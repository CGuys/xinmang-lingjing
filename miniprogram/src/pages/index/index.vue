<template>
  <view class="container" :class="{ 'vibrate-active': isVibrating }">
    <!-- 顶部能量资产状态条 (PRD 2.1) -->
    <view class="header-energy">
      <view
        class="energy-pill"
        :class="userStore.totalEnergy > 0 ? 'energy-pill-active' : 'energy-pill-empty'"
        @click="handleEnergyClick"
      >
        <text class="energy-icon">✨</text>
        <text v-if="userStore.totalEnergy > 0" class="energy-text">
          今日灵感点: <text class="energy-num">{{ userStore.freeEnergyAvailable }}/{{ userStore.dailyFreeLimit }}</text>
          <text v-if="userStore.bonusEnergy > 0" class="bonus-tag"> +{{ userStore.bonusEnergy }}</text>
        </text>
        <text v-else class="energy-text">
          今日灵感点: <text class="energy-num">0/{{ userStore.dailyFreeLimit }}</text> (待充盈)
        </text>
      </view>

      <view v-if="userStore.isInReview" class="review-tag">
        <text>🛡️ 心理自省模式</text>
      </view>
      <view v-else class="archetype-tag">
        <image class="brand-logo-mini" src="/static/logo.png" mode="aspectFit" />
        <text>荣格潜意识投射</text>
      </view>
    </view>

    <!-- 意念/困惑输入模块 (PRD 2.2) -->
    <view v-if="!userStore.isInReview" class="question-card">
      <view class="question-header">
        <text class="question-title">{{ currentGreeting || '🪶 输入当下的困惑或心绪：' }}</text>
        <text class="char-count">{{ userQuestion.length }}/50</text>
      </view>
      <input
        class="question-input"
        type="text"
        v-model="userQuestion"
        maxlength="50"
        placeholder="例如：面临职业转折，不知道是该坚守还是探索新方向..."
        placeholder-class="placeholder-style"
      />
      <!-- 快捷预设心绪标签 (时辰心境 + AI/大数据动态推荐) -->
      <view class="tag-section">
        <view class="tag-section-header">
          <text class="tag-hint-label">✨ {{ periodName ? `${periodName}心境推荐：` : '当下潜意识共鸣：' }}</text>
          <view class="btn-refresh-tags" :class="{ 'refreshing-spin': isRefreshingTags }" @click="handleRefreshTags">
            <text class="refresh-icon">🎲</text>
            <text class="refresh-text">换一批</text>
          </view>
        </view>
        <view class="tag-row">
          <view
            v-for="item in currentMindTags"
            :key="item.name"
            class="preset-tag"
            :class="{ 'preset-tag-selected': selectedTagName === item.name || userQuestion.includes(item.name) }"
            @click="selectMindTag(item)"
          >
            <text class="tag-main-text">【{{ item.name }}】</text>
            <text v-if="item.hint" class="tag-sub-hint">{{ item.hint }}</text>
          </view>
        </view>
      </view>
    </view>
    <view v-else class="review-greeting">
      <text>晨起清心 · 静默深呼吸，抽取今日觉察卡</text>
    </view>

    <!-- 灵境主台核心卡牌展示台 (升级市面上主流抽卡弹窗体验) -->
    <view class="altar-stage">
      <!-- 未抽卡状态：灵境原石卡背与呼吸法阵光晕 -->
      <view
        v-if="!hasDrawnCard"
        class="altar-card-box altar-card-back gold-border-subtle"
        hover-class="altar-card-hover"
        @click="triggerDraw"
      >
        <image
          class="altar-card-img"
          :src="tarotStore.cardBackUrl || '/static/tarot/back.jpg'"
          mode="aspectFill"
        />
        <view class="altar-rune-seal">
          <text class="rune-icon">✦</text>
          <text class="rune-text">ISHTAR TAROT</text>
          <text class="rune-icon">✦</text>
        </view>
        <view class="altar-hint-pill">
          <text class="altar-hand">🔮</text>
          <text class="altar-hint-text">轻触开启灵境抽卡</text>
        </view>
      </view>

      <!-- 已抽卡状态：霸气典藏卡牌展示 -->
      <view
        v-else
        class="altar-card-box altar-card-front gold-border"
        hover-class="altar-card-hover"
        @click="openGachaShowcase"
      >
        <image
          class="altar-card-img"
          :src="displayCard?.imageLarge || displayCard?.image"
          mode="aspectFill"
        />
        <view class="altar-card-top">
          <text class="altar-roman">{{ displayCard?.roman || ('#' + displayCard?.index) }}</text>
          <text class="altar-orientation">{{ displayCard?.orientationName || '正位' }}</text>
        </view>
        <view class="altar-card-bottom">
          <text class="altar-name">{{ displayCard?.nameCn }}</text>
          <view class="altar-tags">
            <text v-for="t in (displayCard?.tags || []).slice(0, 3)" :key="t" class="altar-tag-item">
              {{ t }}
            </text>
          </view>
          <view class="altar-preview-badge">
            <text class="preview-spark">✨</text>
            <text class="preview-label">轻触体验 3D 全息特写</text>
          </view>
        </view>
      </view>

      <view class="stage-hint">
        <text class="hint-label">
          {{ hasDrawnCard ? '✦ 牌面已唤醒 · 点击卡片体验全屏全息特效 ✦' : '✦ 轻触卡牌或点击下方开启潜意识召唤 ✦' }}
        </text>
      </view>
    </view>

    <!-- 底部操作按钮栏 -->
    <view class="bottom-actions">
      <button
        v-if="!hasDrawnCard"
        class="btn-draw"
        :loading="isLoading"
        :disabled="isLoading"
        @click="triggerDraw"
      >
        <text class="btn-symbol">🔮</text>
        <text>开始洗牌与抽牌</text>
      </button>

      <view v-else class="action-grid">
        <view class="btn-reset" hover-class="btn-reset-hover" @click="handleReDrawClick">
          <text>重新抽牌</text>
        </view>
        <view class="btn-view" hover-class="btn-view-hover" @click="goToResult">
          <text>查看解读报告</text>
          <text class="btn-arrow">→</text>
        </view>
      </view>
    </view>

    <!-- 主流游戏级抽卡弹窗 (破茧迸发、万丈光芒与3D全息交互) -->
    <GachaRevealModal
      v-model:visible="showGachaModal"
      :card="tarotStore.currentCard"
      :cardBackUrl="tarotStore.cardBackUrl"
      :isLoading="isLoading"
      @view-result="goToResult"
      @close="handleModalClose"
    />

    <!-- 能量充盈弹窗 -->
    <EnergyModal
      v-model:visible="showEnergyModal"
      @success="handleEnergySuccess"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow, onShareAppMessage } from '@dcloudio/uni-app';
import { useUserStore } from '../../stores/user';
import { useTarotStore } from '../../stores/tarot';
import { apiGetMindTags, type MindTagItem } from '../../api/tarot';
import EnergyModal from '../../components/EnergyModal.vue';
import GachaRevealModal from '../../components/GachaRevealModal.vue';
import type { TarotCard } from '../../types';

const userStore = useUserStore();
const tarotStore = useTarotStore();

const userQuestion = ref('');
const periodName = ref('当下');
const currentGreeting = ref('');
const isRefreshingTags = ref(false);
const selectedTagName = ref('');

// 本地离线高质感心理学初始心绪池 (保障首屏秒开无任何白屏/闪烁)
const currentMindTags = ref<MindTagItem[]>([
  {
    name: '职场瓶颈',
    hint: '突破平台期',
    prompt: '当前职业发展陷入平台期或迷茫，希望发现隐藏的突破契机与资源',
    category: '职场发展'
  },
  {
    name: '人际沟通',
    hint: '化解关系张力',
    prompt: '面对复杂微妙的合作与人际沟通，希望看清认知盲区与平衡之道',
    category: '人际互动'
  },
  {
    name: '情绪内耗',
    hint: '中止无序自耗',
    prompt: '工作推进中感到疲惫与精神内耗，希望找寻能量回血的关键切入点',
    category: '情绪调适'
  },
  {
    name: '亲密关系',
    hint: '探察真实联结',
    prompt: '在亲密关系中感到隐秘的不安或隔阂，希望看见彼此真实的心理联结',
    category: '亲密情感'
  }
]);

const isCardFlipped = ref(false);
const isShuffling = ref(false);
const isLoading = ref(false);
const isVibrating = ref(false);
const showEnergyModal = ref(false);
const showGachaModal = ref(false);

const displayCard = computed<TarotCard | null>(() => {
  return tarotStore.currentCard;
});

// 是否已经抽取了卡牌并在主台呈现
const hasDrawnCard = computed(() => {
  return isCardFlipped.value && Boolean(tarotStore.currentCard);
});

const triggerHaptic = () => {
  // 模拟触感轻微震动
  isVibrating.value = true;
  setTimeout(() => {
    isVibrating.value = false;
  }, 200);

  try {
    uni.vibrateShort({
      // @ts-ignore
      type: 'light'
    });
  } catch {
    // ignore
  }
};

/**
 * 获取当下时辰的动态大数据/AI 推荐心绪标签
 */
const fetchDynamicMindTags = async (isManualRefresh = false) => {
  if (isRefreshingTags.value) return;
  isRefreshingTags.value = true;
  if (isManualRefresh) triggerHaptic();

  try {
    const exclude = isManualRefresh ? currentMindTags.value.map((t) => t.name) : [];
    const res = await apiGetMindTags(exclude);
    if (res && res.tags && res.tags.length > 0) {
      currentMindTags.value = res.tags;
      periodName.value = res.periodName || '时辰';
      currentGreeting.value = res.greeting || '';
    }
  } catch (e) {
    console.warn('[fetchDynamicMindTags fallback to local cache]', e);
  } finally {
    setTimeout(() => {
      isRefreshingTags.value = false;
    }, 300);
  }
};

const handleRefreshTags = () => {
  fetchDynamicMindTags(true);
};

const selectMindTag = (item: MindTagItem) => {
  selectedTagName.value = item.name;
  userQuestion.value = item.prompt;
  triggerHaptic();
};

onShow(() => {
  if (userStore.isLoggedIn) {
    userStore.fetchProfile().catch(() => {});
  }
  tarotStore.fetchCardBackResource().catch(() => {});
  fetchDynamicMindTags(false).catch(() => {});

  if (tarotStore.currentCard) {
    isCardFlipped.value = true;
  }
});

const handleEnergyClick = () => {
  if (userStore.totalEnergy <= 0) {
    showEnergyModal.value = true;
  } else {
    const remainFree = userStore.freeEnergyAvailable;
    const bonus = userStore.bonusEnergy;
    let tip = `今日免费灵感剩余 ${remainFree}/${userStore.dailyFreeLimit} 点`;
    if (bonus > 0) {
      tip += `（额外奖励点: +${bonus}）`;
    }
    uni.showToast({
      title: tip,
      icon: 'none'
    });
  }
};

/**
 * 抽牌核心交互：拉起主流游戏级震撼抽卡弹窗
 */
const triggerDraw = async () => {
  if (isLoading.value) return;

  // 1. 能量检查拦截 (PRD 2.2)
  if (userStore.totalEnergy <= 0) {
    showEnergyModal.value = true;
    triggerHaptic();
    return;
  }

  // 2. 立即拉起全屏抽卡仪式弹窗 (进入蓄势共鸣)
  showGachaModal.value = true;
  isLoading.value = true;
  triggerHaptic();

  try {
    // 真实发起后台抽牌请求并扣除能量
    await tarotStore.drawCard(userQuestion.value);
    isCardFlipped.value = true;
    isLoading.value = false;
  } catch (err: any) {
    isLoading.value = false;
    showGachaModal.value = false;
    if (err.message && err.message.includes('消耗完毕')) {
      showEnergyModal.value = true;
    } else {
      uni.showToast({
        title: err.message || '抽牌遇到问题，请重试',
        icon: 'none'
      });
    }
  }
};

// 点击已抽取的卡牌，重新拉起全屏全息特写
const openGachaShowcase = () => {
  triggerHaptic();
  showGachaModal.value = true;
};

// 主台点击重新抽牌
const handleReDrawClick = () => {
  if (userStore.totalEnergy <= 0) {
    showEnergyModal.value = true;
    triggerHaptic();
    return;
  }
  triggerDraw();
};

const handleModalClose = () => {
  showGachaModal.value = false;
};

const goToResult = () => {
  triggerHaptic();
  showGachaModal.value = false;
  const rid = tarotStore.currentReadingId || uni.getStorageSync('last_reading_id') || '';
  uni.navigateTo({
    url: `/pages/reading/result${rid ? `?id=${rid}` : ''}`
  });
};

const handleEnergySuccess = () => {
  uni.showToast({
    title: '✨ 灵感点已恢复，可以开始抽牌',
    icon: 'none'
  });
};

// 裂变分享自定义 (PRD 2.4)
onShareAppMessage(() => {
  const cardName = tarotStore.currentCard?.nameCn || '命运之轮';
  const uid = userStore.userId || '';
  return {
    title: `我在心芒灵境抽取了【${cardName}】，来看看你的今日潜意识灵感`,
    path: `/pages/index/index?inviter_id=${uid}`,
    imageUrl: tarotStore.currentCard?.image || tarotStore.cardBackUrl || ''
  };
});
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 24rpx 32rpx;
  box-sizing: border-box;
  justify-content: space-between;
}

/* 顶部能量状态条 */
.header-energy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.energy-pill {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 28rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 500;
  transition: all 0.3s;
}

.energy-pill-active {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fde047;
}

.energy-pill-empty {
  background: rgba(136, 19, 55, 0.4);
  border: 1px solid rgba(159, 18, 57, 0.6);
  color: #fda4af;
}

.energy-icon {
  font-size: 24rpx;
}

.energy-text {
  font-size: 24rpx;
}

.energy-num {
  font-weight: 700;
  color: #ffffff;
}

.archetype-tag {
  display: flex;
  align-items: center;
  font-size: 22rpx;
  color: #fde047;
  background: rgba(30, 27, 75, 0.6);
  padding: 6rpx 20rpx 6rpx 14rpx;
  border-radius: 999rpx;
  border: 1px solid rgba(212, 175, 55, 0.35);
}

.brand-logo-mini {
  width: 28rpx;
  height: 28rpx;
  border-radius: 6rpx;
  margin-right: 10rpx;
}

.review-tag {
  font-size: 22rpx;
  color: #fde047;
  background: rgba(245, 158, 11, 0.15);
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

/* 意念/困惑输入卡片 */
.question-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 22rpx;
  color: #cbd5e1;
  margin-bottom: 16rpx;
}

.char-count {
  font-size: 20rpx;
  color: #64748b;
  font-family: monospace;
}

.question-input {
  width: 100%;
  height: 72rpx;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 20rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  color: #fef08a;
  box-sizing: border-box;
}

.placeholder-style {
  color: #64748b;
  font-size: 24rpx;
}

.tag-section {
  margin-top: 18rpx;
}

.tag-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14rpx;
}

.tag-hint-label {
  font-size: 20rpx;
  color: #94a3b8;
  letter-spacing: 0.5rpx;
}

.btn-refresh-tags {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  font-size: 20rpx;
  color: #fde047;
  transition: all 0.2s ease;
}

.btn-refresh-tags:active {
  transform: scale(0.95);
  background: rgba(245, 158, 11, 0.2);
}

.refresh-icon {
  font-size: 20rpx;
}

.refreshing-spin .refresh-icon {
  animation: tagSpin 0.6s linear infinite;
}

@keyframes tagSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.preset-tag {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 22rpx;
  padding: 8rpx 16rpx;
  border-radius: 14rpx;
  background: rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
}

.tag-main-text {
  font-size: 22rpx;
}

.tag-sub-hint {
  font-size: 18rpx;
  color: #94a3b8;
  opacity: 0.85;
}

.preset-tag-selected {
  background: rgba(245, 158, 11, 0.22);
  color: #fef08a;
  border-color: rgba(245, 158, 11, 0.55);
  box-shadow: 0 0 12rpx rgba(245, 158, 11, 0.2);
}

.preset-tag-selected .tag-sub-hint {
  color: #fde047;
}

.review-greeting {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24rpx;
  padding: 24rpx;
  text-align: center;
  font-size: 26rpx;
  color: #fef08a;
  margin-bottom: 24rpx;
}

/* 灵境主台核心展示舞台 (升级主流卡牌台与仪式感) */
.altar-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0;
  position: relative;
}

.altar-card-box {
  width: 380rpx;
  height: 570rpx;
  border-radius: 36rpx;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  background: #0d0a21;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease;
}

.altar-card-hover {
  transform: scale(0.97) translateY(4rpx);
}

.altar-card-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* 未抽卡：神秘悬浮卡背 */
.altar-card-back {
  border: 2rpx solid rgba(253, 224, 71, 0.45);
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.8), 0 0 30rpx rgba(245, 158, 11, 0.25);
  animation: altarFloat 3.6s ease-in-out infinite;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 16rpx;
}

@keyframes altarFloat {
  0% { transform: translateY(0); }
  50% { transform: translateY(-12rpx); }
  100% { transform: translateY(0); }
}

.altar-rune-seal {
  position: relative;
  z-index: 2;
  margin-top: 20rpx;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(253, 224, 71, 0.4);
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
}

.rune-icon {
  font-size: 20rpx;
  color: #fde047;
}

.rune-text {
  font-size: 20rpx;
  font-weight: 600;
  color: #fef08a;
  letter-spacing: 3rpx;
}

.altar-hint-pill {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(253, 224, 71, 0.45);
  border-radius: 999rpx;
  padding: 10rpx 24rpx;
  box-shadow: 0 0 16rpx rgba(245, 158, 11, 0.35);
  animation: pulseHint 2s infinite ease-in-out;
}

@keyframes pulseHint {
  0% { transform: scale(0.96); }
  50% { transform: scale(1.04); }
  100% { transform: scale(0.96); }
}

.altar-hand {
  font-size: 22rpx;
}

.altar-hint-text {
  font-size: 22rpx;
  color: #fde047;
  font-weight: 600;
}

/* 已抽卡：典藏正面展示 */
.altar-card-front {
  border: 2rpx solid #fde047;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.8), 0 0 40rpx rgba(245, 158, 11, 0.4);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.altar-card-top {
  position: relative;
  z-index: 2;
  padding: 16rpx 20rpx;
  background: linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.altar-roman {
  font-size: 20rpx;
  color: #fde047;
  font-family: serif;
  background: rgba(0,0,0,0.5);
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  border: 1px solid rgba(212, 175, 55, 0.3);
}

.altar-orientation {
  font-size: 20rpx;
  color: #fef08a;
  background: rgba(245, 158, 11, 0.3);
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.altar-card-bottom {
  position: relative;
  z-index: 2;
  padding: 20rpx 16rpx 16rpx 16rpx;
  background: linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 65%, transparent 100%);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.altar-name {
  font-size: 32rpx;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 2rpx;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.8);
}

.altar-tags {
  display: flex;
  justify-content: center;
  gap: 8rpx;
  flex-wrap: wrap;
}

.altar-tag-item {
  font-size: 18rpx;
  color: #fef08a;
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.35);
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
}

.altar-preview-badge {
  margin-top: 6rpx;
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(253, 224, 71, 0.3);
  border-radius: 999rpx;
  padding: 4rpx 18rpx;
}

.preview-spark {
  font-size: 18rpx;
}

.preview-label {
  font-size: 20rpx;
  color: #cbd5e1;
}

.card-quote {
  font-size: 22rpx;
  color: #e2e8f0;
  font-style: italic;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.stage-hint {
  margin-top: 24rpx;
}

.hint-label {
  font-size: 22rpx;
  color: #94a3b8;
}

/* 底部操作 */
.bottom-actions {
  width: 100%;
  box-sizing: border-box;
  padding-top: 16rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom, 12rpx));
}

.btn-draw {
  width: 100% !important;
  max-width: 100% !important;
  height: 84rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #fde047 0%, #eab308 50%, #ca8a04 100%);
  color: #0b0c1b;
  font-size: 26rpx;
  font-weight: 700;
  display: flex !important;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 8rpx 24rpx rgba(234, 179, 8, 0.3);
  border: none !important;
  margin: 0 !important;
  box-sizing: border-box !important;
  transition: all 0.2s;
}

.btn-draw:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 14rpx rgba(234, 179, 8, 0.2);
}

.btn-symbol {
  font-size: 28rpx;
}

/* 微信小程序端高保真原型：grid grid-cols-2 gap-2 两等列左右撑满 */
.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  width: 100%;
  box-sizing: border-box;
}

.btn-reset,
.btn-view {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  margin: 0 !important;
  padding: 0 10rpx !important;
  box-sizing: border-box !important;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex !important;
  align-items: center;
  justify-content: center;
  line-height: normal !important;
}

.btn-draw::after,
.btn-reset::after,
.btn-view::after {
  border: none !important;
  display: none !important;
}

.btn-reset {
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
  font-size: 24rpx;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-reset:active {
  background: rgba(255, 255, 255, 0.18) !important;
}

.btn-view {
  background: linear-gradient(90deg, #4f46e5 0%, #f59e0b 100%) !important;
  color: #ffffff !important;
  font-size: 24rpx;
  font-weight: 700;
  border: none !important;
  box-shadow: 0 4rpx 14rpx rgba(79, 70, 229, 0.35);
  display: flex !important;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  transition: all 0.2s;
}

.btn-view:active {
  opacity: 0.9;
}

.btn-arrow {
  font-size: 22rpx;
  margin-left: 4rpx;
}
</style>
