/**
 * 东方财富 API 数据源（A股）
 * 使用 push2his.eastmoney.com 公开接口，无需认证
 */

import type { KLineData, Timeframe } from '@/types/chart';
import type { MarketDataProvider, FetchRequest, FetchResult } from './types';
import { timeframeToPeriod } from './types';

const API_BASE = 'https://push2his.eastmoney.com/api/qt/stock/kline/get';

export class EastMoneyProvider implements MarketDataProvider {
  readonly name = 'EastMoney';
  readonly markets = ['ashare' as const];

  async fetchKLine(req: FetchRequest): Promise<FetchResult> {
    const { symbol, timeframe } = req;
    const period = timeframeToPeriod(timeframe);

    // 确定市场代码前缀
    const code = resolveCode(symbol);
    const secid = resolveSecId(symbol);

    // 计算时间范围（默认 200 根K线）
    const limit = req.limit ?? 200;
    const params = new URLSearchParams({
      fields1: 'f1,f2,f3,f4,f5,f6',
      fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
      klt: String(period.span * (period.type === 'hour' ? 60 : period.type === 'minute' ? 1 : 101)),
      fqt: '1', // 前复权
      end: '20500101',
      lmt: String(limit),
      secid,
    });

    const url = `${API_BASE}?${params.toString()}`;

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const json = await response.json();
      const klines = json?.data?.klines;

      if (!klines || !Array.isArray(klines)) {
        throw new Error('No kline data in response');
      }

      const data: KLineData[] = klines.map((line: string) => {
        // 格式: "日期,开盘,收盘,最高,最低,成交量,成交额,振幅,涨跌幅,涨跌额,换手率"
        const parts = line.split(',');
        const dateStr = parts[0];
        const timestamp = new Date(dateStr + (period.type === 'day' ? '' : ' 09:30')).getTime();

        return {
          timestamp,
          open: parseFloat(parts[1]),
          close: parseFloat(parts[2]),
          high: parseFloat(parts[3]),
          low: parseFloat(parts[4]),
          volume: parseFloat(parts[5]),
          turnover: parseFloat(parts[6]),
        };
      });

      return { data, symbol: code, market: 'ashare' };
    } catch (err) {
      throw new Error(`EastMoney fetch failed: ${(err as Error).message}`);
    }
  }
}

/** 解析标的代码为标准格式 */
function resolveCode(symbol: string): string {
  const s = symbol.toUpperCase().trim();
  // 去掉 SH/SZ 前缀
  if (s.startsWith('SH') || s.startsWith('SZ')) return s.slice(2);
  return s;
}

/** 解析 secid（东方财富格式） */
function resolveSecId(symbol: string): string {
  const code = resolveCode(symbol);
  if (code.startsWith('60')) return `1.${code}`;  // 上交所
  if (code.startsWith('00') || code.startsWith('30')) return `0.${code}`;  // 深交所
  return `1.${code}`;
}
