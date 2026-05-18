/**
 * 统计引擎
 * 计算胜率、盈亏比、资金曲线、回撤等交易统计
 */

import type { TradeRecord, DailyStats, GroupedStats, EquityPoint } from '@/types/trade';
import { roundToDecimals } from '@/utils/calculator';

export class StatisticsEngine {
  /**
   * 计算胜率
   */
  winRate(trades: TradeRecord[]): number {
    if (trades.length === 0) return 0;
    const wins = trades.filter(t => t.profit > 0).length;
    return roundToDecimals((wins / trades.length) * 100, 1);
  }

  /**
   * 获取盈利交易
   */
  winningTrades(trades: TradeRecord[]): TradeRecord[] {
    return trades.filter(t => t.profit > 0);
  }

  /**
   * 获取亏损交易
   */
  losingTrades(trades: TradeRecord[]): TradeRecord[] {
    return trades.filter(t => t.profit < 0);
  }

  /**
   * 获取持平交易
   */
  breakEvenTrades(trades: TradeRecord[]): TradeRecord[] {
    return trades.filter(t => t.profit === 0);
  }

  /**
   * 总净盈亏
   */
  totalNetPnL(trades: TradeRecord[]): number {
    return roundToDecimals(trades.reduce((sum, t) => sum + t.netPnL, 0), 2);
  }

  /**
   * 总手续费
   */
  totalFee(trades: TradeRecord[]): number {
    return roundToDecimals(trades.reduce((sum, t) => sum + t.fee, 0), 2);
  }

  /**
   * 平均盈利（仅盈利交易）
   */
  avgProfit(wins: TradeRecord[]): number {
    if (wins.length === 0) return 0;
    return roundToDecimals(wins.reduce((sum, t) => sum + t.profit, 0) / wins.length, 2);
  }

  /**
   * 平均亏损（仅亏损交易）
   */
  avgLoss(losses: TradeRecord[]): number {
    if (losses.length === 0) return 0;
    return roundToDecimals(Math.abs(losses.reduce((sum, t) => sum + t.profit, 0) / losses.length), 2);
  }

  /**
   * 盈亏比
   */
  profitFactor(trades: TradeRecord[]): number {
    const wins = this.winningTrades(trades);
    const losses = this.losingTrades(trades);

    const totalWins = wins.reduce((sum, t) => sum + t.profit, 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));

    if (totalLosses === 0) return totalWins > 0 ? Infinity : 0;
    return roundToDecimals(totalWins / totalLosses, 2);
  }

  /**
   * 计算日统计数据
   */
  dailyStats(date: string, trades: TradeRecord[]): DailyStats {
    const wins = this.winningTrades(trades);
    const losses = this.losingTrades(trades);
    const breakEvens = this.breakEvenTrades(trades);

    return {
      date,
      totalTrades: trades.length,
      winningTrades: wins.length,
      losingTrades: losses.length,
      breakEvenTrades: breakEvens.length,
      winRate: this.winRate(trades),
      totalPnL: roundToDecimals(trades.reduce((sum, t) => sum + t.profit, 0), 2),
      totalFee: this.totalFee(trades),
      netPnL: this.totalNetPnL(trades),
      avgProfit: this.avgProfit(wins),
      avgLoss: this.avgLoss(losses),
      profitFactor: this.profitFactor(trades),
      trades,
    };
  }

  /**
   * 生成资金曲线
   */
  equityCurve(trades: TradeRecord[]): EquityPoint[] {
    const sorted = [...trades].sort(
      (a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime()
    );

    let equity = 0;
    let peak = 0;
    const curve: EquityPoint[] = [];

    for (const trade of sorted) {
      equity += trade.netPnL;
      if (equity > peak) peak = equity;

      const drawdown = peak > 0 ? ((peak - equity) / peak) * 100 : 0;

      curve.push({
        date: trade.exitTime,
        equity: roundToDecimals(equity, 2),
        drawdown: roundToDecimals(drawdown, 2),
      });
    }

    return curve;
  }

  /**
   * 最大回撤
   */
  maxDrawdown(curve: EquityPoint[]): number {
    if (curve.length === 0) return 0;
    return Math.max(...curve.map(p => p.drawdown));
  }

  /**
   * 按维度分组统计
   */
  groupBy(
    trades: TradeRecord[],
    key: keyof TradeRecord,
  ): GroupedStats[] {
    const groups = new Map<string, TradeRecord[]>();

    for (const trade of trades) {
      let groupKey: string;
      const value = trade[key];

      if (Array.isArray(value)) {
        // 对于数组字段（如 tags），每个元素单独分组
        for (const item of value as string[]) {
          const existing = groups.get(item) ?? [];
          existing.push(trade);
          groups.set(item, existing);
        }
        continue;
      }

      groupKey = String(value ?? '未分类');
      const existing = groups.get(groupKey) ?? [];
      existing.push(trade);
      groups.set(groupKey, existing);
    }

    const result: GroupedStats[] = [];
    for (const [groupKey, groupTrades] of groups) {
      const wins = this.winningTrades(groupTrades);
      result.push({
        key: groupKey,
        count: groupTrades.length,
        wins: wins.length,
        losses: this.losingTrades(groupTrades).length,
        winRate: this.winRate(groupTrades),
        totalPnL: roundToDecimals(groupTrades.reduce((sum, t) => sum + t.netPnL, 0), 2),
      });
    }

    return result.sort((a, b) => Math.abs(b.totalPnL) - Math.abs(a.totalPnL));
  }

  /**
   * 多日统计（按日聚合）
   */
  dailyStatsRange(trades: TradeRecord[]): DailyStats[] {
    const byDate = new Map<string, TradeRecord[]>();

    for (const trade of trades) {
      const date = trade.exitTime.split('T')[0];
      const existing = byDate.get(date) ?? [];
      existing.push(trade);
      byDate.set(date, existing);
    }

    const stats: DailyStats[] = [];
    for (const [date, dayTrades] of byDate) {
      stats.push(this.dailyStats(date, dayTrades));
    }

    return stats.sort((a, b) => a.date.localeCompare(b.date));
  }
}
