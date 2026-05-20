import React, { useRef, useEffect, useState } from 'react';
import { KLineChartPro, Period, SymbolInfo } from '@klinecharts/pro';
import '@klinecharts/pro/dist/klinecharts-pro.css';
import { getDataRouter } from '@/core/DataRouter';
import { detectMarket } from '@/core/providers/types';
import type { InstrumentInfo } from '@/types/trade';
import { formatMoney, formatPercent } from '@/utils/format';
import { StudyLab } from './StudyLab';
import { TradingNotes } from './TradingNotes';
import { useAppStore } from '@/store';

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
};

const KlineChartComponent: React.FC<KlineChartProps> = ({
  symbol: initialSymbol = '000001',
  height = 560,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const proChartRef = useRef<KLineChartPro | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isVisible = useAppStore(state => state.isVisible);

  const [currentSymbol, setCurrentSymbol] = useState(initialSymbol);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [currentChange, setCurrentChange] = useState<number>(0);
  const [currentChangePct, setCurrentChangePct] = useState<number>(0);
  const [marketType, setMarketType] = useState<string>('ashare');
  const [instrumentInfo, setInstrumentInfo] = useState<InstrumentInfo | null>(null);

  // Panels state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'watchlist' | 'study' | 'trading' | 'orderbook' | 'trades' | 'depth'>('watchlist');
  const [currentPeriod, setCurrentPeriod] = useState<string>('daily');
  const [orderBook, setOrderBook] = useState<{ asks: OrderBookItem[]; bids: OrderBookItem[]; maxTotal: number } | null>(null);
  const [trades, setTrades] = useState<TradeItem[]>([]);

  // Watchlist states
  const [watchlist, setWatchlist] = useState<Array<{ symbol: string; name: string; market: string }>>(() => {
    const saved = localStorage.getItem('tj_watchlist');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
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

  // Background fetch prices for all watchlist items
  useEffect(() => {
    localStorage.setItem('tj_watchlist', JSON.stringify(watchlist));
    if (watchlist.length === 0 || !isVisible) return;

    let isMounted = true;
    const fetchWatchlistPrices = async () => {
      if (!isVisible) return;
      const prices: Record<string, { price: number; changePct: number }> = {};
      await Promise.all(watchlist.map(async (item) => {
        try {
          const response = await fetch(`http://127.0.0.1:8765/kline?symbol=${encodeURIComponent(item.symbol)}&period=daily&limit=2`);
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
    const timer = setInterval(fetchWatchlistPrices, 15000);
    return () => {
      isMounted = false;
      clearInterval(timer);
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
        setSearchResults(data.results || []);
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
      localStorage.setItem('tj_last_symbol', currentSymbol);
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

  const handleSelectSymbol = (symbol: string, name?: string) => {
    const cleaned = symbol.toUpperCase().trim();
    const market = detectMarket(cleaned);
    const isCrypto = market === 'crypto';

    if (proChartRef.current) {
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
      setCurrentSymbol(cleaned);
    }
  };

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
        {/* 图表容器 */}
        <div ref={chartContainerRef} className="tj-pro-chart-container" />

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
                    currentPeriod={currentPeriod}
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

    </div>
  );
};

export default KlineChartComponent;
