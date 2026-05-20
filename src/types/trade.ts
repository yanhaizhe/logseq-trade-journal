/**
 * 交易记录核心类型定义
 */

export type TradeDirection = 'long' | 'short';

export type Emotion = 'confident' | 'neutral' | 'nervous' | 'fearful' | 'greedy';

export type TradeStyle = 'day' | 'swing' | 'position' | 'scalping';

export type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1H' | '4H' | '1D' | '1W' | '1M';

export type TradeStatus = 'open' | 'closed';

export type MarketCondition = 'bullish' | 'bearish' | 'ranging' | 'volatile';

/** 交易录入表单输入 */
export interface TradeInput {
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  entryTime: string;
  exitTime: string;
  fee: number;
  strategy?: string;
  tags?: string[];
  emotion?: Emotion;
  patterns?: string[];
  notes?: string;
  // 新增字段
  stopLoss?: number;
  takeProfit?: number;
  riskAmount?: number;
  tradeStyle?: TradeStyle;
  timeFrame?: TimeFrame;
  marketCondition?: MarketCondition;
  rationale?: string;       // 交易理由
  preTradePlan?: string;    // 交易计划
  lessons?: string;         // 经验教训
}

/** 完整的交易记录（含计算结果） */
export interface TradeRecord extends TradeInput {
  id: string;
  profit: number;
  profitPct: number;
  netPnL: number;
  riskRewardRatio?: number; // 盈亏比（基于止损止盈）
  riskPercent?: number;     // 风险占本金百分比
  createdAt: string;
}

/** 交易校验结果 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/** 日统计 */
export interface DailyStats {
  date: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  totalPnL: number;
  totalFee: number;
  netPnL: number;
  avgProfit: number;
  avgLoss: number;
  profitFactor: number;
  trades: TradeRecord[];
}

/** 按维度分组统计 */
export interface GroupedStats {
  key: string;
  count: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnL: number;
}

/** 资金曲线点 */
export interface EquityPoint {
  date: string;
  equity: number;
  drawdown: number;
}

/** 日复盘数据 */
export interface DailyReviewData {
  date: string;
  stats: DailyStats;
  template: string;
}

/** 标的基本信息 */
export interface InstrumentInfo {
  symbol: string;
  name: string;
  market: string;
  price: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  turnover: number;
}

/** 核心交易生命周期复盘记录（多阶段状态机） */
export interface TradeLog {
  id: string;
  status: 'observe' | 'plan' | 'active' | 'closed';
  symbol: string;
  period: string;
  date: string;
  selectionReason: string;
  fundamentalInfo: { sector: string; catalyst: string };
  technicalSelection: string;
  planPrice: { entry: number; sl: number; tp: number; ratio: number };
  checklist: {
    trendAligned: boolean;
    levelConfirmed: boolean;
    signalConfirmed: boolean;
    ratioOk: boolean;
    sizingOk: boolean;
  };
  technicalAnalysis: {
    structure: string;
    level: string;
    trigger: string;
    volumeFlow: string;
  };
  execution: {
    actualEntry: number;
    riskPercent: number;
    totalCapital: number;
    suggestedSize: number;
  };
  management: {
    stopUpdates: string;
    scaleActions: string;
  };
  exit: {
    actualExit: number;
    pnl: number;
    rValue: number;
    reason: string;
  };
  review: {
    patternTags: string[];
    disciplineRating: number;
    psychologyTags: string[];
    reviewNotes: string;
    syncToStudy: boolean;
  };
}

