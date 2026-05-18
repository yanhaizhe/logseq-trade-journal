/**
 * 数据路由调度器
 * 根据标的代码自动识别市场并路由到对应数据源
 *
 * 架构：
 *   A股/期货    → EastMoney（免费公开 API）
 *   加密货币     → Binance（免费公开 API）
 *   美股/港股    → Mock（需 API Key，暂用模拟数据）
 *   未知市场     → Mock（回退）
 *
 *   未来扩展：
 *   - ProxyProvider：连接本地 Python akshare/tushare 服务
 *   - YFinanceProvider：封装 yfinance（需代理）
 */

import type { KLineData, Timeframe } from '@/types/chart';
import type { MarketDataProvider, FetchRequest, FetchResult, MarketType } from './providers/types';
import { detectMarket } from './providers/types';
import { EastMoneyProvider } from './providers/EastMoneyProvider';
import { BinanceProvider } from './providers/BinanceProvider';
import { MockProvider } from './providers/MockProvider';

export class DataRouter {
  private providers = new Map<MarketType, MarketDataProvider>();
  private mockProvider: MockProvider;
  private cache = new Map<string, { data: KLineData[]; ts: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 分钟缓存

  constructor() {
    this.mockProvider = new MockProvider();

    // 注册数据源
    this.registerProvider('ashare', new EastMoneyProvider());
    this.registerProvider('crypto', new BinanceProvider());
    // 其他市场暂用 Mock
  }

  /** 注册自定义数据源 */
  registerProvider(market: MarketType, provider: MarketDataProvider): void {
    this.providers.set(market, provider);
  }

  /** 获取K线数据 */
  async fetchKLine(
    symbol: string,
    timeframe: Timeframe,
    limit: number = 200,
  ): Promise<FetchResult> {
    const market = detectMarket(symbol);
    const cacheKey = `${symbol}_${timeframe}_${limit}`;

    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this.cacheTTL) {
      return { data: cached.data, symbol, market };
    }

    const provider = this.providers.get(market) ?? this.mockProvider;

    const req: FetchRequest = { symbol, timeframe, market, limit };

    try {
      const result = await provider.fetchKLine(req);

      // 缓存
      this.cache.set(cacheKey, { data: result.data, ts: Date.now() });
      // 限制缓存大小
      if (this.cache.size > 100) {
        const first = this.cache.keys().next().value;
        if (first) this.cache.delete(first);
      }

      return result;
    } catch (err) {
      console.warn(`[DataRouter] ${provider.name} failed for ${symbol}, fallback to mock`);
      // 回退到 Mock
      return this.mockProvider.fetchKLine(req);
    }
  }

  /** 订阅实时行情（目前仅 Mock 支持） */
  subscribe(
    symbol: string,
    timeframe: Timeframe,
    callback: (data: KLineData) => void,
  ): () => void {
    return this.mockProvider.subscribe(symbol, timeframe, callback);
  }

  /** 清除所有缓存 */
  clearCache(): void {
    this.cache.clear();
  }
}

// 全局单例
let _router: DataRouter | null = null;

export function getDataRouter(): DataRouter {
  if (!_router) _router = new DataRouter();
  return _router;
}
