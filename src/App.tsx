/**
 * App 顶层组件
 * 根据模式渲染不同的视图：K线图 / 交易表单 / 复盘
 */

import React, { useCallback, useEffect, useState } from 'react';
import KlineChartComponent from '@/components/KlineChart/KlineChart';
import TradeForm from '@/components/TradeForm/TradeForm';
import DailyReview from '@/components/Review/DailyReview';
import { useAppStore } from '@/store';
import { DataService } from '@/core/DataService';
import { TradeManager } from '@/core/TradeManager';
import { StatisticsEngine } from '@/core/StatisticsEngine';
import type { TradeInput, TradeRecord, DailyStats } from '@/types/trade';
import { todayStr } from '@/utils/format';

const dataService = new DataService();
const statsEngine = new StatisticsEngine();

// 从全局获取 tradeManager（由 main.tsx 注入）
function getTradeManager(): TradeManager | null {
  return typeof window !== 'undefined'
    ? (window as any).__tradeManager ?? null
    : null;
}

const App: React.FC = () => {
  const {
    mode, setMode,
    chartData, setChartData,
    chartConfig, setChartConfig,
    dailyStats, setDailyStats,
    trades, setTrades,
    loading, setLoading,
    error, setError,
  } = useAppStore();

  const [symbol, setSymbol] = useState('');

  // 加载 K 线（mock 数据）
  const loadChart = useCallback((sym: string) => {
    if (!sym.trim()) return;
    setChartConfig({ symbol: sym.toUpperCase() });
    setMode('kline');
  }, [setChartConfig, setMode]);

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
      setMode('idle');

      // 通知宿主
      window.parent?.postMessage({ type: 'trade-saved', trade: mockTrade }, '*');
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const trade = await tm.recordTrade(input);
      setTrades([trade, ...trades]);
      setMode('idle');
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
            loadDailyReview();
          }
          break;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [loadDailyReview, setMode]);

  // 窗口拖拽移动
  const handleMoveStart = useCallback((e: React.MouseEvent) => {
    // 只在导航栏区域触发
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT') return;

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const iframe = window.frameElement as HTMLElement | null;
    const startLeft = iframe ? parseInt(iframe.style.left || '0') : 0;
    const startTop = iframe ? parseInt(iframe.style.top || '0') : 0;

    const onMove = (ev: MouseEvent) => {
      const left = startLeft + ev.clientX - startX;
      const top = startTop + ev.clientY - startY;
      if (iframe) {
        iframe.style.left = `${Math.max(0, left)}px`;
        iframe.style.top = `${Math.max(0, top)}px`;
      }
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  // 窗口拖拽缩放
  const handleResizeStart = useCallback((edge: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const iframe = window.frameElement as HTMLElement | null;
    const startW = iframe?.clientWidth ?? window.innerWidth;
    const startH = iframe?.clientHeight ?? window.innerHeight;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let newW = startW;
      let newH = startH;

      if (edge.includes('right')) newW = Math.max(320, startW + dx);
      if (edge.includes('bottom')) newH = Math.max(200, startH + dy);

      if (iframe) {
        iframe.style.width = `${newW}px`;
        iframe.style.height = `${newH}px`;
      }

      // 同时通知 Logseq 宿主
      window.parent?.postMessage({
        type: 'resize',
        width: newW,
        height: newH,
      }, '*');
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
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
      <nav className="app-nav" onMouseDown={handleMoveStart}>
        <span className="nav-drag-hint">⋮⋮</span>
        <button
          className={`nav-btn ${mode === 'kline' ? 'active' : ''}`}
          onClick={() => setMode('kline')}
        >
          📊 K线图
        </button>
        <button
          className={`nav-btn ${mode === 'trade' ? 'active' : ''}`}
          onClick={() => setMode('trade')}
        >
          📝 记交易
        </button>
        <button
          className={`nav-btn ${mode === 'review' ? 'active' : ''}`}
          onClick={loadDailyReview}
        >
          🔍 复盘
        </button>

        {/* 恢复默认大小 */}
        <button
          className="nav-btn nav-reset-btn"
          title="恢复默认大小"
          onClick={() => {
            const iframe = window.frameElement as HTMLElement | null;
            if (iframe) {
              iframe.style.width = '520px';
              iframe.style.height = '720px';
            }
            window.parent?.postMessage({ type: 'resize', width: 520, height: 720 }, '*');
          }}
        >
          ⬚
        </button>

        {/* 关闭按钮 */}
        <button
          className="nav-btn nav-close-btn"
          title="关闭面板"
          onClick={() => {
            try { logseq.hideMainUI(); } catch {}
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

      {/* 内容区 */}
      <main className="app-content">
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
            <KlineChartComponent symbol={chartConfig.symbol} height={520} />
          </div>
        )}

        {/* 交易表单模式 */}
        {mode === 'trade' && (
          <div className="trade-view">
            <TradeForm
              onSubmit={handleTradeSubmit}
              onCancel={() => setMode('idle')}
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
      <div className="resize-handle right" onMouseDown={handleResizeStart('right')} />
      <div className="resize-handle bottom" onMouseDown={handleResizeStart('bottom')} />
      <div className="resize-handle bottom-right" onMouseDown={handleResizeStart('bottom-right')} />
    </div>
  );
};

export default App;
