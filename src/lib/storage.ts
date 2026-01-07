
import fs from 'fs';
import path from 'path';

// 存储策略接口
interface StorageStrategy {
    upload(content: Buffer, filename: string, contentType: string): Promise<string>; // 返回存储路径或URL
    get(pathOrUrl: string): Promise<Buffer | null>;
}

// 1. 本地文件存储策略 (开发环境/非Serverless环境)
class LocalStorageStrategy implements StorageStrategy {
    private uploadDir: string;

    constructor() {
        this.uploadDir = path.join(process.cwd(), 'uploads', 'proofs');
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async upload(content: Buffer, filename: string, contentType: string): Promise<string> {
        // 生成安全的文件名
        const timestamp = Date.now();
        const safeFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const newFilename = `${timestamp}_${safeFilename}`;
        const filePath = path.join(this.uploadDir, newFilename);

        await fs.promises.writeFile(filePath, content);
        return newFilename; // 本地存储只返回文件名
    }

    async get(fileKey: string): Promise<Buffer | null> {
        // 如果是完整URL(兼容未来迁移)，尝试解析
        if (fileKey.startsWith('http')) return null;

        const fullPath = path.join(this.uploadDir, fileKey);
        try {
            if (fs.existsSync(fullPath)) {
                return await fs.promises.readFile(fullPath);
            }
        } catch (e) {
            console.error('Local file read error:', e);
        }
        return null;
    }
}

// 2. Vercel Blob 存储策略
import { put } from '@vercel/blob';

class VercelBlobStrategy implements StorageStrategy {
    async upload(content: Buffer, filename: string, contentType: string): Promise<string> {
        // access: 'public' 表示文件可公开访问
        const { url } = await put(filename, content, { access: 'public', contentType });
        return url;
    }

    async get(url: string): Promise<Buffer | null> {
        // Blob 策略下 get 主要用于兼容性，实际前端可能直接访问 url
        // 但为了统一接口，提供下载 buffer 能力
        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            return Buffer.from(await res.arrayBuffer());
        } catch (error) {
            console.error('Vercel Blob fetch error:', error);
            return null;
        }
    }
}

// 工厂模式：根据环境变量决定使用哪种存储
class StorageManager {
    private strategy: StorageStrategy;

    constructor() {
        // 如果存在 BLOB_READ_WRITE_TOKEN 环境变量，则使用 Vercel Blob
        if (process.env.BLOB_READ_WRITE_TOKEN) {
            this.strategy = new VercelBlobStrategy();
        } else {
            this.strategy = new LocalStorageStrategy();
        }
    }

    async uploadFile(file: File, prefix?: string): Promise<string> {
        let buffer = Buffer.from(await file.arrayBuffer());
        let filename = prefix ? `${prefix}_${file.name}` : file.name;

        // 图片自动压缩逻辑
        if (file.type.startsWith('image/')) {
            try {
                // 动态引入 sharp，防止未安装时报错
                const sharp = require('sharp');
                const image = sharp(buffer);
                const metadata = await image.metadata();

                // 1. 如果宽度过大，限制在 1920px
                if (metadata.width && metadata.width > 1920) {
                    image.resize(1920);
                }

                // 2. 压缩质量 (统一 80%)
                // 根据不同格式采用不同压缩策略
                if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
                    image.jpeg({ quality: 80, mozjpeg: true });
                } else if (metadata.format === 'png') {
                    // PNG 压缩比较耗时，这里设置适中参数
                    image.png({ quality: 80, compressionLevel: 6 });
                } else if (metadata.format === 'webp') {
                    image.webp({ quality: 80 });
                }

                // 只有当压缩后的体积变小才使用压缩版
                const compressedBuffer = await image.toBuffer();
                if (compressedBuffer.length < buffer.length) {
                    buffer = compressedBuffer;
                    // console.log(`图片压缩成功: ${file.name} ${(buffer.length/1024).toFixed(2)}KB -> ${(compressedBuffer.length/1024).toFixed(2)}KB`);
                }
            } catch (e: any) {
                if (e.code === 'MODULE_NOT_FOUND') {
                    console.warn('未安装 sharp，跳过图片压缩。如需压缩请运行: npm install sharp');
                } else {
                    console.error('图片压缩失败，将使用原图:', e);
                }
            }
        }

        return this.strategy.upload(buffer, filename, file.type);
    }

    async getFile(pathOrUrl: string): Promise<Buffer | null> {
        // 简单判断：如果是http开头，说明是远程文件（如Blob/S3 URL）
        if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
            try {
                const res = await fetch(pathOrUrl);
                if (res.ok) {
                    return Buffer.from(await res.arrayBuffer());
                }
            } catch (e) {
                console.error('Remote file fetch error:', e);
            }
            return null;
        }
        // 否则作为本地文件处理
        return this.strategy.get(pathOrUrl);
    }
}

export const storage = new StorageManager();
