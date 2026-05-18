/**
 * 数据源 Provider 统一接口
 */

import type { KLineData, Timeframe } from '@/types/chart';

export type MarketType = 'ashare' | 'us' | 'hk' | 'crypto' | 'futures' | 'unknown';

export interface ProviderConfig {
  timeout?: number;
  apiKey?: string;
  proxyUrl?: string;
}

export interface FetchRequest {
  symbol: string;
  timeframe: Timeframe;
  market: MarketType;
  from?: number;
  to?: number;
  limit?: number;
}

export interface FetchResult {
  data: KLineData[];
  symbol: string;
  market: MarketType;
}

export interface MarketDataProvider {
  /** 提供商名称 */
  readonly name: string;
  /** 支持的市场 */
  readonly markets: MarketType[];
  /** 获取K线历史数据 */
  fetchKLine(req: FetchRequest): Promise<FetchResult>;
  /** 订阅实时行情（返回取消函数） */
  subscribe?(symbol: string, timeframe: Timeframe, callback: (data: KLineData) => void): () => void;
}

/** 从标的代码识别市场类型 */
export function detectMarket(symbol: string): MarketType {
  const s = symbol.toUpperCase().trim();

  // A股：6位纯数字
  if (/^\d{6}$/.test(s)) {
    // 上交所 60xxxx，深交所 00xxxx/30xxxx
    if (s.startsWith('60')) return 'ashare';
    if (s.startsWith('00') || s.startsWith('30')) return 'ashare';
    return 'ashare';
  }

  // 扩展 A 股（带前缀）
  if (/^(SH|SZ)\d{6}$/.test(s)) return 'ashare';

  // 港股：5位数字
  if (/^\d{5}$/.test(s)) return 'hk';

  // 加密货币（以 USDT/BTC/ETH 等结尾）
  if (s.includes('USDT') || s.includes('BTC') || s.includes('ETH') || s.includes('PERP')) {
    return 'crypto';
  }

  // 美股：纯字母（1-5位）
  if (/^[A-Z]{1,5}$/.test(s)) return 'us';

  return 'unknown';
}

/** 周期 → 毫秒 */
export function timeframeToMs(tf: Timeframe): number {
  const m = 60 * 1000;
  const h = 60 * m;
  const d = 24 * h;
  const map: Record<Timeframe, number> = {
    '1m': m, '5m': 5 * m, '15m': 15 * m, '30m': 30 * m,
    '1H': h, '4H': 4 * h, '1D': d, '1W': 7 * d, '1M': 30 * d,
  };
  return map[tf];
}

/** 周期 → KLineChart period 对象 */
export function timeframeToPeriod(tf: Timeframe): { span: number; type: string } {
  const map: Record<string, { span: number; type: string }> = {
    '1m': { span: 1, type: 'minute' },
    '5m': { span: 5, type: 'minute' },
    '15m': { span: 15, type: 'minute' },
    '30m': { span: 30, type: 'minute' },
    '1H': { span: 1, type: 'hour' },
    '4H': { span: 4, type: 'hour' },
    '1D': { span: 1, type: 'day' },
    '1W': { span: 1, type: 'week' },
    '1M': { span: 1, type: 'month' },
  };
  return map[tf] ?? { span: 1, type: 'day' };
}
