/**
 * IndexedDB 缓存层 —— 存放原始行情热数据
 * - A股日线/分钟线 K 线数据
 * - 加密货币 K 线数据
 * - 实时 tick 数据（最近 N 条）
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { KLineData } from 'klinecharts';
import type { Timeframe } from '@/types/chart';

const DB_NAME = 'trade-journal-cache';
const DB_VERSION = 1;
const KLINE_STORE = 'kline_data';
const TICK_STORE = 'tick_data';
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 小时

interface CacheEntry {
  key: string;
  data: KLineData[];
  timestamp: number;
  symbol: string;
  timeframe: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(KLINE_STORE)) {
          const store = db.createObjectStore(KLINE_STORE, { keyPath: 'key' });
          store.createIndex('symbol', 'symbol');
          store.createIndex('timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains(TICK_STORE)) {
          const store = db.createObjectStore(TICK_STORE, { keyPath: 'key' });
          store.createIndex('symbol', 'symbol');
          store.createIndex('timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
}

export const IndexedDBCache = {
  /** 构建缓存 key */
  makeKey(symbol: string, timeframe: string): string {
    return `${symbol.toUpperCase()}_${timeframe}`;
  },

  /** 读取缓存的 K 线数据 */
  async getKLine(symbol: string, timeframe: string): Promise<KLineData[] | null> {
    const db = await getDB();
    const key = this.makeKey(symbol, timeframe);
    const entry = await db.get(KLINE_STORE, key) as CacheEntry | undefined;

    if (!entry) return null;
    // 检查缓存是否过期
    if (Date.now() - entry.timestamp > MAX_CACHE_AGE) {
      await db.delete(KLINE_STORE, key);
      return null;
    }
    return entry.data;
  },

  /** 写入 K 线数据到缓存 */
  async setKLine(symbol: string, timeframe: string, data: KLineData[]): Promise<void> {
    const db = await getDB();
    const entry: CacheEntry = {
      key: this.makeKey(symbol, timeframe),
      data,
      timestamp: Date.now(),
      symbol: symbol.toUpperCase(),
      timeframe,
    };
    await db.put(KLINE_STORE, entry);
  },

  /** 追加单根 K 线（实时更新） */
  async appendKLine(symbol: string, timeframe: string, candle: KLineData): Promise<void> {
    const db = await getDB();
    const key = this.makeKey(symbol, timeframe);
    const existing = await db.get(KLINE_STORE, key) as CacheEntry | undefined;

    if (existing) {
      // 替换最后一根或追加
      const data = existing.data;
      const last = data[data.length - 1];
      if (last && isSamePeriod(last.timestamp, candle.timestamp, timeframe)) {
        data[data.length - 1] = candle;
      } else {
        data.push(candle);
        // 限制最大 500 根缓存
        if (data.length > 500) data.shift();
      }
      existing.timestamp = Date.now();
      await db.put(KLINE_STORE, existing);
    } else {
      await this.setKLine(symbol, timeframe, [candle]);
    }
  },

  /** 保存 tick 数据 */
  async saveTick(symbol: string, tick: { price: number; volume: number; timestamp: number }): Promise<void> {
    const db = await getDB();
    const key = `tick_${symbol.toUpperCase()}_${Date.now()}`;
    await db.put(TICK_STORE, { key, ...tick, symbol: symbol.toUpperCase() });
  },

  /** 清除指定标的缓存 */
  async clearSymbol(symbol: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(KLINE_STORE, 'readwrite');
    const index = tx.store.index('symbol');
    let cursor = await index.openCursor(IDBKeyRange.only(symbol.toUpperCase()));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  },

  /** 清除过期缓存 */
  async cleanExpired(): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(KLINE_STORE, 'readwrite');
    let cursor = await tx.store.openCursor();
    const cutoff = Date.now() - MAX_CACHE_AGE;
    while (cursor) {
      if (cursor.value.timestamp < cutoff) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  },
};

/** 判断两根 K 线是否属于同一周期（同一根） */
function isSamePeriod(ts1: number, ts2: number, timeframe: string): boolean {
  const d1 = new Date(ts1);
  const d2 = new Date(ts2);

  switch (timeframe) {
    case '1m': case '5m': case '15m': case '30m':
      return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate() &&
        d1.getHours() === d2.getHours() &&
        d1.getMinutes() === d2.getMinutes();
    case '1H': case '4H':
      return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate() &&
        d1.getHours() === d2.getHours();
    case '1D':
      return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
    case '1W':
      return getWeekNumber(d1) === getWeekNumber(d2) && d1.getFullYear() === d2.getFullYear();
    case '1M':
      return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
    default:
      return false;
  }
}

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}
