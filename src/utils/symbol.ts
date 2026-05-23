/**
 * 标的代码提取与标准化工具
 */

// 排除大写常用语，防止误判为美股标的
const EXCLUDED_WORDS = new Set([
  'TODO', 'NOTE', 'HTML', 'API', 'BUY', 'SELL', 'HOLD', 'LONG', 'SHORT', 'USD', 'CNY', 'EUR', 'GBP', 'THE', 'AND', 'FOR'
]);

/**
 * 从 Logseq block 内容或属性中提取标的代码
 *
 * @param content Block 的正文内容
 * @param properties Block 的属性对象
 * @returns 提取并标准化后的标的代码，未匹配到则返回 null
 */
export function extractSymbol(content: string, properties?: Record<string, unknown>): string | null {
  // 1. 优先从 Block 属性中提取
  if (properties) {
    const tradeSymbol = properties['trade/symbol'];
    if (tradeSymbol !== undefined && tradeSymbol !== null) {
      const tsStr = String(tradeSymbol).trim();
      if (tsStr) {
        return normalizeExtractedSymbol(tsStr);
      }
    }
    const symbol = properties['symbol'];
    if (symbol !== undefined && symbol !== null) {
      const sStr = String(symbol).trim();
      if (sStr) {
        return normalizeExtractedSymbol(sStr);
      }
    }
  }

  // 2. 从文本内容正则匹配
  if (!content) return null;

  // 加密货币正则: 优先匹配以 USDT 结尾的币种，支持可选的斜杠
  const cryptoRegex = /\b([A-Z]{2,10})(?:\/)?USDT\b/i;
  const cryptoMatch = content.match(cryptoRegex);
  if (cryptoMatch) {
    const base = cryptoMatch[1].toUpperCase();
    return `${base}/USDT`;
  }

  // A股正则: 6位数字
  const ashareRegex = /\b\d{6}\b/;
  const ashareMatch = content.match(ashareRegex);
  if (ashareMatch) {
    return ashareMatch[0];
  }

  // 美股正则: 2-5位全大写字母，排除黑名单常用词
  const usMatches = content.match(/\b[A-Z]{2,5}\b/g);
  if (usMatches) {
    for (const code of usMatches) {
      if (!EXCLUDED_WORDS.has(code)) {
        return code;
      }
    }
  }

  return null;
}

/**
 * 标准化标的代码，针对加密货币追加斜杠，其余统一转大写去空格
 */
function normalizeExtractedSymbol(symbol: string): string {
  const upper = symbol.toUpperCase().trim();
  const cryptoRegex = /^([A-Z]{2,10})(?:\/)?USDT$/;
  const match = upper.match(cryptoRegex);
  if (match) {
    return `${match[1]}/USDT`;
  }
  return upper;
}
