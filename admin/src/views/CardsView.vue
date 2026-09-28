<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <!-- 顶部概览与 OSS 托管状态横幅 -->
    <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl border border-indigo-900/40 shadow-xl relative overflow-hidden">
      <div class="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        <div>
          <div class="flex items-center space-x-3 mb-2">
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
              阿里云 OSS 云端托管中
            </span>
            <span class="text-xs text-indigo-300/80 font-mono">Bucket: {{ ossBucket }}</span>
            <span class="text-xs text-indigo-300/60 font-mono">Region: {{ ossRegion }}</span>
          </div>
          <h2 class="text-xl font-bold tracking-tight flex items-center">
            <i class="fa-solid fa-layer-group text-indigo-400 mr-2.5"></i>
            78 张塔罗卡牌全量心理资产与页面 OSS 资源库
          </h2>
          <p class="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            卡牌资源已按页面规范重命名并分层托管（首页 3D 抽牌缩略图 + 解析页/海报页高清大图 + 艺术卡背），路径与心理投射原型已持久化入库。
          </p>
        </div>

        <!-- 快捷操作区 -->
        <div class="flex flex-wrap items-center gap-3">
          <!-- 资源页面图层切换 -->
          <div class="bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 flex items-center text-xs">
            <button
              @click="activePageLayer = 'home'"
              :class="activePageLayer === 'home' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'"
              class="px-3 py-1.5 rounded-lg transition font-medium flex items-center"
            >
              <i class="fa-solid fa-mobile-screen mr-1.5"></i> 首页 3D 图 (home)
            </button>
            <button
              @click="activePageLayer = 'reading'"
              :class="activePageLayer === 'reading' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'"
              class="px-3 py-1.5 rounded-lg transition font-medium flex items-center"
            >
              <i class="fa-solid fa-image mr-1.5"></i> 解析高清大图 (reading)
            </button>
          </div>

          <!-- AI 智能卡牌识别测试入口 -->
          <button
            @click="aiTesterVisible = true"
            class="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-semibold shadow-md transition flex items-center"
          >
            <i class="fa-solid fa-wand-magic-sparkles mr-1.5"></i> AI 抽牌匹配调试
          </button>
        </div>
      </div>
    </div>

    <!-- 过滤控制与搜索条 -->
    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <!-- 分类过滤 Tabs -->
      <div class="flex items-center space-x-2 overflow-x-auto pb-1 custom-scrollbar">
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="selectedCategory = cat.id"
          :class="[
            selectedCategory === cat.id
              ? 'bg-indigo-600 text-white font-medium shadow-sm'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200',
            'px-3.5 py-1.5 rounded-xl text-xs transition flex items-center whitespace-nowrap'
          ]"
        >
          <span>{{ cat.name }}</span>
          <span class="ml-1.5 opacity-80 text-[10px]">({{ getCategoryCount(cat.id) }})</span>
        </button>
      </div>

      <div class="flex items-center space-x-3">
        <el-input
          v-model="searchQuery"
          placeholder="搜索卡牌中文 / 英文 / 罗马标号 / 标签..."
          size="default"
          clearable
          class="!w-72"
          :prefix-icon="SearchIcon"
        />
        <el-button @click="fetchCards" size="default" :loading="loading" plain>
          <i class="fa-solid fa-arrows-rotate mr-1"></i> 刷新签名
        </el-button>
      </div>
    </div>

    <!-- 78 张卡牌网格瀑布流 -->
    <div v-if="loading" class="text-center py-24">
      <i class="fa-solid fa-circle-notch fa-spin text-3xl text-indigo-500"></i>
      <p class="text-xs text-slate-400 mt-2">正在从数据库加载 OSS 卡牌档案...</p>
    </div>

    <div v-else-if="filteredCards.length === 0" class="bg-white rounded-2xl p-12 text-center border border-slate-200">
      <i class="fa-solid fa-folder-open text-4xl text-slate-300 mb-2"></i>
      <p class="text-sm text-slate-500">未找到匹配的卡牌</p>
    </div>

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <div
        v-for="card in filteredCards"
        :key="card.index"
        class="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col group relative"
      >
        <!-- 图片展示区 (支持切换首页缩略图与解析大图) -->
        <div class="relative h-48 overflow-hidden bg-slate-950 cursor-pointer" @click="openPreview(card)">
          <img
            :src="activePageLayer === 'home' ? card.image : card.imageLarge"
            :alt="card.nameCn"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />

          <!-- 罗马数字/编号 -->
          <div class="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-950/80 text-amber-300 text-[10px] font-cinzel font-semibold backdrop-blur-xs border border-amber-400/20">
            {{ card.roman || '#' + card.index }}
          </div>

          <!-- OSS 托管指示小标 -->
          <div class="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 text-[9px] font-mono border border-indigo-400/30 flex items-center">
            <span class="w-1 h-1 rounded-full bg-emerald-400 mr-1"></span>
            OSS
          </div>

          <!-- 底部渐变卡牌名称栏 -->
          <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-2.5 flex justify-between items-end">
            <div>
              <span class="text-white text-xs font-bold block">{{ card.nameCn }}</span>
              <span class="text-slate-300 text-[10px] font-cinzel block truncate">{{ card.nameEn }}</span>
            </div>
            <span class="text-[9px] text-amber-300/80 font-mono">
              {{ activePageLayer === 'home' ? '缩略图' : '高清大图' }}
            </span>
          </div>
        </div>

        <!-- 详细心理学标签与操作 -->
        <div class="p-3 flex-1 flex flex-col justify-between space-y-2">
          <!-- OSS 页面路径标识 -->
          <div class="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded truncate border border-slate-100 flex items-center justify-between">
            <span class="truncate" :title="activePageLayer === 'home' ? card.ossHomeKey : card.ossReadingKey">
              {{ (activePageLayer === 'home' ? card.ossHomeKey : card.ossReadingKey).split('/').slice(-2).join('/') }}
            </span>
            <button @click.stop="copyText(activePageLayer === 'home' ? card.image : card.imageLarge, 'OSS 直链已复制')" class="text-indigo-500 hover:text-indigo-700 ml-1">
              <i class="fa-regular fa-copy"></i>
            </button>
          </div>

          <div class="flex flex-wrap gap-1">
            <span
              v-for="(t, i) in (card.tags || []).slice(0, 2)"
              :key="i"
              class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]"
            >
              {{ t }}
            </span>
          </div>

          <div class="text-[11px] text-slate-400 line-clamp-2 italic leading-tight">
            “{{ card.quote || card.insight }}”
          </div>

          <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              @click="openPreview(card)"
              class="text-slate-500 hover:text-indigo-600 transition text-[11px] flex items-center"
            >
              <i class="fa-solid fa-cube mr-1"></i> 3D 预览
            </button>
            <button
              @click="loadToSandbox(card)"
              class="text-indigo-600 hover:text-indigo-700 font-medium text-[11px] flex items-center"
            >
              <i class="fa-solid fa-wand-magic-sparkles mr-1"></i> 沙盒测试
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 3D 弹窗翻转详情预览 -->
    <el-dialog
      v-model="previewVisible"
      width="480px"
      destroy-on-close
      align-center
      custom-class="!bg-transparent !shadow-none"
    >
      <div v-if="activeCard" class="bg-slate-900 border border-slate-700 rounded-3xl p-6 text-slate-100 shadow-2xl relative overflow-hidden font-serif-sc">
        <!-- 弹窗标题与 OSS 信息 -->
        <div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
          <div class="flex items-center space-x-2">
            <span class="text-xs font-mono text-amber-400 font-bold">{{ activeCard.roman || '#' + activeCard.index }}</span>
            <h3 class="text-base font-bold text-white font-cinzel">{{ activeCard.nameCn }} ({{ activeCard.nameEn }})</h3>
          </div>
          <button @click="triggerModalShuffle" class="text-xs text-amber-400 hover:text-amber-300 transition flex items-center">
            <i class="fa-solid fa-shuffle mr-1"></i> 洗牌测试
          </button>
        </div>

        <!-- 3D 翻转舞台 -->
        <div class="w-48 h-72 mx-auto card-perspective-stage cursor-pointer my-4" @click="isModalFlipped = !isModalFlipped">
          <div
            class="w-full h-full relative transform-style-3d transition-transform duration-700 rounded-2xl shadow-2xl"
            :class="[
              isModalFlipped ? 'rotate-y-180' : '',
              isModalShuffling ? 'is-shuffling' : ''
            ]"
          >
            <!-- 背面 (使用 OSS 托管的艺术卡背) -->
            <div class="absolute inset-0 backface-hidden rounded-2xl overflow-hidden gold-border bg-slate-950 flex flex-col items-center justify-center">
              <img :src="activeCard.backImage" alt="卡牌背面" class="w-full h-full object-cover select-none" />
              <div class="absolute inset-0 bg-slate-950/20 flex flex-col items-center justify-center p-3 pointer-events-none">
                <span class="text-[10px] text-amber-200/90 bg-black/60 px-2 py-0.5 rounded-full mt-auto mb-2 border border-amber-400/20">
                  点击翻开正面
                </span>
              </div>
            </div>

            <!-- 正面 (使用 OSS 托管的页面规范原画) -->
            <div class="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl overflow-hidden gold-border bg-slate-950 flex flex-col">
              <img :src="modalCardImage" :alt="activeCard.nameCn" class="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        <!-- 弹窗内图片清晰度切换 -->
        <div class="flex items-center justify-center space-x-2 my-2 text-xs">
          <button
            @click="modalImageMode = 'reading'"
            :class="modalImageMode === 'reading' ? 'text-amber-300 bg-amber-500/20 border-amber-500/40' : 'text-slate-400 border-slate-700'"
            class="px-2.5 py-1 rounded-lg border text-[11px] transition"
          >
            解析高清原画 (750×1334)
          </button>
          <button
            @click="modalImageMode = 'home'"
            :class="modalImageMode === 'home' ? 'text-amber-300 bg-amber-500/20 border-amber-500/40' : 'text-slate-400 border-slate-700'"
            class="px-2.5 py-1 rounded-lg border text-[11px] transition"
          >
            首页 3D 抽牌缩略图
          </button>
        </div>

        <!-- OSS 路径信息面板 -->
        <div class="mt-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] space-y-1.5 font-mono">
          <div class="flex items-center justify-between text-slate-400">
            <span class="text-amber-400"><i class="fa-solid fa-cloud mr-1"></i> OSS 首页路径:</span>
            <button @click="copyText(activeCard.ossHomeKey, '已复制首页 OSS 路径')" class="text-indigo-400 hover:underline">
              复制 Key
            </button>
          </div>
          <p class="text-slate-300 truncate">{{ activeCard.ossHomeKey }}</p>

          <div class="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/80">
            <span class="text-amber-400"><i class="fa-solid fa-image mr-1"></i> OSS 解析大图:</span>
            <button @click="copyText(activeCard.ossReadingKey, '已复制解析页 OSS 路径')" class="text-indigo-400 hover:underline">
              复制 Key
            </button>
          </div>
          <p class="text-slate-300 truncate">{{ activeCard.ossReadingKey }}</p>
        </div>

        <!-- 卡牌心理学投射原型 -->
        <div class="space-y-2.5 mt-4 text-xs text-slate-300">
          <div>
            <span class="text-amber-400 font-semibold">【心理学投射原型】：</span>
            <p class="mt-0.5 leading-relaxed text-slate-300 text-[11px]">{{ activeCard.insight }}</p>
          </div>
          <div>
            <span class="text-amber-400 font-semibold">【正念行动建议】：</span>
            <p class="mt-0.5 leading-relaxed text-slate-300 text-[11px]">{{ activeCard.guidance }}</p>
          </div>
        </div>

        <!-- 底部快捷操作 -->
        <div class="mt-5 pt-3 border-t border-slate-800 flex justify-between items-center">
          <el-button size="small" @click="copyText(modalCardImage, 'OSS 图片直链已复制')">
            <i class="fa-solid fa-link mr-1"></i> 复制访问直链
          </el-button>
          <div class="space-x-2">
            <el-button size="small" @click="previewVisible = false">关闭</el-button>
            <el-button type="primary" size="small" @click="loadToSandbox(activeCard)">
              一键载入 AI 编排沙盒
            </el-button>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- AI 抽牌智能卡牌识别与 OSS 资源匹配试炼器 -->
    <el-dialog
      v-model="aiTesterVisible"
      title="AI 智能卡牌识别与 OSS 资源图联调工具"
      width="640px"
      destroy-on-close
    >
      <div class="space-y-4">
        <p class="text-xs text-slate-500">
          模拟大模型在抽牌或解答时给出的任意自然语言、卡牌名称或标签，测试系统能否自动精准识别卡牌并提取对应的页面 OSS 图片：
        </p>

        <div class="space-y-2">
          <label class="text-xs font-semibold text-slate-700">大模型输出内容 / 卡牌名称模拟：</label>
          <el-input
            v-model="aiTestQuery"
            type="textarea"
            :rows="3"
            placeholder="输入自然语句，例如：“在当下的心理映射中，你抽到了【女祭司】代表沉静内观...” 或输入“愚者”、“ace-of-wands”、“10”"
          />
        </div>

        <!-- 预设快速测试示例 -->
        <div class="flex flex-wrap gap-2 text-xs">
          <span class="text-slate-400 text-[11px] py-1">快速填充：</span>
          <button
            v-for="sample in quickSamples"
            :key="sample"
            @click="aiTestQuery = sample"
            class="px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-[11px] transition border border-slate-200"
          >
            {{ sample }}
          </button>
        </div>

        <div class="flex justify-end">
          <el-button type="primary" :loading="aiTestLoading" @click="executeAiMatch">
            <i class="fa-solid fa-wand-magic-sparkles mr-1.5"></i> 执行 AI 卡牌识别与 OSS 检索
          </el-button>
        </div>

        <!-- 匹配结果展示面板 -->
        <div v-if="aiMatchResult" class="mt-4 p-4 rounded-2xl bg-slate-900 text-white space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2">
            <span class="text-xs font-semibold text-emerald-400 flex items-center">
              <i class="fa-solid fa-circle-check mr-1.5"></i> 成功识别卡牌【{{ aiMatchResult.card.nameCn }}】({{ aiMatchResult.card.nameEn }})
            </span>
            <span class="text-xs font-mono text-amber-400">ID: #{{ aiMatchResult.card.index }}</span>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <!-- 首页 3D 缩略图 -->
            <div class="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
              <span class="text-[10px] text-amber-300 block mb-1">首页 3D 抽牌缩略图</span>
              <img :src="aiMatchResult.assets.home.imageUrl" class="w-full h-32 object-cover rounded-lg mb-1" />
              <p class="text-[9px] text-slate-400 font-mono truncate" :title="aiMatchResult.assets.home.ossKey">
                {{ aiMatchResult.assets.home.ossKey }}
              </p>
            </div>

            <!-- 解析页高清大图 -->
            <div class="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
              <span class="text-[10px] text-indigo-300 block mb-1">能量解析页高清大图</span>
              <img :src="aiMatchResult.assets.reading.imageUrl" class="w-full h-32 object-cover rounded-lg mb-1" />
              <p class="text-[9px] text-slate-400 font-mono truncate" :title="aiMatchResult.assets.reading.ossKey">
                {{ aiMatchResult.assets.reading.ossKey }}
              </p>
            </div>

            <!-- 通用艺术卡背 -->
            <div class="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
              <span class="text-[10px] text-slate-300 block mb-1">通用艺术卡背</span>
              <img :src="aiMatchResult.assets.back.imageUrl" class="w-full h-32 object-cover rounded-lg mb-1" />
              <p class="text-[9px] text-slate-400 font-mono truncate" :title="aiMatchResult.assets.back.ossKey">
                {{ aiMatchResult.assets.back.ossKey }}
              </p>
            </div>
          </div>

          <div class="text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <span class="text-amber-400">【投射释义】：</span>{{ aiMatchResult.card.insight }}
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { apiGetCards, apiMatchCardResource } from '../api/admin';

const SearchIcon = () => h('i', { class: 'fa-solid fa-magnifying-glass text-slate-400' });

const router = useRouter();
const loading = ref(false);
const allCards = ref<any[]>([]);
const selectedCategory = ref('all');
const searchQuery = ref('');
const activePageLayer = ref<'home' | 'reading'>('home');

const ossBucket = ref('xinmang-lingjing-tarot');
const ossRegion = ref('oss-cn-hangzhou');

const previewVisible = ref(false);
const activeCard = ref<any>(null);
const isModalFlipped = ref(false);
const isModalShuffling = ref(false);
const modalImageMode = ref<'home' | 'reading'>('reading');

// AI 智能识别试炼器状态
const aiTesterVisible = ref(false);
const aiTestLoading = ref(false);
const aiTestQuery = ref('在当下的心理投射中，你抽到了【女祭司】代表直觉的内观力量');
const aiMatchResult = ref<any>(null);

const quickSamples = [
  '在当下的心理投射中，你抽到了【女祭司】代表直觉的内观力量',
  '抽到了【愚者】牌，提示你勇敢迈出舒适区第一步',
  '你现在的处境宛如【命运之轮】，周期流转顺势而为',
  '建议倾听【隐士】内观的指引',
  'The Magician',
  '王牌·权杖'
];

const categories = [
  { id: 'all', name: '全部卡牌' },
  { id: 'major', name: '大阿卡纳 (灵魂原型)' },
  { id: 'wands', name: '权杖 (火·意志)' },
  { id: 'cups', name: '圣杯 (水·情感)' },
  { id: 'swords', name: '宝剑 (风·理性)' },
  { id: 'pentacles', name: '星币 (土·物质)' },
];

const modalCardImage = computed(() => {
  if (!activeCard.value) return '';
  return modalImageMode.value === 'home' ? activeCard.value.image : activeCard.value.imageLarge;
});

const fetchCards = async () => {
  loading.value = true;
  try {
    const res: any = await apiGetCards();
    if (res.code === 'SUCCESS' && res.data) {
      allCards.value = res.data.cards;
      if (res.data.ossBucket) ossBucket.value = res.data.ossBucket;
      if (res.data.ossRegion) ossRegion.value = res.data.ossRegion;
    }
  } catch (err: any) {
    ElMessage.error('加载卡牌库失败');
  } finally {
    loading.value = false;
  }
};

const getCategoryCount = (catId: string) => {
  if (catId === 'all') return allCards.value.length;
  return allCards.value.filter((c) => c.category === catId).length;
};

const filteredCards = computed(() => {
  return allCards.value.filter((card) => {
    const matchCat = selectedCategory.value === 'all' || card.category === selectedCategory.value;
    const q = searchQuery.value.trim().toLowerCase();
    const matchQuery =
      !q ||
      card.nameCn.toLowerCase().includes(q) ||
      card.nameEn.toLowerCase().includes(q) ||
      (card.slug && card.slug.toLowerCase().includes(q)) ||
      (card.roman && card.roman.toLowerCase().includes(q)) ||
      (card.tags && card.tags.some((t: string) => t.toLowerCase().includes(q)));
    return matchCat && matchQuery;
  });
});

const openPreview = (card: any) => {
  activeCard.value = card;
  modalImageMode.value = activePageLayer.value;
  isModalFlipped.value = false;
  previewVisible.value = true;
};

const triggerModalShuffle = () => {
  isModalFlipped.value = false;
  isModalShuffling.value = true;
  setTimeout(() => {
    isModalShuffling.value = false;
    setTimeout(() => {
      isModalFlipped.value = true;
    }, 150);
  }, 600);
};

const copyText = (text: string, msg: string) => {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success(msg);
  }).catch(() => {
    ElMessage.info('复制成功');
  });
};

const executeAiMatch = async () => {
  if (!aiTestQuery.value.trim()) {
    ElMessage.warning('请输入待识别的 AI 文本');
    return;
  }
  aiTestLoading.value = true;
  try {
    const res: any = await apiMatchCardResource(aiTestQuery.value);
    if (res.code === 'SUCCESS' && res.data) {
      aiMatchResult.value = res.data;
      ElMessage.success(res.message);
    } else {
      ElMessage.warning(res.message || '未匹配到卡牌');
      aiMatchResult.value = null;
    }
  } catch (err: any) {
    ElMessage.error('AI 匹配识别异常');
  } finally {
    aiTestLoading.value = false;
  }
};

const loadToSandbox = (card: any) => {
  previewVisible.value = false;
  ElMessage.success(`已将【${card.nameCn}】载入 AI 编排沙盒！`);
  router.push('/ai-orchestration');
};

onMounted(() => {
  fetchCards();
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.card-perspective-stage {
  perspective: 1200px;
}

.transform-style-3d {
  transform-style: preserve-3d;
}

.backface-hidden {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.rotate-y-180 {
  transform: rotateY(180deg);
}

.gold-border {
  border: 1px solid rgba(245, 158, 11, 0.4);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px 1px rgba(245, 158, 11, 0.15);
}

.is-shuffling {
  animation: modalShuffleAnim 0.6s ease-in-out;
}

@keyframes modalShuffleAnim {
  0% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.08) rotate(-8deg) translateX(-15px); }
  50% { transform: scale(1.08) rotate(8deg) translateX(15px); }
  75% { transform: scale(1.04) rotate(-3deg) translateX(-6px); }
  100% { transform: scale(1) rotate(0deg); }
}
</style>
