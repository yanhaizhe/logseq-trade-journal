/**
 * 数据中心 —— 统一通过本地 Python 数据服务获取多市场数据
 *
 * 架构:
 *   JS (浏览器) → HTTP → Python FastAPI → AKShare/Tushare/YFinance/CCXT
 *
 * A股/期货:  AKShare → Tushare（备用）
 * 美股/港股:  YFinance
 * 加密货币:  CCXT (Binance)
 */

import type { Timeframe } from '@/types/chart';
import type { KLineData } from 'klinecharts';
import type { FetchResult } from './providers/types';
import { detectMarket } from './providers/types';
import { AKShareProvider } from './providers/AKShareProvider';
import { IndexedDBCache } from './cache/IndexedDBCache';

export class DataRouter {
  private provider = new AKShareProvider();

  async checkAKShareHealth(): Promise<boolean> {
    return this.provider.health();
  }

  async checkProvidersDetail(): Promise<Record<string, boolean>> {
    return this.provider.healthDetail();
  }

  async fetchKLine(symbol: string, timeframe: Timeframe): Promise<FetchResult> {
    const market = detectMarket(symbol);
    const code = normalize(symbol);

    // IndexedDB 缓存
    const cached = await IndexedDBCache.getKLine(code, timeframe);
    if (cached && cached.length > 50) {
      return { data: cached, symbol: code, market };
    }

    // 统一走 Python 数据服务（内部自动路由到对应 Provider）
    const result = await this.provider.fetchKLine({ symbol: code, timeframe, market, limit: 300 });
    if (result.data.length === 0) {
      throw new Error(`无数据: ${code}`);
    }

    await IndexedDBCache.setKLine(code, timeframe, result.data);
    return result;
  }

  async getCached(symbol: string, timeframe: Timeframe): Promise<KLineData[]> {
    const cached = await IndexedDBCache.getKLine(normalize(symbol), timeframe);
    return cached ?? [];
  }

  async cleanCache(): Promise<void> {
    await IndexedDBCache.cleanExpired();
  }
}

function normalize(s: string): string {
  return s.toUpperCase().trim().replace(/^(SH|SZ)/, '');
}

let _instance: DataRouter | null = null;

export function getDataRouter(): DataRouter {
  if (!_instance) _instance = new DataRouter();
  return _instance;
}
