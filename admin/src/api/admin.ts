import { request } from './request';

// 认证
export function apiAdminLogin(data: { username: string; password: string }) {
  return request.post<{ code: string; message: string; data: { token: string; admin: any } }>('/admin/login', data);
}

// 仪表盘
export function apiGetDashboard() {
  return request.get<{ code: string; data: any }>('/admin/dashboard');
}

// 策略中控
export function apiGetStrategy() {
  return request.get<{ code: string; data: any }>('/admin/strategy');
}

export function apiUpdateStrategy(data: any) {
  return request.put<{ code: string; data: any }>('/admin/strategy', data);
}

// AI 编排与连通性测试
export function apiGetAiConfig() {
  return request.get<{ code: string; data: any }>('/admin/ai-config');
}

export function apiUpdateAiConfig(data: any) {
  return request.put<{ code: string; data: any }>('/admin/ai-config', data);
}

export function apiTestAiConnection(data?: any) {
  return request.post<{ code: string; message: string; data: any }>('/admin/ai/test-connection', data);
}

export function apiGetAiGatewayStatus() {
  return request.get<{ code: string; data: any }>('/admin/ai/status');
}

// 卡牌资源档案
export function apiGetCards(params?: { category?: string; search?: string }) {
  return request.get<{ code: string; data: { total: number; cards: any[] } }>('/admin/cards', { params });
}

// 敏感词
export function apiGetSensitiveWords() {
  return request.get<{ code: string; data: any[] }>('/admin/sensitive-words');
}

export function apiAddSensitiveWord(data: { word: string; category?: string }) {
  return request.post<{ code: string; data: any }>('/admin/sensitive-words', data);
}

export function apiDeleteSensitiveWord(id: number) {
  return request.delete<{ code: string; data: any }>(`/admin/sensitive-words/${id}`);
}

// 用户管理
export function apiGetUsers(params?: { page?: number; pageSize?: number; search?: string }) {
  return request.get<{ code: string; data: { total: number; page: number; pageSize: number; items: any[] } }>('/admin/users', { params });
}

export function apiAdjustUserEnergy(userId: string, amount: number) {
  return request.post<{ code: string; data: any }>(`/admin/users/${userId}/energy`, { amount });
}

export function apiToggleBlacklist(userId: string, isBlacklisted: boolean) {
  return request.post<{ code: string; data: any }>(`/admin/users/${userId}/blacklist`, { isBlacklisted });
}
