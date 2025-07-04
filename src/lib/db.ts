// 数据库连接池配置
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

// 安全的查询函数
export async function safeQuery(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('数据库查询错误:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
