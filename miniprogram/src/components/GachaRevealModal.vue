<template>
  <view v-if="visible" class="gacha-modal-mask" :class="{ 'mask-active': isMaskActive }">
    <!-- 背景宇宙星云与光晕 -->
    <view class="gacha-bg-cosmos">
      <view class="nebula-cloud nebula-cloud-1"></view>
      <view class="nebula-cloud nebula-cloud-2"></view>
      <view class="stardust-wrap">
        <view v-for="i in 18" :key="i" :class="'star-particle particle-' + i"></view>
      </view>
    </view>

    <!-- 顶部控制栏 (跳过 & 关闭) -->
    <view class="top-nav-bar">
      <view class="brand-badge">
        <image class="brand-logo-tiny" src="/static/logo.png" mode="aspectFit" />
        <text class="brand-text">心芒灵境 · 潜意识召唤</text>
      </view>
      <view class="top-right-actions">
        <!-- 阶段1仪式时支持跳过动画 -->
        <view
          v-if="stage === 'charge' || stage === 'burst'"
          class="btn-skip"
          hover-class="btn-skip-hover"
          @click="skipToReveal"
        >
          <text class="skip-text">跳过动画 ⏩</text>
        </view>
        <!-- 已揭晓阶段提供关闭/收入囊中 -->
        <view
          v-else
          class="btn-close-circle"
          hover-class="btn-close-hover"
          @click="handleClose"
        >
          <text class="close-icon">✕</text>
        </view>
      </view>
    </view>

    <!-- 阶段 1：灵境引力场 · 能量蓄势阶段 (Charge-up & Ritual) -->
    <view
      v-if="stage === 'charge'"
      class="summon-stage"
      @click="handleTriggerBurst"
    >
      <!-- 神圣几何星轨法阵 (双层逆向旋转) -->
      <view class="magic-circle-array">
        <view class="magic-ring ring-outer spin-counter"></view>
        <view class="magic-ring ring-middle spin-clockwise"></view>
        <view class="magic-core-glow pulse-glow"></view>
      </view>

      <!-- 悬浮的神秘卡牌背面 (3D 呼吸悬浮) -->
      <view class="floating-mystery-card">
        <view class="mystery-card-inner gold-border">
          <image
            class="mystery-card-img"
            :src="cardBackUrl || '/static/tarot/back.jpg'"
            mode="aspectFill"
          />
          <view class="seal-overlay">
            <view class="seal-mark pulse-seal">
              <text class="seal-rune">✦</text>
              <text class="seal-text">ISHTAR</text>
              <text class="seal-rune">✦</text>
            </view>
            <view class="ripple-wave ripple-1"></view>
            <view class="ripple-wave ripple-2"></view>
          </view>
        </view>
      </view>

      <!-- 蓄势文字提示与进度条 -->
      <view class="charge-indicator">
        <view class="charge-pulse-dot"></view>
        <text class="charge-title">{{ isCardReady ? '✦ 潜意识灵境同频完成 · 轻触唤醒 ✦' : '✦ 正在调频潜意识共鸣场 ✦' }}</text>
        <view class="charge-bar-track">
          <view class="charge-bar-fill" :style="{ width: chargeProgress + '%' }"></view>
        </view>
        <view class="tap-hint-pill" :class="{ 'ready-burst': isCardReady }">
          <text class="hand-icon">👆</text>
          <text class="hint-text">轻触封印 · 唤醒潜意识力量</text>
        </view>
      </view>
    </view>

    <!-- 阶段 2：破茧迸发瞬间的金色爆光与冲击波 (Flash & Shockwave) -->
    <view v-if="isBursting" class="burst-layer">
      <!-- 全屏白金光爆闪 -->
      <view class="screen-flash-bloom"></view>
      <!-- 冲击波圆环扩散 -->
      <view class="shockwave-ring wave-1"></view>
      <view class="shockwave-ring wave-2"></view>
      <!-- 迸射星芒火花 -->
      <view class="burst-sparks">
        <view v-for="n in 12" :key="n" :class="'spark-line spark-' + n"></view>
      </view>
    </view>

    <!-- 阶段 3 & 4：传说级卡牌霸气登场与炫技特写 (Heroic Card Showcase) -->
    <view
      v-if="stage === 'reveal' && displayCard"
      class="reveal-stage"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- 背景万丈光芒 (360° 旋转光晕射线) -->
      <view class="god-rays-container">
        <view class="god-rays spin-rays"></view>
        <view class="ambient-glow-circle"></view>
      </view>

      <!-- 顶上品级横幅 (SSR 典藏 / 稀有原型) -->
      <view class="rarity-crest-banner" :class="isMajorArcana ? 'rarity-ssr' : 'rarity-sr'">
        <view class="crest-wings-left"></view>
        <view class="crest-center">
          <text class="crest-stars">✦ ✦ ✦</text>
          <text class="crest-title">{{ isMajorArcana ? '典藏 · 潜意识核心原型' : '秘境 · 元素觉察原型' }}</text>
          <text class="crest-tag">{{ isMajorArcana ? 'MAJOR ARCANA' : 'MINOR ARCANA' }}</text>
        </view>
        <view class="crest-wings-right"></view>
      </view>

      <!-- 3D 炫彩全息卡牌展示主体 -->
      <view
        class="card-showcase-container"
        :style="cardTransformStyle"
      >
        <view class="card-heroic-frame" :class="isMajorArcana ? 'frame-ssr' : 'frame-sr'">
          <!-- 卡牌真实插画图片 -->
          <image
            class="card-artwork"
            :src="displayCard.imageLarge || displayCard.image"
            mode="aspectFill"
          />

          <!-- 全息流光扫光层 (45度流金光泽) -->
          <view class="holographic-foil shimmer-sweep"></view>

          <!-- 触控动态高光反光 (跟随手指倾斜移动) -->
          <view class="interactive-specular" :style="specularStyle"></view>

          <!-- 牌面顶部光晕遮罩与头衔 -->
          <view class="card-top-vignette">
            <view class="roman-pill">
              <text class="roman-text">{{ displayCard.roman || ('#' + displayCard.index) }}</text>
            </view>
            <view class="orientation-flag" :class="isUpright ? 'flag-upright' : 'flag-reversed'">
              <text class="flag-icon">{{ isUpright ? '✦' : '◈' }}</text>
              <text class="flag-name">{{ displayCard.orientationName || (isUpright ? '正位' : '逆位') }}</text>
            </view>
          </view>

          <!-- 牌面底部优雅渐变与卡名/能量词 -->
          <view class="card-bottom-vignette">
            <!-- 卡牌中英文名称 -->
            <view class="name-showcase-block">
              <text class="card-name-cn">{{ displayCard.nameCn }}</text>
              <text class="card-name-en">{{ displayCard.nameEn }}</text>
            </view>

            <!-- 核心觉察标签三联胶囊 -->
            <view class="tags-capsule-row">
              <text
                v-for="(t, idx) in (displayCard.tags || []).slice(0, 3)"
                :key="idx"
                class="tag-capsule"
                :style="{ animationDelay: (0.3 + idx * 0.1) + 's' }"
              >
                {{ t }}
              </text>
            </view>

            <!-- 启示金句 -->
            <view class="quote-oracle-box">
              <text class="quote-mark-left">“</text>
              <text class="quote-content">{{ displayCard.quote }}</text>
              <text class="quote-mark-right">”</text>
            </view>
          </view>
        </view>

        <!-- 3D 浮空光影投影底盘 -->
        <view class="card-drop-shadow"></view>
      </view>

      <!-- 炫技提示语 (轻微滑动倾斜体验全息流光) -->
      <view class="tilt-hint-row">
        <text class="tilt-icon">✨</text>
        <text class="tilt-text">滑动卡片可感受 3D 典藏全息流光 · 感受潜意识共鸣</text>
      </view>

      <!-- 底部震撼 CTA 操作栏 -->
      <view class="gacha-actions-panel">
        <!-- 主推大按钮：开启深度解读报告 -->
        <button
          class="btn-primary-interpret"
          hover-class="btn-primary-hover"
          @click="handleViewReading"
        >
          <view class="btn-shine-bar"></view>
          <text class="btn-primary-icon">🔮</text>
          <text class="btn-primary-title">开启深度心理投射解读</text>
          <text class="btn-primary-arrow">→</text>
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import type { TarotCard } from '../types';

const props = defineProps<{
  visible: boolean;
  card: TarotCard | null;
  cardBackUrl?: string;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
  (e: 'close'): void;
  (e: 'view-result'): void;
}>();

// 弹窗状态管理：'charge' (蓄势仪式) -> 'burst' (爆光瞬间) -> 'reveal' (霸气亮相)
const stage = ref<'charge' | 'burst' | 'reveal'>('charge');
const isMaskActive = ref(false);
const isBursting = ref(false);
const chargeProgress = ref(0);
const isCardReady = ref(false);

// 3D 交互倾斜计算
const tiltX = ref(0);
const tiltY = ref(0);
const touchStartX = ref(0);
const touchStartY = ref(0);
const isTouching = ref(false);

let chargeTimer: any = null;
let autoBurstTimer: any = null;

const displayCard = computed(() => props.card);

// 是否为大阿卡纳（大阿卡纳相当于游戏里的 SSR / 传说典藏级原型）
const isMajorArcana = computed(() => {
  if (!props.card) return true;
  if (props.card.category === 'major' || props.card.categoryName?.includes('大阿卡纳')) {
    return true;
  }
  return (props.card.index >= 0 && props.card.index <= 21);
});

// 是否为正位
const isUpright = computed(() => {
  if (!props.card) return true;
  return props.card.orientation === 'upright' || props.card.orientationName?.includes('正');
});

// 3D 动态倾斜与全息高光样式
const cardTransformStyle = computed(() => {
  if (!isTouching.value) {
    return 'transform: perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1);';
  }
  return `transform: perspective(1000px) rotateX(${tiltX.value}deg) rotateY(${tiltY.value}deg) scale3d(1.03, 1.03, 1.03);`;
});

const specularStyle = computed(() => {
  if (!isTouching.value) {
    return 'opacity: 0.25; background: radial-gradient(circle at 50% 30%, rgba(255,255,255,0.4) 0%, transparent 60%);';
  }
  // 根据倾斜位置动态偏移高光中心
  const px = Math.min(Math.max(50 + tiltY.value * 2.5, 10), 90);
  const py = Math.min(Math.max(40 - tiltX.value * 2.5, 10), 90);
  return `opacity: 0.6; background: radial-gradient(circle at ${px}% ${py}%, rgba(255,255,255,0.7) 0%, rgba(253, 224, 71, 0.3) 35%, transparent 70%);`;
});

// 轻触触觉震动反馈
const triggerVibrate = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  try {
    uni.vibrateShort({
      // @ts-ignore
      type
    });
  } catch {
    // ignore
  }
};

// 启动蓄势仪式循环
const startChargeSequence = () => {
  stage.value = 'charge';
  chargeProgress.value = 10;
  isBursting.value = false;
  isCardReady.value = false;

  triggerVibrate('light');

  if (chargeTimer) clearInterval(chargeTimer);
  chargeTimer = setInterval(() => {
    if (chargeProgress.value < 90) {
      chargeProgress.value += 15;
    } else if (props.card) {
      chargeProgress.value = 100;
      isCardReady.value = true;
      clearInterval(chargeTimer);
    }
  }, 120);

  // 1.8 秒后若卡片已就绪，自动平滑触发破印迸发，避免用户不知轻触而等待
  if (autoBurstTimer) clearTimeout(autoBurstTimer);
  autoBurstTimer = setTimeout(() => {
    if (stage.value === 'charge' && props.card) {
      handleTriggerBurst();
    }
  }, 1800);
};

// 监听卡片加载状态
watch(
  () => props.card,
  (newVal) => {
    if (newVal) {
      isCardReady.value = true;
      chargeProgress.value = 100;
    }
  }
);

// 监听弹窗显示与重置
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      isMaskActive.value = true;
      startChargeSequence();
    } else {
      isMaskActive.value = false;
      cleanupTimers();
    }
  },
  { immediate: true }
);

const cleanupTimers = () => {
  if (chargeTimer) clearInterval(chargeTimer);
  if (autoBurstTimer) clearTimeout(autoBurstTimer);
};

onUnmounted(() => {
  cleanupTimers();
});

// 用户主动轻触或自动触发破印爆发
const handleTriggerBurst = () => {
  if (stage.value !== 'charge') return;
  // 如果后台数据还没返回，保持等待提示
  if (!props.card) {
    triggerVibrate('light');
    return;
  }

  cleanupTimers();
  stage.value = 'burst';
  isBursting.value = true;
  triggerVibrate('heavy');

  // 400ms 后切换至传说卡牌霸气登场展示
  setTimeout(() => {
    isBursting.value = false;
    stage.value = 'reveal';
    triggerVibrate('medium');
  }, 420);
};

// 直接跳过动画直接展示
const skipToReveal = () => {
  cleanupTimers();
  isBursting.value = false;
  stage.value = 'reveal';
  triggerVibrate('medium');
};

// 手指拖拽交互体验 3D 陀螺仪全息光效
const handleTouchStart = (e: any) => {
  const touch = e.touches[0];
  if (!touch) return;
  isTouching.value = true;
  touchStartX.value = touch.clientX;
  touchStartY.value = touch.clientY;
};

const handleTouchMove = (e: any) => {
  if (!isTouching.value) return;
  const touch = e.touches[0];
  if (!touch) return;
  const deltaX = touch.clientX - touchStartX.value;
  const deltaY = touch.clientY - touchStartY.value;

  // 倾斜限制在 ±15度以内，提供精致的阻尼感
  tiltY.value = Math.max(Math.min(deltaX * 0.12, 14), -14);
  tiltX.value = Math.max(Math.min(-deltaY * 0.12, 14), -14);
};

const handleTouchEnd = () => {
  isTouching.value = false;
  // 平滑回弹
  tiltX.value = 0;
  tiltY.value = 0;
};

const handleClose = () => {
  triggerVibrate('light');
  emit('close');
  emit('update:visible', false);
};

const handleViewReading = () => {
  triggerVibrate('medium');
  emit('view-result');
  emit('update:visible', false);
};
</script>

<style scoped>
/* 全屏黑色遮罩与背景 */
.gacha-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: #060713;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.mask-active {
  opacity: 1;
}

/* 宇宙星云动态背景 */
.gacha-bg-cosmos {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}

.nebula-cloud {
  position: absolute;
  border-radius: 50%;
  filter: blur(80rpx);
  opacity: 0.35;
}

.nebula-cloud-1 {
  width: 600rpx;
  height: 600rpx;
  background: radial-gradient(circle, #4338ca 0%, #1e1b4b 60%, transparent 100%);
  top: 15%;
  left: 50%;
  transform: translateX(-50%);
  animation: pulseNebula 8s ease-in-out infinite alternate;
}

.nebula-cloud-2 {
  width: 500rpx;
  height: 500rpx;
  background: radial-gradient(circle, #b45309 0%, #78350f 50%, transparent 100%);
  bottom: 20%;
  left: 50%;
  transform: translateX(-50%);
  animation: pulseNebula 6s ease-in-out infinite alternate-reverse;
}

@keyframes pulseNebula {
  0% { transform: translateX(-50%) scale(0.9); opacity: 0.25; }
  100% { transform: translateX(-50%) scale(1.15); opacity: 0.45; }
}

/* 星尘粒子浮动 */
.stardust-wrap {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.star-particle {
  position: absolute;
  width: 6rpx;
  height: 6rpx;
  border-radius: 50%;
  background: #fde047;
  box-shadow: 0 0 10rpx #fde047;
  animation: floatStar 4s infinite ease-in-out;
}

.particle-1 { top: 15%; left: 20%; animation-delay: 0.2s; }
.particle-2 { top: 25%; left: 80%; animation-delay: 0.8s; }
.particle-3 { top: 40%; left: 10%; animation-delay: 1.5s; }
.particle-4 { top: 60%; left: 85%; animation-delay: 0.5s; }
.particle-5 { top: 75%; left: 25%; animation-delay: 2.1s; }
.particle-6 { top: 85%; left: 70%; animation-delay: 1.1s; }
.particle-7 { top: 30%; left: 50%; animation-delay: 2.7s; }
.particle-8 { top: 68%; left: 45%; animation-delay: 1.8s; }

@keyframes floatStar {
  0% { transform: translateY(0) scale(0.6); opacity: 0.2; }
  50% { transform: translateY(-20rpx) scale(1.2); opacity: 0.9; }
  100% { transform: translateY(-40rpx) scale(0.6); opacity: 0.2; }
}

/* 顶部控制栏 */
.top-nav-bar {
  position: relative;
  z-index: 20;
  padding: calc(env(safe-area-inset-top, 40rpx) + 20rpx) 32rpx 16rpx 32rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand-badge {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(253, 224, 71, 0.25);
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  backdrop-filter: blur(10px);
}

.brand-logo-tiny {
  width: 32rpx;
  height: 32rpx;
  border-radius: 8rpx;
}

.brand-text {
  font-size: 22rpx;
  color: #fde047;
  font-weight: 500;
  letter-spacing: 1rpx;
}

.top-right-actions {
  display: flex;
  align-items: center;
}

.btn-skip {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 8rpx 22rpx;
  border-radius: 999rpx;
  backdrop-filter: blur(8px);
}

.btn-skip-hover {
  background: rgba(255, 255, 255, 0.25);
}

.skip-text {
  font-size: 22rpx;
  color: #e2e8f0;
}

.btn-close-circle {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close-hover {
  background: rgba(255, 255, 255, 0.25);
}

.close-icon {
  font-size: 28rpx;
  color: #ffffff;
  line-height: 1;
}

/* ================= 阶段 1：仪式与蓄势 ================= */
.summon-stage {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx 0;
}

/* 神圣几何法阵 */
.magic-circle-array {
  position: absolute;
  width: 600rpx;
  height: 600rpx;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.magic-ring {
  position: absolute;
  border-radius: 50%;
  box-sizing: border-box;
}

.ring-outer {
  width: 580rpx;
  height: 580rpx;
  border: 2rpx dashed rgba(253, 224, 71, 0.35);
  box-shadow: 0 0 30rpx rgba(245, 158, 11, 0.2);
}

.ring-middle {
  width: 440rpx;
  height: 440rpx;
  border: 2rpx solid rgba(253, 224, 71, 0.45);
  border-style: double;
}

.magic-core-glow {
  width: 300rpx;
  height: 300rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, rgba(99, 102, 241, 0.15) 50%, transparent 70%);
}

.spin-clockwise {
  animation: spinCircle 24s linear infinite;
}

.spin-counter {
  animation: spinCounterCircle 32s linear infinite;
}

@keyframes spinCircle {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes spinCounterCircle {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

.pulse-glow {
  animation: corePulse 2s ease-in-out infinite;
}

@keyframes corePulse {
  0% { transform: scale(0.85); opacity: 0.4; }
  50% { transform: scale(1.15); opacity: 0.8; }
  100% { transform: scale(0.85); opacity: 0.4; }
}

/* 悬浮神秘卡背 */
.floating-mystery-card {
  position: relative;
  width: 360rpx;
  height: 540rpx;
  margin-bottom: 50rpx;
  animation: cardHover 3s ease-in-out infinite;
}

@keyframes cardHover {
  0% { transform: translateY(0rpx) rotate(0deg); }
  50% { transform: translateY(-24rpx) rotate(1deg); }
  100% { transform: translateY(0rpx) rotate(0deg); }
}

.mystery-card-inner {
  width: 100%;
  height: 100%;
  border-radius: 32rpx;
  overflow: hidden;
  position: relative;
  background: #0f1026;
  border: 2rpx solid rgba(253, 224, 71, 0.6);
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.8), 0 0 40rpx rgba(245, 158, 11, 0.45);
}

.mystery-card-img {
  width: 100%;
  height: 100%;
}

.seal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
}

.seal-mark {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 30rpx;
  background: rgba(15, 23, 42, 0.85);
  border: 2rpx solid #fde047;
  border-radius: 999rpx;
  box-shadow: 0 0 24rpx rgba(253, 224, 71, 0.6);
  z-index: 2;
}

.seal-rune {
  color: #fde047;
  font-size: 24rpx;
}

.seal-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #fde047;
  letter-spacing: 4rpx;
}

.pulse-seal {
  animation: sealBeat 1.8s ease-in-out infinite;
}

@keyframes sealBeat {
  0% { transform: scale(0.96); box-shadow: 0 0 16rpx rgba(253, 224, 71, 0.4); }
  50% { transform: scale(1.05); box-shadow: 0 0 36rpx rgba(253, 224, 71, 0.9); }
  100% { transform: scale(0.96); box-shadow: 0 0 16rpx rgba(253, 224, 71, 0.4); }
}

.ripple-wave {
  position: absolute;
  width: 120rpx;
  height: 120rpx;
  border: 2rpx solid #fde047;
  border-radius: 50%;
  pointer-events: none;
}

.ripple-1 {
  animation: rippleOut 2s cubic-bezier(0.1, 0.5, 0.3, 1) infinite;
}

.ripple-2 {
  animation: rippleOut 2s cubic-bezier(0.1, 0.5, 0.3, 1) infinite 0.7s;
}

@keyframes rippleOut {
  0% { transform: scale(0.3); opacity: 1; }
  100% { transform: scale(3.2); opacity: 0; }
}

/* 蓄势文字提示与进度条 */
.charge-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  position: relative;
  z-index: 10;
}

.charge-title {
  font-size: 24rpx;
  color: #fde047;
  font-weight: 500;
  letter-spacing: 1rpx;
}

.charge-bar-track {
  width: 320rpx;
  height: 10rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999rpx;
  overflow: hidden;
  border: 1px solid rgba(253, 224, 71, 0.3);
}

.charge-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1 0%, #f59e0b 50%, #fde047 100%);
  border-radius: 999rpx;
  transition: width 0.3s ease;
  box-shadow: 0 0 16rpx #fde047;
}

.tap-hint-pill {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 28rpx;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(253, 224, 71, 0.4);
  border-radius: 999rpx;
  box-shadow: 0 0 20rpx rgba(245, 158, 11, 0.3);
  animation: bounceHint 1.4s ease-in-out infinite;
}

.ready-burst {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.4) 0%, rgba(99, 102, 241, 0.4) 100%);
  border-color: #fde047;
  box-shadow: 0 0 30rpx rgba(253, 224, 71, 0.6);
}

@keyframes bounceHint {
  0% { transform: scale(0.96); }
  50% { transform: scale(1.04); }
  100% { transform: scale(0.96); }
}

.hand-icon {
  font-size: 24rpx;
}

.hint-text {
  font-size: 24rpx;
  color: #ffffff;
  font-weight: 600;
}

/* ================= 阶段 2：破印爆光与冲击波 ================= */
.burst-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 50;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.screen-flash-bloom {
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, #fffbeb 10%, #fef08a 50%, #f59e0b 80%, transparent 100%);
  opacity: 0.95;
  animation: flashOut 0.42s ease-out forwards;
}

@keyframes flashOut {
  0% { opacity: 0.95; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.2); }
}

.shockwave-ring {
  position: absolute;
  border-radius: 50%;
  border: 4rpx solid #fde047;
  box-shadow: 0 0 40rpx #fde047;
}

.wave-1 {
  animation: shockExpand 0.45s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
}

.wave-2 {
  animation: shockExpand 0.45s cubic-bezier(0.1, 0.8, 0.3, 1) forwards 0.1s;
}

@keyframes shockExpand {
  0% { width: 50rpx; height: 50rpx; opacity: 1; }
  100% { width: 800rpx; height: 800rpx; opacity: 0; }
}

.burst-sparks {
  position: absolute;
  width: 100%;
  height: 100%;
}

.spark-line {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8rpx;
  height: 200rpx;
  background: linear-gradient(180deg, #ffffff 0%, #fde047 60%, transparent 100%);
  transform-origin: top center;
}

.spark-1 { transform: rotate(0deg) translateY(60rpx); }
.spark-2 { transform: rotate(30deg) translateY(60rpx); }
.spark-3 { transform: rotate(60deg) translateY(60rpx); }
.spark-4 { transform: rotate(90deg) translateY(60rpx); }
.spark-5 { transform: rotate(120deg) translateY(60rpx); }
.spark-6 { transform: rotate(150deg) translateY(60rpx); }
.spark-7 { transform: rotate(180deg) translateY(60rpx); }
.spark-8 { transform: rotate(210deg) translateY(60rpx); }
.spark-9 { transform: rotate(240deg) translateY(60rpx); }
.spark-10 { transform: rotate(270deg) translateY(60rpx); }
.spark-11 { transform: rotate(300deg) translateY(60rpx); }
.spark-12 { transform: rotate(330deg) translateY(60rpx); }

/* ================= 阶段 3 & 4：霸气登场与炫技特写 ================= */
.reveal-stage {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 10rpx 32rpx calc(env(safe-area-inset-bottom, 20rpx) + 20rpx) 32rpx;
  box-sizing: border-box;
}

/* 万丈光芒背景 */
.god-rays-container {
  position: absolute;
  top: 36%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 800rpx;
  height: 800rpx;
  pointer-events: none;
  z-index: 1;
}

.god-rays {
  width: 100%;
  height: 100%;
  background: conic-gradient(
    from 0deg,
    rgba(245, 158, 11, 0.25) 0deg 15deg,
    transparent 15deg 30deg,
    rgba(253, 224, 71, 0.2) 30deg 45deg,
    transparent 45deg 60deg,
    rgba(245, 158, 11, 0.25) 60deg 75deg,
    transparent 75deg 90deg,
    rgba(253, 224, 71, 0.2) 90deg 105deg,
    transparent 105deg 120deg,
    rgba(245, 158, 11, 0.25) 120deg 135deg,
    transparent 135deg 150deg,
    rgba(253, 224, 71, 0.2) 150deg 165deg,
    transparent 165deg 180deg,
    rgba(245, 158, 11, 0.25) 180deg 195deg,
    transparent 195deg 210deg,
    rgba(253, 224, 71, 0.2) 210deg 225deg,
    transparent 225deg 240deg,
    rgba(245, 158, 11, 0.25) 240deg 255deg,
    transparent 255deg 270deg,
    rgba(253, 224, 71, 0.2) 270deg 285deg,
    transparent 285deg 300deg,
    rgba(245, 158, 11, 0.25) 300deg 315deg,
    transparent 315deg 330deg,
    rgba(253, 224, 71, 0.2) 330deg 345deg,
    transparent 345deg 360deg
  );
  border-radius: 50%;
  filter: blur(8rpx);
}

.spin-rays {
  animation: spinCircle 40s linear infinite;
}

.ambient-glow-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500rpx;
  height: 500rpx;
  background: radial-gradient(circle, rgba(253, 224, 71, 0.35) 0%, rgba(245, 158, 11, 0.15) 50%, transparent 70%);
  border-radius: 50%;
}

/* 品级横幅 (SSR 典藏) */
.rarity-crest-banner {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
  animation: bannerDrop 0.6s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
}

@keyframes bannerDrop {
  0% { transform: translateY(-40rpx) scale(0.7); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

.crest-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6rpx 36rpx;
  border-radius: 16rpx;
  position: relative;
}

.rarity-ssr .crest-center {
  background: linear-gradient(135deg, rgba(88, 28, 135, 0.8) 0%, rgba(180, 83, 9, 0.85) 100%);
  border: 1px solid rgba(253, 224, 71, 0.7);
  box-shadow: 0 0 24rpx rgba(245, 158, 11, 0.5);
}

.rarity-sr .crest-center {
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.8) 0%, rgba(15, 118, 110, 0.8) 100%);
  border: 1px solid rgba(56, 189, 248, 0.6);
  box-shadow: 0 0 20rpx rgba(56, 189, 248, 0.4);
}

.crest-stars {
  font-size: 20rpx;
  color: #fde047;
  letter-spacing: 6rpx;
  line-height: 1.2;
}

.crest-title {
  font-size: 26rpx;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 2rpx;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.8);
}

.crest-tag {
  font-size: 16rpx;
  color: #fde047;
  letter-spacing: 3rpx;
  opacity: 0.9;
}

/* 3D 卡牌展示主体 */
.card-showcase-container {
  position: relative;
  z-index: 10;
  width: 440rpx;
  height: 660rpx;
  transition: transform 0.15s ease-out;
  transform-style: preserve-3d;
  perspective: 1000px;
  margin: 10rpx 0;
  animation: cardHeroicEntrance 0.7s cubic-bezier(0.18, 0.89, 0.32, 1.2) forwards;
}

@keyframes cardHeroicEntrance {
  0% { transform: perspective(1000px) scale(0.3) translateY(80rpx) rotateX(20deg); opacity: 0; }
  70% { transform: perspective(1000px) scale(1.06) translateY(-10rpx) rotateX(-4deg); opacity: 1; }
  100% { transform: perspective(1000px) scale(1) translateY(0) rotateX(0deg); opacity: 1; }
}

.card-heroic-frame {
  width: 100%;
  height: 100%;
  border-radius: 36rpx;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
  background: #090918;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.frame-ssr {
  border: 4rpx solid #fde047;
  box-shadow: 0 0 50rpx rgba(245, 158, 11, 0.65), 0 30rpx 80rpx rgba(0, 0, 0, 0.9);
}

.frame-sr {
  border: 4rpx solid #38bdf8;
  box-shadow: 0 0 45rpx rgba(56, 189, 248, 0.55), 0 30rpx 80rpx rgba(0, 0, 0, 0.9);
}

.card-artwork {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

/* 全息流光扫光层 (45度流金光泽) */
.holographic-foil {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    115deg,
    transparent 35%,
    rgba(255, 255, 255, 0.45) 47%,
    rgba(253, 224, 71, 0.7) 50%,
    rgba(255, 255, 255, 0.45) 53%,
    transparent 65%
  );
  z-index: 4;
  pointer-events: none;
  mix-blend-mode: overlay;
}

.shimmer-sweep {
  animation: sweepFoil 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes sweepFoil {
  0% { transform: translateY(-70%) translateX(-70%); }
  40% { transform: translateY(70%) translateX(70%); }
  100% { transform: translateY(70%) translateX(70%); }
}

/* 交互触控高光 */
.interactive-specular {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 5;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

/* 牌顶信息遮罩 */
.card-top-vignette {
  position: relative;
  z-index: 6;
  padding: 16rpx 20rpx;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 65%, transparent 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.roman-pill {
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(253, 224, 71, 0.4);
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}

.roman-text {
  font-size: 22rpx;
  color: #fde047;
  font-family: serif;
  font-weight: 700;
}

.orientation-flag {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  font-weight: 600;
}

.flag-upright {
  background: rgba(16, 185, 129, 0.25);
  border: 1px solid rgba(16, 185, 129, 0.5);
  color: #a7f3d0;
}

.flag-reversed {
  background: rgba(168, 85, 247, 0.25);
  border: 1px solid rgba(168, 85, 247, 0.5);
  color: #e9d5ff;
}

/* 牌底信息遮罩与卡名/启示 */
.card-bottom-vignette {
  position: relative;
  z-index: 6;
  padding: 24rpx 16rpx 16rpx 16rpx;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.75) 60%, transparent 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.name-showcase-block {
  text-align: center;
}

.card-name-cn {
  font-size: 38rpx;
  font-weight: 900;
  letter-spacing: 4rpx;
  color: #ffffff;
  display: block;
  background: linear-gradient(180deg, #ffffff 0%, #fef08a 60%, #eab308 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2rpx 8rpx rgba(234, 179, 8, 0.5));
}

.card-name-en {
  font-size: 20rpx;
  color: #cbd5e1;
  letter-spacing: 2rpx;
  text-transform: uppercase;
  opacity: 0.85;
}

/* 标签胶囊横向排列 */
.tags-capsule-row {
  display: flex;
  gap: 8rpx;
  justify-content: center;
  flex-wrap: wrap;
}

.tag-capsule {
  font-size: 18rpx;
  color: #fef08a;
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(253, 224, 71, 0.4);
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  animation: tagBounceIn 0.5s ease backwards;
}

@keyframes tagBounceIn {
  from { transform: scale(0.6); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* 启示金句 */
.quote-oracle-box {
  width: 100%;
  box-sizing: border-box;
  padding: 8rpx 12rpx;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12rpx;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.quote-mark-left,
.quote-mark-right {
  color: #fde047;
  font-size: 24rpx;
  font-family: serif;
}

.quote-content {
  font-size: 20rpx;
  color: #f1f5f9;
  font-style: italic;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-align: center;
  padding: 0 4rpx;
}

/* 3D 浮空光影底盘 */
.card-drop-shadow {
  position: absolute;
  bottom: -30rpx;
  left: 10%;
  width: 80%;
  height: 24rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.5) 0%, rgba(0,0,0,0.8) 70%, transparent 100%);
  filter: blur(8rpx);
}

/* 炫技提示语 */
.tilt-hint-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin: 6rpx 0 14rpx 0;
  opacity: 0.85;
}

.tilt-icon {
  font-size: 20rpx;
}

.tilt-text {
  font-size: 20rpx;
  color: #cbd5e1;
  letter-spacing: 0.5rpx;
}

/* ================= 底部震撼操作栏 ================= */
.gacha-actions-panel {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  position: relative;
  z-index: 20;
}

/* 主推解读按钮 */
.btn-primary-interpret {
  width: 100% !important;
  max-width: 100% !important;
  height: 92rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #fde047 0%, #eab308 50%, #ca8a04 100%);
  color: #0b0c1b;
  font-size: 30rpx;
  font-weight: 800;
  display: flex !important;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  box-shadow: 0 10rpx 30rpx rgba(234, 179, 8, 0.45);
  border: none !important;
  margin: 0 !important;
  position: relative;
  overflow: hidden;
  transition: all 0.2s;
}

.btn-primary-hover {
  transform: scale(0.98);
  box-shadow: 0 4rpx 16rpx rgba(234, 179, 8, 0.3);
}

.btn-shine-bar {
  position: absolute;
  top: 0;
  left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.5) 50%, transparent 100%);
  transform: skewX(-20deg);
  animation: shineMove 3s infinite;
}

@keyframes shineMove {
  0% { left: -100%; }
  35% { left: 200%; }
  100% { left: 200%; }
}

.btn-primary-icon {
  font-size: 32rpx;
}

.btn-primary-title {
  letter-spacing: 1rpx;
}

.btn-primary-arrow {
  font-size: 28rpx;
  margin-left: 4rpx;
}

.btn-primary-interpret::after {
  display: none !important;
}
</style>
