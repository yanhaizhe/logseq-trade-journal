/**
 * KLineChart Pro 封装 —— 参考 klinecharts/preview
 *
 * 数据源: Python 数据服务 (AKShare/Tushare/YFinance/CCXT)
 * 默认手动刷新，可切换自动刷新
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { KLineChartPro } from '@klinecharts/pro';
import '@klinecharts/pro/dist/klinecharts-pro.css';
import type { SymbolInfo, Period } from '@klinecharts/pro';
import type { KLineData } from 'klinecharts';
import { getDataRouter } from '@/core/DataRouter';
import { detectMarket } from '@/core/providers/types';
import type { InstrumentInfo } from '@/types/trade';

export interface ProChartProps {
  symbol?: string;
  height?: number;
}

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

const MARKET_LABEL: Record<string, string> = {
  ashare: 'A股', futures: '期货', us: '美股', hk: '港股', crypto: '加密',
};

const ProChart: React.FC<ProChartProps> = ({ symbol: initialSymbol, height = 520 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const proRef = useRef<KLineChartPro | null>(null);
  const dataRef = useRef<KLineData[]>([]);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(false);

  const [symbolInput, setSymbolInput] = useState(initialSymbol ?? '');
  const [currentSymbol, setCurrentSymbol] = useState('');
  const [currentTF, setCurrentTF] = useState('1D');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [info, setInfo] = useState<InstrumentInfo | null>(null);
  const [lastUpdate, setLastUpdate] = useState('');
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>({});

  // 检测数据服务状态（仅首次）
  const checkServer = useCallback(async () => {
    const router = getDataRouter();
    const ok = await router.checkAKShareHealth();
    setServerStatus(ok ? 'online' : 'offline');
    if (ok) {
      const detail = await router.checkProvidersDetail();
      setProviderStatus(detail);
    }
  }, []);

  useEffect(() => {
    checkServer();
  }, [checkServer]);

  // 停止数据服务
  const stopServer = useCallback(async () => {
    try {
      await fetch('http://127.0.0.1:8765/shutdown', { method: 'POST', signal: AbortSignal.timeout(3000) });
    } catch { /* 预期错误 */ }
    setServerStatus('offline');
  }, []);

  // 初始化 Pro
  useEffect(() => {
    if (!containerRef.current || mounted.current) return;
    mounted.current = true;

    console.log('[ProChart] 初始化引擎...');
    const pro = new KLineChartPro({
      container: containerRef.current,
      symbol: {
        ticker: '000001', name: '平安银行', shortName: '平安银行',
        exchange: 'SZ', market: 'stocks', pricePrecision: 2,
        volumePrecision: 0, priceCurrency: 'CNY', type: 'stock',
      },
      period: PERIODS[6],
      periods: PERIODS,
      theme: 'dark',
      locale: 'zh-CN',
      timezone: 'Asia/Shanghai',
      mainIndicators: ['MA'],
      subIndicators: ['VOL'],
      drawingBarVisible: true,
      watermark: 'Trade Journal',
      datafeed: {
        searchSymbols: async (search?: string) => {
          const t = search?.trim() || '000001';
          return [{ ticker: t, name: t, shortName: t,
            exchange: t.startsWith('60') ? 'SH' : 'SZ', market: 'stocks',
            pricePrecision: 2, volumePrecision: 0, priceCurrency: 'CNY', type: 'stock' }];
        },
        getHistoryKLineData: async () => dataRef.current,
        subscribe: () => {},
        unsubscribe: () => {},
      } as any,
    });

    proRef.current = pro;
    console.log('[ProChart] 引擎就绪');

    return () => {
      if (autoTimer.current) clearInterval(autoTimer.current);
      mounted.current = false;
      proRef.current = null;
    };
  }, []);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh || !currentSymbol) return;

    const fetchAndUpdate = async () => {
      const router = getDataRouter();
      try {
        const result = await router.fetchKLine(normalizeSymbol(currentSymbol), currentTF as any);
        dataRef.current = result.data;
        setLastUpdate(new Date().toLocaleTimeString());
        setInfo(buildInfo(currentSymbol, result.data));
      } catch (e) {
        console.warn('[ProChart] 自动刷新失败:', e);
      }
    };

    autoTimer.current = setInterval(fetchAndUpdate, 30_000);
    return () => { if (autoTimer.current) clearInterval(autoTimer.current); };
  }, [autoRefresh, currentSymbol, currentTF]);

  // 手动加载
  const loadSymbol = useCallback(async (sym: string, tf?: string) => {
    const normalized = normalizeSymbol(sym);
    if (!normalized || !proRef.current) return;

    setCurrentSymbol(normalized);
    setSymbolInput(normalized);
    setLoading(true);
    setError(null);
    setInfo(null);
    setLastUpdate('');

    const timeframe = tf || currentTF;
    setCurrentTF(timeframe);

    try {
      const router = getDataRouter();
      const result = await router.fetchKLine(normalized, timeframe as any);
      dataRef.current = result.data;

      const market = detectMarket(normalized);
      proRef.current.setSymbol({
        ticker: normalized, name: normalized, shortName: normalized,
        exchange: normalized.startsWith('60') ? 'SH' : 'SZ',
        market: market === 'crypto' ? 'crypto' : 'stocks',
        pricePrecision: market === 'crypto' ? 4 : 2,
        volumePrecision: 0,
        priceCurrency: market === 'crypto' ? 'USDT' : 'CNY',
        type: 'stock',
      });

      setLastUpdate(new Date().toLocaleTimeString());
      setInfo(buildInfo(normalized, result.data));
      console.log(`[ProChart] 加载完成: ${normalized} ${result.data.length}条`);
    } catch (err) {
      console.error('[ProChart] 加载失败:', err);
      setError(`加载失败: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [currentTF]);

  useEffect(() => {
    if (initialSymbol && proRef.current) loadSymbol(initialSymbol);
  }, [initialSymbol]);

  // 渲染
  return (
    <div className="pro-chart-wrapper">
      {/* 顶栏 */}
      <div className="pro-chart-topbar">
        <div className="pro-chart-topbar-left">
          {info && (
            <>
              <span className="topbar-name">{info.name}</span>
              <span className="topbar-code">{info.symbol}</span>
              <span className={`topbar-tag ${info.market}`}>{MARKET_LABEL[info.market] || info.market}</span>
              <span className={`topbar-price ${info.change >= 0 ? 'up' : 'down'}`}>
                {info.price.toFixed(info.market === 'crypto' ? 2 : 2)}
              </span>
              <span className={`topbar-change ${info.change >= 0 ? 'up' : 'down'}`}>
                {info.change >= 0 ? '+' : ''}{info.change.toFixed(2)} ({info.changePct >= 0 ? '+' : ''}{info.changePct.toFixed(2)}%)
              </span>
            </>
          )}
          {!info && !loading && <span className="topbar-placeholder">输入代码加载数据</span>}
          {loading && <span className="topbar-loading">⏳ 加载中...</span>}
        </div>

        <div className="pro-chart-topbar-right">
          {/* 数据服务状态 */}
          <span className={`akshare-status ${serverStatus}`}
            title={serverStatus === 'online'
              ? `数据服务运行中\n${Object.entries(providerStatus).map(([k,v]) => `${k}: ${v?'✅':'❌'}`).join('\n')}`
              : serverStatus === 'offline'
                ? '数据服务未启动 → 终端运行 scripts/data-service.sh start'
                : '检测中...'}>
            <span className="akshare-dot" />
            {serverStatus === 'online' ? '数据' : serverStatus === 'offline' ? '⏻' : '...'}
          </span>

          {serverStatus === 'online' && (
            <button className="topbar-btn akshare-stop" onClick={stopServer} title="停止数据服务">停</button>
          )}

          <input className="topbar-input" type="text" value={symbolInput}
            onChange={e => setSymbolInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadSymbol(symbolInput)}
            placeholder="000001 / AAPL / BTCUSDT"
            spellCheck={false} disabled={loading} />
          <button className="topbar-btn" onClick={() => loadSymbol(symbolInput)}
            disabled={loading || !symbolInput.trim()}>{loading ? '⏳' : '加载'}</button>
          <button className={`topbar-btn ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? '关闭自动刷新' : '开启自动刷新(30s)'}>
            {autoRefresh ? '🔄 自动' : '🔄'}
          </button>
          {lastUpdate && <span className="topbar-time">{lastUpdate}</span>}
        </div>
      </div>

      {error && <div className="pro-chart-error">{error}</div>}

      <div ref={containerRef} className="pro-chart-container" style={{ height }} />
    </div>
  );
};

function normalizeSymbol(s: string): string {
  return s.toUpperCase().trim().replace(/^(SH|SZ)/, '');
}

function buildInfo(symbol: string, data: KLineData[]): InstrumentInfo {
  const last = data[data.length - 1];
  const prev = data.length > 1 ? data[data.length - 2] : last;
  return {
    symbol, name: symbol, market: detectMarket(symbol),
    price: last.close, change: last.close - prev.close,
    changePct: prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0,
    open: last.open, high: last.high, low: last.low,
    volume: last.volume ?? 0, turnover: (last as any).turnover ?? 0,
  };
}

export default ProChart;
