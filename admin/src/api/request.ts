import axios from 'axios';
import { ElMessage } from 'element-plus';

export const request = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
});

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('xinmang_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

request.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const res = error.response;
    const msg = res?.data?.message || error.message || '网络请求异常';
    if (res?.status === 401) {
      localStorage.removeItem('xinmang_admin_token');
      localStorage.removeItem('xinmang_admin_user');
      ElMessage.error('登录状态已失效，请重新登录');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else {
      ElMessage.error(msg);
    }
    return Promise.reject(error);
  }
);
