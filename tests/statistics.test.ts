import { describe, it, expect } from 'vitest';
import { StatisticsEngine } from '../src/core/StatisticsEngine';
import type { TradeRecord } from '../src/types/trade';

function makeTrade(overrides: Partial<TradeRecord> = {}): TradeRecord {
  return {
    id: 'test-id',
    symbol: '000001',
    direction: 'long',
    entryPrice: 10,
    exitPrice: 12,
    quantity: 1000,
    entryTime: '2026-05-18T10:00:00',
    exitTime: '2026-05-18T14:00:00',
    fee: 25,
    profit: 2000,
    profitPct: 20,
    netPnL: 1975,
    strategy: '突破交易',
    tags: ['#trend'],
    emotion: 'confident',
    patterns: [],
    notes: '',
    createdAt: '2026-05-18T14:00:00',
    ...overrides,
  };
}

describe('StatisticsEngine', () => {
  const eng = new StatisticsEngine();

  describe('winRate', () => {
    it('空列表返回 0', () => {
      expect(eng.winRate([])).toBe(0);
    });

    it('3盈2亏 → 60%', () => {
      const trades = [
        makeTrade({ profit: 100 }),
        makeTrade({ profit: 200 }),
        makeTrade({ profit: 50 }),
        makeTrade({ profit: -80 }),
        makeTrade({ profit: -120 }),
      ];
      expect(eng.winRate(trades)).toBe(60);
    });
  });

  describe('totalNetPnL', () => {
    it('计算总净盈亏', () => {
      const trades = [
        makeTrade({ netPnL: 1000 }),
        makeTrade({ netPnL: -300 }),
        makeTrade({ netPnL: 500 }),
      ];
      expect(eng.totalNetPnL(trades)).toBe(1200);
    });
  });

  describe('profitFactor', () => {
    it('盈亏比 = 总盈利/总亏损', () => {
      const trades = [
        makeTrade({ profit: 1000, netPnL: 975 }),
        makeTrade({ profit: 500, netPnL: 475 }),
        makeTrade({ profit: -300, netPnL: -325 }),
        makeTrade({ profit: -200, netPnL: -225 }),
      ];
      // profit字段：总盈利(1000+500=1500) / 总亏损(|-300|+|-200|=500) = 3.0
      const pf = eng.profitFactor(trades);
      expect(pf).toBe(3.0);
    });
  });

  describe('dailyStats', () => {
    it('返回完整的日统计', () => {
      const trades = [
        makeTrade({ profit: 1000, netPnL: 975, strategy: '趋势跟踪' }),
        makeTrade({ profit: -300, netPnL: -325, strategy: '突破交易' }),
        makeTrade({ profit: 500, netPnL: 475 }),
        makeTrade({ profit: 0, netPnL: -25 }),
      ];

      const stats = eng.dailyStats('2026-05-18', trades);
      expect(stats.totalTrades).toBe(4);
      expect(stats.winningTrades).toBe(2);
      expect(stats.losingTrades).toBe(1);
      expect(stats.breakEvenTrades).toBe(1);
      expect(stats.winRate).toBe(50);
      expect(stats.netPnL).toBe(1100);
    });
  });

  describe('groupBy', () => {
    it('按策略分组', () => {
      const trades = [
        makeTrade({ strategy: '趋势跟踪', profit: 1000, netPnL: 975 }),
        makeTrade({ strategy: '趋势跟踪', profit: -300, netPnL: -325 }),
        makeTrade({ strategy: '突破交易', profit: 500, netPnL: 475 }),
      ];

      const grouped = eng.groupBy(trades, 'strategy');
      expect(grouped).toHaveLength(2);
      
      const trend = grouped.find(g => g.key === '趋势跟踪');
      expect(trend?.count).toBe(2);
      expect(trend?.wins).toBe(1);
      expect(trend?.losses).toBe(1);
    });
  });

  describe('equityCurve', () => {
    it('生成资金曲线', () => {
      const trades = [
        makeTrade({ netPnL: 500, exitTime: '2026-05-01T10:00' }),
        makeTrade({ netPnL: 300, exitTime: '2026-05-02T10:00' }),
        makeTrade({ netPnL: -200, exitTime: '2026-05-03T10:00' }),
      ];

      const curve = eng.equityCurve(trades);
      expect(curve).toHaveLength(3);
      expect(curve[0].equity).toBe(500);
      expect(curve[1].equity).toBe(800);
      expect(curve[2].equity).toBe(600);
    });
  });

  describe('maxDrawdown', () => {
    it('计算最大回撤', () => {
      const curve = [
        { date: '1', equity: 1000, drawdown: 0 },
        { date: '2', equity: 800, drawdown: 20 },
        { date: '3', equity: 900, drawdown: 10 },
        { date: '4', equity: 700, drawdown: 30 },
      ];
      expect(eng.maxDrawdown(curve)).toBe(30);
    });
  });
});
