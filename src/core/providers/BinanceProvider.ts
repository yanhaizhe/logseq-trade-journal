/**
 * Binance 公开 API（加密货币）
 * 无需认证，全球 CDN 加速
 */

import type { KLineData, Timeframe } from '@/types/chart';
import type { MarketDataProvider, FetchRequest, FetchResult } from './types';

const API_BASE = 'https://api.binance.com/api/v3/klines';

// Binance interval 映射
const INTERVAL_MAP: Record<string, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1H': '1h',
  '4H': '4h',
  '1D': '1d',
  '1W': '1w',
  '1M': '1M',
};

export class BinanceProvider implements MarketDataProvider {
  readonly name = 'Binance';
  readonly markets = ['crypto' as const];

  async fetchKLine(req: FetchRequest): Promise<FetchResult> {
    const { symbol, timeframe } = req;
    const symbolNormalized = symbol.toUpperCase().replace('USDT', 'USDT');

    const interval = INTERVAL_MAP[timeframe] || '1d';
    const limit = Math.min(req.limit ?? 200, 1000);

    const params = new URLSearchParams({
      symbol: symbolNormalized,
      interval,
      limit: String(limit),
    });

    const url = `${API_BASE}?${params.toString()}`;

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const raw = await response.json();

      if (!Array.isArray(raw)) {
        throw new Error('Unexpected response format');
      }

      const data: KLineData[] = raw.map((item: unknown[]) => ({
        timestamp: Number(item[0]),
        open: Number(item[1]),
        high: Number(item[2]),
        low: Number(item[3]),
        close: Number(item[4]),
        volume: Number(item[5]),
        turnover: Number(item[7]), // Quote asset volume
      }));

      return { data, symbol: symbolNormalized, market: 'crypto' };
    } catch (err) {
      throw new Error(`Binance fetch failed: ${(err as Error).message}`);
    }
  }
}
