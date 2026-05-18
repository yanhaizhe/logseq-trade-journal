import { describe, it, expect } from 'vitest';
import { calcPnL, estimateFee, isProfitable, isLoss, roundToDecimals } from '../src/utils/calculator';
import type { TradeInput } from '../src/types/trade';

describe('calcPnL', () => {
  const baseTrade: TradeInput = {
    symbol: '000001',
    direction: 'long',
    entryPrice: 10,
    exitPrice: 12,
    quantity: 1000,
    entryTime: '2026-05-18T10:00:00',
    exitTime: '2026-05-18T14:00:00',
    fee: 25,
  };

  it('做多盈利', () => {
    const result = calcPnL(baseTrade);
    expect(result.grossPnL).toBe(2000);
    expect(result.profitPct).toBe(20);
    expect(result.netPnL).toBe(1975);
  });

  it('做多亏损', () => {
    const result = calcPnL({ ...baseTrade, exitPrice: 9 });
    expect(result.grossPnL).toBe(-1000);
    expect(result.profitPct).toBe(-10);
    expect(result.netPnL).toBe(-1025);
  });

  it('做空盈利', () => {
    const result = calcPnL({ ...baseTrade, direction: 'short', exitPrice: 8 });
    expect(result.grossPnL).toBe(2000);
    expect(result.profitPct).toBe(20);
  });

  it('做空亏损', () => {
    const result = calcPnL({ ...baseTrade, direction: 'short', exitPrice: 15 });
    expect(result.grossPnL).toBe(-5000);
    expect(result.profitPct).toBe(-50);
  });
});

describe('estimateFee', () => {
  it('买入 10元×1000股 ≈ 佣金5元(最低)+0印花税', () => {
    const fee = estimateFee(10, 1000, false);
    expect(fee).toBe(5); // 25*0.00025=2.5 低于最低5元
  });

  it('卖出 10元×1000股 ≈ 佣金5元+印花税10元', () => {
    const fee = estimateFee(10, 1000, true);
    expect(fee).toBe(15); // 佣金5 + 印花税10
  });
});

describe('isProfitable / isLoss', () => {
  it('profit > 0 为盈利', () => {
    expect(isProfitable({ profit: 100 })).toBe(true);
    expect(isProfitable({ profit: 0 })).toBe(false);
    expect(isProfitable({ profit: -10 })).toBe(false);
  });

  it('profit < 0 为亏损', () => {
    expect(isLoss({ profit: -10 })).toBe(true);
    expect(isLoss({ profit: 0 })).toBe(false);
  });
});

describe('roundToDecimals', () => {
  it('四舍五入到指定位数', () => {
    expect(roundToDecimals(1.2345, 2)).toBe(1.23);
    expect(roundToDecimals(1.2355, 2)).toBe(1.24);
    expect(roundToDecimals(100, 2)).toBe(100);
  });
});
