/**
 * App 顶层组件
 * 根据模式渲染不同的视图：K线图 / 交易表单 / 复盘
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import KlineChartComponent from '@/components/KlineChart/KlineChart';
import TradeForm from '@/components/TradeForm/TradeForm';
import DailyReview from '@/components/Review/DailyReview';
import WelcomeScreen from '@/components/Onboarding/WelcomeScreen';
import TokenSettingsModal from '@/components/Onboarding/TokenSettingsModal';
import { useAppStore } from '@/store';
import { DataService } from '@/core/DataService';
import { TradeManager } from '@/core/TradeManager';
import { StatisticsEngine } from '@/core/StatisticsEngine';
import type { TradeInput, TradeRecord, DailyStats } from '@/types/trade';
import { todayStr } from '@/utils/format';
import { extractSymbol } from '@/utils/symbol';

const dataService = new DataService();
const statsEngine = new StatisticsEngine();

// 从全局获取 tradeManager（由 main.tsx 注入）
function getTradeManager(): TradeManager | null {
  return typeof window !== 'undefined'
    ? (window as any).__tradeManager ?? null
    : null;
}

// 安全获取 frameElement（拦截跨域 SecurityError 异常）
const getFrameElement = (): HTMLElement | null => {
  try {
    return window.frameElement as HTMLElement | null;
  } catch (e) {
    return null;
  }
};

// 安全获取宿主窗口宽度（拦截跨域 SecurityError 异常）
const getParentWidth = (): number => {
  try {
    return window.parent?.innerWidth || window.innerWidth;
  } catch (e) {
    return window.innerWidth;
  }
};

// 安全获取宿主窗口高度
const getParentHeight = (): number => {
  try {
    return window.parent?.innerHeight || window.innerHeight;
  } catch (e) {
    return window.innerHeight;
  }
};

// 安全读写 localStorage
const safeGetStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
};

const safeSetStorage = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // 忽略私有模式下的写入异常
  }
};

const App: React.FC = () => {
  const {
    mode, setMode,
    chartData, setChartData,
    chartConfig, setChartConfig,
    dailyStats, setDailyStats,
    trades, setTrades,
    loading, setLoading,
    error, setError,
    isVisible, setIsVisible,
  } = useAppStore();

  const [symbol, setSymbol] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recheckKey, setRecheckKey] = useState(0);

  // 记录并追踪当前面板布局位置 (针对 iframe 跨域沙盒无法通过 window.frameElement 修改的替代方案)
  const layoutRef = useRef({
    width: 320,
    height: 720,
    left: 0,
    top: 0
  });

  // 分屏比例与尺寸初始化
  useEffect(() => {
    const storedRatio = safeGetStorage('tj_split_ratio');
    let ratio = storedRatio ? parseFloat(storedRatio) : 0.5;
    if (isNaN(ratio) || !isFinite(ratio) || ratio < 0.1 || ratio > 0.9) {
      ratio = 0.5;
    }

    // 首次使用如果无 last_symbol，则强制设为空
    const hasLastSymbol = safeGetStorage('tj_last_symbol');
    if (!hasLastSymbol) {
      setChartConfig({ symbol: '' });
    }

    const totalWidth = getParentWidth();
    const totalHeight = getParentHeight();
    const initialW = Math.round(Math.max(320, totalWidth * ratio));
    const initialLeft = Math.round(Math.max(0, totalWidth - initialW));
    const initialH = totalHeight;

    layoutRef.current = {
      width: initialW,
      height: initialH,
      left: initialLeft,
      top: 0
    };

    const ls = (window as any).logseq;
    if (ls) {
      ls.setMainUIInlineStyle({
        zIndex: 9999,
        position: 'fixed',
        top: '0px',
        left: `${initialLeft}px`,
        width: `${initialW}px`,
        height: '100%',
        pointerEvents: 'none',
      });
    }

    const iframe = getFrameElement();
    if (iframe) {
      iframe.style.width = `${initialW}px`;
      iframe.style.left = `${initialLeft}px`;
      iframe.style.top = '0px';

      window.parent?.postMessage({
        type: 'resize',
        width: initialW,
        height: iframe.clientHeight || window.innerHeight,
      }, '*');
    }
  }, [setChartConfig]);

  // 加载 K 线（mock 数据）
  const loadChart = useCallback((sym: string) => {
    const upperSym = sym.trim().toUpperCase();
    if (!upperSym) return;
    setChartConfig({ symbol: upperSym });
    safeSetStorage('tj_last_symbol', upperSym);
    setMode('kline');
  }, [setChartConfig, setMode]);

  const handleLoadChart = useCallback(() => {
    const trimmed = symbol.trim();
    if (trimmed) {
      loadChart(trimmed);
    }
  }, [symbol, loadChart]);

  // 处理 CSV 文件加载
  const handleCSVLoad = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const data = await dataService.parseCSV(file);
      setChartData(data);
      setMode('kline');
    } catch (e) {
      setError('CSV 解析失败，请检查格式');
    } finally {
      setLoading(false);
    }
  }, [setChartData, setMode, setLoading, setError]);

  // 处理交易提交
  const handleTradeSubmit = useCallback(async (input: TradeInput) => {
    const tm = getTradeManager();
    if (!tm) {
      // 本地模式：保存到本地状态
      const mockTrade: TradeRecord = {
        ...input,
        id: `local-${Date.now()}`,
        profit: 0,
        profitPct: 0,
        netPnL: 0,
        createdAt: new Date().toISOString(),
        patterns: [],
      };
      setTrades([mockTrade, ...trades]);
      setMode('kline');

      // 通知宿主
      window.parent?.postMessage({ type: 'trade-saved', trade: mockTrade }, '*');
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const trade = await tm.recordTrade(input);
      setTrades([trade, ...trades]);
      setMode('kline');
      window.parent?.postMessage({ type: 'trade-saved', trade }, '*');
      setError(null);
    } catch (e) {
      setError(`保存失败: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [trades, setTrades, setMode, setLoading, setError]);

  // 加载日复盘
  const loadDailyReview = useCallback(async () => {
    const tm = getTradeManager();

    if (!tm) {
      // 本地模式
      if (trades.length > 0) {
        const stats = statsEngine.dailyStats(todayStr(), trades);
        setDailyStats(stats);
      } else {
        setDailyStats({
          date: todayStr(),
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          breakEvenTrades: 0,
          winRate: 0,
          totalPnL: 0,
          totalFee: 0,
          netPnL: 0,
          avgProfit: 0,
          avgLoss: 0,
          profitFactor: 0,
          trades: [],
        });
      }
      setMode('review');
      return;
    }

    setLoading(true);
    try {
      const review = await tm.generateDailyReview(todayStr());
      setDailyStats(review.stats);
      setMode('review');
    } catch (e) {
      // Fallback: 使用本地 trades 数据
      if (trades.length > 0) {
        setDailyStats(statsEngine.dailyStats(todayStr(), trades));
        setMode('review');
      } else {
        setError(`加载复盘失败: ${(e as Error).message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [trades, setDailyStats, setMode, setLoading, setError]);

  const loadDailyReviewRef = useRef(loadDailyReview);
  useEffect(() => {
    loadDailyReviewRef.current = loadDailyReview;
  }, [loadDailyReview]);

  const chartSymbolRef = useRef(chartConfig.symbol);
  useEffect(() => {
    chartSymbolRef.current = chartConfig.symbol;
  }, [chartConfig.symbol]);

  const loadChartRef = useRef(loadChart);
  useEffect(() => {
    loadChartRef.current = loadChart;
  }, [loadChart]);

  // 监听来自宿主和内部的消息
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg?.type) return;

      switch (msg.type) {
        case 'switch-mode':
          if (msg.mode === 'kline') {
            setMode('kline');
          } else if (msg.mode === 'trade') {
            setMode('trade');
          } else if (msg.mode === 'review') {
            loadDailyReviewRef.current();
          }
          break;
        case 'visibility-changed':
          setIsVisible(!!msg.visible);
          break;
        case 'logseq-block-changed': {
          const block = msg.block;
          if (!block) {
            setChartConfig({ symbol: '' });
          } else {
            const extracted = extractSymbol(block.content || '', block.properties);
            if (extracted && extracted !== chartSymbolRef.current) {
              loadChartRef.current(extracted);
            }
          }
          break;
        }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [setMode, setIsVisible]);

  // 窗口拖拽移动
  const handleMoveStart = useCallback((e: React.PointerEvent) => {
    // 只在导航栏区域触发
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT') return;

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = layoutRef.current.left;
    const startTop = layoutRef.current.top;
    const currentW = layoutRef.current.width;

    const currentTarget = e.currentTarget as HTMLElement;
    try {
      currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const onPointerMove = (ev: PointerEvent) => {
      const left = Math.round(startLeft + ev.clientX - startX);
      const top = Math.round(startTop + ev.clientY - startY);
      const safeLeft = Math.max(0, left);
      const safeTop = Math.max(0, top);

      layoutRef.current.left = safeLeft;
      layoutRef.current.top = safeTop;

      const ls = (window as any).logseq;
      if (ls) {
        ls.setMainUIInlineStyle({
          zIndex: 9999,
          position: 'fixed',
          top: `${safeTop}px`,
          left: `${safeLeft}px`,
          width: `${currentW}px`,
          height: '100%',
          pointerEvents: 'none',
        });
      }

      const iframe = getFrameElement();
      if (iframe) {
        iframe.style.left = `${safeLeft}px`;
        iframe.style.top = `${safeTop}px`;
      }
    };

    const onPointerUp = (ev: PointerEvent) => {
      try {
        currentTarget.releasePointerCapture(ev.pointerId);
      } catch {}
      currentTarget.removeEventListener('pointermove', onPointerMove);
      currentTarget.removeEventListener('pointerup', onPointerUp);
      currentTarget.removeEventListener('pointercancel', onPointerUp);
    };

    currentTarget.addEventListener('pointermove', onPointerMove);
    currentTarget.addEventListener('pointerup', onPointerUp);
    currentTarget.addEventListener('pointercancel', onPointerUp);
  }, []);

  // 窗口拖拽缩放
  const handleResizeStart = useCallback((edge: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const iframe = getFrameElement();
    const startW = layoutRef.current.width;
    const startH = layoutRef.current.height;
    const startLeft = layoutRef.current.left;
    const startTop = layoutRef.current.top;

    const currentTarget = e.currentTarget as HTMLElement;
    try {
      currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    let rafId: number | null = null;
    let lastW = startW;
    let lastH = startH;

    const onPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let newW = startW;
      let newH = startH;
      let newLeft = startLeft;

      const totalHeight = getParentHeight();

      if (edge.includes('left')) {
        const maxW = startW + startLeft;
        newW = Math.min(maxW, Math.max(320, startW - dx));
        newLeft = startLeft + (startW - newW);
      }
      if (edge.includes('right')) {
        newW = Math.max(320, startW + dx);
      }
      if (edge.includes('bottom')) {
        newH = Math.min(totalHeight, Math.max(200, startH + dy));
      }

      newW = Math.round(newW);
      newH = Math.round(newH);
      newLeft = Math.round(newLeft);

      layoutRef.current.width = newW;
      layoutRef.current.height = newH;
      layoutRef.current.left = newLeft;

      const ls = (window as any).logseq;
      if (ls) {
        ls.setMainUIInlineStyle({
          zIndex: 9999,
          position: 'fixed',
          top: `${startTop}px`,
          left: `${newLeft}px`,
          width: `${newW}px`,
          height: `${newH}px`,
          pointerEvents: 'none',
        });
      }

      const iframe = getFrameElement();
      if (iframe) {
        iframe.style.width = `${newW}px`;
        iframe.style.height = `${newH}px`;
        if (edge.includes('left')) {
          iframe.style.left = `${newLeft}px`;
        }
      }

      lastW = newW;
      lastH = newH;

      // 使用 requestAnimationFrame 节流 postMessage 发送
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          window.parent?.postMessage({
            type: 'resize',
            width: lastW,
            height: lastH,
          }, '*');
          rafId = null;
        });
      }
    };

    const onPointerUp = (ev: PointerEvent) => {
      try {
        currentTarget.releasePointerCapture(ev.pointerId);
      } catch {}
      currentTarget.removeEventListener('pointermove', onPointerMove);
      currentTarget.removeEventListener('pointerup', onPointerUp);
      currentTarget.removeEventListener('pointercancel', onPointerUp);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      // 最后确保发一次最终位置的消息，防止 raf 遗漏
      const finalW = Math.round(iframe ? iframe.clientWidth : lastW);
      const finalH = Math.round(iframe ? iframe.clientHeight : lastH);
      window.parent?.postMessage({
        type: 'resize',
        width: finalW,
        height: finalH,
      }, '*');

      if (iframe) {
        const totalWidth = getParentWidth();
        const ratio = parseFloat((finalW / totalWidth).toFixed(4));
        const safeRatio = isNaN(ratio) || !isFinite(ratio) ? 0.5 : Math.max(0.1, Math.min(0.9, ratio));
        safeSetStorage('tj_split_ratio', safeRatio.toString());
      }
    };

    currentTarget.addEventListener('pointermove', onPointerMove);
    currentTarget.addEventListener('pointerup', onPointerUp);
  }, []);

  // 错误自动消失
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  return (
    <div className="trade-journal-app">
      {/* 导航栏（可拖动窗口） */}
      <nav className="app-nav" onPointerDown={handleMoveStart}>
        <span className="nav-drag-hint">⋮⋮</span>

        {/* 恢复默认大小 */}
        <button
          className="nav-btn nav-reset-btn"
          title="恢复默认大小"
          onClick={() => {
            const totalWidth = getParentWidth();
            const totalHeight = getParentHeight();
            const defaultW = Math.round(Math.max(320, totalWidth * 0.5));
            const defaultH = Math.round(Math.min(720, Math.max(200, totalHeight)));
            const defaultLeft = totalWidth - defaultW;

            layoutRef.current = {
              width: defaultW,
              height: defaultH,
              left: defaultLeft,
              top: 0
            };

            const ls = (window as any).logseq;
            if (ls) {
              ls.setMainUIInlineStyle({
                zIndex: 9999,
                position: 'fixed',
                top: '0px',
                left: `${defaultLeft}px`,
                width: `${defaultW}px`,
                height: `${defaultH}px`,
                pointerEvents: 'none',
              });
            }

            const iframe = getFrameElement();
            if (iframe) {
              iframe.style.width = `${defaultW}px`;
              iframe.style.height = `${defaultH}px`;
              iframe.style.left = `${defaultLeft}px`;
              iframe.style.top = '0px';
            }

            safeSetStorage('tj_split_ratio', '0.5');
            window.parent?.postMessage({ type: 'resize', width: defaultW, height: defaultH }, '*');
          }}
        >
          ⬚
        </button>

        {/* 关闭按钮 */}
        <button
          className="nav-btn nav-close-btn"
          title="关闭面板"
          onClick={() => {
            (window as any).logseq?.hideMainUI();
            window.parent?.postMessage({ type: 'close' }, '*');
          }}
        >
          ✕
        </button>
      </nav>

      {/* 加载指示器 */}
      {loading && (
        <div className="app-loading">
          <div className="spinner" />
          <span>加载中...</span>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="app-error">
          {error}
        </div>
      )}

      {/* Token 配置弹窗 */}
      <TokenSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => {
          setSettingsOpen(false);
          setRecheckKey(prev => prev + 1);
          setMode('onboarding');
        }}
      />

      {/* 内容区 */}
      <main className="app-content">
        {/* Onboarding 自检页 (Page 03.1) */}
        {mode === 'onboarding' && (
          <WelcomeScreen
            key={recheckKey}
            onEnterWorkspace={() => {
              // 如果首次没有 last_symbol 缓存，则显式设置为空字符串
              const hasLastSymbol = safeGetStorage('tj_last_symbol');
              if (!hasLastSymbol) {
                setChartConfig({ symbol: '' });
              }
              setMode('kline');
            }}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}

        {/* Idle 首页 */}
        {mode === 'idle' && (
          <div className="welcome-screen">
            <div className="welcome-icon">📈</div>
            <h2>Trade Journal</h2>
            <p>K线形态学习 & 交易记录与复盘</p>
            <div className="quick-actions">
              <div className="quick-card" onClick={() => {
                setMode('kline');
              }}>
                <span className="qc-icon">📊</span>
                <span>查看 K 线图</span>
                <span className="qc-desc">拖入CSV数据</span>
              </div>
              <div className="quick-card" onClick={() => setMode('trade')}>
                <span className="qc-icon">📝</span>
                <span>记录新交易</span>
                <span className="qc-desc">快速录入</span>
              </div>
              <div className="quick-card" onClick={loadDailyReview}>
                <span className="qc-icon">🔍</span>
                <span>今日复盘</span>
                <span className="qc-desc">回顾统计</span>
              </div>
            </div>

            {/* 快速输入标的 */}
            <div className="quick-symbol">
              <input
                type="text"
                placeholder="A股:000001 / 美股:AAPL / 加密:BTCUSDT"
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadChart(symbol)}
              />
              <button onClick={() => loadChart(symbol)}>查看</button>
            </div>
          </div>
        )}

        {/* K线图模式 */}
        {mode === 'kline' && (
          <div className="kline-view">
            {chartConfig.symbol ? (
              <KlineChartComponent symbol={chartConfig.symbol} height={520} />
            ) : (
              <div className="tj-kline-empty-state">
                <div className="tj-empty-icon">📊</div>
                <h2>复盘工作区</h2>
                <p>输入标的代码开始分析</p>
                <div className="tj-empty-input-row">
                  <input
                    type="text"
                    placeholder="A股:000001 / 美股:AAPL / 加密:BTCUSDT"
                    value={symbol}
                    onChange={e => setSymbol(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLoadChart()}
                  />
                  <button onClick={handleLoadChart}>进入</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 交易表单模式 */}
        {mode === 'trade' && (
          <div className="trade-view">
            <TradeForm
              onSubmit={handleTradeSubmit}
              onCancel={() => setMode('kline')}
            />
          </div>
        )}

        {/* 复盘模式 */}
        {mode === 'review' && dailyStats && (
          <div className="review-view">
            <DailyReview
              stats={dailyStats}
              onTradeClick={() => {}}
            />
          </div>
        )}
      </main>

      {/* 窗口缩放拖拽手柄 */}
      <div className="resize-handle left" onPointerDown={handleResizeStart('left')} />
      <div className="resize-handle right" onPointerDown={handleResizeStart('right')} />
      <div className="resize-handle bottom" onPointerDown={handleResizeStart('bottom')} />
      <div className="resize-handle bottom-right" onPointerDown={handleResizeStart('bottom-right')} />
    </div>
  );
};

export default App;
