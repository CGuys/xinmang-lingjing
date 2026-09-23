/**
 * 获取东八区 (中国标准时间) 当天日期字符串 YYYY-MM-DD
 */
export function getCSTTodayString(): string {
  const now = new Date();
  // 加上 8 小时偏移
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const cstTime = new Date(utc + 3600000 * 8);

  const year = cstTime.getFullYear();
  const month = String(cstTime.getMonth() + 1).padStart(2, '0');
  const day = String(cstTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取距离今日自然日结束 (次日 00:00:00) 的剩余秒数，用于设置 Redis/Cache 过期时间
 */
export function getSecondsUntilMidnight(): number {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const cstTime = new Date(utc + 3600000 * 8);

  const tomorrow = new Date(cstTime);
  tomorrow.setHours(24, 0, 0, 0);

  const diffSeconds = Math.max(60, Math.floor((tomorrow.getTime() - cstTime.getTime()) / 1000));
  return diffSeconds;
}
