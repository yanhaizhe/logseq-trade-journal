import React, { useRef, useEffect, useState, useCallback } from 'react';
import { KLineChartPro, Period, SymbolInfo } from '@klinecharts/pro';
import '@klinecharts/pro/dist/klinecharts-pro.css';
import { getDataRouter } from '@/core/DataRouter';
import { detectMarket } from '@/core/providers/types';
import type { InstrumentInfo, TradeRecord } from '@/types/trade';
import type { Timeframe } from '@/types/chart';
import { formatMoney, formatPercent } from '@/utils/format';
import { StudyLab } from './StudyLab';
import { TradingNotes } from './TradingNotes';
import { useAppStore } from '@/store';
import { KLineData, registerOverlay, OverlayEvent } from 'klinecharts';
import dayjs from 'dayjs';

declare global {
  interface Window {
    __tradeManager?: {
      db?: {
        getTradesBySymbol: (symbol: string) => Promise<TradeRecord[]>;
        insertTrade: (record: Omit<TradeRecord, 'id'>) => Promise<void>;
      };
    };
  }
}

interface KLineChartInstance {
  removeOverlay: (filter?: { name?: string; id?: string; groupId?: string }) => void;
  // options 使用 any 类型，以便兼容第三方库创建各种覆盖物所接受的底层任意形状的配置对象
  createOverlay: (options: any) => string | null;
  // getOverlays 返回 any[] 是因为底层覆盖物集合包含各类不同配置与属性的第三方类库对象
  getOverlays: () => any[];
  getDataList: () => KLineData[];
  subscribeAction: (action: string, callback: () => void) => void;
  getBarSpace: () => number;
  setBarSpace: (space: number) => void;
  convertFromPixel: (coordinates: any[], finder: any) => any[];
  scrollToTimestamp: (timestamp: number, animationDuration?: number) => void;
  createIndicator: (value: any, isStack?: boolean, paneOptions?: any) => string | null;
  removeIndicator: (paneId: any, name?: string) => void;
  getIndicatorByPaneId: (...args: any[]) => any;
  getConvertPictureUrl: (includeOverlay?: boolean, type?: string, backgroundColor?: string) => string;
  destroy: () => void;
  dispose: () => void;
  [key: string]: any;
}

const dataRouter = getDataRouter();

const PERIODS: Period[] = [
  { multiplier: 1, timespan: 'minute', text: '1m' },
  { multiplier: 5, timespan: 'minute', text: '5m' },
  { multiplier: 15, timespan: 'minute', text: '15m' },
  { multiplier: 30, timespan: 'minute', text: '30m' },
  { multiplier: 60, timespan: 'minute', text: '1h' },
  { multiplier: 240, timespan: 'minute', text: '4h' },
  { multiplier: 1, timespan: 'day', text: '日K' },
  { multiplier: 1, timespan: 'week', text: '周K' },
  { multiplier: 1, timespan: 'month', text: '月K' },
];

let globalOnMarkerHover: ((hovered: any | null, event?: any) => void) | null = null;

/**
 * 从 KLineChartPro 实例中获取底层 klinecharts Chart 实例。
 * KLineChartPro._chartApi 是 SolidJS 组件 ref，只暴露 setTheme 等高层方法，
 * 不包含 createOverlay / removeOverlay 等绘图 API。
 * 真正的 Chart 实例由我们的 klinecharts-wrapper.ts 保存在 DOM 元素的 __klinechart__ 属性上。
 */
function getInnerChart(pro: KLineChartPro | null): KLineChartInstance | null {
  if (!pro) return null;
  const container = (pro as any)._container;
  if (!container) return null;
  const chartEl = container.querySelector?.('[k-line-chart-id]');
  return chartEl ? (chartEl as any).__klinechart__ ?? null : null;
}


registerOverlay({
  name: 'tradeMarker',
  totalStep: 1, // 静态标记仅需单点，防止画图状态卡顿 and 鼠标交互干扰
  onMouseEnter: (event: OverlayEvent) => {
    if (globalOnMarkerHover) {
      globalOnMarkerHover(event.overlay.extendData, event);
    }
    return true;
  },
  onMouseLeave: (event: OverlayEvent) => {
    if (globalOnMarkerHover) {
      globalOnMarkerHover(null);
    }
    return true;
  },
  createPointFigures: ({ coordinates, overlay }) => {
    const coord = coordinates[0];
    if (!coord) return [];

    const extendData = overlay.extendData;
    const safeExtendData = (extendData && typeof extendData === 'object' && !Array.isArray(extendData))
      ? (extendData as Record<string, any>)
      : {};
    const { direction, price } = safeExtendData;
    const dirLower = String(direction || '').toLowerCase();
    const isBuy = dirLower === 'buy' || dirLower === 'long';
    const trades = Array.isArray(safeExtendData.trades) ? safeExtendData.trades : [];
    const isMultiple = dirLower === 'multiple' || trades.length > 1;

    const color = isMultiple ? '#4f8ef7' : (isBuy ? '#089981' : '#F23645');

    const triangleCoords = (isBuy || isMultiple)
      ? [
          { x: coord.x, y: coord.y - 10 },
          { x: coord.x - 7, y: coord.y + 4 },
          { x: coord.x + 7, y: coord.y + 4 },
        ]
      : [
          { x: coord.x, y: coord.y + 10 },
          { x: coord.x - 7, y: coord.y - 4 },
          { x: coord.x + 7, y: coord.y - 4 },
        ];

    const extendDataStr = typeof overlay.extendData === 'string'
      ? overlay.extendData
      : (isMultiple 
          ? `混合交易 (${trades.length})` 
          : `${isBuy ? '买入' : '卖出'} ${price ?? ''}`);

    return [
      {
        type: 'polygon',
        attrs: {
          coordinates: triangleCoords,
        },
        styles: {
          style: 'fill',
          color: color,
        },
      },
      {
        type: 'text',
        attrs: {
          x: coord.x,
          y: isBuy ? coord.y + 10 : coord.y - 10,
          text: extendDataStr,
          align: 'center',
          baseline: isBuy ? 'top' : 'bottom',
        },
        styles: {
          color: '#ffffff',
          size: 11,
          backgroundColor: 'rgba(20, 20, 20, 0.75)',
          paddingLeft: 4,
          paddingRight: 4,
          paddingTop: 2,
          paddingBottom: 2,
        },
      },
    ];
  },
});

function periodToTimeframe(period: Period): Timeframe {
  const { multiplier, timespan } = period;
  if (timespan === 'minute') {
    if (multiplier === 1) return '1m';
    if (multiplier === 5) return '5m';
    if (multiplier === 15) return '15m';
    if (multiplier === 30) return '30m';
    if (multiplier === 60) return '1H';
    if (multiplier === 240) return '4H';
  }
  if (timespan === 'day') return '1D';
  if (timespan === 'week') return '1W';
  if (timespan === 'month') return '1M';
  return '1D';
}

function findNearestTimestamp(dataList: KLineData[], timestamp: number): number {
  if (dataList.length === 0) return timestamp;
  let left = 0;
  let right = dataList.length - 1;
  while (left < right - 1) {
    const mid = Math.floor((left + right) / 2);
    if (dataList[mid].timestamp < timestamp) {
      left = mid;
    } else {
      right = mid;
    }
  }
  const leftDiff = Math.abs(dataList[left].timestamp - timestamp);
  const rightDiff = Math.abs(dataList[right].timestamp - timestamp);
  return leftDiff < rightDiff ? dataList[left].timestamp : dataList[right].timestamp;
}

function formatPeriodText(tf: string): string {
  const map: Record<string, string> = {
    '1m': '1分钟线',
    '5m': '5分钟线',
    '15m': '15分钟线',
    '30m': '30分钟线',
    '1H': '1小时线',
    '4H': '4小时线',
    '1D': '日线',
    '1W': '周线',
    '1M': '月线',
    'daily': '日线',
  };
  return map[tf] ?? tf;
}

const PRESET_PATTERNS = [
  '双底/双顶',
  '头肩底/头肩顶',
  '看涨吞没/看跌吞没',
  'Pinbar 锤子线/流星线',
  'BOS 结构破坏',
  '流动性扫荡',
  'S/R 支撑阻力互换',
  'OB 订单块/需求区',
  'VCP 波动紧缩'
];

const PRESET_PSYCHOLOGY = [
  '冷静耐心',
  '完全遵守纪律',
  'FOMO/追高',
  '报复交易',
  '恐惧缩手',
  '贪婪扛单',
  '提前平仓'
];

function marketLabel(m: string): string {
  const map: Record<string, string> = { ashare: 'A股', us: '美股', hk: '港股', crypto: '加密', futures: '期货' };
  return map[m] ?? m;
}

export interface KlineChartProps {
  symbol?: string;
  height?: number;
}

interface OrderBookItem {
  price: number;
  amount: number;
  total: number;
}

interface TradeItem {
  id: string;
  time: string;
  side: 'buy' | 'sell';
  price: number;
  amount: number;
}

const HOT_SYMBOLS: Record<string, Array<{ symbol: string; name: string; market: string }>> = {
  ashare: [
    { symbol: "600519", name: "贵州茅台", market: "ashare" },
    { symbol: "600036", name: "招商银行", market: "ashare" },
    { symbol: "601318", name: "中国平安", market: "ashare" },
    { symbol: "600900", name: "长江电力", market: "ashare" },
    { symbol: "601899", name: "紫金矿业", market: "ashare" },
  ],
  us: [
    { symbol: "AAPL", name: "Apple Inc.", market: "us" },
    { symbol: "TSLA", name: "Tesla Inc.", market: "us" },
    { symbol: "NVDA", name: "NVIDIA Corp.", market: "us" },
    { symbol: "MSFT", name: "Microsoft Corp.", market: "us" },
    { symbol: "AMZN", name: "Amazon.com Inc.", market: "us" },
  ],
  hk: [
    { symbol: "00700.HK", name: "腾讯控股", market: "hk" },
    { symbol: "03690.HK", name: "美团-W", market: "hk" },
    { symbol: "09988.HK", name: "阿里巴巴-W", market: "hk" },
    { symbol: "01810.HK", name: "小米集团-W", market: "hk" },
    { symbol: "09618.HK", name: "京东集团-SW", market: "hk" },
  ],
  crypto: [
    { symbol: "BTC/USDT", name: "Bitcoin", market: "crypto" },
    { symbol: "ETH/USDT", name: "Ethereum", market: "crypto" },
    { symbol: "SOL/USDT", name: "Solana", market: "crypto" },
    { symbol: "BNB/USDT", name: "BNB", market: "crypto" },
    { symbol: "DOGE/USDT", name: "Dogecoin", market: "crypto" },
  ],
  forex: [
    { symbol: "EUR/USD", name: "欧元/美元", market: "forex" },
    { symbol: "USD/JPY", name: "美元/日元", market: "forex" },
    { symbol: "GBP/USD", name: "英镑/美元", market: "forex" },
    { symbol: "AUD/USD", name: "澳元/美元", market: "forex" },
    { symbol: "USD/CAD", name: "美元/加元", market: "forex" },
  ],
  futures: [
    { symbol: "GC", name: "COMEX黄金", market: "futures" },
    { symbol: "CL", name: "WTI原油", market: "futures" },
    { symbol: "NQ", name: "纳斯达克100期货", market: "futures" },
    { symbol: "RB", name: "螺纹钢", market: "futures" },
    { symbol: "I", name: "铁矿石", market: "futures" },
  ],
};

const KlineChartComponent: React.FC<KlineChartProps> = ({
  symbol = '000001',
  height = 560,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const proChartRef = useRef<KLineChartPro | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadTokenRef = useRef(0);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const isVisible = useAppStore(state => state.isVisible);
  const chartIdRef = useRef(`chart_${Math.random().toString(36).substring(2, 9)}`);

  const [currentSymbol, setCurrentSymbol] = useState(symbol);
  const currentSymbolRef = useRef(currentSymbol);
  useEffect(() => {
    currentSymbolRef.current = currentSymbol;
  }, [currentSymbol]);
  const [currentPeriod, setCurrentPeriod] = useState<string>('daily');

  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [currentChange, setCurrentChange] = useState<number>(0);
  const [currentChangePct, setCurrentChangePct] = useState<number>(0);
  const [marketType, setMarketType] = useState<string>('ashare');
  const [instrumentInfo, setInstrumentInfo] = useState<InstrumentInfo | null>(null);

  // 状态监测与健康自检
  const [chartState, setChartState] = useState<'normal' | 'not_found' | 'offline'>('normal');
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 交易表单和提示状态
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [formSide, setFormSide] = useState<'buy' | 'sell'>('buy');
  const [formPrice, setFormPrice] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [selectedStrategyTags, setSelectedStrategyTags] = useState<string[]>([]);
  const [selectedErrorTags, setSelectedErrorTags] = useState<string[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [activeBlockUuid, setActiveBlockUuid] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [pulseActive, setPulseActive] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; timestamp: number } | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (msg && msg.type === 'logseq-block-changed') {
        const block = msg.block;
        setActiveBlockUuid(block?.uuid || null);

        if (block && block.properties) {
          const snapshotProp = block.properties['trade-kline-snapshot'] ||
                               block.properties['trade/kline-snapshot'] ||
                               block.properties['trade/klineSnapshot'];
          if (snapshotProp) {
            try {
              const snapshot = typeof snapshotProp === 'string' ? JSON.parse(snapshotProp) : snapshotProp;
              if (snapshot && snapshot.symbol && restoreSnapshotRef.current) {
                restoreSnapshotRef.current(snapshot);
              }
            } catch (e) {
              console.error('Failed to parse snapshot property:', e);
            }
          } else {
            const symbol = block.properties['trade-symbol'] || block.properties['trade/symbol'];
            const interval = block.properties['trade-interval'] || block.properties['trade/interval'];
            const timestampProp = block.properties['trade-timestamp'] || block.properties['trade/timestamp'];

            if (symbol && interval && timestampProp) {
              const timestamp = parseInt(timestampProp, 10);
              if (!isNaN(timestamp) && restoreSnapshotRef.current) {
                restoreSnapshotRef.current({
                  symbol: String(symbol),
                  interval: String(interval),
                  timestamp: timestamp
                });
              }
            }
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const lastSubmitRef = useRef<number>(0);
  const lastBarTimestampRef = useRef<number>(0);
  const [formSymbol, setFormSymbol] = useState('');

  const [hoveredTrade, setHoveredTrade] = useState<{
    x: number;
    y: number;
    direction: string;
    price: number;
    quantity: number;
    tags?: string[];
    timestamp: string;
    trades?: Array<{
      direction: string;
      price: number;
      quantity: number;
      tags?: string[];
      timestamp: string;
    }>;
  } | null>(null);

  useEffect(() => {
    globalOnMarkerHover = (data, event) => {
      if (data && event) {
        if (data.chartId !== chartIdRef.current) return;
        setHoveredTrade({
          x: event.x,
          y: event.y,
          direction: data.direction,
          price: data.price,
          quantity: data.quantity,
          tags: data.tags,
          timestamp: data.timestamp,
          trades: data.trades,
        });
      } else {
        setHoveredTrade(null);
      }
    };
    return () => {
      globalOnMarkerHover = null;
    };
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowTradeForm(false);
    setFormPrice('');
    setFormAmount('');
    setFormSide('buy');
    setSelectedStrategyTags([]);
    setSelectedErrorTags([]);
    setFormErrors({});
    setTagSearchQuery('');
  }, []);

  const renderTradeMarkers = useCallback((records: TradeRecord[], chartApi: KLineChartInstance) => {
    if (!chartApi) return;
    try {
      chartApi.removeOverlay({ name: 'tradeMarker' });
    } catch (e) {
      console.warn('Failed to remove trade overlays:', e);
    }
    
    const dataList = chartApi.getDataList() || [];

    // Group records by snappedTimestamp and entryPrice
    const groups: Record<string, TradeRecord[]> = {};
    records.forEach(r => {
      if (!r || !r.entryTime) return;
      const timestamp = new Date(r.entryTime).getTime();
      if (isNaN(timestamp)) {
        console.warn('Invalid entryTime for trade:', r);
        return;
      }

      let snappedTimestamp = timestamp;
      if (dataList.length > 0) {
        snappedTimestamp = findNearestTimestamp(dataList, timestamp);
      }
      const price = r.entryPrice;
      const key = `${snappedTimestamp}_${price}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(r);
    });

    Object.entries(groups).forEach(([key, group]) => {
      try {
        const [snappedTimestampStr, priceStr] = key.split('_');
        const snappedTimestamp = parseInt(snappedTimestampStr, 10);
        const price = parseFloat(priceStr);

        const hasBuy = group.some(g => {
          const dir = String(g.direction || '').toLowerCase();
          return dir === 'buy' || dir === 'long';
        });
        const hasSell = group.some(g => {
          const dir = String(g.direction || '').toLowerCase();
          return dir === 'sell' || dir === 'short';
        });
        let direction = 'buy';
        if (hasBuy && hasSell) {
          direction = 'multiple';
        } else if (hasSell) {
          direction = 'sell';
        }

        chartApi.createOverlay({
          name: 'tradeMarker',
          points: [{ timestamp: snappedTimestamp, value: price }],
          extendData: {
            chartId: chartIdRef.current,
            direction,
            price,
            trades: group.map(g => ({
              direction: g.direction,
              price: g.entryPrice,
              quantity: g.quantity,
              tags: g.tags,
              timestamp: g.entryTime
            }))
          }
        });
      } catch (e) {
        console.warn('Failed to create overlay for group:', group, e);
      }
    });
  }, []);

  const refreshTradeMarkers = useCallback(async (symbol: string) => {
    if (!proChartRef.current) return;
    const chart = getInnerChart(proChartRef.current);
    if (!chart) return;

    let records: TradeRecord[] = [];
    const tm = window.__tradeManager;
    if (tm && tm.db) {
      try {
        records = await tm.db.getTradesBySymbol(symbol);
      } catch (e) {
        console.error('Failed to get trades by symbol:', e);
      }
    } else {
      try {
        const key = 'tj_trade_records';
        const saved = localStorage.getItem(key);
        if (saved) {
          const all = JSON.parse(saved);
          if (Array.isArray(all)) {
            records = all.filter((r: TradeRecord) => r && r.symbol === symbol);
          }
        }
      } catch (e) {
        console.error('Failed to get trades from localStorage:', e);
      }
    }

    // 竞态守卫：确保加载完数据后，当前标的未被用户切换
    if (symbol !== currentSymbolRef.current) {
      console.warn(`[Race Condition Guard] Ignored stale markers for ${symbol}`);
      return;
    }

    renderTradeMarkers(records, chart);
  }, [renderTradeMarkers]);

  const writeTradeRecord = useCallback(async (record: Omit<TradeRecord, 'id'>) => {
    const tm = window.__tradeManager;
    if (tm && tm.db) {
      // 1. 获取现有记录进行防重校验
      const existing = await tm.db.getTradesBySymbol(record.symbol);
      const isDuplicate = existing.some((r: TradeRecord) => {
        if (!r || !r.entryTime) return false;
        const rTime = new Date(r.entryTime).getTime();
        const newTime = new Date(record.entryTime).getTime();
        if (isNaN(rTime) || isNaN(newTime)) return false;
        return r.symbol === record.symbol &&
          String(r.direction || '').toLowerCase() === String(record.direction || '').toLowerCase() &&
          r.entryPrice === record.entryPrice &&
          Math.abs(rTime - newTime) < 5000; // 5秒防重窗口
      });

      if (isDuplicate) {
        throw new Error('DUPLICATE');
      }

      // 2. 写入 Logseq DB
      await tm.db.insertTrade(record);
    } else {
      // 3. 降级到 localStorage
      const key = 'tj_trade_records';
      const existingStr = localStorage.getItem(key);
      let existing: TradeRecord[] = [];
      if (existingStr) {
        try {
          const parsed = JSON.parse(existingStr);
          if (Array.isArray(parsed)) {
            existing = parsed;
          }
        } catch (e) {
          console.error('Failed to parse existing trade records from localStorage:', e);
        }
      }
      
      const isDuplicate = existing.some((r: TradeRecord) => {
        if (!r || !r.entryTime) return false;
        const rTime = new Date(r.entryTime).getTime();
        const newTime = new Date(record.entryTime).getTime();
        if (isNaN(rTime) || isNaN(newTime)) return false;
        return r.symbol === record.symbol &&
          String(r.direction || '').toLowerCase() === String(record.direction || '').toLowerCase() &&
          r.entryPrice === record.entryPrice &&
          Math.abs(rTime - newTime) < 5000;
      });

      if (isDuplicate) {
        throw new Error('DUPLICATE');
      }

      const newRecord = { ...record, id: `local_${Date.now()}` };
      existing.push(newRecord);
      try {
        localStorage.setItem(key, JSON.stringify(existing));
      } catch (e) {
        console.error('Failed to write trade records to localStorage:', e);
        throw new Error('存储空间已满或不可用');
      }
    }
  }, []);

  // 当标的、周期或图表状态就绪时同步加载交易标记
  useEffect(() => {
    if (currentSymbol && chartState === 'normal') {
      refreshTradeMarkers(currentSymbol);
    }
  }, [currentSymbol, currentPeriod, chartState, refreshTradeMarkers]);

  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  // 监听全局 Esc 键以关闭表单
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTradeForm) {
        e.preventDefault();
        handleCloseForm();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showTradeForm, handleCloseForm]);

  const handleFabClick = useCallback(() => {
    if (!currentSymbol || currentSymbol.trim() === '') {
      setToastMsg('⚠️ 请先在左侧输入标的代码');
      return;
    }
    setFormSymbol(currentSymbol);
    setFormPrice(currentPrice > 0 ? currentPrice.toString() : '');
    setFormAmount('');
    setFormSide('buy');
    setSelectedStrategyTags([]);
    setSelectedErrorTags([]);
    setFormErrors({});
    setTagSearchQuery('');
    setShowTradeForm(true);
  }, [currentSymbol, currentPrice]);

  const handleBindStatus = useCallback(async () => {
    if (!activeBlockUuid) {
      setToastMsg('⚠️ 请先在 Logseq 中选择一个笔记 Block');
      return;
    }

    if (!proChartRef.current) {
      setToastMsg('⚠️ 图表尚未加载完成');
      return;
    }
    const chart = getInnerChart(proChartRef.current);
    if (!chart) {
      setToastMsg('⚠️ 图表实例尚未初始化');
      return;
    }

    try {
      const drawings = (chart.getOverlays() || [])
        .filter((o: any) => o && o.name !== 'tradeMarker')
        .map((o: any) => ({
          name: o.name,
          points: o.points,
          styles: o.styles,
          lock: o.lock,
          visible: o.visible,
          extendData: o.extendData
        }));
      const drawingsJson = JSON.stringify(drawings);

      const activeIndicators: { paneId: string; name: string }[] = [];
      if (typeof chart.getIndicatorByPaneId === 'function') {
        const indicatorsMap = chart.getIndicatorByPaneId();
        if (indicatorsMap instanceof Map) {
          indicatorsMap.forEach((paneMap, paneId) => {
            if (paneMap instanceof Map) {
              paneMap.forEach((indicator, name) => {
                activeIndicators.push({ paneId, name });
              });
            } else if (paneMap && typeof paneMap === 'object') {
              Object.keys(paneMap).forEach(name => {
                activeIndicators.push({ paneId, name });
              });
            }
          });
        } else if (indicatorsMap && typeof indicatorsMap === 'object') {
          Object.entries(indicatorsMap).forEach(([paneId, paneMap]) => {
            if (paneMap instanceof Map) {
              paneMap.forEach((indicator, name) => {
                activeIndicators.push({ paneId, name });
              });
            } else if (paneMap && typeof paneMap === 'object') {
              Object.keys(paneMap).forEach(name => {
                activeIndicators.push({ paneId, name });
              });
            }
          });
        }
      }
      const indicatorJson = JSON.stringify(activeIndicators);

      const dataList = chart.getDataList() || [];
      const lastBar = dataList[dataList.length - 1];
      const timestamp = lastBar ? Math.floor(lastBar.timestamp / 1000) : Math.floor(Date.now() / 1000);

      const snapshot = {
        symbol: currentSymbol,
        interval: currentPeriod === 'daily' ? '1D' : currentPeriod,
        drawing_json: drawingsJson,
        indicator_json: indicatorJson,
        timestamp: timestamp,
        bound_block_id: activeBlockUuid
      };

      const ls = (window as any).logseq;
      if (ls && ls.Editor && ls.Editor.upsertBlockProperty) {
        await ls.Editor.upsertBlockProperty(activeBlockUuid, 'trade-kline-snapshot', JSON.stringify(snapshot));
      } else {
        console.log('[Mock Logseq] Upsert property for block:', activeBlockUuid, snapshot);
        localStorage.setItem(`tj_snapshot_${activeBlockUuid}`, JSON.stringify(snapshot));
      }

      setPulseActive(true);
      setTimeout(() => setPulseActive(false), 500);

      setStatusMsg('✅ K线快照状态已成功绑定');
      setTimeout(() => {
        setStatusMsg(null);
      }, 2000);

    } catch (e) {
      console.error('Failed to bind K-line snapshot:', e);
      setToastMsg(`⚠️ 绑定失败: ${e instanceof Error ? e.message : '未知错误'}`);
    }
  }, [activeBlockUuid, currentSymbol, currentPeriod]);

  const handleCreateNoteAtTimestamp = useCallback(async (timestamp: number) => {
    if (!activeBlockUuid) {
      setToastMsg('⚠️ 请先在 Logseq 中选择一个笔记 Block');
      return;
    }

    const intervalText = currentPeriod === 'daily' ? '1D' : currentPeriod;
    const formattedTime = dayjs(timestamp * 1000).format('YYYY-MM-DD HH:mm');
    const blockContent = `${intervalText} · ${formattedTime}`;

    const properties = {
      'trade-symbol': currentSymbol,
      'trade-interval': intervalText,
      'trade-timestamp': timestamp
    };

    try {
      const ls = (window as any).logseq;
      if (ls && ls.Editor && ls.Editor.insertBlock) {
        await ls.Editor.insertBlock(activeBlockUuid, blockContent, {
          properties,
          sibling: true
        });
        setStatusMsg('✅ 笔记创建成功');
        setTimeout(() => setStatusMsg(null), 2000);
      } else {
        console.log('[Mock Logseq] insertBlock sibling:', activeBlockUuid, blockContent, properties);
        setToastMsg(`[Mock] 已创建笔记 Block: ${blockContent}`);
      }
    } catch (e) {
      console.error('Failed to insert block in Logseq:', e);
      setToastMsg(`⚠️ 创建笔记失败: ${e instanceof Error ? e.message : '未知错误'}`);
    }
  }, [activeBlockUuid, currentSymbol, currentPeriod]);

  // Canvas right click menu
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const handleContextMenu = (e: MouseEvent) => {
      if (chartState !== 'normal' || !proChartRef.current) return;
      const chart = getInnerChart(proChartRef.current);
      if (!chart) return;

      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      try {
        const points = chart.convertFromPixel([{ x: clickX, y: clickY }], { paneId: 'candle_pane' });
        const point = Array.isArray(points) ? points[0] : points;
        if (point && point.timestamp) {
          const timestampInSecs = Math.floor(point.timestamp / 1000);
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            timestamp: timestampInSecs
          });
        }
      } catch (err) {
        console.error('Failed to convert context menu pixel coordinates:', err);
      }
    };

    container.addEventListener('contextmenu', handleContextMenu);
    return () => {
      container.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [chartState]);

  // Click outside or ESC key to close context menu
  useEffect(() => {
    if (!contextMenu) return;

    const handleGlobalClick = () => {
      setContextMenu(null);
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };

    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [contextMenu]);

  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    const errors: Record<string, string> = {};
    
    if (!formPrice.trim()) {
      errors.price = '必填项';
    } else {
      const priceNum = parseFloat(formPrice);
      if (isNaN(priceNum) || priceNum <= 0 || !isFinite(priceNum)) {
        errors.price = '价格必须是大于 0 的有效数值';
      }
    }
    
    if (!formAmount.trim()) {
      errors.amount = '必填项';
    } else {
      const amountNum = parseFloat(formAmount);
      if (isNaN(amountNum) || amountNum <= 0 || !isFinite(amountNum)) {
        errors.amount = '数量必须是大于 0 的有效数值';
      }
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      isSubmittingRef.current = false;
      return;
    }
    
    setIsSubmitting(true);
    const targetSymbol = formSymbol || currentSymbol;
    try {
      const recordTime = Date.now(); // 记录真实的交易时间，而非绑定 K 线柱起点
      const newRecord: Omit<TradeRecord, 'id'> = {
        symbol: targetSymbol,
        direction: formSide === 'buy' ? 'long' : 'short',
        entryPrice: parseFloat(formPrice),
        exitPrice: 0,
        quantity: parseFloat(formAmount),
        entryTime: new Date(recordTime).toISOString(),
        exitTime: new Date(recordTime).toISOString(),
        fee: 0,
        profit: 0,
        profitPct: 0,
        netPnL: 0,
        strategy: selectedStrategyTags.join(','),
        tags: [...selectedStrategyTags, ...selectedErrorTags],
        createdAt: new Date().toISOString(),
      };
      
      await writeTradeRecord(newRecord);
      if (isMountedRef.current) {
        setToastMsg('✅ 交易已录入');
        handleCloseForm();
        // 立即刷新标记
        refreshTradeMarkers(targetSymbol);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const errMsg = err instanceof Error ? err.message : '未知错误';
        if (errMsg === 'DUPLICATE') {
          setToastMsg('⚠️ 该交易已存在，请勿重复录入');
        } else {
          setToastMsg(`⚠️ 录入失败: ${errMsg}`);
        }
      }
    } finally {
      isSubmittingRef.current = false;
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [
    formPrice,
    formAmount,
    formSide,
    selectedStrategyTags,
    selectedErrorTags,
    currentSymbol,
    formSymbol,
    writeTradeRecord,
    refreshTradeMarkers,
    handleCloseForm,
  ]);

  const toggleStrategyTag = useCallback((tag: string) => {
    setSelectedStrategyTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  const toggleErrorTag = useCallback((tag: string) => {
    setSelectedErrorTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  const filteredPatterns = PRESET_PATTERNS.filter(tag => 
    tag.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );
  
  const filteredPsychology = PRESET_PSYCHOLOGY.filter(tag => 
    tag.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  // Panels state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'watchlist' | 'study' | 'trading' | 'orderbook' | 'trades' | 'depth'>('watchlist');
  const [orderBook, setOrderBook] = useState<{ asks: OrderBookItem[]; bids: OrderBookItem[]; maxTotal: number } | null>(null);
  const [trades, setTrades] = useState<TradeItem[]>([]);

  // Watchlist states
  const [watchlist, setWatchlist] = useState<Array<{ symbol: string; name: string; market: string }>>(() => {
    try {
      const saved = localStorage.getItem('tj_watchlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [
      { symbol: '600519', name: '贵州茅台', market: 'ashare' },
      { symbol: 'AAPL', name: 'Apple Inc.', market: 'us' },
      { symbol: 'BTC/USDT', name: 'Bitcoin', market: 'crypto' },
    ];
  });
  const [watchlistPrices, setWatchlistPrices] = useState<Record<string, { price: number; changePct: number }>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        setActiveTab(prev => prev === 'study' ? 'trading' : 'study');
        if (!isSidebarOpen) setIsSidebarOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  // Add modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeMarketTab, setActiveMarketTab] = useState<string>('ashare');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string; market: string; exchange: string }>>([]);

  const handleSelectSymbol = useCallback((sym: string, name?: string) => {
    const cleaned = sym.toUpperCase().trim();
    const market = detectMarket(cleaned);
    const isCrypto = market === 'crypto';

    setCurrentPrice(0);
    setInstrumentInfo(null);
    setCurrentSymbol(cleaned);
    lastBarTimestampRef.current = 0;

    if (proChartRef.current) {
      // 切换标的时，立即清除屏幕上的旧标记以防视觉残留
      try {
        const chart = getInnerChart(proChartRef.current);
        if (chart) {
          chart.removeOverlay({ name: 'tradeMarker' });
          
          // 清除其他所有用户划线以防老标的残留
          // o 使用 any 类型是因为 overlays 是第三方类库返回的包含多属性的任意形状对象
          const overlays = chart.getOverlays() || [];
          overlays.forEach((o: any) => {
            if (o && o.name !== 'tradeMarker' && o.id) {
              chart.removeOverlay({ id: o.id });
            }
          });
        }
      } catch (e) {
        console.warn('Failed to remove overlay on symbol switch:', e);
      }

      try {
        proChartRef.current.setSymbol({
          ticker: cleaned,
          name: name || cleaned,
          shortName: name || cleaned,
          market: isCrypto ? 'crypto' : 'stocks',
          pricePrecision: isCrypto ? 4 : 2,
          volumePrecision: 0,
          priceCurrency: isCrypto ? 'USDT' : 'CNY',
          type: isCrypto ? 'crypto' : 'stock',
        });
      } catch (e) {
        console.warn('Failed to set symbol for pro chart:', e);
      }
    }
  }, []);

  // currentSymbolRef 已经移至组件顶部声明

  // 自检重载
  const checkHealthAndReload = useCallback(async () => {
    try {
      const healthy = await dataRouter.checkAKShareHealth();
      if (!isMountedRef.current) return;
      setIsOnline(healthy);
      if (healthy) {
        if (chartState === 'offline') {
          setChartState('normal');
          if (proChartRef.current) {
            handleSelectSymbol(currentSymbolRef.current);
          }
        }
      } else {
        setChartState('offline');
      }
    } catch {
      if (!isMountedRef.current) return;
      setIsOnline(false);
      setChartState('offline');
    }
  }, [chartState, handleSelectSymbol]);

  // Props.symbol 同步变动
  const prevSymbolRef = useRef(symbol);

  const pendingRestoreSnapshotRef = useRef<any>(null);

  const restoreSnapshotData = useCallback((snapshot: any) => {
    if (!proChartRef.current) return;
    const chart = getInnerChart(proChartRef.current);
    if (!chart) return;

    try {
      // 1. 清理旧划线并恢复新划线 (仅当 snapshot 中明确提供了 drawing_json 时)
      if (snapshot.drawing_json !== undefined) {
        const overlays = chart.getOverlays() || [];
        overlays.forEach((o: any) => {
          if (o && o.name !== 'tradeMarker' && o.id) {
            chart.removeOverlay({ id: o.id });
          }
        });

        if (snapshot.drawing_json) {
          try {
            const drawings = JSON.parse(snapshot.drawing_json);
            if (Array.isArray(drawings)) {
              drawings.forEach((d: any) => {
                chart.createOverlay(d);
              });
            }
          } catch (e) {
            console.error('Failed to parse drawing_json:', e);
          }
        }
      }

      // 2. 清理旧指标并恢复新指标 (仅当 snapshot 中明确提供了 indicator_json 时)
      if (snapshot.indicator_json !== undefined) {
        const indicatorsMap = chart.getIndicatorByPaneId();
        const clearIndicator = (paneMap: any, paneId: string) => {
          if (paneMap instanceof Map) {
            paneMap.forEach((_, name) => {
              chart.removeIndicator(paneId, name);
            });
          } else if (paneMap && typeof paneMap === 'object') {
            Object.keys(paneMap).forEach(name => {
              chart.removeIndicator(paneId, name);
            });
          }
        };
        if (indicatorsMap instanceof Map) {
          indicatorsMap.forEach((paneMap, paneId) => {
            clearIndicator(paneMap, paneId);
          });
        } else if (indicatorsMap && typeof indicatorsMap === 'object') {
          Object.entries(indicatorsMap).forEach(([paneId, paneMap]) => {
            clearIndicator(paneMap, paneId);
          });
        }

        if (snapshot.indicator_json) {
          try {
            const indicators = JSON.parse(snapshot.indicator_json);
            if (Array.isArray(indicators)) {
              indicators.forEach((ind: { paneId: string; name: string }) => {
                const isMain = ind.paneId === 'candle_pane';
                chart.createIndicator(ind.name, !isMain, { id: ind.paneId });
              });
            }
          } catch (e) {
            console.error('Failed to parse indicator_json:', e);
          }
        }
      }

      // 3. 视口对齐历史时间点
      if (snapshot.timestamp) {
        const msTimestamp = snapshot.timestamp * 1000;
        chart.scrollToTimestamp(msTimestamp);
      }
    } catch (e) {
      console.error('Failed to restore snapshot data:', e);
    }
  }, []);

  const restoreSnapshot = useCallback((snapshot: any) => {
    if (!proChartRef.current || !snapshot || !snapshot.symbol) return;

    const targetSymbol = snapshot.symbol.toUpperCase().trim();
    const targetPeriodText = snapshot.interval;

    const isSameSymbol = targetSymbol === currentSymbolRef.current;
    const normPeriod = (p: string) => p === 'daily' ? '1D' : p;
    const isSamePeriod = normPeriod(currentPeriod) === normPeriod(targetPeriodText);

    // 强行把 prevSymbolRef.current 更新为快照目标，防止 props.symbol 再次触发同步
    prevSymbolRef.current = targetSymbol;

    if (isSameSymbol && isSamePeriod) {
      restoreSnapshotData(snapshot);
    } else {
      pendingRestoreSnapshotRef.current = snapshot;

      const isCrypto = detectMarket(targetSymbol) === 'crypto';
      if (!isSameSymbol) {
        proChartRef.current.setSymbol({
          ticker: targetSymbol,
          name: targetSymbol,
          shortName: targetSymbol,
          market: isCrypto ? 'crypto' : 'stocks',
          pricePrecision: isCrypto ? 4 : 2,
          volumePrecision: 0,
          priceCurrency: isCrypto ? 'USDT' : 'CNY',
          type: isCrypto ? 'crypto' : 'stock',
        });
      }
      if (!isSamePeriod) {
        const periodObj = PERIODS.find(p => periodToTimeframe(p) === targetPeriodText) || PERIODS[6];
        proChartRef.current.setPeriod(periodObj);
      }
    }
  }, [currentPeriod, restoreSnapshotData]);

  const restoreSnapshotRef = useRef<any>(null);
  useEffect(() => {
    restoreSnapshotRef.current = restoreSnapshot;
  }, [restoreSnapshot]);

  useEffect(() => {
    if (symbol && symbol !== prevSymbolRef.current) {
      prevSymbolRef.current = symbol;
      handleSelectSymbol(symbol);
    }
  }, [symbol, handleSelectSymbol]);

  // 面板可见时健康检查（首次 + 一次自动重试）
  const checkHealthRef = useRef(checkHealthAndReload);
  useEffect(() => {
    checkHealthRef.current = checkHealthAndReload;
  }, [checkHealthAndReload]);

  useEffect(() => {
    if (!isVisible) return;

    let cancelled = false;

    const check = async () => {
      let healthy = false;
      try {
        healthy = await dataRouter.checkAKShareHealth();
      } catch { /* ignore */ }

      if (!healthy) {
        await new Promise(r => setTimeout(r, 2000));
        if (cancelled || !isMountedRef.current) return;
        try {
          healthy = await dataRouter.checkAKShareHealth();
        } catch { /* ignore */ }
      }

      if (cancelled || !isMountedRef.current) return;
      setIsOnline(healthy);

      if (healthy) {
        setChartState('normal');
      } else {
        setChartState('offline');
      }
    };

    check();
    return () => { cancelled = true; };
  }, [isVisible]);

  const decimals = currentPrice > 1000 ? 2 : currentPrice > 1 ? 2 : 4;

  // Sync current price details with watchlist in real time
  useEffect(() => {
    if (currentSymbol && currentPrice > 0) {
      setWatchlistPrices(prev => ({
        ...prev,
        [currentSymbol]: {
          price: currentPrice,
          changePct: currentChangePct
        }
      }));
    }
  }, [currentSymbol, currentPrice, currentChangePct]);

  // High performance FPS and frame drop monitor
  useEffect(() => {
    const isDev = typeof process !== 'undefined' ? process.env?.NODE_ENV === 'development' : true;
    if (!isDev || !isVisible) return;
    let frameCount = 0;
    let lastTime = performance.now();
    let lastFrameTime = performance.now();
    let rAFId: number;

    const monitor = () => {
      const now = performance.now();
      const frameDuration = now - lastFrameTime;
      lastFrameTime = now;

      if (frameDuration > 32 && isDev) {
        console.warn(`[Performance] Detect frame drop: ${frameDuration.toFixed(1)}ms (> 32ms)`);
      }

      frameCount++;
      const delta = now - lastTime;
      if (delta >= 1000) {
        const fps = Math.round((frameCount * 1000) / delta);
        if (fpsRef.current) {
          fpsRef.current.innerText = `FPS: ${fps}`;
          if (fps >= 50) {
            fpsRef.current.style.color = '#22c55e';
          } else if (fps >= 30) {
            fpsRef.current.style.color = '#eab308';
          } else {
            fpsRef.current.style.color = '#ef4444';
          }
        }
        frameCount = 0;
        lastTime = now;
      }
      rAFId = requestAnimationFrame(monitor);
    };

    rAFId = requestAnimationFrame(monitor);
    return () => cancelAnimationFrame(rAFId);
  }, [isVisible]);

  // Background fetch prices for all watchlist items
  useEffect(() => {
    try {
      localStorage.setItem('tj_watchlist', JSON.stringify(watchlist));
    } catch {}
    if (watchlist.length === 0 || !isVisible) return;

    let isMounted = true;
    const fetchWatchlistPrices = async () => {
      if (!isVisible) return;
      const prices: Record<string, { price: number; changePct: number }> = {};
      await Promise.all(watchlist.map(async (item) => {
        try {
          const response = await fetch(`http://127.0.0.1:8765/kline?symbol=${encodeURIComponent(item.symbol)}&market=${item.market}&period=daily&limit=2`);
          if (response.ok) {
            const res = await response.json();
            if (res.data && res.data.length > 0) {
              const data = res.data;
              const last = data[data.length - 1];
              const prev = data[data.length - 2] ?? last;
              const change = last.close - prev.close;
              const changePct = prev.close ? (change / prev.close) * 100 : 0;
              prices[item.symbol] = {
                price: last.close,
                changePct
              };
            }
          }
        } catch (e) {
          console.warn('Fetch price failed for', item.symbol, e);
        }
      }));

      if (isMounted) {
        setWatchlistPrices(prev => ({ ...prev, ...prices }));
      }
    };

    fetchWatchlistPrices();
    return () => {
      isMounted = false;
    };
  }, [watchlist, isVisible]);

  // Handle Search API calls
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await fetch(`http://127.0.0.1:8765/search?q=${encodeURIComponent(searchQuery)}&market=${activeMarketTab}`);
      if (response.ok) {
        const data = await response.json();
        if (isMountedRef.current) {
          setSearchResults(data.results || []);
        }
      }
    } catch (e) {
      console.error('搜索请求失败:', e);
    }
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [activeMarketTab, searchQuery]);

  useEffect(() => {
    if (currentSymbol) {
      try {
        localStorage.setItem('tj_last_symbol', currentSymbol);
      } catch {}
    }
  }, [currentSymbol]);

  const toggleWatchlist = (item: { symbol: string; name: string; market: string }) => {
    setWatchlist(prev => {
      const exists = prev.some(w => w.symbol === item.symbol);
      if (exists) {
        return prev.filter(w => w.symbol !== item.symbol);
      } else {
        return [...prev, item];
      }
    });
  };

  const initializedRef = useRef(false);
  useEffect(() => {
    if (!chartContainerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const initialMarket = detectMarket(symbol);
    const isCrypto = initialMarket === 'crypto';

    const pro = new KLineChartPro({
      container: chartContainerRef.current,
      symbol: {
        ticker: symbol,
        name: symbol,
        shortName: symbol,
        market: isCrypto ? 'crypto' : 'stocks',
        exchange: symbol.startsWith('60') ? 'SH' : 'SZ',
        pricePrecision: isCrypto ? 4 : 2,
        volumePrecision: 0,
        priceCurrency: isCrypto ? 'USDT' : 'CNY',
        type: isCrypto ? 'crypto' : 'stock',
      },
      period: PERIODS[6], // Daily
      periods: PERIODS,
      theme: 'dark',
      locale: 'zh-CN',
      timezone: 'Asia/Shanghai',
      drawingBarVisible: true,
      watermark: 'Trade Journal',
      datafeed: {
        searchSymbols: async (search?: string) => {
          const q = search?.trim().toUpperCase() || '000001';
          const market = detectMarket(q);
          const crypto = market === 'crypto';
          return [{
            ticker: q,
            name: q,
            shortName: q,
            exchange: q.endsWith('SH') || q.startsWith('60') ? 'SH' : q.endsWith('SZ') ? 'SZ' : crypto ? 'Binance' : 'US',
            market: crypto ? 'crypto' : 'stocks',
            pricePrecision: crypto ? 4 : 2,
            volumePrecision: 0,
            priceCurrency: crypto ? 'USDT' : 'CNY',
            type: crypto ? 'crypto' : 'stock',
          }];
        },
        getHistoryKLineData: async (symbolInfo: SymbolInfo, period: Period) => {
          const currentLoadToken = ++loadTokenRef.current;
          try {
            const tf = periodToTimeframe(period);
            const result = await dataRouter.fetchKLine(symbolInfo.ticker, tf);
            
            if (currentLoadToken !== loadTokenRef.current) {
              return [];
            }
            
            if (result.data && result.data.length > 0) {
              const last = result.data[result.data.length - 1] as KLineData & { turnover?: number };
              lastBarTimestampRef.current = last.timestamp;
              const prev = result.data[result.data.length - 2] ?? last;
              const change = last.close - prev.close;
              const changePct = prev.close ? (change / prev.close) * 100 : 0;
              
              setCurrentPrice(last.close);
              setCurrentChange(change);
              setCurrentChangePct(changePct);
              setCurrentSymbol(symbolInfo.ticker);
              setCurrentPeriod(tf);
              setMarketType(result.market || detectMarket(symbolInfo.ticker));

              const info: InstrumentInfo = {
                symbol: symbolInfo.ticker,
                name: symbolInfo.name || symbolInfo.ticker,
                market: result.market || detectMarket(symbolInfo.ticker),
                price: last.close,
                change,
                changePct,
                open: last.open,
                high: last.high,
                low: last.low,
                volume: last.volume ?? 0,
                turnover: last.turnover ?? 0,
              };

              try {
                const fetchedInfo = await dataRouter.fetchSymbolInfo(symbolInfo.ticker);
                if (currentLoadToken === loadTokenRef.current && fetchedInfo && fetchedInfo.name) {
                  info.name = fetchedInfo.name;
                }
              } catch {}
              
              if (currentLoadToken === loadTokenRef.current) {
                setInstrumentInfo(info);
                setChartState('normal');

                if (pendingRestoreSnapshotRef.current) {
                  const snap = pendingRestoreSnapshotRef.current;
                  pendingRestoreSnapshotRef.current = null;
                  setTimeout(() => {
                    restoreSnapshotData(snap);
                  }, 50);
                }
              }
            } else {
              if (currentLoadToken === loadTokenRef.current) {
                setChartState('not_found');
              }
            }
            return result.data;
          } catch (e) {
            console.error('[Datafeed] getHistoryKLineData failed:', e);
            if (currentLoadToken !== loadTokenRef.current) {
              return [];
            }
            try {
              const isHealthy = await dataRouter.checkAKShareHealth();
              if (currentLoadToken === loadTokenRef.current) {
                setIsOnline(isHealthy);
                if (!isHealthy) {
                  setChartState('offline');
                } else {
                  setChartState('not_found');
                }
              }
            } catch {
              if (currentLoadToken === loadTokenRef.current) {
                setChartState('offline');
                setIsOnline(false);
              }
            }
            return [];
          }
        },
        subscribe: () => {},
        unsubscribe: () => {},
      },
    });

    proChartRef.current = pro;

    const chart = getInnerChart(pro);
    if (chart) {
      const originalCreateOverlay = chart.createOverlay.bind(chart);
      // options 使用 any 类型，以便兼容第三方库创建各种覆盖物所接受的底层任意对象形状
      chart.createOverlay = (options: any) => {
        const isTradeMarker = options?.name === 'tradeMarker';
        const id = originalCreateOverlay(options);
        
        if (!isTradeMarker && id) {
          // o 使用 any 类型是因为 overlays 是第三方类库返回的包含多种图形特性的对象集合
          const currentDrawings = (chart.getOverlays() || []).filter((o: any) => o && o.name !== 'tradeMarker');
          if (currentDrawings.length > 50) {
            chart.removeOverlay({ id });
            setToastMsg('⚠️ 最多保存 50 条划线');
          }
        }
        return id;
      };

      chart.subscribeAction('onZoom', () => {
        const currentSpace = chart.getBarSpace();
        const MIN_SPACE = 3;
        const MAX_SPACE = 40;
        if (currentSpace < MIN_SPACE) {
          chart.setBarSpace(MIN_SPACE);
        } else if (currentSpace > MAX_SPACE) {
          chart.setBarSpace(MAX_SPACE);
        }
      });
    }

    return () => {
      if (proChartRef.current) {
        try {
          const chartToDispose = getInnerChart(proChartRef.current);
          if (chartToDispose && typeof (chartToDispose as any).destroy === 'function') {
            (chartToDispose as any).destroy();
          }
        } catch (e) {
          console.warn('Dispose error:', e);
        }
        proChartRef.current = null;
      }
      initializedRef.current = false;
    };
  }, []);

  // Handle dynamic simulation data generation for Order Book and Recent Trades
  useEffect(() => {
    if (!currentPrice || !isVisible) return;

    // Helper to generate initial depth / order book
    const step = Math.max(0.01, parseFloat((currentPrice * 0.00015).toFixed(decimals + 1)));
    
    const generateOrderBook = (price: number) => {
      const newAsks: OrderBookItem[] = [];
      const newBids: OrderBookItem[] = [];
      
      for (let i = 1; i <= 10; i++) {
        const askPrice = price + (11 - i) * step;
        const askAmount = Math.random() * (price > 1000 ? 5 : 500);
        newAsks.push({ price: askPrice, amount: askAmount, total: 0 });
      }

      for (let i = 1; i <= 10; i++) {
        const bidPrice = price - i * step;
        const bidAmount = Math.random() * (price > 1000 ? 5 : 500);
        newBids.push({ price: bidPrice, amount: bidAmount, total: 0 });
      }

      newAsks.reverse();
      let askTotal = 0;
      newAsks.forEach(item => {
        askTotal += item.amount;
        item.total = askTotal;
      });
      newAsks.reverse();

      let bidTotal = 0;
      newBids.forEach(item => {
        bidTotal += item.amount;
        item.total = bidTotal;
      });

      return { asks: newAsks, bids: newBids, maxTotal: Math.max(askTotal, bidTotal) };
    };

    setOrderBook(generateOrderBook(currentPrice));

    // Update order book volumes
    const orderBookTimer = setInterval(() => {
      setOrderBook(prev => {
        if (!prev) return null;
        const newAsks = prev.asks.map(item => ({
          ...item,
          amount: Math.max(0.1, item.amount * (0.85 + Math.random() * 0.3))
        }));
        const newBids = prev.bids.map(item => ({
          ...item,
          amount: Math.max(0.1, item.amount * (0.85 + Math.random() * 0.3))
        }));

        newAsks.reverse();
        let askTotal = 0;
        newAsks.forEach(item => {
          askTotal += item.amount;
          item.total = askTotal;
        });
        newAsks.reverse();

        let bidTotal = 0;
        newBids.forEach(item => {
          bidTotal += item.amount;
          item.total = bidTotal;
        });

        return { asks: newAsks, bids: newBids, maxTotal: Math.max(askTotal, bidTotal) };
      });
    }, 1500);

    // Initial trades
    const initialTrades: TradeItem[] = [];
    for (let i = 0; i < 15; i++) {
      const time = new Date(Date.now() - i * 6000);
      initialTrades.push({
        id: Math.random().toString(),
        time: time.toTimeString().split(' ')[0],
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        price: currentPrice + (Math.random() - 0.5) * 4 * step,
        amount: Math.random() * (currentPrice > 1000 ? 2 : 200)
      });
    }
    setTrades(initialTrades);

    // Dynamic new trade event simulator
    const tradeTimer = setInterval(() => {
      setTrades(prev => {
        const time = new Date();
        const newTrade: TradeItem = {
          id: Math.random().toString(),
          time: time.toTimeString().split(' ')[0],
          side: Math.random() > 0.5 ? 'buy' : 'sell',
          price: currentPrice + (Math.random() - 0.5) * 2 * step,
          amount: Math.random() * (currentPrice > 1000 ? 1 : 100)
        };
        return [newTrade, ...prev.slice(0, 19)];
      });
    }, 2000 + Math.random() * 2000);

    return () => {
      clearInterval(orderBookTimer);
      clearInterval(tradeTimer);
    };
  }, [currentPrice, currentSymbol, isVisible]);

  // Canvas drawing for Depth Chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !orderBook || activeTab !== 'depth') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get true bounding rect size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const bids = [...orderBook.bids].reverse();
    const asks = orderBook.asks;
    const maxTotal = orderBook.maxTotal || 1;
    const center = width / 2;

    // Green Bids slope
    if (bids.length > 0) {
      ctx.beginPath();
      ctx.moveTo(0, height);
      
      bids.forEach((bid, i) => {
        const x = (i / (bids.length - 1)) * center;
        const y = height - (bid.total / maxTotal) * (height - 30);
        ctx.lineTo(x, y);
      });
      
      ctx.lineTo(center, height);
      ctx.closePath();
      
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, 'rgba(34, 197, 94, 0.22)');
      grad.addColorStop(1, 'rgba(34, 197, 94, 0.01)');
      ctx.fillStyle = grad;
      ctx.fill();
      
      ctx.strokeStyle = 'rgb(34, 197, 94)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Red Asks slope
    if (asks.length > 0) {
      ctx.beginPath();
      ctx.moveTo(center, height);
      
      asks.forEach((ask, i) => {
        const x = center + (i / (asks.length - 1)) * center;
        const y = height - (ask.total / maxTotal) * (height - 30);
        ctx.lineTo(x, y);
      });
      
      ctx.lineTo(width, height);
      ctx.closePath();
      
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.22)');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0.01)');
      ctx.fillStyle = grad;
      ctx.fill();
      
      ctx.strokeStyle = 'rgb(239, 68, 68)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [orderBook, activeTab]);

  return (
    <div className="tj-pro-chart-wrapper">
      {/* 标的信息栏 */}
      {instrumentInfo && (
        <div className="instrument-info">
          <div className="info-left">
            <span className="info-name">{instrumentInfo.name}</span>
            <span className="info-symbol-code">{instrumentInfo.symbol}</span>
            <span className={`info-tag ${instrumentInfo.market}`}>{marketLabel(instrumentInfo.market)}</span>
          </div>
          <div className="info-center">
            <span className="info-price">{instrumentInfo.price.toFixed(decimals)}</span>
            <span className={`info-change ${instrumentInfo.change >= 0 ? 'up' : 'down'}`}>
              {formatMoney(instrumentInfo.change)} ({formatPercent(instrumentInfo.changePct)})
            </span>
          </div>
          <div className="info-right">
            <span>开盘 <b>{instrumentInfo.open.toFixed(decimals)}</b></span>
            <span>最高 <b className="up">{instrumentInfo.high.toFixed(decimals)}</b></span>
            <span>最低 <b className="down">{instrumentInfo.low.toFixed(decimals)}</b></span>
            <span>成交量 <b>{(instrumentInfo.volume / 10000).toFixed(1)}万</b></span>
          </div>
        </div>
      )}

      {/* 主体区域：左侧图表，右侧深度与委托 */}
      <div className="tj-pro-chart-body" style={{ height }}>
        {/* 图表容器包装 */}
        <div className="tj-pro-chart-container-wrapper" style={{ position: 'relative', flex: 1, height: '100%' }}>
          <div 
            ref={chartContainerRef} 
            className="tj-pro-chart-container" 
            style={chartState === 'offline' ? { filter: 'grayscale(1) opacity(0.5)', height: '100%' } : { height: '100%' }}
          />
          <div className="tj-fab-container">
            {currentSymbol && (
              <button
                className={`tj-bind-status-btn ${pulseActive ? 'pulse' : ''}`}
                onClick={handleBindStatus}
                title="绑定当前图表快照状态到Logseq Block"
              >
                🔗 绑定状态
              </button>
            )}
            <button 
              className="tj-record-trade-fab" 
              onClick={handleFabClick}
              title="录入交易记录"
            >
              ➕ 录入交易
            </button>
          </div>
          {hoveredTrade && (
            <div 
              className="tj-marker-hover-card" 
              style={{ 
                position: 'absolute', 
                left: hoveredTrade.x + 'px', 
                top: (hoveredTrade.y - 10) + 'px', 
                transform: 'translate(-50%, -100%)',
                zIndex: 100
              }}
            >
              <div className="tj-marker-hover-header">
                <span className="tj-hover-title" style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>交易详情</span>
                {hoveredTrade.trades && hoveredTrade.trades.length > 1 && (
                  <span className="tj-hover-count" style={{ fontSize: '10px', color: 'var(--tj-text-secondary)' }}>共 {hoveredTrade.trades.length} 笔</span>
                )}
              </div>
              <div className="tj-marker-hover-body">
                {hoveredTrade.trades && hoveredTrade.trades.length > 0 ? (
                  hoveredTrade.trades.map((t, idx) => (
                    <div 
                      key={idx} 
                      className="tj-hover-trade-item" 
                      style={{ 
                        borderTop: idx > 0 ? '1px dashed rgba(255,255,255,0.08)' : 'none', 
                        paddingTop: idx > 0 ? 8 : 0, 
                        marginTop: idx > 0 ? 8 : 0 
                      }}
                    >
                      <div className="tj-marker-hover-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 4 }}>
                        <span className={`tj-side-badge ${String(t.direction || '').toLowerCase() === 'long' || String(t.direction || '').toLowerCase() === 'buy' ? 'buy' : 'sell'}`}>
                          {String(t.direction || '').toLowerCase() === 'long' || String(t.direction || '').toLowerCase() === 'buy' ? '买入' : '卖出'}
                        </span>
                        <span className="tj-hover-time">
                          {dayjs(t.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                        </span>
                      </div>
                      <div className="tj-hover-row">
                        <span className="tj-hover-label">价格:</span>
                        <span className="tj-hover-val price">{formatMoney(t.price)}</span>
                      </div>
                      <div className="tj-hover-row">
                        <span className="tj-hover-label">数量:</span>
                        <span className="tj-hover-val">{t.quantity}</span>
                      </div>
                      {t.tags && t.tags.length > 0 && (
                        <div className="tj-hover-tags">
                          {t.tags.map((tag, tagIdx) => {
                            const cleanTag = tag.startsWith('#') ? tag.slice(1) : tag;
                            const isError = ['FOMO', '扛单', '追高', '报复', '恐惧', '贪婪', '提前'].some(keyword => cleanTag.includes(keyword));
                            return (
                              <span 
                                key={tagIdx} 
                                className={`tj-hover-tag ${isError ? 'error-tag' : 'strategy-tag'}`}
                              >
                                #{cleanTag}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="tj-hover-row-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="tj-marker-hover-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                      <span className={`tj-side-badge ${hoveredTrade.direction === 'long' || hoveredTrade.direction === 'buy' ? 'buy' : 'sell'}`}>
                        {hoveredTrade.direction === 'long' || hoveredTrade.direction === 'buy' ? '买入' : '卖出'}
                      </span>
                      <span className="tj-hover-time">
                        {dayjs(hoveredTrade.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                      </span>
                    </div>
                    <div className="tj-hover-row">
                      <span className="tj-hover-label">价格:</span>
                      <span className="tj-hover-val price">{formatMoney(hoveredTrade.price)}</span>
                    </div>
                    <div className="tj-hover-row">
                      <span className="tj-hover-label">数量:</span>
                      <span className="tj-hover-val">{hoveredTrade.quantity}</span>
                    </div>
                    {hoveredTrade.tags && hoveredTrade.tags.length > 0 && (
                      <div className="tj-hover-tags">
                        {hoveredTrade.tags.map((tag, idx) => {
                          const cleanTag = tag.startsWith('#') ? tag.slice(1) : tag;
                          const isError = ['FOMO', '扛单', '追高', '报复', '恐惧', '贪婪', '提前'].some(keyword => cleanTag.includes(keyword));
                          return (
                            <span 
                              key={idx} 
                              className={`tj-hover-tag ${isError ? 'error-tag' : 'strategy-tag'}`}
                            >
                              #{cleanTag}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          {chartState !== 'normal' && (
            <div className="tj-kline-error-overlay">
              <div className="tj-error-overlay-content">
                <span className="tj-error-icon">
                  {chartState === 'offline' ? '🔌' : '🔍'}
                </span>
                <h3>{chartState === 'offline' ? '数据服务未连接' : '未找到标的'}</h3>
                <p>
                  {chartState === 'offline' 
                    ? '无法连接至本地 FastAPI 服务 (127.0.0.1:8765)，正在尝试自动重连...' 
                    : `标的 ${currentSymbol} 在当前市场中不存在或无历史数据`}
                </p>
                {chartState === 'offline' && (
                  <button className="tj-retry-btn" onClick={checkHealthAndReload}>
                    重新连接
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 侧边栏 */}
        <div 
          className={`tj-pro-sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}
          style={{ width: !isSidebarOpen ? undefined : (activeTab === 'trading' ? 420 : activeTab === 'study' ? 360 : 280) }}
        >
          {isSidebarOpen ? (
            <div className="tj-sidebar-content">
              {/* 标签页导航 */}
              <div className="tj-sidebar-tabs">
                <button
                  className={`tj-tab-btn ${activeTab === 'watchlist' ? 'active' : ''}`}
                  onClick={() => setActiveTab('watchlist')}
                >
                  自选
                </button>
                <button
                  className={`tj-tab-btn ${activeTab === 'study' ? 'active' : ''}`}
                  onClick={() => setActiveTab('study')}
                >
                  学习
                </button>
                <button
                  className={`tj-tab-btn ${activeTab === 'trading' ? 'active' : ''}`}
                  onClick={() => setActiveTab('trading')}
                >
                  交易
                </button>
                <button
                  className={`tj-tab-btn ${activeTab === 'orderbook' ? 'active' : ''}`}
                  onClick={() => setActiveTab('orderbook')}
                >
                  委托
                </button>
                <button
                  className={`tj-tab-btn ${activeTab === 'trades' ? 'active' : ''}`}
                  onClick={() => setActiveTab('trades')}
                >
                  成交
                </button>
                <button
                  className={`tj-tab-btn ${activeTab === 'depth' ? 'active' : ''}`}
                  onClick={() => setActiveTab('depth')}
                >
                  深度
                </button>
                <button className="tj-collapse-btn" onClick={() => setIsSidebarOpen(false)} title="收起侧栏">
                  ▶
                </button>
              </div>

              {/* 标签页内容 */}
              <div className="tj-tab-pane">
                {/* 自选 */}
                {activeTab === 'watchlist' && (
                  <div className="tj-watchlist-panel">
                    <div className="watchlist-header">
                      <button className="tj-add-btn" onClick={() => {
                        setShowAddModal(true);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}>
                        + 添加自选股
                      </button>
                    </div>
                    
                    <div className="watchlist-list">
                      {watchlist.map((item) => {
                        const pInfo = watchlistPrices[item.symbol];
                        const hasPrice = pInfo !== undefined;
                        const price = hasPrice ? pInfo.price : 0;
                        const changePct = hasPrice ? pInfo.changePct : 0;
                        const isUp = changePct >= 0;
                        const priceDecimals = price > 1000 ? 2 : price > 1 ? 2 : 4;
                        
                        return (
                          <div
                            key={item.symbol}
                            className={`watchlist-item ${currentSymbol === item.symbol ? 'active' : ''}`}
                            onClick={() => handleSelectSymbol(item.symbol, item.name)}
                          >
                            <div className="item-meta">
                              <span className="symbol-ticker">{item.symbol}</span>
                              <span className="symbol-name">{item.name}</span>
                            </div>
                            
                            <div className="item-price-info">
                              {hasPrice ? (
                                <>
                                  <span className="symbol-price">{price.toFixed(priceDecimals)}</span>
                                  <span className={`symbol-change ${isUp ? 'up' : 'down'}`}>
                                    {isUp ? '+' : ''}{changePct.toFixed(2)}%
                                  </span>
                                </>
                              ) : (
                                <span className="symbol-price-loading">加载中...</span>
                              )}
                            </div>
                            
                            <button
                              className="symbol-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setWatchlist(prev => prev.filter(w => w.symbol !== item.symbol));
                              }}
                              title="删除自选"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                      
                      {watchlist.length === 0 && (
                        <div className="watchlist-empty">
                          <p>暂无自选股</p>
                          <button className="tj-add-btn" onClick={() => {
                            setShowAddModal(true);
                            setSearchQuery('');
                            setSearchResults([]);
                          }}>
                            立即添加
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 委托簿 */}
                {activeTab === 'orderbook' && (
                  <div className="tj-orderbook-panel">
                    <div className="ob-header">
                      <span>价格</span>
                      <span className="text-right">数量</span>
                      <span className="text-right">累计</span>
                    </div>
                    
                    {/* Asks (卖盘) */}
                    <div className="ob-section asks">
                      {orderBook?.asks.map((ask, idx) => {
                        const widthPct = orderBook.maxTotal ? (ask.total / orderBook.maxTotal) * 100 : 0;
                        return (
                          <div key={`ask-${idx}`} className="ob-row ask-row">
                            <span className="price red">{ask.price.toFixed(decimals)}</span>
                            <span className="amount text-right">{ask.amount.toFixed(decimals === 4 ? 3 : 1)}</span>
                            <span className="total text-right">{ask.total.toFixed(decimals === 4 ? 2 : 0)}</span>
                            <div className="row-bar red-bar" style={{ width: `${widthPct}%` }} />
                          </div>
                        );
                      })}
                    </div>

                    {/* 最新价格 & 差价 */}
                    <div className="ob-midbar">
                      <span className={`mid-price ${currentChange >= 0 ? 'up' : 'down'}`}>
                        {currentPrice.toFixed(decimals)}
                      </span>
                      <span className="mid-spread">
                        点差: {((currentPrice * 0.00015)).toFixed(decimals)}
                      </span>
                    </div>

                    {/* Bids (买盘) */}
                    <div className="ob-section bids">
                      {orderBook?.bids.map((bid, idx) => {
                        const widthPct = orderBook.maxTotal ? (bid.total / orderBook.maxTotal) * 100 : 0;
                        return (
                          <div key={`bid-${idx}`} className="ob-row bid-row">
                            <span className="price green">{bid.price.toFixed(decimals)}</span>
                            <span className="amount text-right">{bid.amount.toFixed(decimals === 4 ? 3 : 1)}</span>
                            <span className="total text-right">{bid.total.toFixed(decimals === 4 ? 2 : 0)}</span>
                            <div className="row-bar green-bar" style={{ width: `${widthPct}%` }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 最新成交 */}
                {activeTab === 'trades' && (
                  <div className="tj-trades-panel">
                    <div className="ob-header">
                      <span>时间</span>
                      <span>方向</span>
                      <span className="text-right">价格</span>
                      <span className="text-right">数量</span>
                    </div>
                    <div className="trades-list">
                      {trades.map(trade => (
                        <div key={trade.id} className="trade-row">
                          <span className="time">{trade.time}</span>
                          <span className={`side ${trade.side === 'buy' ? 'green' : 'red'}`}>
                            {trade.side === 'buy' ? '买入' : '卖出'}
                          </span>
                          <span className={`price text-right ${trade.side === 'buy' ? 'green' : 'red'}`}>
                            {trade.price.toFixed(decimals)}
                          </span>
                          <span className="amount text-right">{trade.amount.toFixed(decimals === 4 ? 3 : 1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 深度图 */}
                {activeTab === 'depth' && (
                  <div className="tj-depth-panel">
                    <canvas ref={canvasRef} className="tj-depth-canvas" />
                    <div className="depth-labels">
                      <span className="green">买盘</span>
                      <span className="red">卖盘</span>
                    </div>
                  </div>
                )}

                {/* 知识学习 */}
                {activeTab === 'study' && (
                  <StudyLab
                    onSelectSymbol={handleSelectSymbol}
                    proChart={proChartRef.current}
                  />
                )}

                {/* 交易体系 */}
                {activeTab === 'trading' && (
                  <TradingNotes
                    currentSymbol={currentSymbol}
                    currentPeriod={formatPeriodText(currentPeriod)}
                    currentPrice={currentPrice}
                    onSelectSymbol={handleSelectSymbol}
                    proChart={proChartRef.current}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="tj-collapsed-bar" onClick={() => setIsSidebarOpen(true)} title="展开侧栏">
              <span className="collapsed-arrow">◀</span>
              <span className="collapsed-text">自<br />选<br />股</span>
            </div>
          )}
        </div>
      </div>

      {/* 添加自选模态弹窗 */}
      {showAddModal && (
        <div className="tj-modal-overlay">
          <div className="tj-modal-container">
            <div className="tj-modal-header">
              <h3>添加自选股</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            
            {/* 市场分类导航 */}
            <div className="tj-modal-tabs">
              <button className="tab-arrow">‹</button>
              <div className="tab-scroll-container">
                {[
                  { id: 'ashare', label: 'A股' },
                  { id: 'us', label: '美股' },
                  { id: 'hk', label: 'H股' },
                  { id: 'crypto', label: '加密货币' },
                  { id: 'forex', label: '外汇' },
                  { id: 'futures', label: '期货' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    className={`modal-tab-btn ${activeMarketTab === tab.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveMarketTab(tab.id);
                      setSearchResults([]);
                      setSearchQuery('');
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button className="tab-arrow">›</button>
            </div>
            
            {/* 搜索框 */}
            <form
              className="tj-modal-search"
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
            >
              <input
                type="text"
                placeholder="输入代码或拼音/中文搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="search-submit-btn">
                🔍 搜索
              </button>
            </form>
            
            {/* 标的列表 */}
            <div className="tj-modal-list-section">
              <div className="list-title">
                {searchQuery ? '搜索结果' : (
                  <>
                    <span className="fire-icon">🔥</span> 热门标的
                  </>
                )}
              </div>
              
              <div className="tj-modal-list">
                {(searchQuery ? searchResults : (HOT_SYMBOLS[activeMarketTab] || [])).map((item) => {
                  const isAdded = watchlist.some((w) => w.symbol === item.symbol);
                  return (
                    <div key={item.symbol} className="tj-modal-list-item">
                      <div className="item-info">
                        <span className="item-symbol">{item.symbol}</span>
                        <span className="item-name">{item.name}</span>
                      </div>
                      <button
                        className={`add-toggle-btn ${isAdded ? 'added' : ''}`}
                        onClick={() => toggleWatchlist(item)}
                      >
                        {isAdded ? '已自选' : '+ 自选'}
                      </button>
                    </div>
                  );
                })}
                {(searchQuery ? searchResults : HOT_SYMBOLS[activeMarketTab]).length === 0 && (
                  <div className="no-data">暂无标的数据</div>
                )}
              </div>
            </div>
            
            <div className="tj-modal-footer">
              <button className="footer-cancel-btn" onClick={() => setShowAddModal(false)}>
                取消
              </button>
              <button className="footer-confirm-btn" onClick={() => setShowAddModal(false)}>
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部状态条 */}
      <div className="tj-status-strip">
        <div className="tj-status-left">
          <span>当前标的: <b>{currentSymbol}</b></span>
          <span className="tj-divider">|</span>
          <span>数据周期: <b>{formatPeriodText(currentPeriod)}</b></span>
        </div>
        {statusMsg && (
          <div className="tj-status-middle animate-fade-in-out">
            <span style={{ color: '#10b981', fontWeight: 500 }}>{statusMsg}</span>
          </div>
        )}
        <div className="tj-status-right">
          <span ref={fpsRef} className="tj-fps-monitor" style={{ marginRight: 12, fontSize: '11px', fontWeight: 'bold' }}>FPS: --</span>
          <span className="tj-divider" style={{ marginRight: 12 }}>|</span>
          <span className={`tj-status-light ${isOnline ? 'tj-online' : 'tj-offline'}`} />
          <span className="tj-status-text">
            数据服务: {isOnline ? '连接正常' : '连接异常'}
          </span>
        </div>
      </div>

      {/* 消息 Toast */}
      {toastMsg && (
        <div className="tj-toast">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 交易录入玻璃拟态弹窗 */}
      {showTradeForm && (
        <div className="tj-trade-form-overlay" onClick={handleCloseForm}>
          <div className="tj-trade-form-container" onClick={e => e.stopPropagation()}>
            <div className="tj-trade-form-header">
              <h3>📝 录入交易记录 ({formSymbol})</h3>
              <button className="tj-close-btn" onClick={handleCloseForm}>✕</button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="tj-trade-form">
              {/* 方向切换 */}
              <div className="tj-form-group">
                <label>交易方向</label>
                <div className="tj-side-selector">
                  <button
                    type="button"
                    className={`tj-side-btn buy ${formSide === 'buy' ? 'active' : ''}`}
                    onClick={() => setFormSide('buy')}
                  >
                    买入 (Long)
                  </button>
                  <button
                    type="button"
                    className={`tj-side-btn sell ${formSide === 'sell' ? 'active' : ''}`}
                    onClick={() => setFormSide('sell')}
                  >
                    卖出 (Short)
                  </button>
                </div>
              </div>

              {/* 价格与数量 */}
              <div className="tj-form-row">
                <div className="tj-form-group tj-flex-1">
                  <label>成交价格</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="请输入成交价"
                    value={formPrice}
                    className={formErrors.price ? 'tj-input-error' : ''}
                    onChange={e => {
                      setFormPrice(e.target.value);
                      if (formErrors.price) {
                        setFormErrors(prev => ({ ...prev, price: '' }));
                      }
                    }}
                  />
                  {formErrors.price && <span className="tj-error-text">⚠️ {formErrors.price}</span>}
                </div>

                <div className="tj-form-group tj-flex-1">
                  <label>成交数量</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="请输入成交量"
                    value={formAmount}
                    className={formErrors.amount ? 'tj-input-error' : ''}
                    onChange={e => {
                      setFormAmount(e.target.value);
                      if (formErrors.amount) {
                        setFormErrors(prev => ({ ...prev, amount: '' }));
                      }
                    }}
                  />
                  {formErrors.amount && <span className="tj-error-text">⚠️ {formErrors.amount}</span>}
                </div>
              </div>

              {/* 标签搜索与多选 */}
              <div className="tj-form-group">
                <label>归因标签检索</label>
                <input
                  type="text"
                  placeholder="输入检索词过滤标签 (如: 双底, FOMO)..."
                  value={tagSearchQuery}
                  onChange={e => setTagSearchQuery(e.target.value)}
                  className="tj-tag-search-input"
                />
              </div>

              {/* 已选归因标签展示区 */}
              {(selectedStrategyTags.length > 0 || selectedErrorTags.length > 0) && (
                <div className="tj-selected-chips-row">
                  <span className="tj-selected-label">已选：</span>
                  <div className="tj-selected-chips-container">
                    {selectedStrategyTags.map(tag => (
                      <span
                        key={`selected-strat-${tag}`}
                        className="tj-tag-chip tj-strategy active"
                        onClick={() => toggleStrategyTag(tag)}
                      >
                        #{tag} ✕
                      </span>
                    ))}
                    {selectedErrorTags.map(tag => (
                      <span
                        key={`selected-err-${tag}`}
                        className="tj-tag-chip tj-error active"
                        onClick={() => toggleErrorTag(tag)}
                      >
                        #{tag} ✕
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 策略标签 */}
              <div className="tj-form-group">
                <label className="tj-sub-label">策略标签 (可多选)</label>
                <div className="tj-tags-chips-container">
                  {filteredPatterns.map(tag => {
                    const isSelected = selectedStrategyTags.includes(tag);
                    return (
                      <span
                        key={tag}
                        className={`tj-tag-chip tj-strategy ${isSelected ? 'active' : ''}`}
                        onClick={() => toggleStrategyTag(tag)}
                      >
                        #{tag}
                      </span>
                    );
                  })}
                  {filteredPatterns.length === 0 && <span className="tj-no-tags-tip">无匹配策略标签</span>}
                </div>
              </div>

              {/* 心理/错误标签 */}
              <div className="tj-form-group">
                <label className="tj-sub-label">心理与错误归因 (可多选)</label>
                <div className="tj-tags-chips-container">
                  {filteredPsychology.map(tag => {
                    const isSelected = selectedErrorTags.includes(tag);
                    return (
                      <span
                        key={tag}
                        className={`tj-tag-chip tj-error ${isSelected ? 'active' : ''}`}
                        onClick={() => toggleErrorTag(tag)}
                      >
                        #{tag}
                      </span>
                    );
                  })}
                  {filteredPsychology.length === 0 && <span className="tj-no-tags-tip">无匹配心理标签</span>}
                </div>
              </div>

              {/* 表单页脚 */}
              <div className="tj-trade-form-footer">
                <button 
                  type="button" 
                  className="tj-footer-cancel-btn" 
                  onClick={handleCloseForm}
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className={`tj-footer-confirm-btn ${isSubmitting ? 'tj-btn-loading' : ''}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '写入中...' : '确认录入'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 自定义右键菜单 */}
      {contextMenu && (
        <div 
          className="tj-context-menu" 
          style={{ 
            left: contextMenu.x, 
            top: contextMenu.y 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="tj-context-menu-item"
            onClick={() => {
              handleCreateNoteAtTimestamp(contextMenu.timestamp);
              setContextMenu(null);
            }}
          >
            📝 在此创建笔记
          </button>
        </div>
      )}

    </div>
  );
};

export default KlineChartComponent;
