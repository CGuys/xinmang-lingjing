<template>
  <div class="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
    <!-- 背景流光与神秘星盘 -->
    <div class="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl cosmic-pulse"></div>
    <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl cosmic-pulse" style="animation-delay: 2s;"></div>

    <div class="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10 gold-border-subtle">
      <!-- Logo 与标题 -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-amber-400 mx-auto flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-500/30">
          <i class="fa-solid fa-sparkles text-2xl"></i>
        </div>
        <h1 class="text-2xl font-bold font-cinzel text-white tracking-wider">心芒灵境</h1>
        <p class="text-sm text-slate-400 mt-1">运营管控中枢 · 管理员登录</p>
      </div>

      <!-- 登录表单 -->
      <el-form :model="loginForm" :rules="rules" ref="formRef" @submit.prevent="handleLogin" label-position="top">
        <el-form-item label="管理员账号" prop="username">
          <el-input 
            v-model="loginForm.username" 
            placeholder="请输入账号 (默认: admin)"
            size="large"
            :prefix-icon="UserIcon"
          />
        </el-form-item>

        <el-form-item label="安全密钥 / 密码" prop="password">
          <el-input 
            v-model="loginForm.password" 
            type="password" 
            placeholder="请输入密码 (默认: admin123)"
            show-password
            size="large"
            :prefix-icon="LockIcon"
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <div class="mt-8">
          <button 
            type="button" 
            :disabled="loading" 
            @click="handleLogin"
            class="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/30 transition duration-200 flex items-center justify-center text-sm disabled:opacity-50"
          >
            <i v-if="loading" class="fa-solid fa-circle-notch fa-spin mr-2"></i>
            <span v-else><i class="fa-solid fa-right-to-bracket mr-2"></i> 登 录 中 枢</span>
          </button>
        </div>
      </el-form>

      <!-- 底部系统说明与快捷填充 -->
      <div class="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-500">
        <div class="mb-2">初始管理员账号：<span class="text-indigo-400 font-mono">admin</span> / 密码：<span class="text-indigo-400 font-mono">admin123</span></div>
        <button @click="fillDefault" class="text-amber-400/80 hover:text-amber-300 underline transition">
          一键填入默认账号
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, h } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, type FormInstance } from 'element-plus';
import { useAuthStore } from '../stores/auth';

const UserIcon = () => h('i', { class: 'fa-solid fa-user text-slate-400' });
const LockIcon = () => h('i', { class: 'fa-solid fa-lock text-slate-400' });

const router = useRouter();
const authStore = useAuthStore();

const formRef = ref<FormInstance>();
const loading = ref(false);

const loginForm = reactive({
  username: '',
  password: ''
});

const rules = {
  username: [{ required: true, message: '请输入管理员账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

const fillDefault = () => {
  loginForm.username = 'admin';
  loginForm.password = 'admin123';
};

const handleLogin = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    loading.value = true;
    try {
      await authStore.login(loginForm.username, loginForm.password);
      ElMessage.success('管理员认证成功，欢迎进入管控中枢');
      router.push('/dashboard');
    } catch (err: any) {
      // 错误由 axios 拦截器或 store 处理
    } finally {
      loading.value = false;
    }
  });
};
</script>
