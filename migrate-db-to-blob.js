
const { Pool } = require('pg');
const { put } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');
let sharp;
try {
    sharp = require('sharp');
} catch (e) {
    console.warn('注意: 未安装 sharp，迁移过程将不会压缩图片');
}

// 1. 加载环境变量
function loadEnv() {
    const envPaths = ['.env', '.env.local', '.env.production'];
    for (const envPath of envPaths) {
        const fullPath = path.join(process.cwd(), envPath);
        if (fs.existsSync(fullPath)) {
            console.log(`Loading env from ${envPath}`);
            const content = fs.readFileSync(fullPath, 'utf8');
            content.split('\n').forEach(line => {
                const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
                if (match) {
                    const key = match[1];
                    let value = match[2] || '';
                    if (value.startsWith('"') && value.endsWith('"')) {
                        value = value.slice(1, -1);
                    }
                    if (!process.env[key]) {
                        process.env[key] = value;
                    }
                }
            });
        }
    }
}

loadEnv();

// 2. 检查必要配置
if (!process.env.POSTGRES_URL) {
    console.error('错误: 未找到 POSTGRES_URL 环境变量');
    process.exit(1);
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('错误: 未找到 BLOB_READ_WRITE_TOKEN 环境变量');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL
});

async function compressImage(buffer, mimetype) {
    if (!sharp || !mimetype.startsWith('image/')) return buffer;

    try {
        const image = sharp(buffer);
        const metadata = await image.metadata();

        // 尺寸限制
        if (metadata.width && metadata.width > 1920) {
            image.resize(1920);
        }

        // 格式优化
        if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
            image.jpeg({ quality: 80, mozjpeg: true });
        } else if (metadata.format === 'png') {
            image.png({ quality: 80, compressionLevel: 6 });
        } else if (metadata.format === 'webp') {
            image.webp({ quality: 80 });
        }

        const compressedBuffer = await image.toBuffer();
        // 只有变小了才使用，否则返回原图
        return compressedBuffer.length < buffer.length ? compressedBuffer : buffer;
    } catch (e) {
        console.warn('压缩失败，使用原图:', e.message);
        return buffer;
    }
}

async function migrateToBlob() {
    const client = await pool.connect();
    try {
        console.log('=== 开始迁移数据库图片到 Vercel Blob ===');
        console.log(`目标数据库: ${process.env.POSTGRES_URL.split('@')[1]}`);

        await client.query(`
      CREATE TABLE IF NOT EXISTS proof_paths (
        proof_id INTEGER PRIMARY KEY REFERENCES credits_proofs(id) ON DELETE CASCADE, 
        file_path VARCHAR(512),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // 先查询总数，用于显示进度
        console.log('正在计算待迁移数据总量...');
        const countResult = await client.query(`
      SELECT count(*) as total
      FROM credits_proofs 
      WHERE file IS NOT NULL AND length(file) > 100
    `);
        const total = parseInt(countResult.rows[0].total);
        console.log(`总共有 ${total} 条记录需要迁移`);

        if (total === 0) {
            console.log('没有需要迁移的数据。');
            return;
        }

        let successCount = 0;
        let failCount = 0;
        let processed = 0;

        // 分批处理，每次处理 1 条 (串行处理最稳定，避免并发连接数限制)
        while (true) {
            // 每次只取 1 条未处理的数据
            const res = await client.query(`
          SELECT id, file, filename, mimetype 
          FROM credits_proofs 
          WHERE file IS NOT NULL AND length(file) > 100
          LIMIT 1
        `);

            if (res.rowCount === 0) break;
            const row = res.rows[0];

            processed++;
            const progress = `[${processed}/${total}]`;

            try {
                process.stdout.write(`${progress} 正在处理: ${row.filename}... `);

                let fileBuffer = row.file;
                const originalSize = fileBuffer.length;

                // 压缩
                fileBuffer = await compressImage(fileBuffer, row.mimetype);
                if (fileBuffer.length < originalSize) {
                    process.stdout.write(`(压缩: ${(originalSize / 1024).toFixed(1)}KB -> ${(fileBuffer.length / 1024).toFixed(1)}KB) `);
                }

                // 生成唯一文件名
                const timestamp = Date.now();
                const safeFilename = row.filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const blobPath = `${row.id}_${timestamp}_${safeFilename}`;

                // 上传到 Vercel Blob
                const blob = await put(blobPath, fileBuffer, {
                    access: 'public',
                    contentType: row.mimetype,
                    addRandomSuffix: false
                });

                // 更新数据库 (事务)
                await client.query('BEGIN');

                // 1. 记录外链
                await client.query(
                    'INSERT INTO proof_paths (proof_id, file_path) VALUES ($1, $2) ON CONFLICT (proof_id) DO UPDATE SET file_path = $2',
                    [row.id, blob.url]
                );

                // 2. 清空原数据 (一定要设为空，这样下一轮循环才不会查出这条)
                await client.query(
                    'UPDATE credits_proofs SET file = $1 WHERE id = $2',
                    [Buffer.alloc(0), row.id]
                );

                await client.query('COMMIT');

                process.stdout.write(`√ 完成\n`);
                successCount++;

            } catch (err) {
                await client.query('ROLLBACK');
                process.stdout.write(`× 失败: ${err.message}\n`);
                // 为了防止死循环 (如果这一条一直失败，file 就一直不为空)，
                // 我们需要标记它或者跳过它。
                // 这里我们选择简单地跳出循环或记录错误，
                // 但为了脚本能继续跑下去，我们可以临时把 file_path 标记为 'error' 以便跳过?
                // 或者简单地输出错误并退出当前脚本，让用户检查。
                // 为了健壮性，这里选择暂停 5 秒重试或打印错误后终止当前脚本比较安全。
                console.error('遇到严重错误，脚本终止。请检查网络或配置后重试。');
                process.exit(1);
            }
        }

        console.log('\n=== 迁移完成 ===');
        console.log(`成功: ${successCount}`);
        console.log(`失败: ${failCount}`);

    } catch (err) {
        console.error('脚本执行错误:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrateToBlob();
