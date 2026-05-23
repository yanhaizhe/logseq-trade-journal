import { describe, it, expect } from 'vitest';
import { extractSymbol } from '../src/utils/symbol';

describe('extractSymbol', () => {
  describe('从属性中提取', () => {
    it('优先使用 trade/symbol 属性', () => {
      const properties = {
        'trade/symbol': '000002',
        'symbol': '000001',
      };
      expect(extractSymbol('some content', properties)).toBe('000002');
    });

    it('无 trade/symbol 时使用 symbol 属性', () => {
      const properties = {
        'symbol': 'AAPL',
      };
      expect(extractSymbol('some content', properties)).toBe('AAPL');
    });

    it('属性中的加密货币代码标准化', () => {
      const properties = {
        'symbol': 'btcusdt',
      };
      expect(extractSymbol('some content', properties)).toBe('BTC/USDT');
    });

    it('属性存在但为空值时退化到文本匹配', () => {
      const properties = {
        'symbol': '  ',
      };
      expect(extractSymbol('今天关注 000001 的走势', properties)).toBe('000001');
    });

    it('纯数字的属性值被正确提取并转换为字符串', () => {
      const properties = {
        'symbol': 600519,
      };
      expect(extractSymbol('some content', properties)).toBe('600519');
    });
  });

  describe('从文本正则匹配', () => {
    it('提取 A股 6 位数字代码', () => {
      expect(extractSymbol('今天买入了 600519 茅台')).toBe('600519');
    });

    it('提取美股 2-5 位大写字母代码', () => {
      expect(extractSymbol('特斯拉 TSLA 昨晚大涨')).toBe('TSLA');
    });

    it('提取加密货币代码并标准化为斜杠格式', () => {
      expect(extractSymbol('BTCUSDT 突破了历史新高')).toBe('BTC/USDT');
      expect(extractSymbol('关注 ETH/USDT 的支撑位')).toBe('ETH/USDT');
    });

    it('无匹配代码时返回 null', () => {
      expect(extractSymbol('今天天气不错')).toBe(null);
    });

    it('加密货币匹配优先级高于美股', () => {
      // BTCUSDT 中 BTC 属于 3 位大写字母，但由于它是加密货币，应该被整体提取并标准化为 BTC/USDT，而不是单独提取 BTC
      expect(extractSymbol('BTCUSDT is flying')).toBe('BTC/USDT');
    });

    it('排除常用的全大写英文单词以防止误匹配美股标的', () => {
      expect(extractSymbol('TODO: 分析苹果走势')).toBe(null);
      expect(extractSymbol('BUY AAPL')).toBe('AAPL');
      expect(extractSymbol('SELL TSLA')).toBe('TSLA');
    });
  });
});
