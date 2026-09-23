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
