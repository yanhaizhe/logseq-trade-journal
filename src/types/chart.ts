/**
 * K线图表相关类型定义
 * KLineData 直接复用 klinecharts 的类型，保持兼容
 */

export type { KLineData } from 'klinecharts';

/** K线周期 */
export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1H' | '4H' | '1D' | '1W' | '1M';

/** 技术指标类型 */
export type IndicatorType = 'MA' | 'EMA' | 'VOLUME' | 'MACD' | 'RSI' | 'BOLL' | 'KDJ';

/** 图表配置 */
export interface ChartConfig {
  symbol: string;
  timeframe: Timeframe;
  indicators: IndicatorType[];
  from?: number;         // 起始时间戳
  to?: number;           // 结束时间戳
  theme?: 'light' | 'dark';
  locale?: 'zh-CN' | 'en-US';
}

/** 图表标注点 */
export interface ChartAnnotation {
  timestamp: number;
  price: number;
  type: 'buy' | 'sell' | 'note';
  label?: string;
  tradeId?: string;      // 关联的交易记录 ID
}

/** K线形态匹配结果（Phase 2 用） */
export interface PatternResult {
  name: string;           // 形态名称
  nameZh: string;         // 中文名
  startIndex: number;     // 起始K线索引
  endIndex: number;       // 结束K线索引
  confidence: number;     // 置信度 0-1
  type: 'bullish' | 'bearish' | 'neutral';
}

/** 时间周期选项 */
export const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: '1m', label: '1分钟' },
  { value: '5m', label: '5分钟' },
  { value: '15m', label: '15分钟' },
  { value: '30m', label: '30分钟' },
  { value: '1H', label: '1小时' },
  { value: '4H', label: '4小时' },
  { value: '1D', label: '日线' },
  { value: '1W', label: '周线' },
  { value: '1M', label: '月线' },
];

/** 指标选项 */
export const INDICATOR_OPTIONS: { value: IndicatorType; label: string; category: string }[] = [
  { value: 'VOLUME', label: '成交量', category: '基础' },
  { value: 'MA', label: '移动平均线 MA', category: '趋势' },
  { value: 'EMA', label: '指数均线 EMA', category: '趋势' },
  { value: 'BOLL', label: '布林带 BOLL', category: '趋势' },
  { value: 'MACD', label: 'MACD', category: '震荡' },
  { value: 'RSI', label: 'RSI', category: '震荡' },
  { value: 'KDJ', label: 'KDJ', category: '震荡' },
];
