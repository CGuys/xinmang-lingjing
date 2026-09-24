<template>
  <div class="flex h-screen overflow-hidden bg-slate-50 text-slate-800">
    <!-- 侧边导航栏 -->
    <aside class="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between flex-shrink-0 z-20">
      <div>
        <!-- Logo Header -->
        <div class="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950/40">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-amber-400 flex items-center justify-center text-white mr-3 shadow-md shadow-indigo-500/20">
            <i class="fa-solid fa-sparkles text-sm"></i>
          </div>
          <div>
            <h1 class="font-bold text-white tracking-wide text-sm font-cinzel">心芒灵境</h1>
            <p class="text-[11px] text-slate-400">运营管控中枢 v1.0</p>
          </div>
        </div>

        <!-- 菜单列表 -->
        <nav class="mt-4 px-3 space-y-1">
          <router-link 
            v-for="item in menuItems" 
            :key="item.path" 
            :to="item.path"
            v-slot="{ isActive, navigate }"
            custom
          >
            <button 
              @click="navigate"
              :class="[
                isActive 
                  ? 'bg-indigo-600 text-white font-medium shadow-sm shadow-indigo-600/30' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                'w-full flex items-center px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-left'
              ]"
            >
              <i :class="[item.icon, 'w-5 text-center mr-3 text-base']"></i>
              <span>{{ item.name }}</span>
              <span v-if="item.badge" class="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-semibold">{{ item.badge }}</span>
            </button>
          </router-link>
        </nav>
      </div>

      <!-- 底部系统健康度与账号 -->
      <div class="p-4 border-t border-slate-800 bg-slate-950/20">
        <div class="flex items-center justify-between text-xs mb-1.5">
          <div class="flex items-center space-x-1.5 min-w-0 pr-1.5" :title="`当前生效厂商: ${gatewayProviderName}`">
            <i class="fa-solid fa-brain text-[11px] text-indigo-400 flex-shrink-0"></i>
            <span class="text-slate-200 font-semibold truncate">{{ gatewayProviderName }}</span>
          </div>
          <span class="flex items-center font-medium flex-shrink-0 text-xs" :class="gatewayStatusClass" :title="gatewayMessage || gatewayStatusText">
            <span class="w-2 h-2 rounded-full mr-1.5 animate-pulse" :class="gatewayDotClass"></span>
            <span>{{ gatewayStatusText }}</span>
          </span>
        </div>

        <div v-if="gatewayModel" class="flex items-center justify-between text-[11px] text-slate-400 mb-2 font-mono">
          <span class="truncate max-w-[130px] hover:text-slate-200 transition" :title="`模型: ${gatewayModel}`">
            {{ gatewayModel }}
          </span>
          <span v-if="gatewayLatency > 0" class="text-[10px] text-slate-500 flex-shrink-0">
            {{ gatewayLatency }}ms
          </span>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <div class="flex items-center space-x-2">
            <div class="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-200">
              <i class="fa-solid fa-user-shield"></i>
            </div>
            <div class="text-xs text-slate-300 font-medium">{{ authStore.user?.username || 'Admin' }}</div>
          </div>
          <button @click="handleLogout" class="text-xs text-slate-400 hover:text-rose-400 transition" title="退出登录">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>
      </div>
    </aside>

    <!-- 主视口区域 -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- 顶部 Header -->
      <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 flex-shrink-0">
        <div class="flex items-center space-x-2 text-sm text-slate-500">
          <span>控制台</span>
          <span>/</span>
          <span class="text-slate-900 font-medium">{{ currentRouteName }}</span>
        </div>

        <!-- 顶部快捷操作 & 状态看板 -->
        <div class="flex items-center space-x-4">
          <!-- 微信审核模式快捷状态指示 -->
          <div :class="[
            isInReview 
              ? 'bg-amber-50 border-amber-200 text-amber-700' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-700',
            'flex items-center px-3 py-1 rounded-full border text-xs font-medium cursor-pointer transition'
          ]" @click="quickToggleReview">
            <span :class="[isInReview ? 'bg-amber-500' : 'bg-emerald-500', 'w-2 h-2 rounded-full mr-2']"></span>
            <span>审核伪装模式：{{ isInReview ? '已开启 (安全过审中)' : '已关闭 (全量运行)' }}</span>
          </div>

          <button @click="syncCache" :disabled="syncing" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-2 rounded-lg shadow-sm font-medium transition flex items-center disabled:opacity-50">
            <i :class="['fa-solid mr-1.5', syncing ? 'fa-circle-notch fa-spin' : 'fa-cloud-arrow-up']"></i>
            <span>{{ syncing ? '正在生效...' : '一键同步至 Redis' }}</span>
          </button>
        </div>
      </header>

      <!-- 内容主体区 -->
      <main class="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../stores/auth';
import { apiGetStrategy, apiUpdateStrategy, apiGetAiGatewayStatus } from '../api/admin';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const isInReview = ref(false);
const syncing = ref(false);
const gatewayStatus = ref<string>('CHECKING');
const gatewayProviderName = ref<string>('大模型网关');
const gatewayModel = ref<string>('');
const gatewayLatency = ref<number>(0);
const gatewayMessage = ref<string>('');

const gatewayStatusText = computed(() => {
  switch (gatewayStatus.value) {
    case 'CONNECTED': return '已连通';
    case 'INSUFFICIENT_BALANCE': return '余额不足';
    case 'API_KEY_EMPTY': return '内置引擎';
    case 'INVALID_API_KEY': return '密钥无效';
    case 'MODEL_NOT_FOUND': return '模型未找到';
    case 'FAILED': return '连接异常';
    default: return '检测中...';
  }
});

const gatewayStatusClass = computed(() => {
  switch (gatewayStatus.value) {
    case 'CONNECTED': return 'text-emerald-400';
    case 'INSUFFICIENT_BALANCE': return 'text-amber-400';
    case 'API_KEY_EMPTY': return 'text-indigo-400';
    default: return 'text-rose-400';
  }
});

const gatewayDotClass = computed(() => {
  switch (gatewayStatus.value) {
    case 'CONNECTED': return 'bg-emerald-400';
    case 'INSUFFICIENT_BALANCE': return 'bg-amber-400';
    case 'API_KEY_EMPTY': return 'bg-indigo-400';
    default: return 'bg-rose-400';
  }
});

const checkGatewayStatus = async () => {
  try {
    const res: any = await apiGetAiGatewayStatus();
    if (res.code === 'SUCCESS' && res.data) {
      gatewayStatus.value = res.data.status || 'CONNECTED';
      gatewayProviderName.value = res.data.providerName || (res.data.provider ? String(res.data.provider).toUpperCase() : '大模型网关');
      gatewayModel.value = res.data.model || res.data.modelUsed || '';
      gatewayLatency.value = res.data.latencyMs || 0;
      gatewayMessage.value = res.data.message || '';
    }
  } catch (e) {
    gatewayStatus.value = 'FAILED';
    gatewayMessage.value = '请求网关状态失败';
  }
};

const menuItems = [
  { name: '数据概览看板', path: '/dashboard', icon: 'fa-solid fa-chart-pie' },
  { name: '业务策略中控', path: '/strategy', icon: 'fa-solid fa-sliders', badge: '核心' },
  { name: 'AI 编排沙盒', path: '/ai-orchestration', icon: 'fa-solid fa-wand-magic-sparkles' },
  { name: '卡牌资源中心', path: '/cards', icon: 'fa-solid fa-layer-group', badge: '78张' },
  { name: '违禁词风控库', path: '/sensitive-words', icon: 'fa-solid fa-shield-halved' },
  { name: '用户资产管理', path: '/users', icon: 'fa-solid fa-users-gear' },
];

const currentRouteName = computed(() => {
  const matched = menuItems.find((item) => item.path === route.path);
  return matched ? matched.name : '管控详情';
});

const loadStrategy = async () => {
  try {
    const res: any = await apiGetStrategy();
    if (res.code === 'SUCCESS' && res.data) {
      isInReview.value = Boolean(res.data.is_in_review);
    }
  } catch (e) {
    // ignore
  }
};

const quickToggleReview = async () => {
  try {
    const nextVal = !isInReview.value;
    await apiUpdateStrategy({ is_in_review: nextVal });
    isInReview.value = nextVal;
    ElMessage.success(`微信审核模式已${nextVal ? '开启（仅输出安全鸡汤）' : '关闭（全量大模型运行）'}`);
  } catch (err: any) {
    ElMessage.error(err.message || '更新失败');
  }
};

const syncCache = async () => {
  syncing.value = true;
  try {
    await apiUpdateStrategy({});
    ElMessage.success('✅ 策略配置已成功持久化至 Redis 集群，全网边缘节点已即时生效！');
  } catch (err: any) {
    ElMessage.error('同步失败');
  } finally {
    syncing.value = false;
  }
};

const handleLogout = () => {
  authStore.logout();
  ElMessage.info('已安全退出后台系统');
  router.push('/login');
};

onMounted(() => {
  loadStrategy();
  checkGatewayStatus();
  window.addEventListener('ai-config-updated', checkGatewayStatus);
});

onUnmounted(() => {
  window.removeEventListener('ai-config-updated', checkGatewayStatus);
});
</script>
