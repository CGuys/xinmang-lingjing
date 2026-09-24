<template>
  <div class="grid grid-cols-1 xl:grid-cols-12 gap-8 max-w-7xl mx-auto">
    <!-- 左侧: AI 模型网关参数与 Prompt 编排 -->
    <div class="xl:col-span-7 space-y-6">
      
      <!-- 1. 顶部操作栏与配置面板 -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div>
            <div class="flex items-center space-x-2">
              <h3 class="text-base font-bold text-slate-900 flex items-center">
                <i class="fa-solid fa-brain text-indigo-600 mr-2.5 text-lg"></i> AI 厂商与模型服务网关
              </h3>
            </div>
            <p class="text-xs text-slate-400 mt-1">选择对应 AI 厂商自动预设免费模型与网关地址，各厂商配置独立持久化保存</p>
          </div>
          <div class="flex items-center space-x-2.5">          

            <button 
              type="button"
              @click="testConnection" 
              :disabled="testingConnection"
              class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3.5 py-2 rounded-xl font-medium border border-slate-200 transition flex items-center disabled:opacity-50"
            >
              <i :class="['fa-solid mr-1.5', testingConnection ? 'fa-circle-notch fa-spin text-indigo-600' : 'fa-network-wired text-indigo-500']"></i>
              <span>{{ testingConnection ? '检测链路中...' : '测试网关连通性' }}</span>
            </button>

            <button 
              type="button"
              @click="saveAiConfig" 
              :disabled="saving"
              class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-xl font-medium shadow-sm transition flex items-center disabled:opacity-50"
            >
              <i :class="['fa-solid mr-1.5', saving ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk']"></i>
              <span>{{ saving ? '保存中...' : '保存 AI 配置' }}</span>
            </button>
          </div>
        </div>

        <!-- 连通性测试结果展示卡片 -->
        <transition name="el-fade-in">
          <div v-if="testResult" class="p-4 rounded-xl border text-xs transition duration-200" :class="[
            testResult.ok 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : testResult.status === 'INSUFFICIENT_BALANCE'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-rose-800'
          ]">
            <div class="flex items-start justify-between">
              <div class="flex items-start space-x-2.5">
                <i :class="[
                  testResult.ok ? 'fa-solid fa-circle-check text-emerald-500 text-base mt-0.5' :
                  testResult.status === 'INSUFFICIENT_BALANCE' ? 'fa-solid fa-triangle-exclamation text-amber-500 text-base mt-0.5' :
                  'fa-solid fa-circle-xmark text-rose-500 text-base mt-0.5'
                ]"></i>
                <div class="space-y-1">
                  <div class="font-bold flex items-center space-x-2">
                    <span class="text-sm">
                      {{ testResult.ok ? '网关通信与模型推理正常' : (testResult.status === 'INSUFFICIENT_BALANCE' ? '鉴权通过但账户余额不足' : '网关连接失败') }}
                    </span>
                    <span v-if="testResult.latencyMs > 0" class="text-[10px] px-2 py-0.5 rounded-full bg-black/5 font-mono font-medium">
                      {{ testResult.latencyMs }}ms
                    </span>
                  </div>
                  <div class="leading-relaxed text-[11px] opacity-90">{{ testResult.message }}</div>
                  <div v-if="testResult.balance" class="text-[11px] font-mono text-amber-700 bg-amber-100/50 px-2 py-1 rounded inline-block">
                    账户可用总余额: ¥ {{ testResult.balance.balance_infos?.[0]?.total_balance || '0.00' }} 元
                  </div>
                </div>
              </div>
              <button @click="testResult = null" class="text-slate-400 hover:text-slate-600 transition p-1">
                <i class="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
          </div>
        </transition>

        <!-- 2. AI 厂商可视化卡片式选择器 -->
        <div class="space-y-2">
          <label class="text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span>选择 AI 服务厂商 (点击切换)</span>
            <span class="text-[11px] text-slate-400">切换后自动载入该厂商已保存的独立配置与免费模型</span>
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div
              v-for="(preset, key) in PROVIDER_PRESETS"
              :key="key"
              @click="switchProvider(key)"
              :class="[
                aiConfig.provider === key
                  ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 text-indigo-950 font-semibold'
                  : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50/70 text-slate-700',
                'p-3 rounded-xl border cursor-pointer transition-all duration-150 flex flex-col justify-between relative select-none'
              ]"
            >
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center space-x-1.5">
                  <i :class="[preset.icon, 'text-sm', aiConfig.provider === key ? 'text-indigo-600' : 'text-slate-400']"></i>
                  <span class="text-xs">{{ preset.name }}</span>
                </div>
                <div v-if="aiConfig.provider === key" class="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div>
              </div>
              <div class="flex items-center justify-between text-[10px]">
                <span 
                  :class="[
                    preset.freeTag 
                      ? 'bg-emerald-100/80 text-emerald-700 font-medium' 
                      : 'bg-slate-100 text-slate-500',
                    'px-1.5 py-0.5 rounded'
                  ]"
                >
                  {{ preset.tag }}
                </span>
                <span class="text-slate-400 font-mono truncate max-w-[85px]" :title="preset.defaultModel">
                  {{ preset.defaultModel }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 折叠状态下的精简概览条 (配置已完成模式，始终保持可切换厂商且清爽展示) -->
        <transition name="el-fade-in">
          <div v-if="isConfigCollapsed" class="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/80 text-xs gap-2.5">
            <div class="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-slate-600">
              <div class="flex items-center space-x-1.5">
                <span class="text-slate-400">生效厂商:</span>
                <span class="font-semibold text-slate-800 flex items-center space-x-1">
                  <i :class="[currentPreset.icon, 'text-indigo-600 text-xs']"></i>
                  <span>{{ currentPreset.name }}</span>
                </span>
              </div>
              <div class="flex items-center space-x-1.5">
                <span class="text-slate-400">调用模型:</span>
                <span class="font-mono font-medium text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200/80 shadow-xs">{{ aiConfig.model || '未设定' }}</span>
                <span v-if="isModelFree(aiConfig.model)" class="text-emerald-700 text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-200/50">免费</span>
              </div>
              <div class="hidden sm:flex items-center space-x-1.5">
                <span class="text-slate-400">Base URL:</span>
                <span class="font-mono text-slate-500 truncate max-w-[200px]" :title="aiConfig.baseUrl">{{ aiConfig.baseUrl }}</span>
              </div>
              <div class="flex items-center space-x-1.5">
                <span class="text-slate-400">API Key:</span>
                <span :class="aiConfig.apiKey ? 'text-emerald-600 font-medium' : 'text-amber-600'">
                  {{ aiConfig.apiKey ? '已配置 (••••••••)' : '未填写 (内置疗愈引擎)' }}
                </span>
              </div>
            </div>
            <button 
              type="button" 
              @click="isConfigCollapsed = false"
              class="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center self-start sm:self-center transition"
            >
              <span>展开详细参数</span>
              <i class="fa-solid fa-sliders ml-1.5 text-[11px]"></i>
            </button>
          </div>
        </transition>

        <!-- 3. 当前厂商详细配置表单 (展开状态，带数据验证) -->
        <transition name="el-zoom-in-top">
          <el-form 
            v-if="!isConfigCollapsed"
            ref="configFormRef" 
            :model="aiConfig" 
            :rules="formRules" 
            label-position="top"
            class="space-y-4 pt-2 border-t border-slate-100"
          >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <!-- API 基础地址 Base URL -->
            <el-form-item prop="baseUrl">
              <template #label>
                <div class="flex items-center justify-between w-full text-xs">
                  <span class="font-semibold text-slate-700">API 基础地址 (Base URL)</span>
                  <button 
                    type="button" 
                    @click="restoreCurrentProviderDefaults"
                    class="text-indigo-600 hover:text-indigo-700 text-[11px] hover:underline flex items-center"
                  >
                    <i class="fa-solid fa-arrow-rotate-left mr-1 text-[10px]"></i> 恢复官方默认
                  </button>
                </div>
              </template>
              <el-input 
                v-model="aiConfig.baseUrl" 
                placeholder="例如: https://open.bigmodel.cn/api/paas/v4"
                clearable
                @input="handleConfigInput"
              >
                <template #prefix>
                  <i class="fa-solid fa-link text-slate-400 text-xs"></i>
                </template>
              </el-input>
              <div class="text-[11px] text-slate-400 mt-1">支持官方 API、私有化部署网关或 OneAPI / 聚合中转地址。</div>
            </el-form-item>

            <!-- 模型名称选择 (Model Name) -->
            <el-form-item prop="model">
              <template #label>
                <div class="flex items-center justify-between w-full text-xs">
                  <span class="font-semibold text-slate-700">模型名称 (Model Name)</span>
                  <span v-if="isModelFree(aiConfig.model)" class="text-emerald-600 text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                    当前为免费模型
                  </span>
                </div>
              </template>
              <el-select 
                v-model="aiConfig.model" 
                class="w-full" 
                filterable 
                allow-create 
                default-first-option
                placeholder="请选择或直接输入模型名称"
                @change="handleConfigInput"
              >
                <el-option 
                  v-for="item in currentPreset.models" 
                  :key="item.value" 
                  :label="item.label" 
                  :value="item.value"
                >
                  <div class="flex items-center justify-between py-1">
                    <span :class="[item.isFree ? 'text-emerald-700 font-semibold' : 'text-slate-800']">
                      {{ item.value }}
                    </span>
                    <span 
                      v-if="item.badge" 
                      :class="[
                        item.isFree ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-slate-100 text-slate-500',
                        'text-[10px] px-1.5 py-0.5 rounded ml-2'
                      ]"
                    >
                      {{ item.badge }}
                    </span>
                  </div>
                </el-option>
              </el-select>
              <div class="text-[11px] text-slate-400 mt-1">支持下拉选取预设模型，或手动键入任意自定义模型名称。</div>
            </el-form-item>

            <!-- API Key -->
            <el-form-item class="md:col-span-2" prop="apiKey">
              <template #label>
                <div class="flex items-center justify-between w-full text-xs">
                  <span class="font-semibold text-slate-700">
                    {{ currentPreset.name }} 专属 API Key
                  </span>
                  <a 
                    v-if="currentPreset.portalUrl" 
                    :href="currentPreset.portalUrl" 
                    target="_blank" 
                    class="text-indigo-600 hover:underline flex items-center font-medium text-[11px]"
                  >
                    前往 {{ currentPreset.name }} 官网获取密钥 <i class="fa-solid fa-arrow-up-right-from-square ml-1 text-[9px]"></i>
                  </a>
                </div>
              </template>
              <el-input 
                v-model="aiConfig.apiKey" 
                type="password" 
                show-password 
                placeholder="请输入该厂商对应的 API Key (如 sk-...)"
                clearable
                @input="handleConfigInput"
              >
                <template #prefix>
                  <i class="fa-solid fa-key text-slate-400 text-xs"></i>
                </template>
              </el-input>
              <div class="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>各厂商 API Key 独立加密存储，切换厂商时自动带出。留空时自动降级为内置心理学引擎。</span>
              </div>
            </el-form-item>

            <!-- 采样参数 -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs text-slate-700">
                <span class="font-semibold">发散度 (Temperature)</span>
                <span class="font-mono text-indigo-600 font-medium">{{ aiConfig.temperature }}</span>
              </div>
              <el-slider 
                v-model="aiConfig.temperature" 
                :min="0" 
                :max="1.5" 
                :step="0.05" 
                @change="handleConfigInput"
              />
            </div>

            <div class="space-y-1">
              <div class="flex justify-between text-xs text-slate-700">
                <span class="font-semibold">Top P 采样 (Top_P)</span>
                <span class="font-mono text-indigo-600 font-medium">{{ aiConfig.topP }}</span>
              </div>
              <el-slider 
                v-model="aiConfig.topP" 
                :min="0.1" 
                :max="1" 
                :step="0.05" 
                @change="handleConfigInput"
              />
            </div>

            <!-- 底部便捷收起按钮 -->
            <div class="md:col-span-2 flex justify-end pt-2 border-t border-slate-50">
              <button 
                type="button" 
                @click="toggleCollapse"
                class="text-xs text-slate-500 hover:text-indigo-600 flex items-center transition"
              >
                <span>配置完毕，收起该板块</span>
                <i class="fa-solid fa-chevron-up ml-1.5 text-[10px]"></i>
              </button>
            </div>

          </div>
        </el-form>
      </transition>
      </div>

      <!-- 4. System Prompt 编排设计器 -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 class="text-sm font-bold text-slate-900 flex items-center">
              <i class="fa-solid fa-code text-indigo-600 mr-2"></i> System Prompt 人设与输出规范
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">严格注入心理学疗愈指引，杜绝论断吉凶，合规上线微信小程序平台</p>
          </div>
          <button 
            type="button" 
            @click="resetDefaultPrompt" 
            class="text-xs text-indigo-600 hover:text-indigo-800 underline transition"
          >
            重置默认 Prompt
          </button>
        </div>

        <!-- 占位符标签快速插入提示 -->
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="text-slate-400 text-xs">点击插入占位符：</span>
          <button 
            type="button"
            v-for="chip in promptChips" 
            :key="chip.tag"
            @click="insertPromptChip(chip.tag)"
            class="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-mono text-[11px] border border-indigo-200 transition flex items-center"
            :title="chip.desc"
          >
            <span>{{ chip.tag }}</span>
            <span class="text-[10px] text-indigo-400 ml-1">({{ chip.label }})</span>
          </button>
        </div>

        <el-input 
          v-model="aiConfig.systemPrompt" 
          type="textarea" 
          :rows="13" 
          placeholder="请输入 System Prompt..."
          class="font-mono text-xs"
        />
      </div>
    </div>

    <!-- 右侧: 拟真 iPhone 3D 抽牌沙盒交互台 -->
    <div class="xl:col-span-5 flex flex-col items-center">
      <div class="w-full max-w-sm">
        <div class="flex items-center justify-between mb-3 text-xs text-slate-500">
          <span class="font-medium flex items-center">
            <i class="fa-solid fa-mobile-screen text-indigo-600 mr-1.5"></i> 小程序真机端流式模拟沙盒
          </span>
          <button @click="resetSimulator" class="text-slate-400 hover:text-indigo-600 transition flex items-center">
            <i class="fa-solid fa-rotate-right mr-1"></i> 重置模拟器
          </button>
        </div>

        <!-- 模拟器控制栏 -->
        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs mb-4 space-y-2.5 text-xs">
          <div class="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-slate-100">
            <span class="flex items-center">
              <span class="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              当前连通：<strong class="text-indigo-600 ml-1">{{ currentPreset.name }}</strong>
            </span>
            <span class="font-mono text-slate-400 truncate max-w-[120px]">{{ aiConfig.model }}</span>
          </div>

          <div class="flex items-center space-x-2">
            <span class="text-slate-500 w-16">测试卡牌:</span>
            <el-select v-model="selectedCardIndex" class="flex-1" size="small" @change="handleCardChange">
              <el-option 
                v-for="c in demoCards" 
                :key="c.index" 
                :label="`${c.nameCn} (${c.roman || '#' + c.index})`" 
                :value="c.index" 
              />
            </el-select>
          </div>

          <div class="flex items-center space-x-2">
            <span class="text-slate-500 w-16">正逆位:</span>
            <el-radio-group v-model="selectedOrientation" size="small">
              <el-radio-button label="upright">正位</el-radio-button>
              <el-radio-button label="reversed">逆位</el-radio-button>
            </el-radio-group>
          </div>

          <div class="flex items-center space-x-2">
            <span class="text-slate-500 w-16">模拟困惑:</span>
            <el-input v-model="simulatedQuestion" size="small" placeholder="输入困惑测试敏感词/流式" class="flex-1" />
          </div>

          <div class="flex items-center justify-between pt-1 border-t border-slate-100">
            <button 
              type="button"
              @click="toggleEnergyDepleted"
              :class="[isEnergyDepleted ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200', 'px-2.5 py-1 rounded border text-[11px] font-medium transition']"
            >
              模拟能量耗尽: {{ isEnergyDepleted ? '开 (触发弹窗)' : '关' }}
            </button>
            <button 
              type="button"
              @click="triggerDrawStream" 
              :disabled="isStreaming"
              class="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded font-medium text-[11px] shadow-sm transition disabled:opacity-50"
            >
              <i :class="['fa-solid mr-1', isStreaming ? 'fa-spinner fa-spin' : 'fa-play']"></i>
              <span>{{ isStreaming ? '正在解牌...' : '立即模拟翻牌' }}</span>
            </button>
          </div>
        </div>

        <!-- 拟真 iPhone 机身 -->
        <div class="relative w-[340px] h-[680px] bg-slate-950 rounded-[44px] p-3 mx-auto iphone-shadow border-[4px] border-slate-700/80 flex flex-col overflow-hidden">
          <!-- 听筒与灵动岛 -->
          <div class="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-30 flex items-center justify-end px-2">
            <div class="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800"></div>
          </div>

          <!-- 手机屏幕内容视口 -->
          <div class="w-full h-full bg-slate-900 rounded-[36px] overflow-hidden flex flex-col relative text-slate-100 font-serif-sc">
            <!-- 小程序顶部胶囊 & 状态指示 -->
            <div class="h-12 pt-3 px-4 flex items-center justify-between text-[11px] text-slate-400 z-20">
              <span class="flex items-center space-x-1 font-mono">
                <span>9:41</span>
              </span>
              <div class="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-slate-800/80 text-[10px] text-amber-300 border border-amber-400/20">
                <i class="fa-solid fa-sparkles text-[9px]"></i>
                <span>今日灵感: {{ isEnergyDepleted ? '0/1' : '1/1' }}</span>
              </div>
            </div>

            <!-- 手机内卡牌主舞台 -->
            <div class="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col items-center justify-start space-y-4">
              <!-- 困惑展示条 -->
              <div class="w-full bg-slate-800/50 backdrop-blur border border-slate-700/40 rounded-xl px-3 py-2 text-center text-xs text-slate-300">
                <span class="text-amber-400/80 mr-1">“</span>
                <span>{{ simulatedQuestion || '当下心绪 · 觉察与沉淀' }}</span>
                <span class="text-amber-400/80 ml-1">”</span>
              </div>

              <!-- 3D 翻转卡牌 -->
              <div class="w-44 h-64 card-perspective-stage cursor-pointer" @click="toggleCardFlip">
                <div 
                  class="w-full h-full relative transform-style-3d transition-transform duration-700 rounded-xl shadow-2xl"
                  :class="[
                    isFlipped ? 'rotate-y-180' : '',
                    isShuffling ? 'is-shuffling' : ''
                  ]"
                >
                  <!-- 卡牌背面 -->
                  <div class="absolute inset-0 backface-hidden rounded-xl overflow-hidden gold-border bg-slate-950 flex flex-col items-center justify-center p-2">
                    <div class="w-full h-full border border-amber-400/30 rounded-lg flex flex-col items-center justify-center relative p-3">
                      <div class="w-20 h-20 rounded-full border border-amber-400/30 flex items-center justify-center animate-spin-slow">
                        <i class="fa-solid fa-dharmachakra text-amber-400/50 text-3xl"></i>
                      </div>
                      <div class="text-[10px] font-cinzel text-amber-300/80 tracking-widest mt-3">XINMANG</div>
                      <div class="text-[9px] text-slate-400 mt-1">点击翻开觉察</div>
                    </div>
                  </div>

                  <!-- 卡牌正面 -->
                  <div class="absolute inset-0 backface-hidden rotate-y-180 rounded-xl overflow-hidden gold-border bg-slate-950 flex flex-col">
                    <img 
                      :src="currentCard.image" 
                      :alt="currentCard.nameCn" 
                      class="w-full h-48 object-cover"
                      :class="[selectedOrientation === 'reversed' ? 'rotate-180' : '']"
                    />
                    <div class="flex-1 bg-slate-900/90 p-2 flex flex-col justify-center items-center text-center">
                      <div class="text-xs font-bold text-amber-300 font-cinzel">
                        {{ currentCard.nameCn }} · {{ selectedOrientation === 'reversed' ? '逆位' : '正位' }}
                      </div>
                      <div class="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]">
                        {{ currentCard.tags ? currentCard.tags.join(' · ') : '' }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 解牌流式打字机区域 -->
              <div class="w-full bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs leading-relaxed text-slate-200 min-h-[140px] relative">
                <div class="text-[10px] text-amber-400/80 mb-1 flex items-center justify-between font-mono">
                  <span>AI 潜意识心理投射解读</span>
                  <span v-if="isStreaming" class="flex items-center text-indigo-400">
                    <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-1 animate-pulse"></span> 流式输出中
                  </span>
                </div>
                <div class="whitespace-pre-line text-[11px] text-slate-300">
                  {{ phoneStreamText || (isFlipped ? '准备连接大模型 API 网关...' : '点击上方卡牌开始抽取与解读') }}
                  <span v-if="isStreaming" class="inline-block w-1.5 h-3 bg-amber-400 animate-pulse ml-0.5"></span>
                </div>
              </div>
            </div>

            <!-- 能量耗尽弹窗模拟 -->
            <div v-if="showEnergyAlert" class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
              <div class="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 text-center space-y-4 shadow-2xl">
                <div class="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center text-xl">
                  <i class="fa-solid fa-battery-empty"></i>
                </div>
                <div>
                  <h4 class="text-sm font-bold text-white">今日灵感已消耗完毕</h4>
                  <p class="text-xs text-slate-400 mt-1">传递能量给好友，或静心观看短片即可重新充盈灵感点。</p>
                </div>
                <div class="space-y-2">
                  <button @click="simulateShareReward" class="w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl text-xs font-medium shadow">
                    <i class="fa-solid fa-share-nodes mr-1.5"></i> 分享给好友 (+1 灵感点)
                  </button>
                  <button @click="simulateAdReward" class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-medium border border-amber-400/20">
                    <i class="fa-solid fa-film mr-1.5"></i> 观看 15 秒短片 (+1 点)
                  </button>
                </div>
                <button @click="showEnergyAlert = false" class="text-xs text-slate-500 hover:text-slate-400">稍后充盈</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { apiGetAiConfig, apiUpdateAiConfig, apiGetCards, apiTestAiConnection } from '../api/admin';

// 6 大核心主流 AI 厂商预设模型与官方默认地址
const PROVIDER_PRESETS: Record<string, {
  name: string;
  tag: string;
  freeTag: boolean;
  icon: string;
  defaultBaseUrl: string;
  defaultModel: string;
  isFree?: boolean;
  portalUrl: string;
  models: Array<{ label: string; value: string; isFree?: boolean; badge?: string }>;
}> = {
  glm: {
    name: '智谱 AI (GLM)',
    tag: '永久免费模型',
    freeTag: true,
    icon: 'fa-solid fa-bolt',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    isFree: true,
    portalUrl: 'https://open.bigmodel.cn/',
    models: [
      { label: 'glm-4-flash (【永久免费】极速响应首选)', value: 'glm-4-flash', isFree: true, badge: '永久免费' },
      { label: 'glm-4-flashx (极速轻量增强版)', value: 'glm-4-flashx', badge: '轻量极速' },
      { label: 'glm-4-air (高性价比主力版)', value: 'glm-4-air' },
      { label: 'glm-4-plus (高智力全能旗舰版)', value: 'glm-4-plus', badge: '旗舰' }
    ]
  },
  siliconflow: {
    name: '硅基流动 (SiliconFlow)',
    tag: '免费模型+赠额度',
    freeTag: true,
    icon: 'fa-solid fa-microchip',
    defaultBaseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'Qwen/Qwen2.5-7B-Instruct',
    isFree: true,
    portalUrl: 'https://siliconflow.cn/',
    models: [
      { label: 'Qwen/Qwen2.5-7B-Instruct (【永久免费】千问2.5)', value: 'Qwen/Qwen2.5-7B-Instruct', isFree: true, badge: '永久免费' },
      { label: 'THUDM/glm-4-9b-chat (【永久免费】智谱开源版)', value: 'THUDM/glm-4-9b-chat', isFree: true, badge: '永久免费' },
      { label: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B (【永久免费】R1蒸馏推理)', value: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B', isFree: true, badge: '永久免费' },
      { label: 'deepseek-ai/DeepSeek-V3 (满血 V3 官方版)', value: 'deepseek-ai/DeepSeek-V3', badge: '官方满血' },
      { label: 'deepseek-ai/DeepSeek-R1 (满血 R1 深度思考)', value: 'deepseek-ai/DeepSeek-R1', badge: '深度思考' }
    ]
  },
  qwen: {
    name: '阿里云百炼 · 通义千问 (Qwen)',
    tag: '新户赠海量Token',
    freeTag: true,
    icon: 'fa-solid fa-cloud',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-turbo',
    isFree: true,
    portalUrl: 'https://bailian.console.aliyun.com/',
    models: [
      { label: 'qwen-turbo (【新户送数百万Token】极速版)', value: 'qwen-turbo', isFree: true, badge: '高额赠送' },
      { label: 'qwen-plus (能力均衡主力模型)', value: 'qwen-plus', badge: '主力推荐' },
      { label: 'qwen-max (通义千问超大旗舰)', value: 'qwen-max', badge: '旗舰' }
    ]
  },
  baidu_qianfan: {
    name: '百度千帆 (文心一言)',
    tag: '永久免费模型',
    freeTag: true,
    icon: 'fa-solid fa-feather-pointed',
    defaultBaseUrl: 'https://qianfan.baidubce.com/v2',
    defaultModel: 'ernie-speed-8k',
    isFree: true,
    portalUrl: 'https://console.bce.baidu.com/qianfan/',
    models: [
      { label: 'ernie-speed-8k (【永久免费】轻量快速版)', value: 'ernie-speed-8k', isFree: true, badge: '永久免费' },
      { label: 'ernie-lite-8k (【永久免费】体验轻量版)', value: 'ernie-lite-8k', isFree: true, badge: '永久免费' },
      { label: 'ernie-4.0-8k (文心 4.0 旗舰)', value: 'ernie-4.0-8k', badge: '旗舰' }
    ]
  },
  deepseek: {
    name: 'DeepSeek (官方原厂)',
    tag: '需充值使用',
    freeTag: false,
    icon: 'fa-solid fa-compass',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    portalUrl: 'https://platform.deepseek.com/',
    models: [
      { label: 'deepseek-chat (DeepSeek-V3 官方对话模型)', value: 'deepseek-chat', badge: 'V3 对话' },
      { label: 'deepseek-reasoner (DeepSeek-R1 官方深度推理)', value: 'deepseek-reasoner', badge: 'R1 推理' }
    ]
  },
  openai_compatible: {
    name: 'OpenAI 兼容中转 / 自定义',
    tag: '自定义中转',
    freeTag: false,
    icon: 'fa-solid fa-server',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    portalUrl: '',
    models: [
      { label: 'gpt-4o-mini (轻量经济模型)', value: 'gpt-4o-mini', badge: '轻量' },
      { label: 'gpt-4o (全能多模态旗舰)', value: 'gpt-4o', badge: '全能旗舰' },
      { label: 'deepseek-chat (中转节点)', value: 'deepseek-chat' }
    ]
  }
};

const promptChips = [
  { tag: '{card_name}', label: '卡牌名', desc: '抽取的卡牌中文名称，如“星星”' },
  { tag: '{orientation}', label: '正逆位', desc: '卡牌方向：正位 / 逆位' },
  { tag: '{question}', label: '来访者困惑', desc: '用户输入的当下困惑心绪文本' },
  { tag: '{insight}', label: '荣格投射', desc: '心理学潜意识意象投射原型' },
  { tag: '{tags}', label: '心理标签', desc: '卡牌提炼的核心心理标签' },
];

const configFormRef = ref<FormInstance>();
const saving = ref(false);
const testingConnection = ref(false);
const testResult = ref<any>(null);

// 表单验证规则
const formRules: FormRules = {
  baseUrl: [
    { required: true, message: '请输入 API 基础地址 (Base URL)', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (!value || !value.trim()) {
          callback(new Error('API 基础地址不能为空'));
        } else if (!/^https?:\/\/.+/i.test(value.trim())) {
          callback(new Error('API 地址格式无效，必须以 http:// 或 https:// 开头'));
        } else {
          callback();
        }
      },
      trigger: ['blur', 'change']
    }
  ],
  model: [
    { required: true, message: '请选择或输入模型名称 (Model Name)', trigger: ['blur', 'change'] }
  ]
};

// 各厂商独立保存的配置档案 (Provider Profiles)
const providerProfiles = ref<Record<string, {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  topP?: number;
}>>({});

// 当前活动表单状态
const aiConfig = ref({
  provider: 'glm',
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  apiKey: '',
  model: 'glm-4-flash',
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 1000,
  systemPrompt: ''
});

// 当前厂商预设元数据
const currentPreset = computed(() => {
  return PROVIDER_PRESETS[aiConfig.value.provider] || PROVIDER_PRESETS['glm'];
});

// 检查当前模型是否是免费模型
const isModelFree = (modelName: string) => {
  const found = currentPreset.value.models.find(m => m.value === modelName);
  return Boolean(found?.isFree);
};

// 切换厂商：保存旧厂商状态，无缝载入新厂商配置档案（若无档案则代入默认地址与免费模型）
const switchProvider = (newProvider: string) => {
  if (aiConfig.value.provider === newProvider) return;
  
  // 1. 暂存当前厂商的最新输入
  syncCurrentToProfile();
  
  // 2. 切换当前厂商标识
  aiConfig.value.provider = newProvider;
  testResult.value = null;
  const preset = PROVIDER_PRESETS[newProvider] || PROVIDER_PRESETS['glm'];

  // 3. 读取目标厂商的档案，如有则恢复；如无则赋出厂默认地址与默认免费模型
  if (providerProfiles.value[newProvider]) {
    const saved = providerProfiles.value[newProvider];
    aiConfig.value.baseUrl = saved.baseUrl || preset.defaultBaseUrl;
    aiConfig.value.apiKey = saved.apiKey || '';
    aiConfig.value.model = saved.model || preset.defaultModel;
    if (saved.temperature !== undefined) aiConfig.value.temperature = saved.temperature;
    if (saved.topP !== undefined) aiConfig.value.topP = saved.topP;
  } else {
    aiConfig.value.baseUrl = preset.defaultBaseUrl;
    aiConfig.value.model = preset.defaultModel;
    aiConfig.value.apiKey = '';
  }

  // 4. 同步至当前暂存档案
  syncCurrentToProfile();
  configFormRef.value?.clearValidate();
};

// 监听表单输入实时同步至当前厂商档案
const handleConfigInput = () => {
  syncCurrentToProfile();
};

// 恢复当前厂商出厂默认地址与免费模型
const restoreCurrentProviderDefaults = () => {
  const preset = currentPreset.value;
  aiConfig.value.baseUrl = preset.defaultBaseUrl;
  aiConfig.value.model = preset.defaultModel;
  syncCurrentToProfile();
  configFormRef.value?.clearValidate();
  ElMessage.info(`已恢复 ${preset.name} 默认官方地址与免费推荐模型【${preset.defaultModel}】`);
};

// 插入占位符标签到 Prompt 编辑框
const insertPromptChip = (chipTag: string) => {
  aiConfig.value.systemPrompt += `\n${chipTag}`;
  ElMessage.success(`已插入占位符 ${chipTag}`);
};

// 同步当前激活表单到厂商字典缓存
const syncCurrentToProfile = () => {
  const p = aiConfig.value.provider;
  providerProfiles.value[p] = {
    baseUrl: aiConfig.value.baseUrl,
    apiKey: aiConfig.value.apiKey,
    model: aiConfig.value.model,
    temperature: aiConfig.value.temperature,
    topP: aiConfig.value.topP
  };
};

// 沙盒模拟器状态
const demoCards = ref<any[]>([]);
const selectedCardIndex = ref(17); // 星星
const currentCard = ref<any>({
  index: 17,
  nameCn: '星星',
  roman: 'XVII',
  image: '/assets/tarot/cards/17.jpg',
  tags: ['希望', '灵感', '内在疗愈']
});
const selectedOrientation = ref('upright');
const simulatedQuestion = ref('最近面对新目标，内心充满期待但有些焦虑');
const isFlipped = ref(false);
const isShuffling = ref(false);
const isStreaming = ref(false);
const phoneStreamText = ref('');
const isEnergyDepleted = ref(false);
const showEnergyAlert = ref(false);
const isConfigCollapsed = ref(true);

const toggleCollapse = () => {
  isConfigCollapsed.value = !isConfigCollapsed.value;
  localStorage.setItem('ai_config_collapsed', String(isConfigCollapsed.value));
};

const loadAiConfig = async () => {
  try {
    const res: any = await apiGetAiConfig();
    if (res.code === 'SUCCESS' && res.data) {
      const data = res.data;
      if (data.providerProfiles && typeof data.providerProfiles === 'object') {
        providerProfiles.value = data.providerProfiles;
      }

      // 如果有保存的 provider，恢复选择；默认 glm
      const activeP = data.provider || 'glm';
      aiConfig.value.provider = activeP;
      aiConfig.value.systemPrompt = data.systemPrompt || '';
      aiConfig.value.maxTokens = data.maxTokens || 1000;

      // 如果当前厂商已有 profile，优先使用 profile
      if (providerProfiles.value[activeP]) {
        const saved = providerProfiles.value[activeP];
        aiConfig.value.baseUrl = saved.baseUrl || data.baseUrl || (PROVIDER_PRESETS[activeP]?.defaultBaseUrl);
        aiConfig.value.apiKey = saved.apiKey !== undefined ? saved.apiKey : (data.apiKey || '');
        aiConfig.value.model = saved.model || data.model || (PROVIDER_PRESETS[activeP]?.defaultModel);
        aiConfig.value.temperature = saved.temperature ?? data.temperature ?? 0.7;
        aiConfig.value.topP = saved.topP ?? data.topP ?? 0.9;
      } else {
        const preset = PROVIDER_PRESETS[activeP] || PROVIDER_PRESETS['glm'];
        aiConfig.value.baseUrl = data.baseUrl || preset.defaultBaseUrl;
        aiConfig.value.apiKey = data.apiKey || '';
        aiConfig.value.model = data.model || preset.defaultModel;
        aiConfig.value.temperature = data.temperature ?? 0.7;
        aiConfig.value.topP = data.topP ?? 0.9;
        syncCurrentToProfile();
      }

      // 检查收起/展开状态：如配置项配置完成在下次进入的时候默认收起该板块
      const savedCollapseState = localStorage.getItem('ai_config_collapsed');
      if (savedCollapseState !== null) {
        isConfigCollapsed.value = savedCollapseState === 'true';
      } else {
        // 配置已完成（存在有效 baseUrl 与 model），默认收起
        const isConfigCompleted = Boolean(aiConfig.value.baseUrl && aiConfig.value.model);
        isConfigCollapsed.value = isConfigCompleted;
      }
    }
  } catch (e) {
    // handled
  }
};

const loadDemoCards = async () => {
  try {
    const res: any = await apiGetCards();
    if (res.code === 'SUCCESS' && res.data) {
      demoCards.value = res.data.cards.slice(0, 10);
      const star = res.data.cards.find((c: any) => c.index === 17) || res.data.cards[0];
      if (star) {
        currentCard.value = star;
        selectedCardIndex.value = star.index;
      }
    }
  } catch (e) {
    // fallback
  }
};

const handleCardChange = (idx: number) => {
  const found = demoCards.value.find((c) => c.index === idx);
  if (found) {
    currentCard.value = found;
    if (isFlipped.value) {
      triggerDrawStream();
    }
  }
};

const toggleCardFlip = () => {
  if (!isFlipped.value) {
    triggerDrawStream();
  } else {
    isFlipped.value = false;
    phoneStreamText.value = '';
  }
};

const triggerDrawStream = () => {
  if (isEnergyDepleted.value) {
    showEnergyAlert.value = true;
    return;
  }

  isFlipped.value = false;
  isShuffling.value = true;
  phoneStreamText.value = '';

  setTimeout(() => {
    isShuffling.value = false;
    isFlipped.value = true;
    startSseStream();
  }, 600);
};

const startSseStream = () => {
  isStreaming.value = true;
  phoneStreamText.value = '';

  // 使用服务端的沙盒 SSE 流式接口
  const url = `/api/v1/admin/sandbox/stream?card_index=${currentCard.value.index}&orientation=${selectedOrientation.value}&question=${encodeURIComponent(simulatedQuestion.value)}`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'chunk') {
        phoneStreamText.value += data.text;
      } else if (data.type === 'done') {
        eventSource.close();
        isStreaming.value = false;
      }
    } catch (e) {
      // ignore
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    isStreaming.value = false;
  };
};

const resetSimulator = () => {
  isFlipped.value = false;
  isShuffling.value = false;
  isStreaming.value = false;
  phoneStreamText.value = '';
  showEnergyAlert.value = false;
  isEnergyDepleted.value = false;
};

const toggleEnergyDepleted = () => {
  isEnergyDepleted.value = !isEnergyDepleted.value;
};

const simulateShareReward = () => {
  showEnergyAlert.value = false;
  isEnergyDepleted.value = false;
  ElMessage.success('🎉 微信好友已成功打开分享卡，能量充盈成功（+1 点）！现在可以翻牌了。');
};

const simulateAdReward = () => {
  showEnergyAlert.value = false;
  isEnergyDepleted.value = false;
  ElMessage.success('🎬 15 秒激励视频广告已模拟完播，获得 1 点今日觉察能量！');
};

const testConnection = async () => {
  // 校验表单格式
  if (configFormRef.value) {
    let valid = false;
    await configFormRef.value.validate((v) => { valid = v; });
    if (!valid) {
      ElMessage.warning('请先修正 API 基础地址或模型名称的格式错误');
      return;
    }
  } else {
    if (!aiConfig.value.baseUrl || !/^https?:\/\/.+/.test(aiConfig.value.baseUrl)) {
      isConfigCollapsed.value = false;
      ElMessage.warning('API 基础地址格式无效，已为您展开配置面板');
      return;
    }
    if (!aiConfig.value.model) {
      isConfigCollapsed.value = false;
      ElMessage.warning('模型名称不能为空，已为您展开配置面板');
      return;
    }
  }

  testingConnection.value = true;
  testResult.value = null;
  syncCurrentToProfile();
  try {
    const res: any = await apiTestAiConnection({
      baseUrl: aiConfig.value.baseUrl,
      apiKey: aiConfig.value.apiKey,
      model: aiConfig.value.model,
      provider: aiConfig.value.provider
    });
    if (res.code === 'SUCCESS' && res.data) {
      testResult.value = res.data;
      if (res.data.ok) {
        ElMessage.success(res.data.message || '大模型网关连通性测试通过！');
      } else if (res.data.status === 'INSUFFICIENT_BALANCE') {
        ElMessage.warning('鉴权成功，但该账户余额为 0 元，已欠费停机');
      } else {
        ElMessage.error(res.data.message || '大模型网关连接失败');
      }
      // 触发左下角网关状态联动更新
      window.dispatchEvent(new CustomEvent('ai-config-updated'));
    }
  } catch (err: any) {
    ElMessage.error(err.message || '网络测试超时或失败');
  } finally {
    testingConnection.value = false;
  }
};

const saveAiConfig = async () => {
  // 数据有效性校验
  if (configFormRef.value) {
    let valid = false;
    await configFormRef.value.validate((v) => { valid = v; });
    if (!valid) {
      isConfigCollapsed.value = false;
      ElMessage.error('API 基础地址或模型名称格式不合规，请检查修正后再保存');
      return;
    }
  } else {
    if (!aiConfig.value.baseUrl || !/^https?:\/\/.+/.test(aiConfig.value.baseUrl)) {
      isConfigCollapsed.value = false;
      ElMessage.error('API 基础地址格式不合规，已为您展开配置项请检查修正');
      return;
    }
    if (!aiConfig.value.model) {
      isConfigCollapsed.value = false;
      ElMessage.error('模型名称不能为空，已为您展开配置项请检查修正');
      return;
    }
  }

  saving.value = true;
  syncCurrentToProfile();
  try {
    await apiUpdateAiConfig({
      ...aiConfig.value,
      providerProfiles: providerProfiles.value
    });
    ElMessage.success(`【${currentPreset.value.name}】配置与模型参数已成功持久化保存！`);
    
    // 保存完成，下次进入默认收起该板块，当前也保持收起
    isConfigCollapsed.value = true;
    localStorage.setItem('ai_config_collapsed', 'true');

    // 触发全局事件通知 MainLayout 刷新左下角网关状态
    window.dispatchEvent(new CustomEvent('ai-config-updated'));
  } catch (err: any) {
    ElMessage.error(err.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

const resetDefaultPrompt = () => {
  aiConfig.value.systemPrompt = `你是一位温和、洞察力深刻且富有共情心的心理学投射分析师与心灵疗愈导师。
你的核心工作是基于荣格心理学“共时性原则”与潜意识意象投射，帮助来访者观照内在自我。

【核心合规戒律】：
1. 严禁断言未来吉凶祸福，严禁使用“命运注定”、“必有大难”、“大吉大利”等迷信算命式预言。
2. 将卡牌意象解读为当事人潜意识在现实生活中的投射，聚焦于心智模式、情绪内耗、思维盲区。
3. 必须提供温和、具体、具有可行性的正念微习惯或行动建议。

【输出结构要求】：
1. 【今日心灵定调】：（提炼 2~4 个字的核心情绪/能量意向，如“破茧沉淀”、“澄澈内观”）
2. 【意象投射与潜意识映射】：（结合来访者的困惑与抽出的卡牌，剖析卡牌象征对当下的心理映照）
3. 【思维盲区与视角转念】：（指出当下认知中的执念或误区，提供全新的觉察视角）
4. 【正念行动微建议】：（给出 1~2 条切实可行的微小行动或自我关怀练习）`;
};

onMounted(() => {
  loadAiConfig();
  loadDemoCards();
});
</script>
