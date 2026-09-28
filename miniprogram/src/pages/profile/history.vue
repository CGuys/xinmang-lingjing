<template>
  <view class="history-container">
    <!-- 顶部觉察数据看板 -->
    <view class="stats-card">
      <view class="stats-header">
        <text class="stats-title font-serif">我的心灵觉察轨迹</text>
        <text class="stats-total">累计记录: {{ totalCount }} 次</text>
      </view>

      <view class="stats-grid">
        <view class="stat-item">
          <text class="stat-label">历史记录</text>
          <text class="stat-val text-amber">{{ totalCount }} 次</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">主导能量</text>
          <text class="stat-val text-indigo">{{ dominantEnergy }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">高频原型</text>
          <text class="stat-val text-teal">{{ dominantCard }}</text>
        </view>
      </view>
    </view>

    <!-- 历史记录列表 -->
    <scroll-view
      class="history-scroll-list"
      scroll-y
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="list-wrapper" v-if="historyList.length > 0">
        <view
          v-for="item in historyList"
          :key="item.id"
          class="history-item gold-border-subtle"
          @click="viewHistoryDetail(item)"
        >
          <view class="item-left">
            <view class="item-thumb-box">
              <image
                class="item-thumb"
                :src="item.cardMeta?.image"
                mode="aspectFill"
              />
            </view>
            <view class="item-info">
              <view class="item-title-row">
                <text class="item-name font-serif">{{ item.cardName }}</text>
                <text class="item-orientation-tag">{{ item.orientation === 'reversed' ? '逆位' : '正位' }}</text>
              </view>
              <text class="item-quote">“{{ item.cardMeta?.quote || '倾听潜意识的细语，在日常中获得力量。' }}”</text>
              <text class="item-meta">{{ formatDate(item.createdAt) }} · {{ item.userQuestion || '每日例行觉察' }}</text>
            </view>
          </view>
          <text class="item-arrow">→</text>
        </view>

        <!-- 加载中或底线 -->
        <view class="list-footer">
          <text v-if="isLoadingMore" class="footer-text">正在回响过往记忆...</text>
          <text v-else-if="hasMore" class="footer-text">上拉加载更多</text>
          <text v-else class="footer-text">✦ 已呈现全部历史回响 ✦</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else-if="!isInitialLoading" class="empty-wrap">
        <text class="empty-icon">🌙</text>
        <text class="empty-title">暂无觉察记录</text>
        <text class="empty-desc">静下心来，抽取你在心芒灵境的第一张觉察卡吧</text>
        <button class="empty-btn" @click="goToDraw">抽取今日觉察卡</button>
      </view>
    </scroll-view>

    <!-- 底部悬浮抽牌按钮 -->
    <view class="bottom-draw-bar">
      <button class="btn-draw-today" @click="goToDraw">
        <text>抽取今日觉察卡</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { apiGetHistory } from '../../api/tarot';
import { useTarotStore } from '../../stores/tarot';
import { useUserStore } from '../../stores/user';
import type { HistoryRecord, TarotCard } from '../../types';

const tarotStore = useTarotStore();
const userStore = useUserStore();

const historyList = ref<HistoryRecord[]>([]);
const totalCount = ref(0);
const page = ref(1);
const pageSize = 15;
const hasMore = ref(false);
const isRefreshing = ref(false);
const isLoadingMore = ref(false);
const isInitialLoading = ref(true);

const dominantEnergy = computed(() => {
  if (historyList.value.length === 0) return '直觉沉潜';
  const first = historyList.value[0];
  return (first.cardMeta?.tags && first.cardMeta.tags[0]) || '破茧沉淀';
});

const dominantCard = computed(() => {
  if (historyList.value.length === 0) return '星星牌';
  return historyList.value[0]?.cardName || '愚者';
});

onShow(() => {
  loadData(1);
});

onPullDownRefresh(async () => {
  await loadData(1);
  uni.stopPullDownRefresh();
});

const onRefresh = async () => {
  isRefreshing.value = true;
  await loadData(1);
  isRefreshing.value = false;
};

const loadData = async (targetPage = 1) => {
  if (!userStore.isLoggedIn) {
    await userStore.silentLogin();
  }

  try {
    const res = await apiGetHistory(targetPage, pageSize);
    totalCount.value = res.total;
    if (targetPage === 1) {
      historyList.value = res.items;
    } else {
      historyList.value.push(...res.items);
    }
    page.value = targetPage;
    hasMore.value = historyList.value.length < res.total;
  } catch (err) {
    console.error('[loadHistory error]', err);
  } finally {
    isInitialLoading.value = false;
  }
};

const loadMore = () => {
  if (!hasMore.value || isLoadingMore.value) return;
  isLoadingMore.value = true;
  loadData(page.value + 1).finally(() => {
    isLoadingMore.value = false;
  });
};

const viewHistoryDetail = (item: HistoryRecord) => {
  // 组装回放卡牌对象
  const reconstructedCard: TarotCard = {
    index: item.cardId,
    nameCn: item.cardName,
    nameEn: item.cardMeta?.nameEn || '',
    slug: '',
    category: '',
    categoryName: '',
    image: item.cardMeta?.image || '',
    imageLarge: item.cardMeta?.imageLarge || item.cardMeta?.image || '',
    backImage: tarotStore.cardBackUrl || '',
    tags: item.cardMeta?.tags || [],
    quote: item.cardMeta?.quote || '',
    orientation: item.orientation as any,
    orientationName: item.orientation === 'reversed' ? '逆位' : '正位'
  };

  tarotStore.setActiveCard(reconstructedCard, item.userQuestion || '', item.id);

  if (item.readingResult) {
    tarotStore.streamingRawText = item.readingResult;
    tarotStore.isStreamDone = true;
    tarotStore.parseStructuredText(item.readingResult);
  }

  uni.navigateTo({
    url: '/pages/reading/result'
  });
};

const goToDraw = () => {
  uni.switchTab({
    url: '/pages/index/index'
  });
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '未知时间';
  const d = new Date(dateStr);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${m}-${day} ${h}:${min}`;
};
</script>

<style scoped>
.history-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 24rpx 32rpx;
  box-sizing: border-box;
}

/* 顶部数据看板 */
.stats-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 32rpx;
  padding: 24rpx 28rpx;
  backdrop-filter: blur(10px);
  margin-bottom: 24rpx;
  flex-shrink: 0;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18rpx;
}

.stats-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #ffffff;
}

.stats-total {
  font-size: 22rpx;
  color: #fde047;
  font-family: monospace;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.stat-item {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
  padding: 16rpx 12rpx;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.stat-label {
  font-size: 20rpx;
  color: #94a3b8;
}

.stat-val {
  font-size: 26rpx;
  font-weight: 700;
}

.text-amber { color: #fde047; }
.text-indigo { color: #a5b4fc; }
.text-teal { color: #5eead4; }

/* 列表区 */
.history-scroll-list {
  flex: 1;
  overflow: hidden;
  margin-bottom: 20rpx;
}

.list-wrapper {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  padding-right: 4rpx;
}

.history-item {
  background: rgba(8, 10, 24, 0.7);
  border-radius: 24rpx;
  padding: 20rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex: 1;
  overflow: hidden;
}

.item-thumb-box {
  width: 80rpx;
  height: 114rpx;
  border-radius: 14rpx;
  overflow: hidden;
  position: relative;
  background: #000000;
  border: 1px solid rgba(212, 175, 55, 0.4);
  flex-shrink: 0;
}

.item-thumb {
  width: 100%;
  height: 100%;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  flex: 1;
  overflow: hidden;
}

.item-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.item-name {
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
}

.item-orientation-tag {
  font-size: 18rpx;
  color: #fef08a;
  background: rgba(245, 158, 11, 0.25);
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.item-quote {
  font-size: 20rpx;
  color: #94a3b8;
  font-style: italic;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-meta {
  font-size: 18rpx;
  color: #64748b;
  font-family: monospace;
}

.item-arrow {
  font-size: 26rpx;
  color: #475569;
  margin-left: 12rpx;
}

.list-footer {
  text-align: center;
  padding: 24rpx 0;
}

.footer-text {
  font-size: 20rpx;
  color: #64748b;
}

/* 空状态 */
.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
  text-align: center;
}

.empty-icon {
  font-size: 64rpx;
  margin-bottom: 24rpx;
}

.empty-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 12rpx;
}

.empty-desc {
  font-size: 24rpx;
  color: #94a3b8;
  margin-bottom: 36rpx;
}

.empty-btn {
  height: 80rpx;
  padding: 0 48rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #fde047 0%, #eab308 50%, #ca8a04 100%);
  color: #0b0c1b;
  font-size: 26rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

/* 底部操作 */
.bottom-draw-bar {
  flex-shrink: 0;
  padding-bottom: 20rpx;
}

.btn-draw-today {
  width: 100%;
  height: 90rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #d97706 100%);
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(99, 102, 241, 0.3);
  border: none;
}
</style>
