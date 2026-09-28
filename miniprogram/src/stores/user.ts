import { defineStore } from 'pinia';
import { apiWxLogin } from '../api/auth';
import { apiGetUserProfile } from '../api/user';
import { apiAcceptShare } from '../api/share';
import { apiRewardCallback } from '../api/ad';
import type { UserProfile } from '../types';

export const useUserStore = defineStore('user', {
  state: () => ({
    token: uni.getStorageSync('token') || '',
    userInfo: null as UserProfile | null,
    isInReview: false,
    isLoggingIn: false,
    inviterId: ''
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    dailyFreeLimit: (state): number => state.userInfo?.dailyFreeLimit ?? 1,
    freeEnergyUsedToday: (state): number => state.userInfo?.freeEnergyUsedToday ?? 0,
    freeEnergyAvailable: (state): number => state.userInfo?.freeEnergyAvailable ?? Math.max(0, (state.userInfo?.dailyFreeLimit ?? 1) - (state.userInfo?.freeEnergyUsedToday ?? 0)),
    totalEnergy: (state): number => {
      if (!state.userInfo) return 0;
      return state.userInfo.totalAvailable ?? (
        (state.userInfo.freeEnergyAvailable ?? (state.userInfo.hasFreeToday ? 1 : 0)) + (state.userInfo.bonusEnergy || 0)
      );
    },
    hasFreeToday: (state): boolean => state.userInfo?.hasFreeToday ?? ((state.userInfo?.freeEnergyAvailable ?? 0) > 0),
    bonusEnergy: (state): number => state.userInfo?.bonusEnergy ?? 0,
    userId: (state): string => state.userInfo?.userId || ''
  },

  actions: {
    /**
     * 微信端静默登录
     */
    async silentLogin(): Promise<boolean> {
      if (this.isLoggingIn) return false;
      this.isLoggingIn = true;

      try {
        // 若本地已有 token，先尝试拉取一次个人资料
        if (this.token) {
          try {
            await this.fetchProfile();
            this.isLoggingIn = false;
            if (this.inviterId) {
              this.acceptInviter(this.inviterId);
            }
            return true;
          } catch {
            this.token = '';
            uni.removeStorageSync('token');
          }
        }

        // 获取小程序登录 code
        let code = '';
        try {
          // @ts-ignore
          if (typeof wx !== 'undefined' && typeof wx.login === 'function') {
            const loginRes = await new Promise<any>((resolve, reject) => {
              // @ts-ignore
              wx.login({
                success: resolve,
                fail: reject
              });
            });
            code = loginRes.code || '';
          }
        } catch (e) {
          console.warn('[wx.login] 降级至环境 Mock 模式:', e);
        }

        // H5 / 模拟器或开发环境未提供原生 code 时的沙盒回退
        if (!code) {
          let devId = uni.getStorageSync('mock_user_dev_id');
          if (!devId) {
            devId = 'dev_' + Math.random().toString(36).substring(2, 10);
            uni.setStorageSync('mock_user_dev_id', devId);
          }
          code = `mock_${devId}`;
        }

        const res = await apiWxLogin(code);
        this.token = res.token;
        uni.setStorageSync('token', res.token);

        this.userInfo = {
          userId: res.user.id,
          openid: res.user.openid,
          dailyFreeLimit: res.user.dailyFreeLimit ?? 1,
          freeEnergyUsedToday: res.user.freeEnergyUsedToday ?? 0,
          freeEnergyAvailable: res.user.freeEnergyAvailable ?? (res.user.hasFreeToday ? (res.user.dailyFreeLimit ?? 1) : 0),
          hasFreeToday: res.user.hasFreeToday,
          bonusEnergy: res.user.bonusEnergy,
          totalAvailable: res.user.totalAvailable,
          lastFreeDate: res.user.lastFreeDate
        };

        if (this.inviterId) {
          this.acceptInviter(this.inviterId);
        }

        return true;
      } catch (err: any) {
        console.error('[silentLogin error]', err);
        return false;
      } finally {
        this.isLoggingIn = false;
      }
    },

    /**
     * 刷新用户个人资料与最新能量状态
     */
    async fetchProfile(): Promise<void> {
      if (!this.token) return;
      try {
        const profile = await apiGetUserProfile();
        this.userInfo = profile;
      } catch (err) {
        console.error('[fetchProfile error]', err);
        throw err;
      }
    },

    /**
     * 接受好友裂变邀请
     */
    async acceptInviter(inviterId: string): Promise<boolean> {
      if (!inviterId || inviterId === this.userId) return false;
      try {
        const res = await apiAcceptShare(inviterId);
        if (res.rewarded) {
          await this.fetchProfile();
          uni.showToast({
            title: '已与好友产生心灵共鸣',
            icon: 'success'
          });
        }
        this.inviterId = '';
        return true;
      } catch (err) {
        console.warn('[acceptInviter error]', err);
        return false;
      }
    },

    /**
     * 激励视频广告观看完成并核销加能量
     */
    async watchRewardedAd(): Promise<boolean> {
      const uid = this.userId;
      if (!uid) {
        await this.silentLogin();
      }

      // @ts-ignore
      if (typeof wx !== 'undefined' && typeof wx.createRewardedVideoAd === 'function') {
        return new Promise((resolve) => {
          // @ts-ignore
          const rewardedVideoAd = wx.createRewardedVideoAd({
            adUnitId: 'adunit-mock-default-15s'
          });

          rewardedVideoAd.onLoad(() => {});
          rewardedVideoAd.onError((err: any) => {
            console.warn('[RewardedVideoAd error]', err);
            uni.showToast({ title: '广告加载失败，已为您发放灵感补偿', icon: 'none' });
            // 失败时走保底模拟发放
            this.handleAdCallbackReward(`trans_${Date.now()}`).then(resolve);
          });

          rewardedVideoAd.onClose(async (status: { isEnded?: boolean }) => {
            if (status && status.isEnded) {
              const transId = `ad_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              const success = await this.handleAdCallbackReward(transId);
              resolve(success);
            } else {
              uni.showToast({ title: '需要完整观看完视频才能充盈灵感哦', icon: 'none' });
              resolve(false);
            }
          });

          rewardedVideoAd.show().catch(() => {
            rewardedVideoAd.load().then(() => rewardedVideoAd.show()).catch(() => {
              // 无法播放广告时保底
              this.handleAdCallbackReward(`trans_${Date.now()}`).then(resolve);
            });
          });
        });
      }

      // 非微信端或模拟环境走直连仿真激励
      const transId = `mock_trans_${Date.now()}`;
      return this.handleAdCallbackReward(transId);
    },

    async handleAdCallbackReward(transId: string): Promise<boolean> {
      try {
        await apiRewardCallback(transId, this.userId);
        await this.fetchProfile();
        uni.showToast({
          title: '🎬 灵感已充盈 +1 点',
          icon: 'success'
        });
        return true;
      } catch (e: any) {
        console.error('[handleAdCallbackReward error]', e);
        // 若服务端关闭了广告通道或已发放，本地仍尽量刷新
        await this.fetchProfile();
        return false;
      }
    },

    setInviterId(id: string) {
      this.inviterId = id;
    }
  }
});
