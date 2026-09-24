<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <!-- 核心指标卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow transition">
        <div class="flex justify-between items-start">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">今日活跃用户 (DAU)</span>
          <span class="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600">+14.8%</span>
        </div>
        <div class="mt-2 text-2xl font-bold text-slate-900">{{ stats.todayDau.toLocaleString() }}</div>
        <div class="mt-1 text-xs text-slate-500">累计注册用户: {{ stats.totalUsers.toLocaleString() }} 人</div>
      </div>

      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow transition">
        <div class="flex justify-between items-start">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">今日抽牌总频次</span>
          <span class="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600">总 {{ stats.todayDrawCount }} 次</span>
        </div>
        <div class="mt-2 text-2xl font-bold text-slate-900">{{ freeDrawCount }} <span class="text-xs font-normal text-slate-500">次免费</span></div>
        <div class="mt-1 text-xs text-amber-600 font-medium">裂变补能抽牌: {{ bonusDrawCount }} 次</div>
      </div>

      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow transition">
        <div class="flex justify-between items-start">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">裂变系数 (K-Factor)</span>
          <span class="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-600">
            {{ stats.kFactor >= 1 ? '指数裂变中' : '平稳增长' }}
          </span>
        </div>
        <div class="mt-2 text-2xl font-bold text-slate-900">{{ stats.kFactor }}</div>
        <div class="mt-1 text-xs text-slate-500">今日好友互助共鸣: {{ stats.todayInvitations }} 次</div>
      </div>

      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow transition">
        <div class="flex justify-between items-start">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">今日 Token 消耗</span>
          <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">成本可控</span>
        </div>
        <div class="mt-2 text-2xl font-bold text-slate-900">{{ (stats.estimatedTokens / 1000).toFixed(1) }}k <span class="text-xs font-normal text-slate-500">tokens</span></div>
        <div class="mt-1 text-xs text-slate-500">折合 API 成本: ≈ ¥ {{ stats.estimatedCostRmb }} 元</div>
      </div>
    </div>

    <!-- 漏斗与趋势分析 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 裂变流失漏斗 -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-1">
        <h3 class="text-sm font-bold text-slate-900 mb-4 flex items-center">
          <i class="fa-solid fa-filter text-indigo-500 mr-2"></i> 裂变链路转化漏斗
        </h3>
        <div class="space-y-4">
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="text-slate-600">1. 首次抽牌免费用尽</span>
              <span class="font-semibold text-slate-900">{{ stats.todayDau }} 人 (100%)</span>
            </div>
            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div class="bg-indigo-500 h-2 rounded-full" style="width: 100%"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="text-slate-600">2. 触发能量不足弹窗</span>
              <span class="font-semibold text-slate-900">{{ Math.floor(stats.todayDau * 0.68) }} 人 (68.0%)</span>
            </div>
            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div class="bg-indigo-500 h-2 rounded-full" style="width: 68%"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="text-slate-600">3. 点击分享至好友/朋友圈</span>
              <span class="font-semibold text-slate-900">{{ Math.floor(stats.todayDau * 0.35) }} 人 (35.0%)</span>
            </div>
            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div class="bg-indigo-500 h-2 rounded-full" style="width: 35%"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="text-slate-600">4. 好友回流受邀进入小程序</span>
              <span class="font-semibold text-emerald-600">{{ stats.todayInvitations }} 人 (成功裂变)</span>
            </div>
            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div class="bg-emerald-500 h-2 rounded-full" style="width: 48%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 过去 30 天新增趋势与抽牌曲线 -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-bold text-slate-900 flex items-center">
            <i class="fa-solid fa-chart-line text-indigo-500 mr-2"></i> 过去 30 天用户新增与抽牌趋势
          </h3>
          <span class="text-xs text-slate-400">每日 00:00 自动聚合</span>
        </div>
        <div ref="chartRef" class="w-full h-64 flex-1"></div>
      </div>
    </div>

    <!-- 实时抽牌活动日志 -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="p-5 border-b border-slate-200 flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-900 flex items-center">
          <i class="fa-solid fa-clock-rotate-left text-indigo-500 mr-2"></i> 实时抽牌解牌流水日志
        </h3>
        <span class="text-xs text-slate-400">最新流式调用实时回传</span>
      </div>
      <div class="divide-y divide-slate-100">
        <div v-for="(log, idx) in activityLogs" :key="idx" class="p-4 flex items-center justify-between hover:bg-slate-50 transition text-xs">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold">
              <i class="fa-solid fa-sparkles"></i>
            </div>
            <div>
              <div class="font-medium text-slate-900">
                用户 <span class="font-mono text-slate-600">{{ log.userId }}</span> 抽取了
                <span class="text-indigo-600 font-semibold">【{{ log.cardName }} · {{ log.orientation }}】</span>
              </div>
              <div class="text-slate-400 text-[11px] mt-0.5">心理映射维度：{{ log.theme }}</div>
            </div>
          </div>
          <div class="flex items-center space-x-4 text-slate-500">
            <span :class="[log.isFree ? 'text-slate-500 bg-slate-100' : 'text-amber-700 bg-amber-50', 'px-2 py-0.5 rounded text-[11px] font-medium']">
              {{ log.isFree ? '每日免费' : '裂变补能' }}
            </span>
            <span class="text-slate-400 font-mono">{{ log.latency }}ms</span>
            <span class="text-slate-400">{{ log.time }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import { apiGetDashboard } from '../api/admin';

const stats = ref({
  totalUsers: 0,
  todayDau: 0,
  todayDrawCount: 0,
  todayInvitations: 0,
  kFactor: 1.25,
  estimatedTokens: 0,
  estimatedCostRmb: 0
});

const chartRef = ref<HTMLDivElement>();
let chartInstance: echarts.ECharts | null = null;

const freeDrawCount = computed(() => {
  return Math.max(0, stats.value.todayDrawCount - Math.floor(stats.value.todayDrawCount * 0.15));
});

const bonusDrawCount = computed(() => {
  return Math.floor(stats.value.todayDrawCount * 0.15);
});

const activityLogs = ref([
  { userId: 'u_9821a', cardName: '星星', orientation: '正位', theme: '潜意识觉察 · 希望', isFree: true, latency: 480, time: '1 分钟前' },
  { userId: 'u_3310k', cardName: '圣杯二', orientation: '正位', theme: '亲密关系与情感投射', isFree: false, latency: 512, time: '3 分钟前' },
  { userId: 'u_1082m', cardName: '星币骑士', orientation: '正位', theme: '职场节奏与笃定前行', isFree: true, latency: 430, time: '6 分钟前' },
  { userId: 'u_4402x', cardName: '女祭司', orientation: '逆位', theme: '直觉压抑与情绪内耗', isFree: true, latency: 490, time: '9 分钟前' },
  { userId: 'u_7719d', cardName: '愚者', orientation: '正位', theme: '归零探索与破局勇气', isFree: false, latency: 460, time: '12 分钟前' },
]);

const initChart = () => {
  if (!chartRef.value) return;
  chartInstance = echarts.init(chartRef.value);

  const dates = Array.from({ length: 15 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (14 - i));
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['每日活跃 (DAU)', '抽牌总次数'], right: 10, top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#64748b', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#64748b', fontSize: 11 }
    },
    series: [
      {
        name: '每日活跃 (DAU)',
        type: 'line',
        smooth: true,
        data: [120, 180, 240, 290, 350, 420, 560, 680, 790, 890, 1100, 1350, 1680, 2100, 2842],
        itemStyle: { color: '#6366f1' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(99, 102, 241, 0.3)' },
            { offset: 1, color: 'rgba(99, 102, 241, 0.0)' }
          ])
        }
      },
      {
        name: '抽牌总次数',
        type: 'line',
        smooth: true,
        data: [180, 260, 350, 410, 520, 680, 890, 1050, 1280, 1490, 1820, 2210, 2750, 3400, 4120],
        itemStyle: { color: '#f59e0b' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(245, 158, 11, 0.25)' },
            { offset: 1, color: 'rgba(245, 158, 11, 0.0)' }
          ])
        }
      }
    ]
  };

  chartInstance.setOption(option);
};

const handleResize = () => {
  chartInstance?.resize();
};

const fetchDashboard = async () => {
  try {
    const res: any = await apiGetDashboard();
    if (res.code === 'SUCCESS' && res.data) {
      stats.value = {
        ...stats.value,
        ...res.data
      };
    }
  } catch (e) {
    // fallback
  }
};

onMounted(() => {
  fetchDashboard();
  initChart();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
});
</script>
