// 数据库连接池配置
import { Pool, PoolClient } from 'pg';

// 检查环境变量
const requiredEnvVars = ['PGUSER', 'PGHOST', 'PGDATABASE', 'PGPASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('缺少必要的数据库环境变量:', missingVars);
  console.error('请确保已创建 .env 文件并配置以下变量:');
  console.error('PGUSER, PGHOST, PGDATABASE, PGPASSWORD');
  process.exit(1);
}

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
  // 连接池配置
  max: 20, // 最大连接数
  min: 2,  // 最小连接数
  idleTimeoutMillis: 30000, // 空闲连接超时时间
  connectionTimeoutMillis: 2000, // 连接超时时间
  // 重试配置
  maxUses: 7500, // 连接最大使用次数
});

// 连接池事件监听
pool.on('connect', (client: PoolClient) => {
  console.log('数据库连接已建立');
});

pool.on('error', (err: Error, client: PoolClient) => {
  console.error('数据库连接池错误:', err);
});

pool.on('acquire', (client: PoolClient) => {
  console.log('从连接池获取连接');
});

// 测试数据库连接
export async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('数据库连接测试成功');
    return true;
  } catch (error) {
    console.error('数据库连接测试失败:', error);
    return false;
  }
}

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
