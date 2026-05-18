/**
 * 输入校验工具
 */

import type { TradeInput, ValidationResult } from '@/types/trade';

/**
 * 校验交易输入
 */
export function validateTrade(input: Partial<TradeInput>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.symbol?.trim()) {
    errors.symbol = '请输入标的代码';
  }

  if (!input.direction) {
    errors.direction = '请选择交易方向';
  } else if (!['long', 'short'].includes(input.direction)) {
    errors.direction = '无效的交易方向';
  }

  if (input.entryPrice == null || input.entryPrice <= 0) {
    errors.entryPrice = '请输入有效的入场价格';
  }

  if (input.exitPrice == null || input.exitPrice <= 0) {
    errors.exitPrice = '请输入有效的出场价格';
  }

  if (input.quantity == null || input.quantity <= 0 || !Number.isInteger(input.quantity)) {
    errors.quantity = '请输入有效的整数数量';
  }

  if (!input.entryTime?.trim()) {
    errors.entryTime = '请选择入场时间';
  }

  if (!input.exitTime?.trim()) {
    errors.exitTime = '请选择出场时间';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * 校验标的代码格式
 */
export function validateSymbol(symbol: string): boolean {
  if (!symbol?.trim()) return false;
  
  // A股：6位数字
  const aStock = /^\d{6}$/;
  // 美股：字母1-5位
  const usStock = /^[A-Za-z]{1,5}$/;
  // 港股：5位数字
  const hkStock = /^\d{5}$/;
  
  return aStock.test(symbol) || usStock.test(symbol) || hkStock.test(symbol);
}
