<template>
  <view class="poster-container">
    <view class="poster-tip">
      <text class="tip-text">✦ 朋友圈高清能量卡 · 750×1334 Canvas 2D 绘制 ✦</text>
    </view>

    <!-- 海报高保真等比卡片预览 -->
    <view class="poster-card-preview gold-border" v-if="card">
      <view class="preview-inner">
        <!-- 顶栏标题与日期 -->
        <view class="poster-head">
          <text class="poster-brand">INNER GLOW · 心芒灵境</text>
          <text class="poster-date">{{ todayFormatted }}</text>
        </view>

        <!-- 卡牌信息 -->
        <view class="poster-card-info">
          <text class="card-roman-text">{{ card.roman || ('#' + card.index) }}</text>
          <text class="card-name-text">{{ card.nameCn }}</text>
          <text class="card-meta-text">{{ card.nameEn }} · {{ card.orientationName || '正位' }}</text>
        </view>

        <!-- 卡牌插画大图 -->
        <view class="poster-img-wrap">
          <image
            class="poster-img"
            :src="card.imageLarge || card.image"
            mode="aspectFill"
          />
        </view>

        <!-- 4字定调词与金句 -->
        <view class="poster-tag-wrap">
          <text class="poster-tag-badge">{{ energyTag }}</text>
        </view>

        <view class="poster-quote-wrap">
          <text class="poster-quote">“{{ quoteText }}”</text>
        </view>

        <!-- 底部真实小程序码与引流文案 -->
        <view class="poster-footer">
          <view class="footer-left">
            <text class="footer-t1">微信长按识别小程序码</text>
            <text class="footer-t2">抽取你的今日潜意识灵感</text>
          </view>
          <view class="footer-qr">
            <image
              class="qr-img"
              src="/static/mp_qrcode.png"
              mode="aspectFit"
            />
          </view>
        </view>
      </view>
    </view>

    <!-- 隐式 Canvas 2D 用于真实导出 750x1334 高清原图 -->
    <!-- #ifdef MP-WEIXIN -->
    <canvas
      type="2d"
      id="posterCanvas"
      class="offscreen-canvas"
    ></canvas>
    <!-- #endif -->
    <!-- #ifndef MP-WEIXIN -->
    <canvas
      canvas-id="posterCanvas"
      id="posterCanvas"
      class="offscreen-canvas"
    ></canvas>
    <!-- #endif -->

    <!-- 底部操作按钮群 -->
    <view class="action-wrap">
      <!-- 真实保存到手机相册 -->
      <button
        class="btn-save-album"
        :loading="isSaving"
        :disabled="isSaving"
        @click="handleSavePoster"
      >
        <text class="btn-icon">💾</text>
        <text>保存高清图片至相册</text>
      </button>

      <!-- 微信好友与朋友圈分享按钮组 -->
      <view class="share-row">
        <!-- 微信原生转发给好友 -->
        <button class="btn-share-friend" open-type="share">
          <text class="btn-icon">👥</text>
          <text>分享给微信好友</text>
        </button>

        <!-- 预览长按发朋友圈/保存 -->
        <button class="btn-share-timeline" @click="handlePreviewAndShare">
          <text class="btn-icon">✨</text>
          <text>预览长按发朋友圈</text>
        </button>
      </view>

      <button class="btn-back" @click="handleBackHome">
        <text>返回灵境主台</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app';
import { useTarotStore } from '../../stores/tarot';
import { useUserStore } from '../../stores/user';
import { renderTarotPoster } from '../../utils/canvas';
import type { TarotCard } from '../../types';

const tarotStore = useTarotStore();
const userStore = useUserStore();

const isSaving = ref(false);
const isGenerating = ref(false);
const generatedFilePath = ref('');

const card = computed<TarotCard | null>(() => {
  return tarotStore.currentCard;
});

const todayFormatted = computed(() => {
  const d = new Date();
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
});

const energyTag = computed(() => {
  if (tarotStore.structuredInsight.category) {
    return `【${tarotStore.structuredInsight.category}】`;
  }
  const c = card.value;
  if (c && c.tags && c.tags.length > 0) {
    return `【${c.tags[0]} · ${c.element || '觉察'}】`;
  }
  return '【今日自省 · 潜意识投射】';
});

const quoteText = computed(() => {
  return (
    tarotStore.structuredInsight.affirmation ||
    card.value?.affirmation ||
    card.value?.quote ||
    '微风不燥，万物有序，在每一个微小的行动中找回安宁。'
  );
});

onMounted(() => {
  // 进入页面静默预渲染海报，提高用户点击保存时的响应速度
  setTimeout(() => {
    generatePosterQuietly();
  }, 400);
});

/**
 * 后台静默生成 750 × 1334 高清海报
 */
const generatePosterQuietly = () => {
  if (!card.value || generatedFilePath.value || isGenerating.value) return;
  generatePosterCore(() => {});
};

/**
 * 核心 Canvas 2D 海报渲染逻辑
 */
const generatePosterCore = (callback: (path: string) => void) => {
  if (!card.value) {
    callback('');
    return;
  }

  isGenerating.value = true;

  // #ifdef MP-WEIXIN
  const query = uni.createSelectorQuery();
  query
    .select('#posterCanvas')
    .fields({ node: true, size: true })
    .exec(async (res: any) => {
      if (!res[0] || !res[0].node) {
        isGenerating.value = false;
        callback('');
        return;
      }
      const canvas = res[0].node;
      try {
        const tempPath = await renderTarotPoster(canvas, {
          card: card.value!,
          dateStr: todayFormatted.value,
          tag: energyTag.value,
          quote: quoteText.value,
          qrcodeUrl: '/static/mp_qrcode.png'
        });
        generatedFilePath.value = tempPath;
        isGenerating.value = false;
        callback(tempPath);
      } catch (err: any) {
        console.error('[Render poster error]', err);
        isGenerating.value = false;
        callback('');
      }
    });
  // #endif

  // #ifndef MP-WEIXIN
  // H5 / 网页环境兜底
  setTimeout(() => {
    isGenerating.value = false;
    const fallbackUrl = card.value?.imageLarge || card.value?.image || '';
    generatedFilePath.value = fallbackUrl;
    callback(fallbackUrl);
  }, 300);
  // #endif
};

/**
 * 真实保存海报至手机相册
 */
const handleSavePoster = async () => {
  if (!card.value) {
    uni.showToast({ title: '未获取到卡牌信息', icon: 'none' });
    return;
  }

  isSaving.value = true;

  // 若已有生成好的高清图片，直接进入相册保存授权流程
  if (generatedFilePath.value) {
    saveImageFile(generatedFilePath.value);
    return;
  }

  // 否则开始生成并保存
  uni.showLoading({ title: '生成高清海报中...' });
  generatePosterCore((tempPath) => {
    uni.hideLoading();
    if (!tempPath) {
      isSaving.value = false;
      uni.showToast({ title: '海报生成失败，请重试', icon: 'none' });
      return;
    }
    saveImageFile(tempPath);
  });
};

/**
 * 真实相册写入与权限处理 (微信原生相册授权 + H5自动下载)
 */
const saveImageFile = (filePath: string) => {
  // #ifdef MP-WEIXIN
  uni.getSetting({
    success: (settingRes) => {
      const auth = settingRes.authSetting['scope.writePhotosAlbum'];

      // 用户此前明确拒绝了授权
      if (auth === false) {
        isSaving.value = false;
        uni.showModal({
          title: '相册授权提示',
          content: '保存海报需要写入您的手机相册，请在设置中开启“添加到相册”权限',
          confirmText: '前往设置',
          cancelText: '取消',
          success: (m) => {
            if (m.confirm) {
              uni.openSetting();
            }
          }
        });
        return;
      }

      // 进行真正的相册保存操作
      uni.saveImageToPhotosAlbum({
        filePath,
        success: () => {
          isSaving.value = false;
          uni.showToast({
            title: '已保存至手机相册',
            icon: 'success',
            duration: 2500
          });
        },
        fail: (err: any) => {
          isSaving.value = false;
          if (err.errMsg && (err.errMsg.includes('auth deny') || err.errMsg.includes('auth denied'))) {
            uni.showModal({
              title: '相册授权提示',
              content: '保存海报需要将图片写入相册，请在设置中开启权限',
              confirmText: '前往设置',
              cancelText: '取消',
              success: (m) => {
                if (m.confirm) uni.openSetting();
              }
            });
          } else if (err.errMsg && err.errMsg.includes('cancel')) {
            uni.showToast({ title: '已取消保存', icon: 'none' });
          } else {
            // 系统相册或模拟器特殊限制时，唤起全屏海报大图预览供用户长按直接保存
            uni.showModal({
              title: '保存提示',
              content: '已为您生成高清海报，长按屏幕可直接保存至相册或发送给好友',
              confirmText: '打开海报',
              showCancel: false,
              success: () => {
                uni.previewImage({
                  urls: [filePath],
                  current: filePath,
                  showmenu: true
                });
              }
            });
          }
        }
      });
    },
    fail: () => {
      // getSetting 异常兜底直接调用
      uni.saveImageToPhotosAlbum({
        filePath,
        success: () => {
          isSaving.value = false;
          uni.showToast({ title: '已保存至手机相册', icon: 'success' });
        },
        fail: (err) => {
          isSaving.value = false;
          uni.showToast({ title: err.errMsg || '保存失败', icon: 'none' });
        }
      });
    }
  });
  // #endif

  // #ifdef H5
  try {
    const a = document.createElement('a');
    a.href = filePath;
    a.download = `inner-glow-tarot-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    isSaving.value = false;
    uni.showToast({ title: '海报已开始下载', icon: 'success' });
  } catch (e: any) {
    isSaving.value = false;
    uni.showToast({ title: '下载失败', icon: 'none' });
  }
  // #endif
};

/**
 * 预览长按转发朋友圈：打开全屏大图预览（内置微信原生长按转发、收藏、保存相册）
 */
const handlePreviewAndShare = () => {
  if (generatedFilePath.value) {
    uni.previewImage({
      urls: [generatedFilePath.value],
      current: generatedFilePath.value,
      showmenu: true
    });
    return;
  }

  uni.showLoading({ title: '正在准备海报...' });
  generatePosterCore((path) => {
    uni.hideLoading();
    const finalUrl = path || card.value?.imageLarge || card.value?.image || '';
    if (finalUrl) {
      uni.previewImage({
        urls: [finalUrl],
        current: finalUrl,
        showmenu: true
      });
    } else {
      uni.showToast({ title: '海报准备中，请稍后再试', icon: 'none' });
    }
  });
};

const handleBackHome = () => {
  uni.switchTab({
    url: '/pages/index/index'
  });
};

/**
 * 分享给微信好友：将生成的能量海报作为微信会话卡片封面
 */
onShareAppMessage(() => {
  const cName = card.value?.nameCn || '灵境卡牌';
  const uid = userStore.userId || '';
  return {
    title: `我在心芒灵境抽取了【${cName}】，来看看你的今日潜意识灵感`,
    path: `/pages/index/index?inviter_id=${uid}`,
    imageUrl: generatedFilePath.value || card.value?.imageLarge || card.value?.image || ''
  };
});

/**
 * 分享到微信朋友圈：支持右上角菜单与系统朋友圈转发
 */
onShareTimeline(() => {
  const cName = card.value?.nameCn || '灵境卡牌';
  const uid = userStore.userId || '';
  return {
    title: `【${cName}】心芒灵境 · 今日潜意识能量卡`,
    query: `inviter_id=${uid}`,
    imageUrl: generatedFilePath.value || card.value?.imageLarge || card.value?.image || ''
  };
});
</script>

<style scoped>
.poster-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  min-height: 100vh;
  padding: 24rpx 32rpx;
  box-sizing: border-box;
}

.poster-tip {
  margin-bottom: 20rpx;
}

.tip-text {
  font-size: 22rpx;
  color: #94a3b8;
}

/* 750x1334 海报等比卡片预览 */
.poster-card-preview {
  width: 520rpx;
  height: 820rpx;
  border-radius: 36rpx;
  background: linear-gradient(180deg, #181438 0%, #0d0c20 50%, #04030a 100%);
  padding: 28rpx;
  box-sizing: border-box;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.8);
}

.preview-inner {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.poster-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 12rpx;
}

.poster-brand {
  font-size: 18rpx;
  color: #fef08a;
  letter-spacing: 1rpx;
}

.poster-date {
  font-size: 18rpx;
  color: #d4af37;
}

.poster-card-info {
  text-align: center;
  margin: 12rpx 0 8rpx 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.card-roman-text {
  font-size: 18rpx;
  color: #fde047;
  font-family: serif;
}

.card-name-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #ffffff;
}

.card-meta-text {
  font-size: 18rpx;
  color: #c7d2fe;
}

.poster-img-wrap {
  width: 260rpx;
  height: 380rpx;
  margin: 0 auto;
  border-radius: 20rpx;
  overflow: hidden;
  border: 1px solid rgba(212, 175, 55, 0.5);
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.7);
  background: #000000;
}

.poster-img {
  width: 100%;
  height: 100%;
}

.poster-tag-wrap {
  text-align: center;
  margin: 10rpx 0 4rpx 0;
}

.poster-tag-badge {
  font-size: 20rpx;
  color: #fef08a;
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.4);
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
}

.poster-quote-wrap {
  text-align: center;
  padding: 0 16rpx;
}

.poster-quote {
  font-size: 18rpx;
  color: #cbd5e1;
  font-style: italic;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.poster-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 14rpx;
}

.footer-left {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.footer-t1 {
  font-size: 16rpx;
  color: #64748b;
}

.footer-t2 {
  font-size: 18rpx;
  color: #fde047;
  font-weight: 600;
}

.footer-qr {
  width: 72rpx;
  height: 72rpx;
  border-radius: 12rpx;
  background: #ffffff;
  padding: 4rpx;
  box-sizing: border-box;
  border: 1px solid rgba(212, 175, 55, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.qr-img {
  width: 100%;
  height: 100%;
}

/* 隐式 Canvas */
.offscreen-canvas {
  position: absolute;
  left: -9999px;
  top: -9999px;
  width: 750px;
  height: 1334px;
}

/* 底部操作按钮 */
.action-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 24rpx;
  padding-bottom: 24rpx;
}

.btn-save-album {
  width: 100%;
  height: 92rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #fde047 0%, #eab308 50%, #ca8a04 100%);
  color: #0b0c1b;
  font-size: 28rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 10rpx 30rpx rgba(234, 179, 8, 0.3);
  border: none;
}

.share-row {
  display: flex;
  gap: 16rpx;
  width: 100%;
}

.btn-share-friend,
.btn-share-timeline {
  flex: 1;
  height: 84rpx;
  border-radius: 20rpx;
  background: rgba(254, 240, 138, 0.12);
  border: 1px solid rgba(254, 240, 138, 0.35);
  color: #fef08a;
  font-size: 26rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 0;
  margin: 0;
}

.btn-share-friend::after,
.btn-share-timeline::after {
  border: none;
}

.btn-back {
  width: 100%;
  height: 80rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #94a3b8;
  font-size: 24rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon {
  font-size: 28rpx;
}
</style>
