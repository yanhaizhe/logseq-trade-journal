/**
 * 全局状态管理（Zustand store）
 * 管理插件 UI 模式和应用状态
 */

import { create } from 'zustand';
import type { KLineData, ChartConfig, Timeframe } from '@/types/chart';
import type { TradeInput, TradeRecord, DailyStats } from '@/types/trade';

export type AppMode = 'kline' | 'trade' | 'review' | 'dashboard' | 'idle';

interface AppState {
  /** 当前模式 */
  mode: AppMode;
  /** K线图表数据 */
  chartData: KLineData[];
  /** 图表配置 */
  chartConfig: ChartConfig;
  /** 当前交易输入 */
  tradeInput: Partial<TradeInput>;
  /** 日统计数据 */
  dailyStats: DailyStats | null;
  /** 所有交易记录 */
  trades: TradeRecord[];
  /** 是否加载中 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;

  // Actions
  setMode: (mode: AppMode) => void;
  setChartData: (data: KLineData[]) => void;
  setChartConfig: (config: Partial<ChartConfig>) => void;
  setTradeInput: (input: Partial<TradeInput>) => void;
  setDailyStats: (stats: DailyStats | null) => void;
  setTrades: (trades: TradeRecord[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const defaultChartConfig: ChartConfig = {
  symbol: '',
  timeframe: '1D',
  indicators: ['MA', 'VOLUME'],
  theme: 'dark',
  locale: 'zh-CN',
};

export const useAppStore = create<AppState>((set) => ({
  mode: 'idle',
  chartData: [],
  chartConfig: defaultChartConfig,
  tradeInput: {},
  dailyStats: null,
  trades: [],
  loading: false,
  error: null,

  setMode: (mode) => set({ mode }),
  setChartData: (data) => set({ chartData: data }),
  setChartConfig: (config) =>
    set((state) => ({ chartConfig: { ...state.chartConfig, ...config } })),
  setTradeInput: (input) =>
    set((state) => ({ tradeInput: { ...state.tradeInput, ...input } })),
  setDailyStats: (stats) => set({ dailyStats: stats }),
  setTrades: (trades) => set({ trades }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      mode: 'idle',
      chartData: [],
      chartConfig: defaultChartConfig,
      tradeInput: {},
      dailyStats: null,
      trades: [],
      loading: false,
      error: null,
    }),
}));
