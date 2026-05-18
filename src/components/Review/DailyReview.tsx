/**
 * 日复盘视图组件
 * 展示当日交易统计和逐笔回顾
 */

import React, { useMemo } from 'react';
import type { DailyStats, TradeRecord } from '@/types/trade';
import { StatisticsEngine } from '@/core/StatisticsEngine';
import { formatMoney, formatPercent, directionLabel, pnlColor, formatDate } from '@/utils/format';

interface DailyReviewProps {
  stats: DailyStats;
  onTradeClick?: (trade: TradeRecord) => void;
}

const eng = new StatisticsEngine();

const DailyReview: React.FC<DailyReviewProps> = ({ stats, onTradeClick }) => {
  const equityCurve = useMemo(() => eng.equityCurve(stats.trades), [stats.trades]);
  const maxDd = useMemo(() => eng.maxDrawdown(equityCurve), [equityCurve]);

  return (
    <div className="daily-review">
      {/* 概览卡片 */}
      <div className="review-header">
        <h3>📊 {formatDate(stats.date)} 交易复盘</h3>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <span className="stat-value">{stats.totalTrades}</span>
          <span className="stat-label">总交易</span>
        </div>
        <div className="stat-card win">
          <span className="stat-value">{stats.winningTrades}</span>
          <span className="stat-label">盈利</span>
        </div>
        <div className="stat-card loss">
          <span className="stat-value">{stats.losingTrades}</span>
          <span className="stat-label">亏损</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.winRate}%</span>
          <span className="stat-label">胜率</span>
        </div>
      </div>

      <div className="stats-cards secondary">
        <div className="stat-card">
          <span className="stat-value" style={{ color: stats.netPnL >= 0 ? '#ef4444' : '#22c55e' }}>
            {formatMoney(stats.netPnL)}
          </span>
          <span className="stat-label">净盈亏</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formatMoney(stats.totalFee)}</span>
          <span className="stat-label">手续费</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}</span>
          <span className="stat-label">盈亏比</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{maxDd.toFixed(1)}%</span>
          <span className="stat-label">最大回撤</span>
        </div>
      </div>

      {/* 逐笔交易列表 */}
      <div className="trade-list">
        <h4>逐笔交易</h4>
        {stats.trades.length === 0 ? (
          <p className="empty-text">今日暂无交易记录</p>
        ) : (
          <div className="trade-items">
            {stats.trades.map(trade => (
              <TradeSummaryCard
                key={trade.id}
                trade={trade}
                onClick={() => onTradeClick?.(trade)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 按策略分组 */}
      {stats.trades.length > 0 && (
        <div className="grouped-stats">
          <h4>按策略分布</h4>
          <StrategyBreakdown trades={stats.trades} />
        </div>
      )}
    </div>
  );
};

/**
 * 单笔交易摘要卡片
 */
interface TradeSummaryCardProps {
  trade: TradeRecord;
  onClick?: () => void;
}

const TradeSummaryCard: React.FC<TradeSummaryCardProps> = ({ trade, onClick }) => {
  return (
    <div className="trade-summary-card" onClick={onClick}>
      <div className="tsc-left">
        <span className={`tsc-direction ${trade.direction}`}>
          {directionLabel(trade.direction)}
        </span>
        <span className="tsc-symbol">{trade.symbol}</span>
        {trade.strategy && <span className="tsc-strategy">{trade.strategy}</span>}
      </div>
      <div className="tsc-center">
        <div className="tsc-prices">
          <span>入场 {trade.entryPrice}</span>
          <span className="tsc-arrow">→</span>
          <span>出场 {trade.exitPrice}</span>
        </div>
        <div className="tsc-qty">{trade.quantity} 股</div>
      </div>
      <div className="tsc-right">
        <span className="tsc-pnl" style={{ color: pnlColor(trade.profit) }}>
          {formatMoney(trade.netPnL)}
        </span>
        <span className="tsc-pct" style={{ color: pnlColor(trade.profit) }}>
          {formatPercent(trade.profitPct)}
        </span>
      </div>
    </div>
  );
};

/**
 * 策略分布统计
 */
const StrategyBreakdown: React.FC<{ trades: TradeRecord[] }> = ({ trades }) => {
  const grouped = useMemo(() => eng.groupBy(trades, 'strategy'), [trades]);

  if (grouped.length === 0) return <p className="empty-text">未按策略分类</p>;

  return (
    <div className="strategy-breakdown">
      {grouped.map(g => (
        <div key={g.key} className="strategy-row">
          <span className="strategy-name">{g.key || '未分类'}</span>
          <span className="strategy-count">{g.count}笔</span>
          <span className="strategy-winrate">胜率 {g.winRate}%</span>
          <span className="strategy-pnl" style={{ color: g.totalPnL >= 0 ? '#ef4444' : '#22c55e' }}>
            {formatMoney(g.totalPnL)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default DailyReview;
