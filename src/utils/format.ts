/**
 * 格式化工具函数
 */

import dayjs from 'dayjs';

/**
 * 格式化金额（保留2位小数，加千分位）
 */
export function formatMoney(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * 格式化日期
 */
export function formatDate(date: string | Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}

/**
 * 格式化日期时间
 */
export function formatDateTime(date: string | Date): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}

/**
 * 获取今日日期字符串
 */
export function todayStr(): string {
  return dayjs().format('YYYY-MM-DD');
}

/**
 * 获取当前 ISO 时间字符串
 */
export function nowISO(): string {
  return dayjs().toISOString();
}

/**
 * 按方向获取标签颜色
 */
export function directionColor(direction: 'long' | 'short'): string {
  return direction === 'long' ? '#ef4444' : '#22c55e';
}

/**
 * 按方向获取中文标签
 */
export function directionLabel(direction: 'long' | 'short'): string {
  return direction === 'long' ? '做多' : '做空';
}

/**
 * 盈亏颜色
 */
export function pnlColor(pnl: number): string {
  if (pnl > 0) return '#ef4444';
  if (pnl < 0) return '#22c55e';
  return '#888';
}
