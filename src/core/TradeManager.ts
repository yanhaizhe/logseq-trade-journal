/**
 * 交易管理器
 * 统一的交易业务逻辑入口
 */

import type { TradeRecord, TradeInput, DailyReviewData, TradeLog } from '@/types/trade';
import { LogseqDBService } from './LogseqDBService';
import { StatisticsEngine } from './StatisticsEngine';
import { calcPnL, estimateFee } from '@/utils/calculator';
import { validateTrade } from '@/utils/validation';
import { nowISO } from '@/utils/format';

export class TradeManager {
  private db: LogseqDBService;
  private stats: StatisticsEngine;

  constructor(db: LogseqDBService) {
    this.db = db;
    this.stats = new StatisticsEngine();
  }

  /**
   * 录入一笔新交易
   */
  async recordTrade(input: TradeInput): Promise<TradeRecord> {
    // 校验
    const validation = validateTrade(input);
    if (!validation.valid) {
      throw new Error(`交易数据无效: ${Object.values(validation.errors).join(', ')}`);
    }

    // 如果没有手动填手续费，自动估算
    let fee = input.fee;
    if (fee === 0) {
      const entryFee = estimateFee(input.entryPrice, input.quantity, false);
      const exitFee = estimateFee(input.exitPrice, input.quantity, true);
      fee = entryFee + exitFee;
    }

    // 计算盈亏
    const calc = calcPnL({ ...input, fee });

    // 计算风险收益比（基于止损止盈）
    let riskRewardRatio: number | undefined;
    let riskPercent: number | undefined;
    if (input.entryPrice && input.stopLoss && input.takeProfit) {
      const risk = Math.abs(input.entryPrice - input.stopLoss);
      const reward = Math.abs(input.takeProfit - input.entryPrice);
      riskRewardRatio = risk > 0 ? Math.round((reward / risk) * 100) / 100 : undefined;
    }
    if (input.riskAmount && input.riskAmount > 0) {
      riskPercent = Math.round((input.riskAmount / (input.entryPrice * input.quantity)) * 10000) / 100;
    }

    // 构建完整记录
    const trade: TradeRecord = {
      ...input,
      id: '', // 由 DB 分配
      fee,
      profit: calc.grossPnL,
      profitPct: calc.profitPct,
      netPnL: calc.netPnL,
      riskRewardRatio,
      riskPercent,
      patterns: input.patterns ?? [],
      createdAt: nowISO(),
    };

    // 写入数据库
    const blockId = await this.db.insertTrade(trade);
    trade.id = blockId;

    return trade;
  }

  /**
   * 更新交易记录
   */
  async updateTrade(id: string, updates: Partial<TradeInput>): Promise<TradeRecord> {
    // 如果价格或数量有变化，重新计算
    const needRecalc = updates.entryPrice != null
      || updates.exitPrice != null
      || updates.quantity != null
      || updates.direction != null;

    if (needRecalc) {
      const merged: TradeInput = {
        symbol: updates.symbol ?? '',
        direction: updates.direction ?? 'long',
        entryPrice: updates.entryPrice ?? 0,
        exitPrice: updates.exitPrice ?? 0,
        quantity: updates.quantity ?? 0,
        entryTime: updates.entryTime ?? '',
        exitTime: updates.exitTime ?? '',
        fee: updates.fee ?? 0,
        strategy: updates.strategy,
        tags: updates.tags,
        emotion: updates.emotion,
        patterns: updates.patterns,
        notes: updates.notes,
      };

      const calc = calcPnL(merged);
      const fullUpdates: Partial<TradeRecord> = {
        ...merged,
        profit: calc.grossPnL,
        profitPct: calc.profitPct,
        netPnL: calc.netPnL,
      };

      await this.db.updateTrade(id, fullUpdates);
      return fullUpdates as TradeRecord;
    }

    await this.db.updateTrade(id, updates);
    return updates as TradeRecord;
  }

  /**
   * 删除交易
   */
  async deleteTrade(id: string): Promise<void> {
    await this.db.deleteTrade(id);
  }

  /**
   * 生成日复盘数据
   */
  async generateDailyReview(date: string): Promise<DailyReviewData> {
    const trades = await this.db.getTradesByDate(date);
    const stats = this.stats.dailyStats(date, trades);

    return {
      date,
      stats,
      template: '', // 模板由 DB Service 生成
    };
  }

  /**
   * 执行日复盘（生成并插入模板）
   */
  async doDailyReview(date: string): Promise<void> {
    const { stats } = await this.generateDailyReview(date);
    await this.db.insertReviewTemplate(date, {
      totalTrades: stats.totalTrades,
      winningTrades: stats.winningTrades,
      losingTrades: stats.losingTrades,
      winRate: stats.winRate,
      totalPnL: stats.totalPnL,
      totalFee: stats.totalFee,
      netPnL: stats.netPnL,
    });
  }

  /**
   * 获取统计引擎（供外部使用）
   */
  getStatsEngine(): StatisticsEngine {
    return this.stats;
  }

  /**
   * 计算交易输入的盈亏预览（不存储）
   */
  previewPnL(input: Partial<TradeInput>): {
    grossPnL: number;
    profitPct: number;
    estimatedFee: number;
    netPnL: number;
  } | null {
    if (!input.entryPrice || !input.exitPrice || !input.quantity || !input.direction) {
      return null;
    }

    const fee = input.fee ?? (
      estimateFee(input.entryPrice, input.quantity, false) +
      estimateFee(input.exitPrice, input.quantity, true)
    );

    return calcPnL({
      symbol: '',
      direction: input.direction,
      entryPrice: input.entryPrice,
      exitPrice: input.exitPrice,
      quantity: input.quantity,
      entryTime: '',
      exitTime: '',
      fee,
    });
  }

  // ===== TradeLog Sync API =====

  async getAllTradeLogs(): Promise<TradeLog[]> {
    return this.db.getAllTradeLogs();
  }

  async insertTradeLog(log: TradeLog): Promise<string> {
    return this.db.insertTradeLog(log);
  }

  async updateTradeLog(id: string, log: TradeLog): Promise<void> {
    await this.db.updateTradeLog(id, log);
  }

  async deleteTradeLog(id: string): Promise<void> {
    await this.db.deleteTradeLog(id);
  }
}
