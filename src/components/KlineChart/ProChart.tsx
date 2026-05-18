/**
 * KLineChart Pro React 封装
 * 使用 @klinecharts/pro 提供开箱即用的 TradingView 级体验
 * - 内置画图工具栏（无需自己画）
 * - 内置周期切换
 * - 内置指标管理
 * - 专业 CSS 主题
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { KLineChartPro } from '@klinecharts/pro';
import '@klinecharts/pro/dist/klinecharts-pro.css';
import type { SymbolInfo, Period } from '@klinecharts/pro';
import { CustomDatafeed } from '@/core/CustomDatafeed';
import type { InstrumentInfo } from '@/types/trade';
import { formatMoney, formatPercent } from '@/utils/format';
import { detectMarket } from '@/core/providers/types';

export interface ProChartProps {
  symbol?: string;
  height?: number;
}

// 可用周期列表
const PERIODS: Period[] = [
  { multiplier: 1, timespan: 'minute', text: '1分' },
  { multiplier: 5, timespan: 'minute', text: '5分' },
  { multiplier: 15, timespan: 'minute', text: '15分' },
  { multiplier: 30, timespan: 'minute', text: '30分' },
  { multiplier: 60, timespan: 'minute', text: '1时' },
  { multiplier: 240, timespan: 'minute', text: '4时' },
  { multiplier: 1, timespan: 'day', text: '日线' },
  { multiplier: 1, timespan: 'week', text: '周线' },
  { multiplier: 1, timespan: 'month', text: '月线' },
];

const datafeed = new CustomDatafeed();

const ProChart: React.FC<ProChartProps> = ({ symbol: initialSymbol, height = 520 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const proRef = useRef<KLineChartPro | null>(null);

  const [symbol, setSymbol] = useState(initialSymbol ?? '');
  const [symbolInput, setSymbolInput] = useState(initialSymbol ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instrumentInfo, setInstrumentInfo] = useState<InstrumentInfo | null>(null);

  // 初始化 Pro
  useEffect(() => {
    if (!containerRef.current) return;

    const symInfo: SymbolInfo = {
      ticker: initialSymbol || '000001',
      name: initialSymbol || '000001',
      shortName: initialSymbol || '000001',
      exchange: 'A股',
      market: 'stock',
      pricePrecision: 2,
      volumePrecision: 0,
      priceCurrency: 'CNY',
      type: 'stock',
    };

    const pro = new KLineChartPro({
      container: containerRef.current,
      symbol: symInfo,
      period: { multiplier: 1, timespan: 'day', text: '日线' },
      periods: PERIODS,
      theme: 'dark',
      locale: 'zh-CN',
      timezone: 'Asia/Shanghai',
      mainIndicators: ['MA'],
      subIndicators: ['VOL'],
      drawingBarVisible: true,
      datafeed,
    });

    proRef.current = pro;
  }, []);

  // 加载数据
  const loadSymbol = useCallback(async (sym: string) => {
    if (!sym.trim() || !proRef.current) return;
    const normalized = sym.toUpperCase().trim();
    setSymbol(normalized);
    setSymbolInput(normalized);
    setLoading(true);
    setError(null);

    try {
      const market = detectMarket(normalized);
      const symInfo: SymbolInfo = {
        ticker: normalized,
        name: normalized,
        shortName: normalized,
        exchange: marketLabel(market),
        market: market,
        pricePrecision: 2,
        volumePrecision: 0,
        priceCurrency: market === 'crypto' ? 'USDT' : 'CNY',
        type: 'stock',
      };

      proRef.current.setSymbol(symInfo);

      // 获取标的信息（用于顶部栏）
      const router = (await import('@/core/DataRouter')).getDataRouter();
      const result = await router.fetchKLine(normalized, '1D');
      if (result.data.length > 0) {
        const last = result.data[result.data.length - 1];
        const prev = result.data[result.data.length - 2] ?? last;
        const info: InstrumentInfo = {
          symbol: normalized,
          name: normalized,
          market,
          price: last.close,
          change: last.close - prev.close,
          changePct: prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0,
          open: last.open, high: last.high, low: last.low,
          volume: last.volume, turnover: last.turnover ?? 0,
        };

        // A 股名称
        if (market === 'ashare') {
          try {
            const r = await fetch(`https://push2.eastmoney.com/api/qt/stock/get?secid=1.${normalized}&fields=f57`);
            const j = await r.json();
            if (j?.data?.f57) info.name = j.data.f57;
          } catch {}
        }
        setInstrumentInfo(info);
      }
    } catch (err) {
      setError(`加载失败: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    if (initialSymbol) loadSymbol(initialSymbol);
  }, [initialSymbol, loadSymbol]);

  return (
    <div className="pro-chart-wrapper">
      {/* 自定义顶栏：标的信息 + 代码输入 */}
      <div className="pro-chart-info">
        {instrumentInfo && (
          <div className="instrument-info">
            <div className="info-left">
              <span className="info-name">{instrumentInfo.name}</span>
              <span className="info-symbol-code">{instrumentInfo.symbol}</span>
              <span className={`info-tag ${instrumentInfo.market}`}>{marketLabel(instrumentInfo.market)}</span>
            </div>
            <div className="info-center">
              <span className="info-price">{instrumentInfo.price.toFixed(2)}</span>
              <span className={`info-change ${instrumentInfo.change >= 0 ? 'up' : 'down'}`}>
                {formatMoney(instrumentInfo.change)} ({formatPercent(instrumentInfo.changePct)})
              </span>
            </div>
            <div className="info-right">
              <span>O <b>{instrumentInfo.open.toFixed(2)}</b></span>
              <span>H <b className="up">{instrumentInfo.high.toFixed(2)}</b></span>
              <span>L <b className="down">{instrumentInfo.low.toFixed(2)}</b></span>
              <span>V <b>{(instrumentInfo.volume / 10000).toFixed(0)}万</b></span>
            </div>
          </div>
        )}
        {!instrumentInfo && (
          <div className="pro-search-bar">
            <input
              className="symbol-input"
              type="text"
              value={symbolInput}
              onChange={e => setSymbolInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadSymbol(symbolInput)}
              placeholder="输入代码: 000001 / AAPL / BTCUSDT"
              spellCheck={false}
            />
            <button className="topbar-btn" onClick={() => loadSymbol(symbolInput)} disabled={loading}>
              {loading ? '⏳' : '加载'}
            </button>
          </div>
        )}
      </div>

      {/* 图表容器（Pro 负责内部全部 UI：画图工具、周期、指标等） */}
      {error && <div className="chart-error-bar">{error}</div>}
      <div ref={containerRef} className="pro-chart-container" style={{ height }} />
    </div>
  );
};

function marketLabel(m: string): string {
  const map: Record<string, string> = { ashare: 'A股', us: '美股', hk: '港股', crypto: '加密', futures: '期货' };
  return map[m] ?? m;
}

export default ProChart;
