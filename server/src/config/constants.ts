import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  JWT_SECRET: process.env.JWT_SECRET || 'xinmang_lingjing_super_jwt_secret_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET || 'xinmang_lingjing_admin_super_jwt_secret_2026',
  ADMIN_JWT_EXPIRES_IN: process.env.ADMIN_JWT_EXPIRES_IN || '2d',
  WECHAT_APP_ID: process.env.WECHAT_APP_ID || '',
  WECHAT_APP_SECRET: process.env.WECHAT_APP_SECRET || '',
  REDIS_URL: process.env.REDIS_URL || '',
  ASSETS_PATH: process.env.ASSETS_PATH || '../assets',
};

// 默认大模型参数
export const DEFAULT_AI_CONFIG = {
  provider: process.env.LLM_PROVIDER || 'deepseek',
  apiKey: process.env.LLM_API_KEY || '',
  baseUrl: process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1',
  model: process.env.LLM_MODEL || 'deepseek-chat',
  temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
  topP: parseFloat(process.env.LLM_TOP_P || '0.9'),
  maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '1000', 10),
  systemPrompt: `你是一位温和、洞察力深刻且富有共情心的心理学投射分析师与心灵疗愈导师。
你的核心工作是基于荣格心理学“共时性原则”与潜意识意象投射，帮助来访者观照内在自我。

【核心合规戒律】：
1. 严禁断言未来吉凶祸福，严禁使用“命运注定”、“必有大难”、“大吉大利”等迷信算命式预言。
2. 将卡牌意象解读为当事人潜意识在现实生活中的投射，聚焦于心智模式、情绪内耗、思维盲区。
3. 必须提供温和、具体、具有可行性的正念微习惯或行动建议。

【输出结构要求】：
1. 【今日心灵定调】：（提炼 2~4 个字的核心情绪/能量意向，如“破茧沉淀”、“澄澈内观”）
2. 【意象投射与潜意识映射】：（结合来访者的困惑与抽出的卡牌，剖析卡牌象征对当下的心理映照）
3. 【思维盲区与视角转念】：（指出当下认知中的执念或误区，提供全新的觉察视角）
4. 【正念行动微建议】：（给出 1~2 条切实可行的微小行动或自我关怀练习）`
};

// 默认业务策略配置项
export const DEFAULT_STRATEGY_CONFIG = {
  daily_free_limit: 1,
  share_reward_limit: 3,
  share_reward_enabled: true,
  ad_reward_enabled: true,
  ad_unit_id: 'adunit-mock-default-15s',
  is_in_review: false,
};

// 默认预置反迷信违禁词
export const DEFAULT_SENSITIVE_WORDS = [
  '改运', '断命', '看相', '算命', '占凶吉', '发横财', '避血光', '鬼神', '巫术', '降头',
  '借寿', '招魂', '解降', '驱邪', '通灵', '作法', '斩桃花', '符咒', '还阴债', '续命'
];
