/**
 * 获取东八区 (中国标准时间) 当天日期字符串 YYYY-MM-DD
 */
export declare function getCSTTodayString(): string;
/**
 * 获取距离今日自然日结束 (次日 00:00:00) 的剩余秒数，用于设置 Redis/Cache 过期时间
 */
export declare function getSecondsUntilMidnight(): number;
