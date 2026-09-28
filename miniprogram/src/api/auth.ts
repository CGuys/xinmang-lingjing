import { request } from '../utils/request';
import type { UserProfile } from '../types';

export interface LoginResult {
  token: string;
  user: {
    id: string;
    openid: string;
    dailyFreeLimit?: number;
    freeEnergyUsedToday?: number;
    freeEnergyAvailable?: number;
    hasFreeToday: boolean;
    bonusEnergy: number;
    totalAvailable: number;
    lastFreeDate: string | null;
  };
}

export function apiWxLogin(code: string): Promise<LoginResult> {
  return request<LoginResult>({
    url: '/api/v1/auth/wx-login',
    method: 'POST',
    data: { code },
    skipAuth: true
  });
}
