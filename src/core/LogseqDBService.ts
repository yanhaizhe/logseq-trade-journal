/**
 * Logseq DB 操作封装层 v2
 * - 修复 createJournalPage 调用
 * - 新规：每笔交易创建独立页面 {symbol} {YYYY-MM-DD HH:mm}
 */

import type { TradeRecord } from '@/types/trade';
import dayjs from 'dayjs';

const P = 'trade/';

export class LogseqDBService {

  private str(v: unknown, defaultValue: string = ''): string {
    if (v == null || v === undefined) return defaultValue;
    if (Array.isArray(v)) return v.filter(Boolean).join(', ');
    if (typeof v === 'number') return isNaN(v) ? defaultValue : String(v);
    return String(v);
  }

  private tradeToProperties(trade: TradeRecord): Record<string, string> {
    return {
      [`${P}symbol`]:       this.str(trade.symbol),
      [`${P}direction`]:    this.str(trade.direction),
      [`${P}entry-price`]:  this.str(trade.entryPrice),
      [`${P}exit-price`]:   this.str(trade.exitPrice),
      [`${P}quantity`]:     this.str(trade.quantity),
      [`${P}entry-time`]:   this.str(trade.entryTime),
      [`${P}exit-time`]:    this.str(trade.exitTime),
      [`${P}fee`]:          this.str(trade.fee),
      [`${P}profit`]:       this.str(trade.profit),
      [`${P}profit-pct`]:   this.str(trade.profitPct),
      [`${P}net-pnl`]:      this.str(trade.netPnL),
      [`${P}strategy`]:     this.str(trade.strategy),
      [`${P}tags`]:         this.str(trade.tags),
      [`${P}emotion`]:      this.str(trade.emotion),
      [`${P}notes`]:        this.str(trade.notes),
      [`${P}stop-loss`]:    this.str(trade.stopLoss, '-'),
      [`${P}take-profit`]:  this.str(trade.takeProfit, '-'),
      [`${P}risk-amount`]:  this.str(trade.riskAmount, '-'),
      [`${P}trade-style`]:  this.str(trade.tradeStyle),
      [`${P}timeframe`]:    this.str(trade.timeFrame),
      [`${P}market-cond`]:  this.str(trade.marketCondition),
      [`${P}rationale`]:    this.str(trade.rationale),
      [`${P}pre-plan`]:     this.str(trade.preTradePlan),
      [`${P}lessons`]:      this.str(trade.lessons),
    };
  }

  private propertiesToTrade(id: string, props: Record<string, unknown>): TradeRecord | null {
    const getStr = (k: string) => String(props[`${P}${k}`] ?? '');
    const getNum = (k: string) => {
      const v = getStr(k);
      return v && v !== '-' ? parseFloat(v) || 0 : 0;
    };
    const tags = getStr('tags').split(',').map(s => s.trim()).filter(Boolean);

    if (!getStr('symbol')) return null;

    return {
      id,
      symbol: getStr('symbol'),
      direction: (getStr('direction') || 'long') as 'long' | 'short',
      entryPrice: getNum('entry-price'),
      exitPrice: getNum('exit-price'),
      quantity: getNum('quantity') || 0,
      entryTime: getStr('entry-time'),
      exitTime: getStr('exit-time'),
      fee: getNum('fee'),
      profit: getNum('profit'),
      profitPct: getNum('profit-pct'),
      netPnL: getNum('net-pnl'),
      strategy: getStr('strategy') || undefined,
      tags: tags.length > 0 ? tags : undefined,
      emotion: (getStr('emotion') || undefined) as TradeRecord['emotion'],
      patterns: [],
      notes: getStr('notes') || undefined,
      stopLoss: getStr('stop-loss') && getStr('stop-loss') !== '-' ? getNum('stop-loss') : undefined,
      takeProfit: getStr('take-profit') && getStr('take-profit') !== '-' ? getNum('take-profit') : undefined,
      riskAmount: getStr('risk-amount') && getStr('risk-amount') !== '-' ? getNum('risk-amount') : undefined,
      tradeStyle: (getStr('trade-style') || undefined) as TradeRecord['tradeStyle'],
      timeFrame: (getStr('timeframe') || undefined) as TradeRecord['timeFrame'],
      marketCondition: (getStr('market-cond') || undefined) as TradeRecord['marketCondition'],
      rationale: getStr('rationale') || undefined,
      preTradePlan: getStr('pre-plan') || undefined,
      lessons: getStr('lessons') || undefined,
      createdAt: '',
    };
  }

  /** 生成交易页面名称: {symbol} {YYYY-MM-DD HH:mm} */
  private tradePageName(trade: TradeRecord): string {
    const sym = trade.symbol.toUpperCase().trim();
    const time = trade.entryTime
      ? dayjs(trade.entryTime).format('YYYY-MM-DD HH:mm')
      : dayjs().format('YYYY-MM-DD HH:mm');
    return `${sym} ${time}`;
  }

  // ===== CRUD =====

  async insertTrade(trade: TradeRecord): Promise<string> {
    const dateStr = dayjs().format('YYYY-MM-DD');
    const pageName = this.tradePageName(trade);

    // Step 1: 创建交易页面（标的+时间）
    let tradePage = await logseq.Editor.getPage(pageName);
    if (!tradePage) {
      tradePage = await logseq.Editor.createPage(pageName, {}, { journal: false });
    }
    if (!tradePage) {
      // fallback: 创建不带 journal 的页面
      tradePage = await logseq.Editor.createPage(pageName);
    }
    if (!tradePage) {
      throw new Error(`无法创建交易页面: ${pageName}`);
    }

    // Step 2: 在交易页面插入交易记录 block
    const directionLabel = trade.direction === 'long' ? '做多' : '做空';
    const pnlSign = trade.profit >= 0 ? '+' : '';
    const content = `## ${directionLabel} ${trade.symbol} | ${pnlSign}${trade.profit.toFixed(2)} (${pnlSign}${trade.profitPct.toFixed(2)}%)`;

    const block = await logseq.Editor.insertBlock(tradePage.uuid, content, {
      properties: this.tradeToProperties(trade) as Record<string, unknown>,
    });

    if (!block) throw new Error('交易记录插入失败');

    // Step 3: 在当日的 journal 页面上插入引用链接
    let journalPage = await logseq.Editor.getPage(dateStr);
    if (!journalPage) {
      journalPage = await logseq.Editor.createJournalPage(dateStr);
    }
    if (journalPage) {
      await logseq.Editor.insertBlock(
        journalPage.uuid,
        `交易: [[${pageName}]] | ${directionLabel} ${trade.symbol} ${pnlSign}${trade.profit.toFixed(2)}`,
      );
    }

    // Step 4: 确保标的页面存在并关联
    await this.ensureSymbolPage(trade.symbol, tradePage.name);

    return block.uuid;
  }

  async getTradesByDate(date: string): Promise<TradeRecord[]> {
    const page = await logseq.Editor.getPage(date);
    if (!page) return [];
    const blocks = await logseq.Editor.getPageBlocksTree(page.uuid);
    if (!blocks) return [];
    return this.extractTrades(blocks);
  }

  async getTradesBySymbol(symbol: string): Promise<TradeRecord[]> {
    const refs = await logseq.Editor.getPageLinkedReferences(symbol);
    if (!refs) return [];
    const trades: TradeRecord[] = [];
    for (const [_, blocks] of refs) {
      trades.push(...this.extractTrades(blocks as any[]));
    }
    return trades;
  }

  async getAllTrades(): Promise<TradeRecord[]> {
    const pages = await logseq.Editor.getAllPages();
    if (!pages) return [];
    const trades: TradeRecord[] = [];
    for (const p of pages) {
      if (p['journal?']) {
        const blocks = await logseq.Editor.getPageBlocksTree(p.uuid);
        if (blocks) trades.push(...this.extractTrades(blocks));
      }
    }
    return trades;
  }

  async updateTrade(id: string, updates: Partial<TradeRecord>): Promise<void> {
    const block = await logseq.Editor.getBlock(id);
    if (!block) throw new Error('Block not found');
    const existing = this.propertiesToTrade(id, (block.properties ?? {}) as Record<string, unknown>);
    if (!existing) throw new Error('Not a trade record');

    const merged = { ...existing, ...updates };
    const directionLabel = merged.direction === 'long' ? '做多' : '做空';
    const pnlSign = merged.profit >= 0 ? '+' : '';
    const content = `${directionLabel} [[${merged.symbol}]] | ${pnlSign}${merged.profit.toFixed(2)} (${pnlSign}${merged.profitPct.toFixed(2)}%)`;

    await logseq.Editor.updateBlock(id, content, {
      properties: this.tradeToProperties(merged) as Record<string, unknown>,
    });
  }

  async deleteTrade(id: string): Promise<void> {
    await logseq.Editor.removeBlock(id);
  }

  async ensureSymbolPage(symbol: string, tradePageName?: string): Promise<string> {
    let page = await logseq.Editor.getPage(symbol);
    if (!page) {
      page = await logseq.Editor.createPage(symbol);
    }
    if (page && tradePageName) {
      // 在标的页面上插入交易引用
      await logseq.Editor.insertBlock(page.uuid, `[[${tradePageName}]]`, {
        sibling: false,
      });
    }
    return page?.uuid ?? '';
  }

  async insertReviewTemplate(date: string, stats: {
    totalTrades: number; winningTrades: number; losingTrades: number;
    winRate: number; totalPnL: number; totalFee: number; netPnL: number;
  }): Promise<void> {
    let page = await logseq.Editor.getPage(date);
    if (!page) {
      page = await logseq.Editor.createJournalPage(date);
    }
    if (!page) return;

    const pnlSign = stats.netPnL >= 0 ? '+' : '';
    const template = `# ${date} 交易复盘

## 📊 概览
- **总交易**: ${stats.totalTrades} 笔 | **胜**: ${stats.winningTrades} | **负**: ${stats.losingTrades}
- **胜率**: ${stats.winRate.toFixed(1)}%
- **总盈亏**: ${pnlSign}${stats.totalPnL.toFixed(2)}
- **手续费**: ${stats.totalFee.toFixed(2)}
- **净盈亏**: ${pnlSign}${stats.netPnL.toFixed(2)}

## 📝 逐笔回顾

## 💡 经验教训
- 今日最大收获：
- 需要改进：

## 📅 明日计划
- 关注标的：
- 策略调整：
`;
    await logseq.Editor.insertBlock(page.uuid, template);
  }

  private extractTrades(blocks: any[]): TradeRecord[] {
    const trades: TradeRecord[] = [];
    const walk = (list: any[]) => {
      for (const b of list) {
        if (b.properties?.[`${P}symbol`]) {
          const t = this.propertiesToTrade(b.uuid, b.properties);
          if (t) trades.push(t);
        }
        if (b.children?.length) {
          const children = Array.isArray(b.children[0])
            ? b.children.map(([, b2]: [string, any]) => b2)
            : b.children;
          walk(children);
        }
      }
    };
    walk(blocks);
    return trades;
  }
}
