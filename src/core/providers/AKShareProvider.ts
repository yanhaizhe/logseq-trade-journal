/**
 * AKShare Provider —— 通过本地 Python 数据服务获取多市场数据
 *
 * 服务端: server/main.py (FastAPI)
 * 默认地址: http://127.0.0.1:8765
 * 支持: A股/期货(AKShare→Tushare), 美股/港股(YFinance), 加密(CCXT)
 */

import type { KLineData } from 'klinecharts';
import type { MarketDataProvider, FetchRequest, FetchResult, MarketType } from './types';
import { IndexedDBCache } from '../cache/IndexedDBCache';

export interface AKShareConfig {
  baseUrl?: string;
  timeout?: number;
}

const PERIOD_MAP: Record<string, string> = {
  '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min',
  '1H': '60min', '4H': '60min',
  '1D': 'daily', '1W': 'weekly', '1M': 'monthly',
};

export class AKShareProvider implements MarketDataProvider {
  readonly name = 'AKShare';
  readonly markets: MarketType[] = ['ashare', 'futures', 'us', 'hk', 'crypto'];
  private baseUrl: string;
  private timeout: number;

  constructor(config: AKShareConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://127.0.0.1:8765';
    this.timeout = config.timeout || 20000;
  }

  /** 健康检查 */
  async health(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(3000) });
      if (!resp.ok) return false;
      const json = await resp.json();
      return json.status === 'ok';
    } catch {
      return false;
    }
  }

  /** 获取所有 provider 健康状态 */
  async healthDetail(): Promise<Record<string, boolean>> {
    try {
      const resp = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(3000) });
      const json = await resp.json();
      return json.providers || {};
    } catch {
      return {};
    }
  }

  async fetchKLine(req: FetchRequest): Promise<FetchResult> {
    const { symbol, timeframe } = req;
    const code = normalizeSymbol(symbol);
    const period = PERIOD_MAP[timeframe] || 'daily';

    // 缓存优先
    const cached = await IndexedDBCache.getKLine(code, timeframe);
    if (cached && cached.length > 50) {
      return { data: cached, symbol: code, market: req.market };
    }

    const params = new URLSearchParams({
      symbol: code,
      period,
      limit: String(Math.min(req.limit ?? 300, 800)),
      adjust: 'qfq',
    });

    const resp = await fetch(`${this.baseUrl}/kline?${params}`, {
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`数据服务 HTTP ${resp.status}: ${errText}`);
    }

    const json = await resp.json();
    const rawData: any[] = json.data || [];
    if (rawData.length === 0) {
      throw new Error(`${json.provider || '服务'} 返回空数据: ${code}`);
    }

    const data: KLineData[] = rawData.map((item: any) => ({
      timestamp: Number(item.timestamp) || 0,
      open: Number(item.open) || 0,
      high: Number(item.high) || 0,
      low: Number(item.low) || 0,
      close: Number(item.close) || 0,
      volume: Number(item.volume) || 0,
      turnover: Number(item.turnover) || 0,
    }));

    if (data.length > 0) {
      await IndexedDBCache.setKLine(code, timeframe, data);
    }

    console.log(`[AKShare] ${code} → ${json.provider} (${json.market}) ${data.length}条`);
    return { data, symbol: code, market: (json.market as MarketType) || req.market };
  }
}

function normalizeSymbol(s: string): string {
  return s.toUpperCase().trim().replace(/^(SH|SZ)/, '');
}
