import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiAdminLogin } from '../api/admin';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('xinmang_admin_token') || '');
  const user = ref<any>(
    localStorage.getItem('xinmang_admin_user')
      ? JSON.parse(localStorage.getItem('xinmang_admin_user')!)
      : null
  );

  const isAuthenticated = () => !!token.value;

  async function login(username: string, password: string) {
    const res: any = await apiAdminLogin({ username, password });
    if (res.code === 'SUCCESS' && res.data) {
      token.value = res.data.token;
      user.value = res.data.admin;
      localStorage.setItem('xinmang_admin_token', res.data.token);
      localStorage.setItem('xinmang_admin_user', JSON.stringify(res.data.admin));
      return res.data;
    }
    throw new Error(res.message || '登录失败');
  }

  function logout() {
    token.value = '';
    user.value = null;
    localStorage.removeItem('xinmang_admin_token');
    localStorage.removeItem('xinmang_admin_user');
  }

  return {
    token,
    user,
    isAuthenticated,
    login,
    logout
  };
});
