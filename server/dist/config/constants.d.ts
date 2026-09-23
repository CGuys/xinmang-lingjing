export declare const ENV: {
    PORT: number;
    NODE_ENV: string;
    DATABASE_URL: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    ADMIN_JWT_SECRET: string;
    ADMIN_JWT_EXPIRES_IN: string;
    WECHAT_APP_ID: string;
    WECHAT_APP_SECRET: string;
    REDIS_URL: string;
    ASSETS_PATH: string;
};
export declare const DEFAULT_AI_CONFIG: {
    provider: string;
    apiKey: string;
    baseUrl: string;
    model: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    systemPrompt: string;
};
export declare const DEFAULT_STRATEGY_CONFIG: {
    daily_free_limit: number;
    share_reward_limit: number;
    share_reward_enabled: boolean;
    ad_reward_enabled: boolean;
    ad_unit_id: string;
    is_in_review: boolean;
};
export declare const DEFAULT_SENSITIVE_WORDS: string[];
