<script setup lang="ts">
import { onLaunch, onShow } from "@dcloudio/uni-app";
import { useUserStore } from "./stores/user";

onLaunch((options) => {
  const userStore = useUserStore();
  // 捕获分享裂变带来的 inviter_id 参数
  if (options?.query && options.query.inviter_id) {
    userStore.setInviterId(options.query.inviter_id);
  }
  // 静默登录
  userStore.silentLogin();
});

onShow(() => {
  // 返回前台时刷新能量状态
  const userStore = useUserStore();
  if (userStore.isLoggedIn) {
    userStore.fetchProfile().catch(() => {});
  }
});
</script>

<style>
/* 全局页面样式与神秘学治愈系古典美学设计 */
page {
  background: radial-gradient(circle at 50% 15%, #181438 0%, #0c0a1a 50%, #05040a 100%);
  background-color: #070913;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  min-height: 100vh;
  box-sizing: border-box;
}

/* 金色流光文字 */
.gold-gradient-text {
  background: linear-gradient(135deg, #fef08a 0%, #d4af37 40%, #facc15 70%, #ca8a04 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  color: #facc15;
}

/* 神圣几何金色边框 */
.gold-border {
  border: 1px solid rgba(212, 175, 55, 0.55);
  box-shadow: 0 0 25px rgba(212, 175, 55, 0.18), inset 0 0 15px rgba(212, 175, 55, 0.12);
}

.gold-border-subtle {
  border: 1px solid rgba(212, 175, 55, 0.3);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

/* 微信小程序端 3D 卡牌立体翻转空间 */
.perspective-1000 {
  perspective: 1000px;
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

/* 3D 洗牌动画 */
@keyframes shuffleShake {
  0% { transform: translateY(0) rotate(0deg); }
  20% { transform: translateY(-16px) rotate(-6deg) scale(0.96); }
  40% { transform: translateY(12px) rotate(5deg) scale(1.02); }
  60% { transform: translateY(-8px) rotate(-3deg); }
  80% { transform: translateY(4px) rotate(2deg); }
  100% { transform: translateY(0) rotate(0deg); }
}
.is-shuffling {
  animation: shuffleShake 0.6s ease-in-out;
}

/* 触感轻微震动反馈动画 */
@keyframes tactileVibrate {
  0% { transform: translate(0, 0); }
  25% { transform: translate(-2px, 2px); }
  50% { transform: translate(2px, -2px); }
  75% { transform: translate(-1px, 1px); }
  100% { transform: translate(0, 0); }
}
.vibrate-active {
  animation: tactileVibrate 0.15s linear 2;
}

/* 星芒微光与脉冲 */
@keyframes cosmicGlow {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.75; transform: scale(1.05); }
}
.cosmic-pulse {
  animation: cosmicGlow 4s ease-in-out infinite;
}

/* 打字机光标脉冲 */
@keyframes cursorPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.cursor-blink {
  animation: cursorPulse 0.8s infinite;
}
</style>
