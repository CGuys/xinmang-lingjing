<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <!-- 顶部概览与搜索栏 -->
    <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-base font-bold text-slate-900 flex items-center">
          <i class="fa-solid fa-users-gear text-indigo-600 mr-2"></i> 用户资产与风控管理
        </h2>
        <p class="text-xs text-slate-400 mt-0.5">
          实时查看小程序用户静默注册资产、能量余额明细，支持人工异常纠偏与恶意黑产封禁
        </p>
      </div>

      <div class="flex items-center space-x-3">
        <el-input 
          v-model="searchQuery" 
          placeholder="搜索 OpenID 或 用户 ID..." 
          size="default" 
          clearable 
          class="!w-64"
          :prefix-icon="SearchIcon"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">查询</el-button>
      </div>
    </div>

    <!-- 用户数据表格 -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
      <el-table :data="users" v-loading="loading" style="width: 100%" class="text-xs">
        <el-table-column label="微信 OpenID" min-width="180">
          <template #default="{ row }">
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full" :class="[row.isBlacklisted ? 'bg-rose-500' : 'bg-emerald-500']"></span>
              <span class="font-mono text-slate-800 font-medium">{{ row.openid }}</span>
            </div>
            <div class="text-[10px] text-slate-400 font-mono mt-0.5">ID: {{ row.id }}</div>
          </template>
        </el-table-column>

        <el-table-column label="奖励点数" width="110" align="center">
          <template #default="{ row }">
            <span class="font-bold text-amber-600 text-sm font-mono">{{ row.bonusEnergy }}</span>
            <span class="text-[10px] text-slate-400 ml-1">点</span>
          </template>
        </el-table-column>

        <el-table-column label="上次消耗免费点" width="130" align="center">
          <template #default="{ row }">
            <span class="font-mono text-slate-600">{{ row.lastFreeDate || '暂未消耗' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="互动统计" width="140" align="center">
          <template #default="{ row }">
            <div class="text-[11px] text-slate-600">抽牌: <span class="font-bold text-indigo-600">{{ row.readingsCount }}</span> 次</div>
            <div class="text-[11px] text-slate-400">成功邀友: {{ row.invitationsCount }} 人</div>
          </template>
        </el-table-column>

        <el-table-column label="注册时间" width="160" align="center">
          <template #default="{ row }">
            <span class="text-slate-500 font-mono text-[11px]">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="账号状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isBlacklisted ? 'danger' : 'success'" size="small">
              {{ row.isBlacklisted ? '已封禁' : '正常' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="管控动作" width="180" align="center">
          <template #default="{ row }">
            <div class="flex items-center justify-center space-x-2">
              <el-button size="small" type="primary" link @click="openEnergyDialog(row)">
                人工充能
              </el-button>
              <el-button 
                size="small" 
                :type="row.isBlacklisted ? 'success' : 'danger'" 
                link 
                @click="toggleBlacklist(row)"
              >
                {{ row.isBlacklisted ? '解除封禁' : '封禁拉黑' }}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页栏 -->
      <div class="mt-5 flex justify-between items-center text-xs text-slate-500">
        <span>共 {{ total }} 位小程序注册用户</span>
        <el-pagination 
          v-model:current-page="page" 
          v-model:page-size="pageSize" 
          :total="total" 
          layout="prev, pager, next"
          @current-change="fetchUsers"
        />
      </div>
    </div>

    <!-- 人工补能对话框 -->
    <el-dialog v-model="energyDialogVisible" title="人工能量资产干预" width="400px" align-center>
      <div v-if="selectedUser" class="space-y-4">
        <div class="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
          <div>用户 OpenID: <span class="font-mono font-medium">{{ selectedUser.openid }}</span></div>
          <div>当前奖励点数余额: <span class="font-bold text-amber-600 font-mono">{{ selectedUser.bonusEnergy }}</span> 点</div>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-700 block mb-1.5">
            充值或扣减点数（负数代表扣减）：
          </label>
          <el-input-number v-model="energyAdjustment" :min="-100" :max="100" class="!w-full" />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end space-x-2">
          <el-button @click="energyDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="adjusting" @click="submitAdjustEnergy">确认调整</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { apiGetUsers, apiAdjustUserEnergy, apiToggleBlacklist } from '../api/admin';

const SearchIcon = () => h('i', { class: 'fa-solid fa-magnifying-glass text-slate-400' });

const users = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const searchQuery = ref('');
const loading = ref(false);

const energyDialogVisible = ref(false);
const selectedUser = ref<any>(null);
const energyAdjustment = ref(1);
const adjusting = ref(false);

const fetchUsers = async () => {
  loading.value = true;
  try {
    const res: any = await apiGetUsers({
      page: page.value,
      pageSize: pageSize.value,
      search: searchQuery.value
    });
    if (res.code === 'SUCCESS' && res.data) {
      users.value = res.data.items;
      total.value = res.data.total;
    }
  } catch (err: any) {
    ElMessage.error('获取用户列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  page.value = 1;
  fetchUsers();
};

const formatDate = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const openEnergyDialog = (user: any) => {
  selectedUser.value = user;
  energyAdjustment.value = 1;
  energyDialogVisible.value = true;
};

const submitAdjustEnergy = async () => {
  if (!selectedUser.value) return;
  adjusting.value = true;
  try {
    await apiAdjustUserEnergy(selectedUser.value.id, energyAdjustment.value);
    ElMessage.success('能量资产调整成功');
    energyDialogVisible.value = false;
    fetchUsers();
  } catch (err: any) {
    ElMessage.error(err.message || '调整失败');
  } finally {
    adjusting.value = false;
  }
};

const toggleBlacklist = (user: any) => {
  const nextStatus = !user.isBlacklisted;
  const tip = nextStatus ? `确定要将用户【${user.openid}】加入黑名单封禁吗？封禁后将无法使用任何抽牌及登录功能。` : `确定要解除用户【${user.openid}】的封禁状态吗？`;

  ElMessageBox.confirm(tip, nextStatus ? '封禁确认' : '解封确认', {
    type: nextStatus ? 'error' : 'info',
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(async () => {
    try {
      await apiToggleBlacklist(user.id, nextStatus);
      ElMessage.success(nextStatus ? '用户已被封禁' : '用户已解封');
      fetchUsers();
    } catch (e: any) {
      ElMessage.error('操作失败');
    }
  }).catch(() => {});
};

onMounted(() => {
  fetchUsers();
});
</script>
