<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <!-- 顶部概览与添加操作 -->
    <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-base font-bold text-slate-900 flex items-center">
          <i class="fa-solid fa-shield-halved text-rose-500 mr-2"></i> 违禁词内容风控字典
        </h2>
        <p class="text-xs text-slate-400 mt-0.5">
          用于在用户发起抽牌前对意念困惑文本实施前置拦截，严禁封建迷信预测吉凶，杜绝微信官方合规封禁
        </p>
      </div>

      <div class="flex items-center space-x-3">
        <el-input 
          v-model="searchQuery" 
          placeholder="搜索词条..." 
          size="default" 
          clearable 
          class="!w-48"
          :prefix-icon="SearchIcon"
        />
        <button 
          @click="showAddDialog = true" 
          class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-xl font-medium shadow-sm transition flex items-center whitespace-nowrap"
        >
          <i class="fa-solid fa-plus mr-1.5"></i> 新增敏感词
        </button>
      </div>
    </div>

    <!-- 词条展示卡片与列表 -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div class="flex items-center justify-between mb-4">
        <span class="text-xs font-semibold text-slate-500">
          已生效违禁词条：<span class="text-indigo-600 font-bold">{{ filteredWords.length }}</span> 个
        </span>
        <span class="text-[11px] text-slate-400">前端与服务端双层拦截</span>
      </div>

      <!-- 标签展示流 -->
      <div v-if="loading" class="text-center py-10">
        <i class="fa-solid fa-circle-notch fa-spin text-2xl text-indigo-500"></i>
      </div>

      <div v-else class="flex flex-wrap gap-2.5">
        <div 
          v-for="item in filteredWords" 
          :key="item.id"
          class="group flex items-center bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-3 py-1.5 rounded-xl text-xs transition duration-150"
        >
          <span class="text-slate-800 group-hover:text-rose-700 font-medium">{{ item.word }}</span>
          <span class="ml-2 text-[10px] text-slate-400 group-hover:text-rose-400 font-normal">
            {{ getCategoryLabel(item.category) }}
          </span>
          <button 
            @click="handleDelete(item)" 
            class="ml-2 text-slate-400 hover:text-rose-600 transition"
            title="删除此词条"
          >
            <i class="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 新增弹窗 -->
    <el-dialog v-model="showAddDialog" title="新增内容风控违禁词" width="400px" align-center>
      <el-form :model="addForm" label-position="top">
        <el-form-item label="违禁敏感词汇" required>
          <el-input v-model="addForm.word" placeholder="例如: 借寿、符咒、改命..." />
        </el-form-item>
        <el-form-item label="分类维度">
          <el-select v-model="addForm.category" class="w-full">
            <el-option label="封建迷信 / 算命预知" value="superstition" />
            <el-option label="政治敏感 / 违规涉密" value="politics" />
            <el-option label="恶意攻击 / 谩骂低俗" value="abuse" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end space-x-2">
          <el-button @click="showAddDialog = false">取消</el-button>
          <el-button type="primary" :loading="adding" @click="submitAdd">确认添加</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { apiGetSensitiveWords, apiAddSensitiveWord, apiDeleteSensitiveWord } from '../api/admin';

const SearchIcon = () => h('i', { class: 'fa-solid fa-magnifying-glass text-slate-400' });

const words = ref<any[]>([]);
const loading = ref(false);
const searchQuery = ref('');

const showAddDialog = ref(false);
const adding = ref(false);
const addForm = ref({
  word: '',
  category: 'superstition'
});

const fetchWords = async () => {
  loading.value = true;
  try {
    const res: any = await apiGetSensitiveWords();
    if (res.code === 'SUCCESS' && res.data) {
      words.value = res.data;
    }
  } catch (err: any) {
    ElMessage.error('获取违禁词库失败');
  } finally {
    loading.value = false;
  }
};

const getCategoryLabel = (cat: string) => {
  switch (cat) {
    case 'superstition': return '反迷信';
    case 'politics': return '涉政';
    case 'abuse': return '辱骂';
    default: return '通用';
  }
};

const filteredWords = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return words.value;
  return words.value.filter((w) => w.word.toLowerCase().includes(q));
});

const submitAdd = async () => {
  const trimmed = addForm.value.word.trim();
  if (!trimmed) {
    ElMessage.warning('请输入词汇');
    return;
  }
  adding.value = true;
  try {
    await apiAddSensitiveWord({ word: trimmed, category: addForm.value.category });
    ElMessage.success(`敏感词【${trimmed}】添加成功`);
    showAddDialog.value = false;
    addForm.value.word = '';
    fetchWords();
  } catch (err: any) {
    ElMessage.error(err.message || '添加失败');
  } finally {
    adding.value = false;
  }
};

const handleDelete = (item: any) => {
  ElMessageBox.confirm(`确定要移除违禁词【${item.word}】吗？移除后将不再拦截该词汇输入。`, '移除确认', {
    type: 'warning',
    confirmButtonText: '确定移除',
    cancelButtonText: '取消'
  }).then(async () => {
    try {
      await apiDeleteSensitiveWord(item.id);
      ElMessage.success('已移除该违禁词');
      fetchWords();
    } catch (e: any) {
      ElMessage.error('删除失败');
    }
  }).catch(() => {});
};

onMounted(() => {
  fetchWords();
});
</script>
