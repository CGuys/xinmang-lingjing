<template>
  <view v-if="visible" class="energy-modal-overlay">
    <view class="energy-modal-card">
      <view class="icon-wrap">
        <text class="moon-icon">🌙</text>
      </view>
      <text class="title">今日免费灵感已用尽</text>
      <text class="desc">
        今日灵感已消耗完毕。传递正向能量给好友，或静心观看短片，双方皆可重新充盈 1 点灵感。
      </text>

      <view class="btn-group">
        <!-- 途径一：分享给好友 (原生 open-type="share") -->
        <button
          class="btn-primary"
          open-type="share"
          @click="onShareClick"
        >
          <text class="btn-icon">✨</text>
          <text class="btn-text">分享至微信好友 (+1 灵感点)</text>
        </button>

        <!-- 途径二：激励视频广告 -->
        <button
          class="btn-secondary"
          :loading="isWatchingAd"
          :disabled="isWatchingAd"
          @click="onWatchAd"
        >
          <text class="btn-icon">🎬</text>
          <text class="btn-text">静心观看 15 秒短片 (+1 灵感点)</text>
        </button>

        <view class="btn-cancel" @click="onClose">
          <text class="cancel-text">稍后再试</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '../stores/user';

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
  (e: 'success'): void;
}>();

const userStore = useUserStore();
const isWatchingAd = ref(false);

const onClose = () => {
  emit('update:visible', false);
};

const onShareClick = () => {
  // 小程序点击 open-type="share" 会唤起原生分享面板
  setTimeout(() => {
    emit('update:visible', false);
  }, 1000);
};

const onWatchAd = async () => {
  isWatchingAd.value = true;
  try {
    const success = await userStore.watchRewardedAd();
    if (success) {
      emit('update:visible', false);
      emit('success');
    }
  } catch (err: any) {
    uni.showToast({ title: err.message || '广告加载失败', icon: 'none' });
  } finally {
    isWatchingAd.value = false;
  }
};
</script>

<style scoped>
.energy-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.energy-modal-card {
  width: 100%;
  max-width: 620rpx;
  background: #0f1225;
  border: 1px solid rgba(212, 175, 55, 0.4);
  box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.8), 0 0 30rpx rgba(212, 175, 55, 0.15);
  border-radius: 40rpx;
  padding: 48rpx 36rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.icon-wrap {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.moon-icon {
  font-size: 48rpx;
}

.title {
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 16rpx;
  letter-spacing: 1rpx;
}

.desc {
  font-size: 26rpx;
  color: #94a3b8;
  line-height: 1.6;
  margin-bottom: 36rpx;
  padding: 0 16rpx;
}

.btn-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.btn-primary {
  width: 100%;
  height: 88rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #facc15 0%, #eab308 50%, #ca8a04 100%);
  color: #0b0c1b;
  font-weight: 700;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 8rpx 20rpx rgba(234, 179, 8, 0.3);
  border: none;
}

.btn-secondary {
  width: 100%;
  height: 88rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e2e8f0;
  font-weight: 600;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.btn-icon {
  font-size: 30rpx;
}

.btn-text {
  font-size: 28rpx;
}

.btn-cancel {
  padding: 16rpx 0 0 0;
}

.cancel-text {
  font-size: 26rpx;
  color: #64748b;
}
</style>
