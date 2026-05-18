/**
 * K线数据获取服务
 * 支持 CSV 导入和在线 API
 */

import Papa from 'papaparse';
import type { KLineData, Timeframe } from '@/types/chart';

export type DataSourceType = 'csv' | 'mock';

export class DataService {
  private cache = new Map<string, KLineData[]>();

  /**
   * 解析 CSV 文件为 K 线数据
   */
  async parseCSV(file: File): Promise<KLineData[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          try {
            const data = this.normalizeCSVData(results.data as Record<string, unknown>[]);
            resolve(data);
          } catch (err) {
            reject(err);
          }
        },
        error: (err: Error) => reject(err),
      });
    });
  }

  /**
   * 解析 CSV 文本内容为 K 线数据
   */
  parseCSVText(csvText: string): KLineData[] {
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
    return this.normalizeCSVData(result.data as Record<string, unknown>[]);
  }

  /**
   * 标准化 CSV 数据字段映射
   * 支持常见列名变体
   */
  private normalizeCSVData(rows: Record<string, unknown>[]): KLineData[] {
    if (rows.length === 0) return [];

    // 检测列名映射
    const firstRow = rows[0];
    const columns = Object.keys(firstRow);

    const dateCol = columns.find(c => /date|time|日期|时间/i.test(c)) ?? columns[0];
    const openCol = columns.find(c => /open|开盘/i.test(c)) ?? '';
    const highCol = columns.find(c => /high|最高/i.test(c)) ?? '';
    const lowCol = columns.find(c => /low|最低/i.test(c)) ?? '';
    const closeCol = columns.find(c => /close|收盘/i.test(c)) ?? '';
    const volumeCol = columns.find(c => /volume|vol|成交量/i.test(c)) ?? '';
    const turnoverCol = columns.find(c => /turnover|amount|成交额/i.test(c)) ?? '';

    return rows
      .filter(row => {
        const o = Number(row[openCol]);
        return !isNaN(o) && o > 0;
      })
      .map(row => {
        // 解析时间戳
        let timestamp: number;
        const dateVal = row[dateCol];
        if (typeof dateVal === 'number') {
          timestamp = dateVal > 1e12 ? dateVal : dateVal * 1000;
        } else {
          timestamp = new Date(String(dateVal)).getTime();
        }

        return {
          timestamp: isNaN(timestamp) ? Date.now() : timestamp,
          open: Number(row[openCol] ?? 0),
          high: Number(row[highCol] ?? 0),
          low: Number(row[lowCol] ?? 0),
          close: Number(row[closeCol] ?? 0),
          volume: Number(row[volumeCol] ?? 0),
          turnover: turnoverCol ? Number(row[turnoverCol] ?? 0) : undefined,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 生成模拟 K 线数据（用于测试和演示）
   */
  generateMockData(
    symbol: string,
    timeframe: Timeframe,
    count: number = 200,
  ): KLineData[] {
    const cacheKey = `mock_${symbol}_${timeframe}_${count}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // 根据周期确定每根K线的时间间隔（毫秒）
    const intervalMs = this.timeframeToMs(timeframe);
    const now = Date.now();
    const data: KLineData[] = [];

    let price = 10 + Math.random() * 90; // 初始价格 10-100
    let baseVolume = 1000000;

    for (let i = count - 1; i >= 0; i--) {
      const change = (Math.random() - 0.5) * price * 0.04; // ±4% 波动
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * Math.abs(change) * 0.5;
      const low = Math.min(open, close) - Math.random() * Math.abs(change) * 0.5;
      const volume = baseVolume * (0.5 + Math.random());

      data.push({
        timestamp: now - i * intervalMs,
        open: round4(open),
        high: round4(high),
        low: round4(low),
        close: round4(close),
        volume: Math.round(volume),
        turnover: Math.round(close * volume),
      });

      price = close;
      baseVolume = volume * (0.8 + Math.random() * 0.4);
    }

    this.cache.set(cacheKey, data);
    return data;
  }

  /**
   * 周期转毫秒
   */
  private timeframeToMs(tf: Timeframe): number {
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const map: Record<Timeframe, number> = {
      '1m': 1 * minute,
      '5m': 5 * minute,
      '15m': 15 * minute,
      '30m': 30 * minute,
      '1H': 1 * hour,
      '4H': 4 * hour,
      '1D': 1 * day,
      '1W': 7 * day,
      '1M': 30 * day,
    };
    return map[tf];
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}
