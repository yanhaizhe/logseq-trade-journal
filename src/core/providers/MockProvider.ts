/**
 * Mock 数据源（开发/离线回退）
 */

import type { KLineData, Timeframe } from '@/types/chart';
import type { MarketDataProvider, FetchRequest, FetchResult } from './types';
import { detectMarket, timeframeToMs } from './types';

const mockCache = new Map<string, KLineData[]>();

export class MockProvider implements MarketDataProvider {
  readonly name = 'Mock';
  readonly markets = ['ashare', 'us', 'hk', 'crypto', 'futures', 'unknown' as any];

  async fetchKLine(req: FetchRequest): Promise<FetchResult> {
    const { symbol, timeframe } = req;
    const cacheKey = `${symbol}_${timeframe}_${req.limit ?? 200}`;
    const cached = mockCache.get(cacheKey);
    if (cached) return { data: cached, symbol, market: detectMarket(symbol) };

    const intervalMs = timeframeToMs(timeframe);
    const count = req.limit ?? 200;
    const now = Date.now();

    let price = 10 + Math.random() * 90;
    let volume = 1_000_000;
    const data: KLineData[] = [];

    for (let i = count - 1; i >= 0; i--) {
      const change = (Math.random() - 0.5) * price * 0.04;
      const open = price;
      const close = price + change;
      data.push({
        timestamp: now - i * intervalMs,
        open: round4(open),
        high: round4(Math.max(open, close) + Math.random() * Math.abs(change) * 0.5),
        low: round4(Math.min(open, close) - Math.random() * Math.abs(change) * 0.5),
        close: round4(close),
        volume: Math.round(volume * (0.5 + Math.random())),
        turnover: Math.round(close * volume * (0.5 + Math.random())),
      });
      price = close;
      volume *= (0.8 + Math.random() * 0.4);
    }

    mockCache.set(cacheKey, data);
    return { data, symbol, market: detectMarket(symbol) };
  }

  subscribe(symbol: string, _timeframe: Timeframe, callback: (data: KLineData) => void): () => void {
    const timer = setInterval(() => {
      const last = mockCache.get(symbol)?.[0];
      const price = last?.close ?? 50;
      const change = (Math.random() - 0.5) * price * 0.01;
      callback({
        timestamp: Date.now(),
        open: price,
        close: price + change,
        high: price + Math.abs(change) * 1.5,
        low: price - Math.abs(change) * 1.5,
        volume: Math.round(50000 + Math.random() * 200000),
      });
    }, 3000);
    return () => clearInterval(timer);
  }
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}
