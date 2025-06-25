import jwt from 'jsonwebtoken';

// 生产环境请将密钥放入环境变量
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET 环境变量未设置');
}
const JWT_SECRET_KEY = JWT_SECRET as string;
const JWT_EXPIRES_IN = '24h';

export function signJwt(payload: object) {
  // 检查payload是否已包含exp字段
  const hasExp = Object.prototype.hasOwnProperty.call(payload, 'exp');
  return jwt.sign(
    payload, 
    JWT_SECRET_KEY, 
    hasExp ? undefined : { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyJwt(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET_KEY);
  } catch (error) {
    return null;
  }
}