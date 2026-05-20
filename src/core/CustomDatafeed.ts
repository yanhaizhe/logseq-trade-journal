/**
 * CustomDatafeed —— 适配 KLineChart Pro Datafeed 接口（Tushare 专用）
 * 注意：当前 ProChart 使用内联 datafeed，此类保留作备用
 */

import type { KLineData } from 'klinecharts';
import type { Datafeed, SymbolInfo, Period } from '@klinecharts/pro';
import type { Timeframe } from '@/types/chart';
import { getDataRouter } from './DataRouter';

export class CustomDatafeed implements Datafeed {
  private dataRouter = getDataRouter();

  async searchSymbols(search?: string): Promise<SymbolInfo[]> {
    const ticker = search?.trim() || '000001';
    return [
      {
        ticker,
        name: ticker,
        shortName: ticker,
        exchange: ticker.startsWith('60') ? 'SH' : 'SZ',
        market: 'stocks',
        pricePrecision: 2,
        volumePrecision: 0,
        priceCurrency: 'CNY',
        type: 'stock',
      },
    ];
  }

  async getHistoryKLineData(symbol: SymbolInfo, period: Period): Promise<KLineData[]> {
    const tf: Timeframe = periodToTimeframe(period) as Timeframe;
    try {
      const result = await this.dataRouter.fetchKLine(symbol.ticker, tf);
      return result.data;
    } catch {
      return [];
    }
  }

  subscribe(): void {}
  unsubscribe(): void {}
}

function periodToTimeframe(period: Period): string {
  if (period.timespan === 'minute') {
    if (period.multiplier >= 240) return '4H';
    if (period.multiplier >= 60) return '1H';
    return `${period.multiplier}m`;
  }
  if (period.timespan === 'week') return '1W';
  if (period.timespan === 'month') return '1M';
  return '1D';
}
