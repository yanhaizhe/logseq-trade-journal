/**
 * Tushare HTTP API Provider（A股 / 国内期货）
 *
 * 纯 TypeScript + fetch 实现，支持：
 * - A股日线：stk_daily / daily
 * - A股分钟线：stk_mins
 * - 期货日线：fut_daily
 * - 期货分钟线：ft_mins
 *
 * 需要用户配置 tushare token
 */

import type { KLineData } from 'klinecharts';
import type { MarketDataProvider, FetchRequest, FetchResult, MarketType } from './types';
import { IndexedDBCache } from '../cache/IndexedDBCache';

const API_URL = 'https://api.tushare.pro';

// 周期映射
const PERIOD_MAP: Record<string, string> = {
  '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min',
  '1H': '60min', '4H': 'D', '1D': 'D', '1W': 'W', '1M': 'M',
};

const MINUTE_PERIODS = new Set(['1min', '5min', '15min', '30min', '60min']);

// ============== 期货交易所前缀映射 ==============
interface ExchangeInfo { exchange: string; name: string }

const FUTURES_PREFIX_MAP: Record<string, ExchangeInfo> = {
  // 中金所 CFFEX
  IF: { exchange: 'CFFEX', name: '沪深300' }, IC: { exchange: 'CFFEX', name: '中证500' },
  IH: { exchange: 'CFFEX', name: '上证50' }, IM: { exchange: 'CFFEX', name: '中证1000' },
  T:  { exchange: 'CFFEX', name: '10年国债' }, TF: { exchange: 'CFFEX', name: '5年国债' },
  TS: { exchange: 'CFFEX', name: '2年国债' }, TL: { exchange: 'CFFEX', name: '30年国债' },
  // 上期所 SHFE
  AG: { exchange: 'SHFE', name: '沪银' }, AL: { exchange: 'SHFE', name: '沪铝' },
  AO: { exchange: 'SHFE', name: '氧化铝' }, AU: { exchange: 'SHFE', name: '沪金' },
  BR: { exchange: 'SHFE', name: '丁二烯橡胶' }, BU: { exchange: 'SHFE', name: '沥青' },
  CU: { exchange: 'SHFE', name: '沪铜' }, FU: { exchange: 'SHFE', name: '燃油' },
  HC: { exchange: 'SHFE', name: '热卷' }, NI: { exchange: 'SHFE', name: '沪镍' },
  NR: { exchange: 'SHFE', name: '20号胶' }, PB: { exchange: 'SHFE', name: '沪铅' },
  RB: { exchange: 'SHFE', name: '螺纹钢' }, RU: { exchange: 'SHFE', name: '橡胶' },
  SN: { exchange: 'SHFE', name: '沪锡' }, SP: { exchange: 'SHFE', name: '纸浆' },
  SS: { exchange: 'SHFE', name: '不锈钢' }, WR: { exchange: 'SHFE', name: '线材' },
  ZN: { exchange: 'SHFE', name: '沪锌' },
  // 大商所 DCE
  A:  { exchange: 'DCE', name: '豆一' }, B:  { exchange: 'DCE', name: '豆二' },
  C:  { exchange: 'DCE', name: '玉米' }, CS: { exchange: 'DCE', name: '淀粉' },
  EB: { exchange: 'DCE', name: '苯乙烯' }, EG: { exchange: 'DCE', name: '乙二醇' },
  FB: { exchange: 'DCE', name: '纤维板' }, I:  { exchange: 'DCE', name: '铁矿石' },
  J:  { exchange: 'DCE', name: '焦炭' }, JD: { exchange: 'DCE', name: '鸡蛋' },
  JM: { exchange: 'DCE', name: '焦煤' }, L:  { exchange: 'DCE', name: '塑料' },
  LH: { exchange: 'DCE', name: '生猪' }, M:  { exchange: 'DCE', name: '豆粕' },
  P:  { exchange: 'DCE', name: '棕榈油' }, PG: { exchange: 'DCE', name: '液化气' },
  PP: { exchange: 'DCE', name: '聚丙烯' }, RR: { exchange: 'DCE', name: '粳米' },
  V:  { exchange: 'DCE', name: 'PVC' }, Y:  { exchange: 'DCE', name: '豆油' },
  // 郑商所 CZCE
  AP: { exchange: 'CZCE', name: '苹果' }, CF: { exchange: 'CZCE', name: '棉花' },
  CJ: { exchange: 'CZCE', name: '红枣' }, CY: { exchange: 'CZCE', name: '棉纱' },
  FG: { exchange: 'CZCE', name: '玻璃' }, JR: { exchange: 'CZCE', name: '粳稻' },
  LR: { exchange: 'CZCE', name: '晚籼稻' }, MA: { exchange: 'CZCE', name: '甲醇' },
  OI: { exchange: 'CZCE', name: '菜油' }, PF: { exchange: 'CZCE', name: '短纤' },
  PK: { exchange: 'CZCE', name: '花生' }, PM: { exchange: 'CZCE', name: '普麦' },
  RI: { exchange: 'CZCE', name: '早籼稻' }, RM: { exchange: 'CZCE', name: '菜粕' },
  RS: { exchange: 'CZCE', name: '油菜籽' }, SA: { exchange: 'CZCE', name: '纯碱' },
  SF: { exchange: 'CZCE', name: '硅铁' }, SH: { exchange: 'CZCE', name: '烧碱' },
  SM: { exchange: 'CZCE', name: '锰硅' }, SR: { exchange: 'CZCE', name: '白糖' },
  TA: { exchange: 'CZCE', name: 'PTA' }, UR: { exchange: 'CZCE', name: '尿素' },
  WH: { exchange: 'CZCE', name: '强麦' }, ZC: { exchange: 'CZCE', name: '动力煤' },
  // 上期能源 INE
  BC: { exchange: 'INE', name: '国际铜' }, EC: { exchange: 'INE', name: '集运指数' },
  LU: { exchange: 'INE', name: '低硫燃油' }, SC: { exchange: 'INE', name: '原油' },
};

export class TushareProvider implements MarketDataProvider {
  readonly name = 'Tushare';
  readonly markets: MarketType[] = ['ashare', 'futures'];
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  setToken(token: string): void {
    this.token = token;
  }

  async fetchKLine(req: FetchRequest): Promise<FetchResult> {
    const { symbol, timeframe } = req;
    const code = normalizeSymbol(symbol);
    const period = PERIOD_MAP[timeframe] || 'D';
    const market = req.market === 'futures' ? 'futures' : 'ashare';

    // 优先读缓存
    const cached = await IndexedDBCache.getKLine(code, timeframe);
    if (cached && cached.length > 50) {
      return { data: cached, symbol: code, market };
    }

    try {
      const isMinute = MINUTE_PERIODS.has(period);

      let body: Record<string, any>;

      if (market === 'futures') {
        body = buildFuturesRequest(code, period, isMinute, this.token);
      } else {
        body = buildStockRequest(code, period, isMinute, this.token);
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const json = await response.json();
      if (json.code !== 0) {
        throw new Error(`Tushare error: ${json.msg || '未知错误'} (code=${json.code})`);
      }

      const rawData = json.data?.items || [];
      const data: KLineData[] = rawData
        .map((row: any[]) => ({
          timestamp: parseDate(row[0], isMinute),
          open: Number(row[1]),
          high: Number(row[2]),
          low: Number(row[3]),
          close: Number(row[4]),
          volume: Number(row[5]),
          turnover: Number(row[6]) || 0,
        }))
        .reverse(); // Tushare 返回降序

      // 写入缓存
      if (data.length > 0) {
        await IndexedDBCache.setKLine(code, timeframe, data);
      }

      return { data, symbol: code, market };
    } catch (err) {
      throw new Error(`Tushare 获取失败: ${(err as Error).message}`);
    }
  }
}

// ============== 请求构建 ==============

function buildStockRequest(code: string, period: string, isMinute: boolean, token: string) {
  const base: Record<string, any> = { token };
  base.params = {
    ts_code: tushareStockCode(code),
    limit: 300,
  };

  if (isMinute) {
    base.api_name = 'stk_mins';
    base.fields = 'trade_time,open,high,low,close,vol,amount';
    base.params.freq = period;
    base.params.start_date = recentDate(30);
  } else {
    base.api_name = 'daily';
    base.fields = 'trade_date,open,high,low,close,vol,amount';
  }
  return base;
}

function buildFuturesRequest(code: string, period: string, isMinute: boolean, token: string) {
  const base: Record<string, any> = { token };
  const tsCode = tushareFuturesCode(code);

  if (isMinute) {
    base.api_name = 'ft_mins';
    base.fields = 'trade_time,open,high,low,close,vol,oi';
    base.params = {
      ts_code: tsCode,
      freq: period,
      start_date: recentDate(7),
    };
  } else {
    base.api_name = 'fut_daily';
    base.fields = 'trade_date,open,high,low,close,vol,oi,amount';
    base.params = {
      ts_code: tsCode,
      trade_date: '', // 空串取全部
      start_date: recentDate(365),
      end_date: todayYMD(),
      limit: 300,
    };
  }
  return base;
}

// ============== 代码映射 ==============

function normalizeSymbol(s: string): string {
  return s.toUpperCase().trim().replace(/^(SH|SZ)/, '');
}

/** A股 → Tushare ts_code: 000001 → 000001.SZ */
function tushareStockCode(code: string): string {
  if (code.startsWith('60')) return `${code}.SH`;
  if (code.startsWith('00') || code.startsWith('30')) return `${code}.SZ`;
  return `${code}.SH`;
}

/** 期货 → Tushare ts_code: RB2501 → RB2501.SHFE */
function tushareFuturesCode(code: string): string {
  // 支持直接传入 ts_code 格式（已有 .XX 后缀）
  if (code.includes('.')) return code;

  const prefix = code.match(/^[A-Za-z]+/)?.[0]?.toUpperCase() || '';
  const info = FUTURES_PREFIX_MAP[prefix];
  if (info) return `${code}.${info.exchange}`;

  // fallback：尝试基于代码长度猜测
  // 大商所/郑商所多数是小写代码，无法区分，默认上期所
  return `${code}.SHFE`;
}

// ============== 工具函数 ==============

function parseDate(str: string, isMinute: boolean): number {
  if (!str) return 0;
  // 格式可能是 "2026-05-19 14:30" 或 "20260519"
  const s = str.replace(/[- :]/g, '');
  const y = parseInt(s.slice(0, 4));
  const m = parseInt(s.slice(4, 6)) - 1;
  const d = parseInt(s.slice(6, 8));

  let ts = new Date(y, m, d).getTime();
  if (isMinute && s.length >= 12) {
    const hh = parseInt(s.slice(8, 10)) || 0;
    const mm = parseInt(s.slice(10, 12)) || 0;
    ts += hh * 3600000 + mm * 60000;
  }
  return ts;
}

function todayYMD(): string {
  const now = new Date();
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
}

function recentDate(daysBack: number): string {
  const d = new Date(Date.now() - daysBack * 86400000);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
