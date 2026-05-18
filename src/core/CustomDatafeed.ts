/**
 * CustomDatafeed - 将 DataRouter 适配为 KLineChart Pro 的 Datafeed 接口
 */

import type { Datafeed, SymbolInfo, Period } from '@klinecharts/pro';
import type { KLineData } from 'klinecharts';
import { getDataRouter } from '@/core/DataRouter';
import { detectMarket, timeframeToPeriod } from '@/core/providers/types';
import type { Timeframe } from '@/types/chart';

const router = getDataRouter();

/** Period → Timeframe 反向映射 */
function periodToTimeframe(period: Period): Timeframe {
  const key = `${period.multiplier}${period.timespan}`;
  const map: Record<string, Timeframe> = {
    '1minute': '1m', '5minute': '5m', '15minute': '15m', '30minute': '30m',
    '60minute': '1H', '240minute': '4H', '1day': '1D', '1week': '1W', '1month': '1M',
  };
  return map[key] ?? '1D';
}

/** 获取时间范围（默认 300 根K线） */
function getTimeRange(period: Period): { from: number; to: number } {
  const ms = period.multiplier;
  const unit = period.timespan;
  let intervalMs: number;

  switch (unit) {
    case 'minute': intervalMs = ms * 60 * 1000; break;
    case 'hour': intervalMs = ms * 3600 * 1000; break;
    case 'day': intervalMs = ms * 86400 * 1000; break;
    case 'week': intervalMs = ms * 7 * 86400 * 1000; break;
    case 'month': intervalMs = ms * 30 * 86400 * 1000; break;
    default: intervalMs = 86400 * 1000;
  }

  return { from: Date.now() - intervalMs * 300, to: Date.now() };
}

export class CustomDatafeed implements Datafeed {
  async searchSymbols(search?: string): Promise<SymbolInfo[]> {
    if (!search?.trim()) return [];
    const s = search.toUpperCase().trim();
    const market = detectMarket(s);

    return [{
      ticker: s,
      name: s,
      shortName: s,
      exchange: marketLabel(market),
      market: market,
      pricePrecision: 2,
      volumePrecision: 0,
      priceCurrency: market === 'crypto' ? 'USDT' : 'CNY',
      type: 'stock',
    }];
  }

  async getHistoryKLineData(
    symbol: SymbolInfo,
    period: Period,
    from: number,
    to: number,
  ): Promise<KLineData[]> {
    try {
      const tf = periodToTimeframe(period);
      const result = await router.fetchKLine(symbol.ticker, tf, 300);
      return result.data;
    } catch {
      return [];
    }
  }

  subscribe(symbol: SymbolInfo, period: Period, callback: (data: KLineData) => void): void {
    // 实时订阅（当前用 mock 模拟）
    const tf = periodToTimeframe(period);
    router.subscribe(symbol.ticker, tf, callback);
  }

  unsubscribe(_symbol: SymbolInfo, _period: Period): void {
    // no-op for now
  }
}

function marketLabel(m: string): string {
  const map: Record<string, string> = {
    ashare: 'A股', us: '美股', hk: '港股', crypto: '加密', futures: '期货',
  };
  return map[m] ?? m;
}
