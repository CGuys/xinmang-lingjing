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

    <!-- 结构化 AI 流式解读内容区 (参考高保真原型实现，采用标准 flex 纵向滚动容器，彻底杜绝 iOS 微信 scroll-view 塌陷空白) -->
    <view class="reading-scroll-area">
      <!-- 异常状态提示（仅在出错时轻量提示） -->
      <view class="stream-error-card" v-if="tarotStore.streamError">
        <text class="error-icon">💡</text>
        <view class="error-info">
          <text class="error-title">AI 解读链路提示</text>
          <text class="error-desc">{{ tarotStore.streamError }}</text>
        </view>
        <button class="btn-retry" @click="handleRetryStream">重新解读</button>
      </view>

      <view class="reading-blocks">
        <!-- 1. 核心能量定调 -->
        <view class="insight-block">
          <view class="block-header text-amber">
            <text class="header-icon">🧭</text>
            <text class="header-title">核心能量定调</text>
            <text class="header-tag">TAG</text>
          </view>
          <text class="block-content font-serif text-gold-bold">
            {{ currentInsight.category }}
          </text>
        </view>

        <!-- 2. 潜意识意象投射 -->
        <view class="insight-block">
          <view class="block-header text-indigo">
            <text class="header-icon">🧠</text>
            <text class="header-title">潜意识意象投射</text>
            <text class="header-tag">PROJECTION</text>
          </view>
          <view class="block-content text-slate">
            <text>{{ currentInsight.insight }}</text>
            <text v-if="tarotStore.isStreaming" class="cursor-blink">|</text>
          </view>
        </view>

        <!-- 3. 思维盲区与转念 -->
        <view class="insight-block">
          <view class="block-header text-rose">
            <text class="header-icon">👁️</text>
            <text class="header-title">思维盲区与转念</text>
            <text class="header-tag">BLINDSPOT</text>
          </view>
          <view class="block-content text-slate">
            <text>{{ currentInsight.challenge }}</text>
          </view>
        </view>

        <!-- 4. 今日正念行动建议 -->
        <view class="insight-block">
          <view class="block-header text-teal">
            <text class="header-icon">🌱</text>
            <text class="header-title">今日正念行动建议</text>
            <text class="header-tag">ACTION</text>
          </view>
          <view class="block-content text-slate">
            <text>{{ currentInsight.guidance }}</text>
          </view>
        </view>

        <!-- 5. 赋能金句 -->
        <view class="affirmation-card">
          <text class="affirmation-text font-serif">
            “{{ currentInsight.affirmation }}”
          </text>
        </view>
      </view>
    </view>

    <!-- 底部操作按钮 -->
    <view class="bottom-bar">
      <view class="btn-save" hover-class="btn-save-hover" @click="handleSaveArchive">
        <text class="btn-icon">🔖</text>
        <text>已保存至回响</text>
      </view>

      <view class="btn-poster" hover-class="btn-poster-hover" @click="goToPoster">
        <text class="btn-icon">🖼️</text>
        <text>生成朋友圈海报</text>
      </view>
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

const currentInsight = computed(() => {
  const si = tarotStore.structuredInsight;
  const c = card.value;
  return {
    category: si.category || (c ? `【${c.categoryName || c.category || '潜意识投射'} · ${c.element || 'INTUITION'}】` : '【潜意识投射】'),
    insight: si.insight || (tarotStore.streamingRawText && !si.category ? tarotStore.streamingRawText : (c?.insight || '正在感知卡牌意象对当下的心理投射与直觉共鸣...')),
    challenge: si.challenge || (c?.challenge || '觉察当下认知中的固着与盲区，转换全新的觉察视角。'),
    guidance: si.guidance || (c?.guidance || '在今日的日常中保留片刻留白，保持温和深呼吸与向内觉察。'),
    affirmation: si.affirmation || (c?.quote || c?.affirmation || '穿透内心的迷雾，接纳潜意识深处的潮汐。')
  };
});

onLoad(async (options: any) => {
  const readingId = options?.id || tarotStore.currentReadingId || uni.getStorageSync('last_reading_id');
  if (readingId) {
    tarotStore.currentReadingId = readingId;
  }

  // 1. 如果没有卡片数据，拉取卡片详情
  if (!tarotStore.currentCard) {
    isLoadingData.value = true;
    await tarotStore.fetchReading(readingId);
    isLoadingData.value = false;
  }

  // 2. 如果已经拥有完整解读数据且已推流结束，无需重复推流
  if (hasAnyInsight.value && tarotStore.isStreamDone) {
    return;
  }

  // 3. 立即启动流式解读推流
  if (readingId && !tarotStore.isStreamDone && !tarotStore.isStreaming) {
    tarotStore.startStreamingReading(readingId).catch(async (err) => {
      console.warn('[Stream Error]', err);
      await tarotStore.fetchReading(readingId);
    });
  }
});

onMounted(() => {
  // 设置网络兜底同步，防止微信 iOS 客户端环境分块未及时分发或丢帧
  fallbackTimer = setTimeout(async () => {
    if (!hasAnyInsight.value && tarotStore.currentReadingId && !tarotStore.streamError) {
      await tarotStore.fetchReading(tarotStore.currentReadingId);
    }
  }, 1800);
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
  height: 100vh;
  height: 100dvh;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom, 20px));
  box-sizing: border-box;
  background-color: #070913;
  color: #ffffff;
  overflow: hidden;
}

/* 顶部卡牌概览卡片 */
.card-summary-card {
  flex-shrink: 0;
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

/* 解读滚动区：采用标准弹性滚动容器，在 iOS / WebKit / Android 下均 100% 顺畅滚动且不塌陷 */
.reading-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 20rpx;
}

.reading-blocks {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding-bottom: 24rpx;
}

/* 异常提示卡片 */
.stream-error-card {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 20rpx;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.error-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.error-icon {
  font-size: 36rpx;
}

.error-title {
  font-size: 24rpx;
  font-weight: 700;
  color: #fca5a5;
}

.error-desc {
  font-size: 22rpx;
  color: #cbd5e1;
  line-height: 1.4;
}

.btn-retry {
  padding: 0 24rpx;
  height: 52rpx;
  line-height: 52rpx;
  border-radius: 999rpx;
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: #fde047;
  font-size: 20rpx;
  font-weight: 600;
  margin: 0;
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

.bottom-bar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom, 10rpx));
}

.btn-save,
.btn-poster {
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
  gap: 12rpx;
  line-height: normal !important;
}

.btn-save::after,
.btn-poster::after {
  border: none !important;
  display: none !important;
}

.btn-save {
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
  font-size: 24rpx;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-save-hover,
.btn-save:active {
  background: rgba(255, 255, 255, 0.18) !important;
}

.btn-poster {
  background: linear-gradient(135deg, #fde047 0%, #eab308 50%, #ca8a04 100%) !important;
  color: #0b0c1b !important;
  font-size: 24rpx;
  font-weight: 700;
  border: none !important;
  box-shadow: 0 8rpx 24rpx rgba(234, 179, 8, 0.35);
  transition: all 0.2s;
}

.btn-poster-hover,
.btn-poster:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 12rpx rgba(234, 179, 8, 0.2);
}

.btn-icon {
  font-size: 28rpx;
}
</style>
