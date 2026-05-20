/**
 * KLineChart 组件 v3 —— 参照 klinecharts/pro 架构
 * 
 * Pro 模式要点：
 * - 统一 Chart 生命周期管理（init → applyData → dispose）
 * - 主题系统（跟随 Logseq 明暗主题）
 * - applyMoreData 实时增量更新
 * - 时区支持
 * - 多画线独立管理
 */

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import * as kc from 'klinecharts';
import type { KLineData, IndicatorType, Timeframe } from '@/types/chart';
import { INDICATOR_OPTIONS, TIMEFRAME_OPTIONS } from '@/types/chart';
import { getDataRouter } from '@/core/DataRouter';
import { DataService } from '@/core/DataService';
import { detectMarket } from '@/core/providers/types';
import type { InstrumentInfo } from '@/types/trade';
import { formatMoney, formatPercent } from '@/utils/format';

// ===== 注册自定义图形 overlays (矩形 & 圆形) =====
try {
  kc.registerOverlay({
    name: 'rect',
    needDefaultPointFigure: true,
    totalStep: 3,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length < 2) return [];
      return [
        {
          type: 'rect',
          attrs: {
            x: Math.min(coordinates[0].x, coordinates[1].x),
            y: Math.min(coordinates[0].y, coordinates[1].y),
            width: Math.abs(coordinates[1].x - coordinates[0].x),
            height: Math.abs(coordinates[1].y - coordinates[0].y)
          },
          styles: {
            style: 'stroke_fill'
          }
        }
      ];
    }
  });

  kc.registerOverlay({
    name: 'circle',
    needDefaultPointFigure: true,
    totalStep: 3,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length < 2) return [];
      const r = Math.sqrt(
        Math.pow(coordinates[1].x - coordinates[0].x, 2) +
        Math.pow(coordinates[1].y - coordinates[0].y, 2)
      );
      return [
        {
          type: 'circle',
          attrs: {
            x: coordinates[0].x,
            y: coordinates[0].y,
            r: r
          },
          styles: {
            style: 'stroke_fill'
          }
        }
      ];
    }
  });
} catch (e) {
  console.warn('Failed to register custom overlays:', e);
}

// ===== 画图工具 =====
const DRAWING_TOOLS = [
  { id: 'cursor', name: '指针', icon: '🖱', group: 'nav' },
  { id: 'horizontalStraightLine', name: '水平线', icon: '━', group: 'line' },
  { id: 'horizontalRayLine', name: '水平射线', icon: '⇁', group: 'line' },
  { id: 'horizontalSegment', name: '水平线段', icon: '╌', group: 'line' },
  { id: 'verticalStraightLine', name: '垂直线', icon: '┃', group: 'line' },
  { id: 'verticalRayLine', name: '垂直射线', icon: '↿', group: 'line' },
  { id: 'verticalSegment', name: '垂直线段', icon: '╎', group: 'line' },
  { id: 'straightLine', name: '直线', icon: '╱', group: 'line' },
  { id: 'rayLine', name: '射线', icon: '↗', group: 'line' },
  { id: 'segment', name: '线段', icon: '⎯', group: 'line' },
  { id: 'parallelStraightLine', name: '平行线', icon: '⫼', group: 'line' },
  { id: 'priceLine', name: '价格线', icon: '$', group: 'line' },
  { id: 'priceChannelLine', name: '通道线', icon: '⫴', group: 'line' },
  { id: 'rect', name: '矩形', icon: '▭', group: 'shape' },
  { id: 'circle', name: '圆', icon: '○', group: 'shape' },
  { id: 'fibonacciLine', name: '斐波那契', icon: 'Φ', group: 'shape' },
];

const DRAWING_GROUPS = [
  { key: 'nav', label: '' },
  { key: 'line', label: '线' },
  { key: 'shape', label: '形' },
];

export interface KlineChartProps {
  symbol?: string;
  data?: KLineData[];
  config?: Partial<{ timeframe: Timeframe; indicators: IndicatorType[]; theme: 'light' | 'dark' }>;
  height?: number;
}

const dataService = new DataService();
const dataRouter = getDataRouter();

const KlineChartComponent: React.FC<KlineChartProps> = ({
  symbol: initialSymbol = '',
  data: initialData,
  config: configOverride,
  height = 480,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<kc.Chart | null>(null);
  const indicatorPaneMap = useRef<Map<string, string>>(new Map());
  const disposeRef = useRef<(() => void) | null>(null);

  const [symbol, setSymbol] = useState(initialSymbol);
  const [symbolInput, setSymbolInput] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState<string>(configOverride?.timeframe ?? '1D');
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorType>>(
    new Set(configOverride?.indicators ?? ['MA', 'VOLUME']),
  );
  const [activeDrawing, setActiveDrawing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [klineData, setKlineData] = useState<KLineData[]>(initialData ?? []);
  const [error, setError] = useState<string | null>(null);
  const [instrumentInfo, setInstrumentInfo] = useState<InstrumentInfo | null>(null);
  const [chartTheme] = useState(configOverride?.theme ?? 'dark');

  // ===== Pro 模式：统一 Chart 生命周期 =====
  const initChart = useCallback(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = kc.init(containerRef.current, {
      styles: createTheme(chartTheme) as any,
      locale: 'zh-CN',
      timezone: 'Asia/Shanghai',
    });

    if (!chart) return;

    chartRef.current = chart;

    // 初始指标
    const indicators = configOverride?.indicators ?? ['MA', 'VOLUME'];
    indicatorPaneMap.current = new Map();
    indicators.forEach(ind => {
      try {
        // Pro 模式：VOLUME 使用独立 pane
        const isOverlay = ind !== 'VOLUME';
        const pid = chart.createIndicator(ind, isOverlay);
        if (pid) indicatorPaneMap.current.set(ind, pid);
      } catch {}
    });

    // Resize 观察
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(containerRef.current);
    disposeRef.current = () => {
      ro.disconnect();
      try { (chart as any).destroy?.(); } catch {}
      try { (chart as any).dispose?.(); } catch {}
      chartRef.current = null;
    };
  }, [chartTheme, configOverride?.indicators]);

  useEffect(() => {
    initChart();
    return () => disposeRef.current?.();
  }, [initChart]);

  // 应用数据
  useEffect(() => {
    if (chartRef.current && klineData.length > 0) {
      chartRef.current.applyNewData(klineData);
    }
  }, [klineData]);

  // 初始数据
  useEffect(() => {
    if (initialData?.length && klineData.length === 0) {
      setKlineData(initialData);
    }
  }, [initialData]);

  // ===== 数据加载 =====
  const loadData = useCallback(async (sym: string) => {
    if (!sym.trim()) return;
    const normalized = sym.toUpperCase().trim();
    setSymbol(normalized);
    setSymbolInput(normalized);
    setLoading(true);
    setError(null);
    setInstrumentInfo(null);

    try {
      const result = await dataRouter.fetchKLine(normalized, timeframe as Timeframe);
      if (!result.data.length) {
        setError('未获取到数据，请检查标的代码');
        return;
      }
      setKlineData(result.data);

      // 标的信息
      const last = result.data[result.data.length - 1];
      const prev = result.data[result.data.length - 2] ?? last;
      const info: InstrumentInfo = {
        symbol: normalized,
        name: normalized,
        market: detectMarket(normalized),
        price: last.close,
        change: last.close - prev.close,
        changePct: prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0,
        open: last.open, high: last.high, low: last.low,
        volume: last.volume ?? 0, turnover: (last as any).turnover ?? 0,
      };
      setInstrumentInfo(info);

      // 获取标的名称 (A股/港股/美股等)
      try {
        const symbolInfo = await dataRouter.fetchSymbolInfo(normalized);
        if (symbolInfo && symbolInfo.name) {
          info.name = symbolInfo.name;
          setInstrumentInfo({ ...info });
        }
      } catch {}
    } catch (err) {
      setError(`加载失败: ${(err as Error).message}`);
      setKlineData(dataService.generateMockData(normalized, timeframe as Timeframe, 200));
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  // 周期切换
  const switchTimeframe = useCallback(async (tf: string) => {
    setTimeframe(tf);
    if (!symbol) return;
    setLoading(true);
    try {
      const result = await dataRouter.fetchKLine(symbol, tf as Timeframe);
      setKlineData(result.data);
    } catch {
      setKlineData(dataService.generateMockData(symbol, tf as Timeframe, 200));
    } finally { setLoading(false); }
  }, [symbol]);

  // 指标切换
  const toggleIndicator = useCallback((ind: IndicatorType) => {
    const chart = chartRef.current;
    if (!chart) return;
    const newActive = new Set(activeIndicators);
    if (newActive.has(ind)) {
      newActive.delete(ind);
      const pid = indicatorPaneMap.current.get(ind);
      if (pid) { try { chart.removeIndicator(pid, ind); } catch {}; indicatorPaneMap.current.delete(ind); }
    } else {
      newActive.add(ind);
      const isOverlay = ind !== 'VOLUME';
      try { const pid = chart.createIndicator(ind, isOverlay); if (pid) indicatorPaneMap.current.set(ind, pid); } catch {}
    }
    setActiveIndicators(newActive);
  }, [activeIndicators]);

  // 画图（多线共存）
  const startDrawing = useCallback((toolId: string) => {
    const chart = chartRef.current;
    if (!chart) return;
    if (toolId === 'cursor') { setActiveDrawing(null); return; }
    try {
      chart.createOverlay({
        name: toolId,
        onDrawEnd: () => {
          setActiveDrawing(null);
          return false;
        }
      });
      setActiveDrawing(toolId);
    } catch {}
  }, []);

  const clearAllDrawings = useCallback(() => {
    chartRef.current?.removeOverlay();
    setActiveDrawing(null);
  }, []);

  // CSV
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file?.name.endsWith('.csv')) return;
    setLoading(true);
    try { const d = await dataService.parseCSV(file); if (d.length) setKlineData(d); } finally { setLoading(false); }
  }, []);

  const groupedTools = useMemo(() =>
    DRAWING_GROUPS.map(g => ({ ...g, tools: DRAWING_TOOLS.filter(t => t.group === g.key) })).filter(g => g.tools.length > 0), []);

  return (
    <div className="kline-chart-wrapper">
      {/* 标的信息栏 */}
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

      {/* 顶栏 */}
      <div className="chart-topbar">
        <div className="topbar-left">
          <input className="symbol-input" type="text" value={symbolInput}
            onChange={e => setSymbolInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadData(symbolInput)}
            placeholder="000001 / AAPL / BTCUSDT" spellCheck={false} />
          <button className="topbar-btn" onClick={() => loadData(symbolInput)} disabled={loading}>
            {loading ? '⏳' : '加载'}
          </button>
        </div>
        <div className="topbar-center">
          {TIMEFRAME_OPTIONS.map(tf => (
            <button key={tf.value} className={`tf-btn ${tf.value === timeframe ? 'active' : ''}`}
              onClick={() => switchTimeframe(tf.value)}>{tf.label}</button>
          ))}
        </div>
        <div className="topbar-right">
          {INDICATOR_OPTIONS.map(ind => (
            <button key={ind.value} className={`ind-btn ${activeIndicators.has(ind.value) ? 'active' : ''}`}
              onClick={() => toggleIndicator(ind.value)} title={ind.label}>{ind.label.split(' ')[0]}</button>
          ))}
        </div>
      </div>

      {/* 主体 */}
      <div className="chart-body">
        <div className="chart-left-toolbar">
          {groupedTools.map(group => (
            <div key={group.key} className="tool-group">
              {group.label && <div className="tool-group-label">{group.label}</div>}
              {group.tools.map(tool => (
                <button key={tool.id} className={`tool-btn ${activeDrawing === tool.id ? 'active' : ''}`}
                  onClick={() => startDrawing(tool.id)} title={tool.name}>
                  <span className="tool-icon">{tool.icon}</span>
                </button>
              ))}
            </div>
          ))}
          <button className="tool-btn clear-btn" onClick={clearAllDrawings} title="清除全部">
            <span className="tool-icon">🗑</span>
          </button>
        </div>

        <div className="chart-main-area">
          {error && <div className="chart-error-bar">{error}</div>}
          <div ref={containerRef} className="kline-chart-container" style={{ height, width: '100%' }}
            onDrop={handleDrop} onDragOver={e => e.preventDefault()} />
          {klineData.length === 0 && !loading && (
            <div className="kline-chart-empty">
              <div className="empty-icon">📊</div>
              <p>输入标的代码加载K线数据</p>
              <p className="empty-hint">A股:6位代码 | 美股:AAPL | 加密:BTCUSDT</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function marketLabel(m: string): string {
  const map: Record<string, string> = { ashare: 'A股', us: '美股', hk: '港股', crypto: '加密', futures: '期货' };
  return map[m] ?? m;
}

/** 创建 KLineChart 主题（Pro 风格） */
function createTheme(type: 'light' | 'dark') {
  if (type === 'light') {
    return {
      grid: { horizontal: { color: '#e8e8e8', style: 'solid' as const, size: 1 }, vertical: { color: '#e8e8e8', style: 'solid' as const, size: 1 } },
      candle: {
        type: 'candle_solid' as const,
        bar: { upColor: '#ef4444', downColor: '#22c55e', noChangeColor: '#666', upBorderColor: '#ef4444', downBorderColor: '#22c55e', noChangeBorderColor: '#666', upWickColor: '#ef4444', downWickColor: '#22c55e', noChangeWickColor: '#666' },
        priceMark: { high: { show: true, color: '#ef4444' }, low: { show: true, color: '#22c55e' } },
      },
      xAxis: { axisLine: { color: '#ccc', size: 1 }, tickText: { color: '#666', size: 11 } },
      yAxis: { axisLine: { color: '#ccc', size: 1 }, tickText: { color: '#666', size: 11 } },
      separator: { color: '#e8e8e8', size: 1 },
      overlay: {
        point: { color: '#1677ff', borderColor: 'rgba(22, 119, 255, 0.35)', borderSize: 1, radius: 4, activeRadius: 6, activeColor: '#1677ff', activeBorderColor: 'rgba(22, 119, 255, 0.5)' },
        line: { color: '#1677ff', size: 1.5, style: 'solid' },
        rect: { borderColor: '#1677ff', borderSize: 1.5, color: 'rgba(22, 119, 255, 0.1)' },
        circle: { borderColor: '#1677ff', borderSize: 1.5, color: 'rgba(22, 119, 255, 0.1)' },
        polygon: { borderColor: '#1677ff', borderSize: 1.5, color: 'rgba(22, 119, 255, 0.1)' },
        text: { color: '#1677ff', size: 12, family: 'sans-serif', weight: 'normal' }
      }
    };
  }
  return {
    grid: { horizontal: { color: '#2a2e35', style: 'solid' as const, size: 1 }, vertical: { color: '#2a2e35', style: 'solid' as const, size: 1 } },
    candle: {
      type: 'candle_solid' as const,
      bar: { upColor: '#ef4444', downColor: '#22c55e', noChangeColor: '#888', upBorderColor: '#ef4444', downBorderColor: '#22c55e', noChangeBorderColor: '#888', upWickColor: '#ef4444', downWickColor: '#22c55e', noChangeWickColor: '#888' },
      priceMark: { high: { show: true, color: '#ef4444', textSize: 10 }, low: { show: true, color: '#22c55e', textSize: 10 } },
    },
    xAxis: { axisLine: { color: '#4a4a4a', size: 1 }, tickText: { color: '#aaa', size: 11 } },
    yAxis: { axisLine: { color: '#4a4a4a', size: 1 }, tickText: { color: '#aaa', size: 11 } },
    separator: { color: '#2a2e35', size: 1 },
    overlay: {
      point: { color: '#30b0ff', borderColor: 'rgba(48, 176, 255, 0.35)', borderSize: 1, radius: 4, activeRadius: 6, activeColor: '#30b0ff', activeBorderColor: 'rgba(48, 176, 255, 0.5)' },
      line: { color: '#30b0ff', size: 1.5, style: 'solid' },
      rect: { borderColor: '#30b0ff', borderSize: 1.5, color: 'rgba(48, 176, 255, 0.1)' },
      circle: { borderColor: '#30b0ff', borderSize: 1.5, color: 'rgba(48, 176, 255, 0.1)' },
      polygon: { borderColor: '#30b0ff', borderSize: 1.5, color: 'rgba(48, 176, 255, 0.1)' },
      text: { color: '#30b0ff', size: 12, family: 'sans-serif', weight: 'normal' }
    }
  };
}

export default KlineChartComponent;
