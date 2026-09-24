import { Response } from 'express';
export declare class AiService {
    /**
     * 组装 Prompt
     */
    static assemblePrompt(template: string, params: {
        cardName: string;
        orientation: string;
        question?: string;
        insight?: string;
        tags?: string[];
    }): string;
    /**
     * 测试大模型网关连通性
     */
    static testConnection(params?: {
        baseUrl?: string;
        apiKey?: string;
        model?: string;
        provider?: string;
    }): Promise<{
        ok: boolean;
        status: string;
        provider: any;
        providerName: any;
        model: any;
        message: string;
        latencyMs: number;
        modelUsed?: undefined;
        balance?: undefined;
        sampleOutput?: undefined;
        errorDetail?: undefined;
    } | {
        ok: boolean;
        status: string;
        provider: any;
        providerName: any;
        model: any;
        latencyMs: number;
        modelUsed: any;
        message: string;
        balance: any;
        sampleOutput: any;
        errorDetail?: undefined;
    } | {
        ok: boolean;
        status: string;
        provider: any;
        providerName: any;
        model: any;
        latencyMs: number;
        message: string;
        balance: any;
        errorDetail: any;
        modelUsed?: undefined;
        sampleOutput?: undefined;
    } | {
        ok: boolean;
        status: string;
        provider: any;
        providerName: any;
        model: any;
        latencyMs: number;
        message: string;
        errorDetail: any;
        modelUsed?: undefined;
        balance?: undefined;
        sampleOutput?: undefined;
    }>;
    /**
     * 处理 SSE 流式解读推流
     */
    static streamReading(readingId: string, userId: string | null, res: Response): Promise<void>;
    /**
     * 模拟打字机微延迟流推送到客户端
     */
    private static typewriterStream;
    /**
     * 更新抽牌状态并固化结果
     */
    private static finalizeReading;
}
