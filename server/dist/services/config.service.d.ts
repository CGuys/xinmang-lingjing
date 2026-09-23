export declare class ConfigService {
    /**
     * 获取当前生效的业务策略配置
     */
    static getStrategyConfig(): Promise<any>;
    /**
     * 更新业务策略配置
     */
    static updateStrategyConfig(updates: Record<string, any>): Promise<any>;
    /**
     * 获取当前 AI 编排配置
     */
    static getAiConfig(): Promise<any>;
    /**
     * 更新 AI 编排配置
     */
    static updateAiConfig(updates: Record<string, any>): Promise<any>;
}
