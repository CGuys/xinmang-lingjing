<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <!-- 顶部说明卡片 -->
    <div class="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-indigo-800/50 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-bold flex items-center">
          <i class="fa-solid fa-sliders text-amber-400 mr-2.5"></i> 平台业务策略中枢
        </h2>
        <p class="text-xs text-slate-300 mt-1">
          配置参数修改并保存后，将通过 Redis 集群即时广播至全网边缘接入层与微信小程序端，无需发版审核即可生效。
        </p>
      </div>
      <button 
        @click="saveConfig" 
        :disabled="saving"
        class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2.5 rounded-xl font-medium shadow-md transition flex items-center disabled:opacity-50"
      >
        <i :class="['fa-solid mr-2', saving ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk']"></i>
        <span>{{ saving ? '正在保存...' : '保存策略并热生效' }}</span>
      </button>
    </div>

    <!-- 表单卡片 -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8 space-y-8">
      <!-- 模块 1: 能量体系与防刷限制 -->
      <div>
        <div class="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-5">
          <div class="w-2 h-5 bg-indigo-600 rounded-full"></div>
          <h3 class="text-sm font-bold text-slate-900">能量体系与防刷规则 (Energy & Anti-cheat)</h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>每日赠送免费次数 (daily_free_limit)</span>
              <span class="text-slate-400 font-normal">默认: 1 次 / 自然日</span>
            </label>
            <el-input-number 
              v-model="form.daily_free_limit" 
              :min="1" 
              :max="10" 
              class="!w-full"
            />
            <p class="text-[11px] text-slate-400">每日 00:00 按自然日懒加载判定重置，未消耗不累加。</p>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>单日分享最高获得能量上限 (share_reward_limit)</span>
              <span class="text-slate-400 font-normal">默认: 3 点 / 天</span>
            </label>
            <el-input-number 
              v-model="form.share_reward_limit" 
              :min="0" 
              :max="20" 
              class="!w-full"
            />
            <p class="text-[11px] text-slate-400">单人单日通过邀请好友最多可充盈的点数，防机刷卡死成本。</p>
          </div>

          <div class="md:col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div class="text-xs font-semibold text-slate-900">开启裂变互惠补能通道 (share_reward_enabled)</div>
              <div class="text-[11px] text-slate-500 mt-0.5">关闭后，受邀用户进入小程序将不再为邀请人增加额外点数。</div>
            </div>
            <el-switch v-model="form.share_reward_enabled" active-color="#6366f1" />
          </div>
        </div>
      </div>

      <!-- 模块 2: 商业化激励视频广告 -->
      <div>
        <div class="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-5">
          <div class="w-2 h-5 bg-amber-500 rounded-full"></div>
          <h3 class="text-sm font-bold text-slate-900">商业化与激励视频广告 (Monetization & Ad)</h3>
        </div>

        <div class="space-y-5">
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div class="text-xs font-semibold text-slate-900">启用激励视频补能按钮 (ad_reward_enabled)</div>
              <div class="text-[11px] text-slate-500 mt-0.5">当能量不足时，小程序端是否显示“静心观看 15 秒短片获得 1 点”选项。</div>
            </div>
            <el-switch v-model="form.ad_reward_enabled" active-color="#f59e0b" />
          </div>

          <div class="space-y-1.5" v-if="form.ad_reward_enabled">
            <label class="text-xs font-semibold text-slate-700">微信激励视频广告位 ID (ad_unit_id)</label>
            <el-input v-model="form.ad_unit_id" placeholder="例如: adunit-67290184b29c..." />
            <p class="text-[11px] text-slate-400">从微信公众平台流量主后台获取的激励视频 Unit ID。</p>
          </div>
        </div>
      </div>

      <!-- 模块 3: 微信安全审查与伪装模式 -->
      <div>
        <div class="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-5">
          <div class="w-2 h-5 bg-rose-500 rounded-full"></div>
          <h3 class="text-sm font-bold text-slate-900">微信上线机审伪装模式 (WeChat Review Bypass)</h3>
        </div>

        <div class="p-4 rounded-xl border transition" :class="[
          form.is_in_review 
            ? 'bg-amber-50 border-amber-300' 
            : 'bg-slate-50 border-slate-200'
        ]">
          <div class="flex items-center justify-between">
            <div class="pr-6">
              <div class="text-xs font-bold text-slate-900 flex items-center">
                <span>开启微信提审安全伪装模式 (is_in_review)</span>
                <span v-if="form.is_in_review" class="ml-2 text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded font-normal">当前生效中</span>
              </div>
              <div class="text-[11px] text-slate-600 mt-1 leading-relaxed">
                开关开启时：小程序端关闭所有自定义输入框与反向提问，大模型流式解读返回经过预设脱敏的纯正向文学鸡汤，避开微信人工审核关于“未备案大模型应用”与“封建迷信”的类目机审驳回。审核通过后，可在此一键关闭，瞬间恢复完整大模型心理投射能力。
              </div>
            </div>
            <el-switch v-model="form.is_in_review" active-color="#f59e0b" />
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
        <button 
          @click="resetDefaults" 
          type="button" 
          class="text-xs text-slate-500 hover:text-slate-700 underline transition"
        >
          恢复为出厂推荐默认值
        </button>

        <button 
          @click="saveConfig" 
          :disabled="saving"
          class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-6 py-2.5 rounded-xl font-medium shadow transition flex items-center disabled:opacity-50"
        >
          <i :class="['fa-solid mr-2', saving ? 'fa-circle-notch fa-spin' : 'fa-check']"></i>
          <span>{{ saving ? '正在同步...' : '确定保存并同步' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { apiGetStrategy, apiUpdateStrategy } from '../api/admin';

const saving = ref(false);

const form = ref({
  daily_free_limit: 1,
  share_reward_limit: 3,
  share_reward_enabled: true,
  ad_reward_enabled: true,
  ad_unit_id: 'adunit-mock-default-15s',
  is_in_review: false,
});

const loadConfig = async () => {
  try {
    const res: any = await apiGetStrategy();
    if (res.code === 'SUCCESS' && res.data) {
      form.value = {
        daily_free_limit: Number(res.data.daily_free_limit) || 1,
        share_reward_limit: Number(res.data.share_reward_limit) || 3,
        share_reward_enabled: Boolean(res.data.share_reward_enabled),
        ad_reward_enabled: Boolean(res.data.ad_reward_enabled),
        ad_unit_id: res.data.ad_unit_id || 'adunit-mock-default-15s',
        is_in_review: Boolean(res.data.is_in_review),
      };
    }
  } catch (e) {
    // handled
  }
};

const saveConfig = async () => {
  saving.value = true;
  try {
    await apiUpdateStrategy(form.value);
    ElMessage.success('业务策略配置保存成功，已即时写入服务端与缓存');
  } catch (err: any) {
    ElMessage.error(err.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

const resetDefaults = () => {
  form.value = {
    daily_free_limit: 1,
    share_reward_limit: 3,
    share_reward_enabled: true,
    ad_reward_enabled: true,
    ad_unit_id: 'adunit-mock-default-15s',
    is_in_review: false,
  };
  ElMessage.info('已重置为默认值，请点击保存以生效');
};

onMounted(() => {
  loadConfig();
});
</script>
