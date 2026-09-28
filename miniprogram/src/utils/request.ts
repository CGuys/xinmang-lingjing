import { getApiBaseUrl } from './config';
import type { ApiResponse } from '../types';

export interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  header?: Record<string, string>;
  skipAuth?: boolean;
}

export function request<T = any>(options: RequestOptions): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const token = uni.getStorageSync('token') || '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.header || {})
  };

  if (!options.skipAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fullUrl = options.url.startsWith('http')
    ? options.url
    : `${baseUrl}${options.url.startsWith('/') ? '' : '/'}${options.url}`;

  return new Promise((resolve, reject) => {
    uni.request({
      url: fullUrl,
      method: options.method || 'GET',
      data: options.data,
      header: headers,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const body = res.data as ApiResponse<T>;
          if (body && typeof body === 'object' && 'code' in body) {
            if (body.code === 'SUCCESS') {
              resolve(body.data);
            } else {
              reject(new Error(body.message || '请求处理失败'));
            }
          } else {
            resolve(res.data as T);
          }
        } else if (res.statusCode === 401) {
          // Token 过期或未登录
          uni.removeStorageSync('token');
          reject(new Error('登录状态已失效，请重新登录'));
        } else {
          const errData = res.data as any;
          const msg = errData?.message || `网络请求错误 (${res.statusCode})`;
          reject(new Error(msg));
        }
      },
      fail: (err) => {
        console.error('[Request Fail]', err);
        reject(new Error(err.errMsg || '网络连接异常，请检查网络'));
      }
    });
  });
}
