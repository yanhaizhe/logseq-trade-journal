/**
 * 盈亏计算工具函数
 */

import type { TradeInput } from '@/types/trade';

export interface CalcResult {
  /** 毛盈亏（不含手续费） */
  grossPnL: number;
  /** 盈亏百分比 */
  profitPct: number;
  /** 估算手续费 */
  estimatedFee: number;
  /** 净盈亏 */
  netPnL: number;
}

/**
 * 根据交易输入计算盈亏
 */
export function calcPnL(input: TradeInput): CalcResult {
  const { direction, entryPrice, exitPrice, quantity, fee } = input;

  const priceDelta = direction === 'long'
    ? exitPrice - entryPrice
    : entryPrice - exitPrice;

  const grossPnL = priceDelta * quantity;
  const profitPct = (priceDelta / entryPrice) * 100;
  const netPnL = grossPnL - fee;

  return {
    grossPnL: roundToDecimals(grossPnL, 2),
    profitPct: roundToDecimals(profitPct, 2),
    estimatedFee: fee,
    netPnL: roundToDecimals(netPnL, 2),
  };
}

/**
 * 估算 A 股手续费（默认万2.5佣金 + 千1印花税卖出）
 */
export function estimateFee(
  price: number,
  quantity: number,
  isSell: boolean = true,
  commissionRate: number = 0.00025,
  stampTaxRate: number = 0.001,
): number {
  const amount = price * quantity;
  const commission = Math.max(amount * commissionRate, 5); // 最低5元
  const stampTax = isSell ? amount * stampTaxRate : 0;
  return roundToDecimals(commission + stampTax, 2);
}

/**
 * 判断一笔交易是否盈利
 */
export function isProfitable(record: { profit: number }): boolean {
  return record.profit > 0;
}

/**
 * 判断一笔交易是否亏损
 */
export function isLoss(record: { profit: number }): boolean {
  return record.profit < 0;
}

/**
 * 盈亏比（平均盈利 / 平均亏损）
 */
export function profitLossRatio(avgProfit: number, avgLoss: number): number {
  if (avgLoss === 0) return avgProfit > 0 ? Infinity : 0;
  return Math.abs(avgProfit / avgLoss);
}

/**
 * 四舍五入到指定小数位
 */
export function roundToDecimals(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
