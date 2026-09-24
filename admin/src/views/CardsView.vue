<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <!-- 顶部概览与过滤控制条 -->
    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-base font-bold text-slate-900 flex items-center">
          <i class="fa-solid fa-layer-group text-indigo-600 mr-2"></i> 78 张塔罗卡牌全量心理资产库
        </h2>
        <p class="text-xs text-slate-400 mt-0.5">
          大阿卡纳 22 张（灵魂原型）+ 小阿卡纳 56 张（日常生活意象投射），支持 3D 细节翻转与一键推送沙盒
        </p>
      </div>

      <div class="flex items-center space-x-3">
        <el-input 
          v-model="searchQuery" 
          placeholder="搜索卡牌中文 / 英文 / 心理标签..." 
          size="default" 
          clearable 
          class="!w-64"
          :prefix-icon="SearchIcon"
        />
      </div>
    </div>

    <!-- 分类过滤 Tabs -->
    <div class="flex items-center space-x-2 overflow-x-auto pb-2 custom-scrollbar">
      <button 
        v-for="cat in categories" 
        :key="cat.id" 
        @click="selectedCategory = cat.id"
        :class="[
          selectedCategory === cat.id 
            ? 'bg-indigo-600 text-white font-medium shadow-sm' 
            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200',
          'px-4 py-2 rounded-xl text-xs transition flex items-center whitespace-nowrap'
        ]"
      >
        <span>{{ cat.name }}</span>
        <span class="ml-1.5 opacity-80 text-[10px]">({{ getCategoryCount(cat.id) }})</span>
      </button>
    </div>

    <!-- 78 张卡牌网格瀑布流 -->
    <div v-if="loading" class="text-center py-20">
      <i class="fa-solid fa-circle-notch fa-spin text-3xl text-indigo-500"></i>
      <p class="text-xs text-slate-400 mt-2">正在载入卡牌资产档案...</p>
    </div>

    <div v-else-if="filteredCards.length === 0" class="bg-white rounded-2xl p-12 text-center border border-slate-200">
      <i class="fa-solid fa-folder-open text-4xl text-slate-300 mb-2"></i>
      <p class="text-sm text-slate-500">未找到匹配的卡牌</p>
    </div>

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <div 
        v-for="card in filteredCards" 
        :key="card.index"
        class="bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition overflow-hidden flex flex-col group"
      >
        <!-- 图片区 -->
        <div class="relative h-48 overflow-hidden bg-slate-900 cursor-pointer" @click="openPreview(card)">
          <img 
            :src="card.image" 
            :alt="card.nameCn" 
            class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            loading="lazy"
          />
          <div class="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-950/70 text-amber-300 text-[10px] font-cinzel font-semibold backdrop-blur-xs border border-amber-400/20">
            {{ card.roman || '#' + card.index }}
          </div>
          <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent p-2 flex justify-between items-end">
            <span class="text-white text-xs font-bold">{{ card.nameCn }}</span>
            <span class="text-slate-300 text-[10px] font-cinzel">{{ card.nameEn }}</span>
          </div>
        </div>

        <!-- 详细心理学标签与操作 -->
        <div class="p-3 flex-1 flex flex-col justify-between space-y-2.5">
          <div class="flex flex-wrap gap-1">
            <span 
              v-for="(t, i) in (card.tags || []).slice(0, 2)" 
              :key="i"
              class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]"
            >
              {{ t }}
            </span>
          </div>

          <div class="text-[11px] text-slate-400 line-clamp-2 italic">
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
      width="440px" 
      destroy-on-close
      align-center
      custom-class="!bg-transparent !shadow-none"
    >
      <div v-if="activeCard" class="bg-slate-900 border border-slate-700 rounded-3xl p-6 text-slate-100 shadow-2xl relative overflow-hidden font-serif-sc">
        <!-- 弹窗标题 -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-2">
            <span class="text-xs font-mono text-amber-400">{{ activeCard.roman || '#' + activeCard.index }}</span>
            <h3 class="text-base font-bold text-white font-cinzel">{{ activeCard.nameCn }} ({{ activeCard.nameEn }})</h3>
          </div>
          <button @click="triggerModalShuffle" class="text-xs text-slate-400 hover:text-amber-300 transition flex items-center">
            <i class="fa-solid fa-shuffle mr-1"></i> 洗牌测试
          </button>
        </div>

        <!-- 3D 卡牌立体翻转 -->
        <div class="w-48 h-72 mx-auto card-perspective-stage cursor-pointer my-4" @click="isModalFlipped = !isModalFlipped">
          <div 
            class="w-full h-full relative transform-style-3d transition-transform duration-700 rounded-2xl shadow-2xl"
            :class="[
              isModalFlipped ? 'rotate-y-180' : '',
              isModalShuffling ? 'is-shuffling' : ''
            ]"
          >
            <!-- 背面 -->
            <div class="absolute inset-0 backface-hidden rounded-2xl overflow-hidden gold-border bg-slate-950 flex flex-col items-center justify-center p-3">
              <div class="w-full h-full border border-amber-400/30 rounded-xl flex flex-col items-center justify-center">
                <i class="fa-solid fa-dharmachakra text-amber-400/50 text-4xl mb-3 animate-spin-slow"></i>
                <span class="text-xs font-cinzel text-amber-300 tracking-widest">ISHTAR</span>
                <span class="text-[10px] text-slate-400 mt-1">点击翻开正面</span>
              </div>
            </div>

            <!-- 正面 -->
            <div class="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl overflow-hidden gold-border bg-slate-950 flex flex-col">
              <img :src="activeCard.image" :alt="activeCard.nameCn" class="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        <!-- 卡牌寓意详情 -->
        <div class="space-y-3 mt-5 text-xs text-slate-300">
          <div>
            <span class="text-amber-400 font-semibold">【心理学投射原型】：</span>
            <p class="mt-1 leading-relaxed text-slate-300">{{ activeCard.insight }}</p>
          </div>
          <div>
            <span class="text-amber-400 font-semibold">【正念行动建议】：</span>
            <p class="mt-1 leading-relaxed text-slate-300">{{ activeCard.guidance }}</p>
          </div>
        </div>

        <!-- 底部载入沙盒快捷入口 -->
        <div class="mt-6 pt-4 border-t border-slate-800 flex justify-end space-x-3">
          <el-button size="small" @click="previewVisible = false">关闭</el-button>
          <el-button type="primary" size="small" @click="loadToSandbox(activeCard)">
            一键载入 AI 编排沙盒
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { apiGetCards } from '../api/admin';

const SearchIcon = () => h('i', { class: 'fa-solid fa-magnifying-glass text-slate-400' });

const router = useRouter();
const loading = ref(false);
const allCards = ref<any[]>([]);
const selectedCategory = ref('all');
const searchQuery = ref('');

const previewVisible = ref(false);
const activeCard = ref<any>(null);
const isModalFlipped = ref(false);
const isModalShuffling = ref(false);

const categories = [
  { id: 'all', name: '全部卡牌' },
  { id: 'major', name: '大阿卡纳' },
  { id: 'wands', name: '权杖 (火)' },
  { id: 'cups', name: '圣杯 (水)' },
  { id: 'swords', name: '宝剑 (风)' },
  { id: 'pentacles', name: '星币 (土)' },
];

const fetchCards = async () => {
  loading.value = true;
  try {
    const res: any = await apiGetCards();
    if (res.code === 'SUCCESS' && res.data) {
      allCards.value = res.data.cards;
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
      (card.roman && card.roman.toLowerCase().includes(q)) ||
      (card.tags && card.tags.some((t: string) => t.toLowerCase().includes(q)));
    return matchCat && matchQuery;
  });
});

const openPreview = (card: any) => {
  activeCard.value = card;
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

const loadToSandbox = (card: any) => {
  previewVisible.value = false;
  ElMessage.success(`已将【${card.nameCn}】载入 AI 编排沙盒！`);
  router.push('/ai-orchestration');
};

onMounted(() => {
  fetchCards();
});
</script>
