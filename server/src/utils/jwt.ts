import jwt from 'jsonwebtoken';
import { ENV } from '../config/constants';

export interface UserJwtPayload {
  userId: string;
  openid: string;
}

export interface AdminJwtPayload {
  adminId: string;
  username: string;
  role: string;
}

export function signUserToken(payload: UserJwtPayload): string {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: ENV.JWT_EXPIRES_IN as any });
}

export function verifyUserToken(token: string): UserJwtPayload | null {
  try {
    return jwt.verify(token, ENV.JWT_SECRET) as UserJwtPayload;
  } catch (err) {
    return null;
  }
}

export function signAdminToken(payload: AdminJwtPayload): string {
  return jwt.sign(payload, ENV.ADMIN_JWT_SECRET, { expiresIn: ENV.ADMIN_JWT_EXPIRES_IN as any });
}

export function verifyAdminToken(token: string): AdminJwtPayload | null {
  try {
    return jwt.verify(token, ENV.ADMIN_JWT_SECRET) as AdminJwtPayload;
  } catch (err) {
    return null;
  }
}
