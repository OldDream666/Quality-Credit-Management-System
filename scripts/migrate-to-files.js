
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPaths = ['.env', '.env.local'];
    for (const envPath of envPaths) {
        const fullPath = path.join(process.cwd(), envPath);
        if (fs.existsSync(fullPath)) {
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

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL
});

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'proofs');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('开始迁移证明材料存储方式...');

        if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR, { recursive: true });
            console.log('创建上传目录:', UPLOAD_DIR);
        }

        console.log('创建 proof_paths 表...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS proof_paths (
        proof_id INTEGER PRIMARY KEY REFERENCES credits_proofs(id) ON DELETE CASCADE, 
        file_path VARCHAR(512),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        console.log('查询待迁移数据...');
        const res = await client.query('SELECT id, file, filename FROM credits_proofs WHERE length(file) > 100'); // 只有大文件才迁移，避免重复迁移已处理的(空文件)
        console.log(`找到 ${res.rowCount} 条记录需要迁移`);

        for (const row of res.rows) {
            if (!row.file) continue;

            const timestamp = new Date().getTime();
            const safeFilename = row.filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const newFilename = `${row.id}_${timestamp}_${safeFilename}`;
            const filePath = path.join(UPLOAD_DIR, newFilename);

            fs.writeFileSync(filePath, row.file);

            // 插入路径记录
            await client.query(
                'INSERT INTO proof_paths (proof_id, file_path) VALUES ($1, $2) ON CONFLICT (proof_id) DO UPDATE SET file_path = $2',
                [row.id, newFilename]
            );

            // 清空 blob (设置为1字节空buffer，防止违反NOT NULL)
            await client.query(
                'UPDATE credits_proofs SET file = $1 WHERE id = $2',
                [Buffer.alloc(0), row.id]
            );

            process.stdout.write('.');
        }

        console.log('\n迁移完成！');

    } catch (err) {
        console.error('迁移失败:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
