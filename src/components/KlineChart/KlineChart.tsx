import React, { useRef, useEffect, useState } from 'react';
import { KLineChartPro, Period, SymbolInfo } from '@klinecharts/pro';
import '@klinecharts/pro/dist/klinecharts-pro.css';
import { getDataRouter } from '@/core/DataRouter';
import { detectMarket } from '@/core/providers/types';
import type { InstrumentInfo } from '@/types/trade';
import { formatMoney, formatPercent } from '@/utils/format';

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

function periodToTimeframe(period: Period): string {
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

const KlineChartComponent: React.FC<KlineChartProps> = ({
  symbol: initialSymbol = '000001',
  height = 560,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const proChartRef = useRef<KLineChartPro | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentSymbol, setCurrentSymbol] = useState(initialSymbol);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [currentChange, setCurrentChange] = useState<number>(0);
  const [currentChangePct, setCurrentChangePct] = useState<number>(0);
  const [marketType, setMarketType] = useState<string>('ashare');
  const [instrumentInfo, setInstrumentInfo] = useState<InstrumentInfo | null>(null);

  // Panels state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'orderbook' | 'trades' | 'depth'>('orderbook');
  const [orderBook, setOrderBook] = useState<{ asks: OrderBookItem[]; bids: OrderBookItem[]; maxTotal: number } | null>(null);
  const [trades, setTrades] = useState<TradeItem[]>([]);

  const decimals = currentPrice > 1000 ? 2 : currentPrice > 1 ? 2 : 4;

  // Initialize and clean up chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const initialMarket = detectMarket(initialSymbol);
    const isCrypto = initialMarket === 'crypto';

    const pro = new KLineChartPro({
      container: chartContainerRef.current,
      symbol: {
        ticker: initialSymbol,
        name: initialSymbol,
        shortName: initialSymbol,
        market: isCrypto ? 'crypto' : 'stocks',
        exchange: initialSymbol.startsWith('60') ? 'SH' : 'SZ',
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
          try {
            const tf = periodToTimeframe(period);
            const result = await dataRouter.fetchKLine(symbolInfo.ticker, tf as any);
            
            if (result.data.length > 0) {
              const last = result.data[result.data.length - 1];
              const prev = result.data[result.data.length - 2] ?? last;
              const change = last.close - prev.close;
              const changePct = prev.close ? (change / prev.close) * 100 : 0;
              
              setCurrentPrice(last.close);
              setCurrentChange(change);
              setCurrentChangePct(changePct);
              setCurrentSymbol(symbolInfo.ticker);
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
                turnover: (last as any).turnover ?? 0,
              };

              try {
                const fetchedInfo = await dataRouter.fetchSymbolInfo(symbolInfo.ticker);
                if (fetchedInfo && fetchedInfo.name) {
                  info.name = fetchedInfo.name;
                }
              } catch {}
              setInstrumentInfo(info);
            }
            return result.data;
          } catch (e) {
            console.error('[Datafeed] getHistoryKLineData failed:', e);
            return [];
          }
        },
        subscribe: () => {},
        unsubscribe: () => {},
      },
    });

    proChartRef.current = pro;

    return () => {
      // Clean up pro instance
      if (proChartRef.current) {
        try {
          (proChartRef.current as any)._chartApi?.dispose();
        } catch (e) {
          console.warn('Dispose error:', e);
        }
        proChartRef.current = null;
      }
    };
  }, [initialSymbol]);

  // Handle dynamic simulation data generation for Order Book and Recent Trades
  useEffect(() => {
    if (!currentPrice) return;

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
  }, [currentPrice, currentSymbol]);

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
        {/* 图表容器 */}
        <div ref={chartContainerRef} className="tj-pro-chart-container" />

        {/* 侧边栏 */}
        <div className={`tj-pro-sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
          {isSidebarOpen ? (
            <div className="tj-sidebar-content">
              {/* 标签页导航 */}
              <div className="tj-sidebar-tabs">
                <button
                  className={`tj-tab-btn ${activeTab === 'orderbook' ? 'active' : ''}`}
                  onClick={() => setActiveTab('orderbook')}
                >
                  委托簿
                </button>
                <button
                  className={`tj-tab-btn ${activeTab === 'trades' ? 'active' : ''}`}
                  onClick={() => setActiveTab('trades')}
                >
                  最新成交
                </button>
                <button
                  className={`tj-tab-btn ${activeTab === 'depth' ? 'active' : ''}`}
                  onClick={() => setActiveTab('depth')}
                >
                  深度图
                </button>
                <button className="tj-collapse-btn" onClick={() => setIsSidebarOpen(false)} title="收起侧栏">
                  ▶
                </button>
              </div>

              {/* 标签页内容 */}
              <div className="tj-tab-pane">
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
              </div>
            </div>
          ) : (
            <div className="tj-collapsed-bar" onClick={() => setIsSidebarOpen(true)} title="展开侧栏">
              <span className="collapsed-arrow">◀</span>
              <span className="collapsed-text">委<br />托<br />簿</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KlineChartComponent;
