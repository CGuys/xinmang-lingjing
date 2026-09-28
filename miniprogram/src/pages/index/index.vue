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
        <text>荣格潜意识投射</text>
      </view>
    </view>

    <!-- 意念/困惑输入模块 (PRD 2.2) -->
    <view v-if="!userStore.isInReview" class="question-card">
      <view class="question-header">
        <text class="question-title">🪶 输入当下的困惑或心绪：</text>
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
      <!-- 快捷预设标签 -->
      <view class="tag-row">
        <view
          v-for="tag in presetTags"
          :key="tag"
          class="preset-tag"
          :class="{ 'preset-tag-selected': userQuestion.includes(tag) }"
          @click="selectPresetTag(tag)"
        >
          <text>【{{ tag }}】</text>
        </view>
      </view>
    </view>
    <view v-else class="review-greeting">
      <text>晨起清心 · 静默深呼吸，抽取今日觉察卡</text>
    </view>

    <!-- 3D 核心抽牌翻转舞台 (PRD 2.2) -->
    <view class="card-stage perspective-1000">
      <view
        class="card-box transform-style-3d"
        :class="[
          isCardFlipped ? 'rotate-y-180' : '',
          isShuffling ? 'is-shuffling' : ''
        ]"
        @click="handleCardTap"
      >
        <!-- 卡牌背面 (从后台接口加载艺术卡背 OSS 资源) -->
        <view class="card-face card-face-back backface-hidden gold-border">
          <view class="inner-frame">
            <image
              class="card-img"
              :src="tarotStore.cardBackUrl || tarotStore.currentCard?.backImage"
              mode="aspectFill"
            />
            <view class="back-overlay-top">
              <text class="back-title">ISHTAR TAROT</text>
            </view>
            <view class="back-overlay-bottom">
              <view class="hint-badge">
                <text class="hint-icon">👆</text>
                <text class="hint-text">轻触翻转觉察</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 卡牌正面 (使用当前抽出的卡牌后台 OSS 资源) -->
        <view class="card-face card-face-front backface-hidden rotate-y-180 gold-border">
          <view class="inner-frame" v-if="displayCard">
            <!-- 卡牌插画大图 (后台 OSS 直链) -->
            <image
              class="card-img"
              :src="displayCard.image"
              mode="aspectFill"
            />
            <!-- 顶部头衔 -->
            <view class="front-overlay-top">
              <text class="card-roman">{{ displayCard.roman || ('#' + displayCard.index) }}</text>
              <text class="card-name">{{ displayCard.nameCn }}</text>
              <text class="card-orientation">{{ displayCard.orientationName || '正位' }}</text>
            </view>
            <!-- 底部启示 -->
            <view class="front-overlay-bottom">
              <view class="card-tags">
                <text v-for="t in (displayCard.tags || [])" :key="t" class="card-tag-badge">
                  {{ t }}
                </text>
              </view>
              <text class="card-quote">“{{ displayCard.quote }}”</text>
            </view>
          </view>
        </view>
      </view>

      <view class="stage-hint">
        <text class="hint-label">
          {{ isCardFlipped ? '✦ 牌面已呈现 · 点击卡片查看深度解读' : '✦ 轻触卡牌或点击下方开始抽牌' }}
        </text>
      </view>
    </view>

    <!-- 底部操作按钮栏 -->
    <view class="bottom-actions">
      <button
        v-if="!isCardFlipped"
        class="btn-draw"
        :loading="isLoading"
        :disabled="isLoading"
        @click="triggerDraw"
      >
        <text class="btn-symbol">🔮</text>
        <text>开始洗牌与抽牌</text>
      </button>

      <view v-else class="action-grid">
        <button class="btn-reset" @click="resetCardState">
          <text>重置卡牌</text>
        </button>
        <button class="btn-view" @click="goToResult">
          <text>查看解读报告</text>
          <text class="btn-arrow">→</text>
        </button>
      </view>
    </view>

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
import EnergyModal from '../../components/EnergyModal.vue';
import type { TarotCard } from '../../types';

const userStore = useUserStore();
const tarotStore = useTarotStore();

const userQuestion = ref('面临职业转折，不知道是该坚守还是探索新方向...');
const presetTags = ['自我探索', '亲密关系', '职场瓶颈', '今日灵感'];

const isCardFlipped = ref(false);
const isShuffling = ref(false);
const isLoading = ref(false);
const isVibrating = ref(false);
const showEnergyModal = ref(false);

const displayCard = computed<TarotCard | null>(() => {
  return tarotStore.currentCard;
});

onShow(() => {
  if (userStore.isLoggedIn) {
    userStore.fetchProfile().catch(() => {});
  }
  tarotStore.fetchCardBackResource().catch(() => {});
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

const selectPresetTag = (tag: string) => {
  userQuestion.value = `当下面临【${tag}】方面的困惑与选择，希望获得潜意识指引`;
  triggerHaptic();
};

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
 * 抽牌核心交互
 */
const triggerDraw = async () => {
  if (isLoading.value) return;

  // 1. 能量检查拦截 (PRD 2.2)
  if (userStore.totalEnergy <= 0) {
    showEnergyModal.value = true;
    triggerHaptic();
    return;
  }

  isLoading.value = true;
  isCardFlipped.value = false;
  isShuffling.value = true;
  triggerHaptic();

  try {
    // 真实发起后台抽牌请求并扣除能量
    await tarotStore.drawCard(userQuestion.value);

    // 维持洗牌动效约 1 秒
    setTimeout(() => {
      isShuffling.value = false;
      isCardFlipped.value = true;
      isLoading.value = false;
      triggerHaptic();

      if (tarotStore.currentCard) {
        uni.showToast({
          title: `已抽取【${tarotStore.currentCard.nameCn}】`,
          icon: 'none'
        });
      }
    }, 900);
  } catch (err: any) {
    isShuffling.value = false;
    isLoading.value = false;
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

const handleCardTap = () => {
  if (!isCardFlipped.value) {
    triggerDraw();
  } else {
    goToResult();
  }
};

const resetCardState = () => {
  isCardFlipped.value = false;
  triggerHaptic();
};

const goToResult = () => {
  triggerHaptic();
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
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #fde047;
}

.energy-pill-empty {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
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
  font-size: 22rpx;
  color: #c7d2fe;
  background: rgba(99, 102, 241, 0.15);
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  border: 1px solid rgba(99, 102, 241, 0.3);
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
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 32rpx;
  padding: 24rpx;
  backdrop-filter: blur(10px);
  margin-bottom: 24rpx;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 24rpx;
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

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}

.preset-tag {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 14rpx;
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.preset-tag-selected {
  background: rgba(245, 158, 11, 0.25);
  color: #fef08a;
  border-color: rgba(245, 158, 11, 0.5);
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

/* 3D 抽牌舞台 */
.card-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20rpx 0;
}

.card-box {
  width: 380rpx;
  height: 570rpx;
  border-radius: 36rpx;
  position: relative;
  transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 30rpx 70rpx rgba(15, 23, 42, 0.9);
}

.card-face {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 36rpx;
  overflow: hidden;
  box-sizing: border-box;
  padding: 8rpx;
  background: #0d0a21;
}

.inner-frame {
  width: 100%;
  height: 100%;
  border-radius: 28rpx;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(212, 175, 55, 0.4);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.back-overlay-top {
  position: relative;
  z-index: 2;
  text-align: center;
  padding-top: 20rpx;
}

.back-title {
  font-size: 20rpx;
  color: #fef08a;
  letter-spacing: 4rpx;
  background: rgba(0, 0, 0, 0.6);
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  border: 1px solid rgba(212, 175, 55, 0.3);
}

.back-overlay-bottom {
  position: relative;
  z-index: 2;
  text-align: center;
  padding-bottom: 24rpx;
}

.hint-badge {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 999rpx;
  padding: 8rpx 24rpx;
}

.hint-icon {
  font-size: 20rpx;
}

.hint-text {
  font-size: 22rpx;
  color: #fde047;
  font-weight: 500;
}

/* 卡牌正面细节 */
.card-face-front {
  background: #090814;
}

.front-overlay-top {
  position: relative;
  z-index: 2;
  padding: 16rpx 20rpx;
  background: linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 60%, transparent 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-roman {
  font-size: 20rpx;
  color: #fde047;
  font-family: serif;
  background: rgba(0,0,0,0.5);
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  border: 1px solid rgba(212, 175, 55, 0.3);
}

.card-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #ffffff;
}

.card-orientation {
  font-size: 20rpx;
  color: #fef08a;
  background: rgba(245, 158, 11, 0.3);
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.front-overlay-bottom {
  position: relative;
  z-index: 2;
  padding: 20rpx 16rpx;
  background: linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 70%, transparent 100%);
  text-align: center;
}

.card-tags {
  display: flex;
  justify-content: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.card-tag-badge {
  font-size: 18rpx;
  color: #fef08a;
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.35);
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
}

.card-quote {
  font-size: 22rpx;
  color: #e2e8f0;
  font-style: italic;
  display: -webkit-box;
  -webkit-line-clamp: 1;
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
  padding-top: 20rpx;
  padding-bottom: 20rpx;
}

.btn-draw {
  width: 100%;
  height: 92rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #fde047 0%, #eab308 50%, #ca8a04 100%);
  color: #0b0c1b;
  font-size: 30rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 10rpx 30rpx rgba(234, 179, 8, 0.3);
  border: none;
}

.btn-symbol {
  font-size: 32rpx;
}

.action-grid {
  display: grid;
  grid-template-columns: 1fr 1.6fr;
  gap: 20rpx;
}

.btn-reset {
  height: 90rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  font-size: 26rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.btn-view {
  height: 90rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #d97706 100%);
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  box-shadow: 0 8rpx 24rpx rgba(99, 102, 241, 0.3);
  border: none;
}

.btn-arrow {
  font-size: 28rpx;
}
</style>
