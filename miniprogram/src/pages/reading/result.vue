<template>
  <view class="result-container">
    <!-- 顶部卡牌概览徽章 -->
    <view class="card-summary-card" v-if="card">
      <view class="summary-left">
        <view class="thumb-box gold-border-subtle">
          <image
            class="thumb-img"
            :src="card.imageLarge || card.image"
            mode="aspectFill"
          />
        </view>
        <view class="meta-box">
          <view class="name-row">
            <text class="roman-tag">{{ card.roman || ('#' + card.index) }}</text>
            <text class="name-cn">{{ card.nameCn }}</text>
            <text class="orientation-badge">{{ card.orientationName || '正位' }}</text>
          </view>
          <text class="name-en">{{ card.nameEn }} · {{ card.element || card.categoryName || '潜意识' }}</text>
          <view class="tags-row">
            <text v-for="t in (card.tags || [])" :key="t" class="tag-pill">{{ t }}</text>
          </view>
        </view>
      </view>

      <view class="re-draw-btn" @click="handleReDraw">
        <text class="re-draw-text">重新抽牌</text>
      </view>
    </view>

    <!-- 结构化 AI 流式解读内容区：仅当 AI 真实输出各板块时才展示，彻底杜绝默认和 Mock 数据 -->
    <scroll-view class="reading-scroll-view" scroll-y>
      <!-- 大模型刚开始推流且尚未产出首段文字时的神秘光晕呼吸态（永不白屏） -->
      <view
        class="ai-loading-box"
        v-if="!hasAnyInsight && !tarotStore.streamError"
      >
        <view class="sparkle-orbit">✦</view>
        <text class="ai-loading-text">正在与潜意识建立共时性共鸣，AI 正在深度推流解读...</text>
      </view>

      <!-- 异常状态提示：未成功绝不扣除次数，提示用户并提供重新解读 -->
      <view class="stream-error-card" v-if="tarotStore.streamError">
        <text class="error-icon">💡</text>
        <text class="error-title">AI 解读链路提示</text>
        <text class="error-desc">{{ tarotStore.streamError }}</text>
        <button class="btn-retry" @click="handleRetryStream">重新解读</button>
      </view>

      <view class="reading-blocks" v-if="hasAnyInsight">
        <!-- 1. 核心能量定调：仅当 AI 吐出定调词后才展示 -->
        <view class="insight-block" v-if="tarotStore.structuredInsight.category">
          <view class="block-header text-amber">
            <text class="header-icon">🧭</text>
            <text class="header-title">核心能量定调</text>
            <text class="header-tag">TAG</text>
          </view>
          <text class="block-content font-serif text-gold-bold">
            【{{ tarotStore.structuredInsight.category }}】
          </text>
        </view>

        <!-- 2. 潜意识意象投射：仅当该部分正在输出或已有内容时显示 -->
        <view
          class="insight-block"
          v-if="tarotStore.structuredInsight.insight || (tarotStore.isStreaming && tarotStore.currentActiveSection === 'insight')"
        >
          <view class="block-header text-indigo">
            <text class="header-icon">🧠</text>
            <text class="header-title">潜意识意象投射</text>
            <text class="header-tag">PROJECTION</text>
          </view>
          <view class="block-content text-slate">
            <text>{{ tarotStore.structuredInsight.insight }}</text>
            <text v-if="tarotStore.isStreaming && tarotStore.currentActiveSection === 'insight'" class="cursor-blink">|</text>
          </view>
        </view>

        <!-- 3. 思维盲区与转念：仅当该部分正在输出或已有内容时显示 -->
        <view
          class="insight-block"
          v-if="tarotStore.structuredInsight.challenge || (tarotStore.isStreaming && tarotStore.currentActiveSection === 'challenge')"
        >
          <view class="block-header text-rose">
            <text class="header-icon">👁️</text>
            <text class="header-title">思维盲区与转念</text>
            <text class="header-tag">BLINDSPOT</text>
          </view>
          <view class="block-content text-slate">
            <text>{{ tarotStore.structuredInsight.challenge }}</text>
            <text v-if="tarotStore.isStreaming && tarotStore.currentActiveSection === 'challenge'" class="cursor-blink">|</text>
          </view>
        </view>

        <!-- 4. 今日正念行动建议：仅当该部分正在输出或已有内容时显示 -->
        <view
          class="insight-block"
          v-if="tarotStore.structuredInsight.guidance || (tarotStore.isStreaming && tarotStore.currentActiveSection === 'guidance')"
        >
          <view class="block-header text-teal">
            <text class="header-icon">🌱</text>
            <text class="header-title">今日正念行动建议</text>
            <text class="header-tag">ACTION</text>
          </view>
          <view class="block-content text-slate">
            <text>{{ tarotStore.structuredInsight.guidance }}</text>
            <text v-if="tarotStore.isStreaming && tarotStore.currentActiveSection === 'guidance'" class="cursor-blink">|</text>
          </view>
        </view>

        <!-- 5. 赋能金句：仅当 AI 吐出金句后才展示 -->
        <view class="affirmation-card" v-if="tarotStore.structuredInsight.affirmation">
          <text class="affirmation-text font-serif">
            “{{ tarotStore.structuredInsight.affirmation }}”
          </text>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作按钮 -->
    <view class="bottom-bar">
      <button class="btn-save" @click="handleSaveArchive">
        <text class="btn-icon">🔖</text>
        <text>已保存至回响</text>
      </button>

      <button class="btn-poster" @click="goToPoster">
        <text class="btn-icon">🖼️</text>
        <text>生成朋友圈海报</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { useTarotStore } from '../../stores/tarot';
import { useUserStore } from '../../stores/user';
import type { TarotCard } from '../../types';

const tarotStore = useTarotStore();
const userStore = useUserStore();
const isLoadingData = ref(false);
let fallbackTimer: any = null;

const card = computed<TarotCard | null>(() => {
  return tarotStore.currentCard;
});

const hasAnyInsight = computed(() => {
  const i = tarotStore.structuredInsight;
  return Boolean(i.category || i.insight || i.challenge || i.guidance || i.affirmation);
});

onLoad(async (options: any) => {
  const readingId = options?.id || tarotStore.currentReadingId || uni.getStorageSync('last_reading_id');
  if (readingId) {
    tarotStore.currentReadingId = readingId;
  }

  // 1. 如果没有卡片数据或没有解读内容，优先发起拉取
  if (!tarotStore.currentCard || !hasAnyInsight.value) {
    isLoadingData.value = true;
    await tarotStore.fetchReading(readingId);
    isLoadingData.value = false;
  }

  // 2. 如果已经拥有解读数据，无需重新推流
  if (hasAnyInsight.value) {
    return;
  }

  // 3. 启动流式解读推流
  if (readingId && !tarotStore.isStreamDone && !tarotStore.isStreaming) {
    tarotStore.startStreamingReading(readingId).catch(async (err) => {
      console.warn('[Stream Error]', err);
      await tarotStore.fetchReading(readingId);
    });
  }
});

onMounted(() => {
  // 设置 3.5 秒网络兜底同步，防止微信 iOS 客户端环境分块未及时分发
  fallbackTimer = setTimeout(async () => {
    if (!hasAnyInsight.value && tarotStore.currentReadingId && !tarotStore.streamError) {
      await tarotStore.fetchReading(tarotStore.currentReadingId);
    }
  }, 3500);
});

onUnmounted(() => {
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }
  tarotStore.stopStreaming();
});

const handleRetryStream = () => {
  tarotStore.startStreamingReading().catch(async () => {
    await tarotStore.fetchReading();
  });
};

const handleReDraw = () => {
  uni.navigateBack({
    fail: () => {
      uni.switchTab({ url: '/pages/index/index' });
    }
  });
};

const handleSaveArchive = () => {
  uni.showToast({
    title: '已自动归档至【往日回响】',
    icon: 'success'
  });
};

const goToPoster = () => {
  uni.navigateTo({
    url: '/pages/poster/view'
  });
};

onShareAppMessage(() => {
  const cName = card.value?.nameCn || '灵境卡牌';
  const uid = userStore.userId || '';
  return {
    title: `我在心芒灵境抽取了【${cName}】，来看看你的今日潜意识灵感`,
    path: `/pages/index/index?inviter_id=${uid}`,
    imageUrl: card.value?.imageLarge || card.value?.image || ''
  };
});
</script>

<style scoped>
.result-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 24rpx 32rpx;
  box-sizing: border-box;
  background-color: #070913;
  color: #ffffff;
}

/* 顶部卡牌概览卡片 */
.card-summary-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 28rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
  backdrop-filter: blur(10px);
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.thumb-box {
  width: 90rpx;
  height: 130rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background: #000;
  border: 1px solid rgba(212, 175, 55, 0.4);
}

.thumb-img {
  width: 100%;
  height: 100%;
}

.meta-box {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.roman-tag {
  font-family: serif;
  font-size: 24rpx;
  color: #fde047;
}

.name-cn {
  font-size: 32rpx;
  font-weight: 700;
  color: #ffffff;
}

.orientation-badge {
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: rgba(245, 158, 11, 0.2);
  color: #fde047;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.name-en {
  font-size: 20rpx;
  color: #94a3b8;
}

.tags-row {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
  margin-top: 4rpx;
}

.tag-pill {
  font-size: 18rpx;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
}

.re-draw-btn {
  padding: 12rpx 20rpx;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 999rpx;
}

.re-draw-text {
  font-size: 22rpx;
  color: #cbd5e1;
}

/* 解读滚动区 */
.reading-scroll-view {
  flex: 1;
  height: 0;
  margin-bottom: 24rpx;
}

.reading-blocks {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding-bottom: 20rpx;
}

/* 大模型刚连接时的呼吸光晕提示 */
.ai-loading-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
  background: rgba(99, 102, 241, 0.05);
  border: 1px dashed rgba(99, 102, 241, 0.25);
  border-radius: 28rpx;
  gap: 24rpx;
  margin-top: 40rpx;
}

.sparkle-orbit {
  font-size: 40rpx;
  color: #fde047;
  animation: spin 3s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg) scale(0.9); opacity: 0.7; }
  50% { transform: rotate(180deg) scale(1.2); opacity: 1; }
  100% { transform: rotate(360deg) scale(0.9); opacity: 0.7; }
}

.ai-loading-text {
  font-size: 24rpx;
  color: #a5b4fc;
  text-align: center;
  line-height: 1.6;
}

/* 异常提示卡片 */
.stream-error-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 32rpx;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 28rpx;
  gap: 16rpx;
  text-align: center;
  margin: 30rpx 0;
}

.error-icon {
  font-size: 48rpx;
}

.error-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #fca5a5;
}

.error-desc {
  font-size: 24rpx;
  color: #cbd5e1;
  line-height: 1.5;
}

.btn-retry {
  margin-top: 10rpx;
  padding: 0 40rpx;
  height: 68rpx;
  line-height: 68rpx;
  border-radius: 999rpx;
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: #fde047;
  font-size: 24rpx;
  font-weight: 600;
}

/* 5大板块通用卡片 */
.insight-block {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 28rpx;
  padding: 24rpx 28rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10rpx); }
  to { opacity: 1; transform: translateY(0); }
}

.block-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 10rpx;
}

.header-icon {
  font-size: 26rpx;
}

.header-title {
  font-size: 26rpx;
  font-weight: 700;
  flex: 1;
}

.header-tag {
  font-size: 18rpx;
  font-family: monospace;
  color: #64748b;
}

.text-amber { color: #fde047; }
.text-indigo { color: #a5b4fc; }
.text-rose { color: #fca5a5; }
.text-teal { color: #5eead4; }

.block-content {
  font-size: 26rpx;
  line-height: 1.65;
}

.text-gold-bold {
  color: #fef08a;
  font-weight: 700;
  font-size: 28rpx;
}

.text-slate {
  color: #cbd5e1;
}

.cursor-blink {
  color: #fde047;
  font-weight: 700;
  margin-left: 4rpx;
  animation: blink 0.8s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.affirmation-card {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 28rpx;
  padding: 24rpx;
  text-align: center;
  animation: fadeIn 0.4s ease-out;
}

.affirmation-text {
  font-size: 26rpx;
  color: #fef08a;
  font-style: italic;
  line-height: 1.6;
}

/* 底部操作条 */
.bottom-bar {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 20rpx;
  flex-shrink: 0;
  padding-bottom: 20rpx;
}

.btn-save {
  height: 90rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
  font-size: 26rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}

.btn-poster {
  height: 90rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #fde047 0%, #eab308 50%, #ca8a04 100%);
  color: #0b0c1b;
  font-size: 28rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  box-shadow: 0 8rpx 24rpx rgba(234, 179, 8, 0.3);
  border: none;
}

.btn-icon {
  font-size: 28rpx;
}
</style>
