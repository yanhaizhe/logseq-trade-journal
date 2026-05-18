/**
 * 交易录入表单 —— 专业版
 * 包含：基本信息、风险管理、策略分析、交易后反思
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { TradeInput, TradeDirection, Emotion, TradeStyle, TimeFrame, MarketCondition } from '@/types/trade';
import { validateTrade } from '@/utils/validation';
import { calcPnL, estimateFee } from '@/utils/calculator';
import { formatMoney, formatPercent, todayStr, nowISO } from '@/utils/format';

export interface TradeFormProps {
  onSubmit: (trade: TradeInput) => void;
  onCancel?: () => void;
  initialData?: Partial<TradeInput>;
}

const defaultInput: TradeInput = {
  symbol: '',
  direction: 'long',
  entryPrice: 0,
  exitPrice: 0,
  quantity: 100,
  entryTime: nowISO(),
  exitTime: nowISO(),
  fee: 0,
  strategy: '',
  tags: [],
  emotion: 'neutral',
  notes: '',
  stopLoss: 0,
  takeProfit: 0,
  riskAmount: 0,
  tradeStyle: undefined,
  timeFrame: undefined,
  marketCondition: undefined,
  rationale: '',
  preTradePlan: '',
  lessons: '',
};

const emotionOptions: { value: Emotion; emoji: string; label: string }[] = [
  { value: 'confident', emoji: '😎', label: '自信' },
  { value: 'neutral', emoji: '😐', label: '平常' },
  { value: 'nervous', emoji: '😰', label: '紧张' },
  { value: 'fearful', emoji: '😨', label: '恐惧' },
  { value: 'greedy', emoji: '🤑', label: '贪婪' },
];

const strategyOptions = [
  '突破交易', '回调入场', '趋势跟踪', '反转交易',
  '日内短线', '波段操作', '网格交易', '动量交易',
  '均值回归', '事件驱动', '其他',
];

const styleOptions: { value: TradeStyle; label: string }[] = [
  { value: 'day', label: '日内' },
  { value: 'swing', label: '波段' },
  { value: 'position', label: '趋势' },
  { value: 'scalping', label: '超短' },
];

const timeframeOptions: { value: TimeFrame; label: string }[] = [
  { value: '1m', label: '1分' },
  { value: '5m', label: '5分' },
  { value: '15m', label: '15分' },
  { value: '30m', label: '30分' },
  { value: '1H', label: '1时' },
  { value: '4H', label: '4时' },
  { value: '1D', label: '日线' },
  { value: '1W', label: '周线' },
];

const conditionOptions: { value: MarketCondition; label: string; icon: string }[] = [
  { value: 'bullish', label: '多头', icon: '📈' },
  { value: 'bearish', label: '空头', icon: '📉' },
  { value: 'ranging', label: '震荡', icon: '↔️' },
  { value: 'volatile', label: '高波', icon: '🌊' },
];

const TradeForm: React.FC<TradeFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [form, setForm] = useState<TradeInput>({ ...defaultInput, ...initialData });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');
  const [section, setSection] = useState<'basic' | 'risk' | 'analysis' | 'review'>('basic');

  const updateField = useCallback(<K extends keyof TradeInput>(field: K, value: TradeInput[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  }, []);

  const pnlPreview = useMemo(() => {
    if (!form.entryPrice || !form.exitPrice || !form.quantity) return null;
    const fee = form.fee || (estimateFee(form.entryPrice, form.quantity, false) + estimateFee(form.exitPrice, form.quantity, true));
    return calcPnL({ ...form, fee });
  }, [form.entryPrice, form.exitPrice, form.quantity, form.direction, form.fee]);

  // 风险计算
  const riskCalc = useMemo(() => {
    if (!form.entryPrice || !form.stopLoss || !form.quantity) return null;
    const riskPerShare = Math.abs(form.entryPrice - form.stopLoss);
    const totalRisk = riskPerShare * form.quantity;
    const rrRatio = form.takeProfit && form.entryPrice
      ? Math.abs(form.takeProfit - form.entryPrice) / riskPerShare
      : 0;
    return { riskPerShare: riskPerShare.toFixed(2), totalRisk: totalRisk.toFixed(2), rrRatio: rrRatio > 0 ? rrRatio.toFixed(1) : '-' };
  }, [form.entryPrice, form.stopLoss, form.takeProfit, form.quantity]);

  const addTag = useCallback(() => {
    const tag = tagInput.trim();
    if (tag && !form.tags?.includes(tag)) {
      updateField('tags', [...(form.tags ?? []), tag]);
    }
    setTagInput('');
  }, [tagInput, form.tags, updateField]);

  const removeTag = useCallback((tag: string) => {
    updateField('tags', (form.tags ?? []).filter(t => t !== tag));
  }, [form.tags, updateField]);

  const handleSubmit = useCallback(() => {
    const validation = validateTrade(form);
    if (!validation.valid) { setErrors(validation.errors); return; }
    let final = { ...form };
    if (final.fee === 0) {
      final.fee = estimateFee(final.entryPrice, final.quantity, false) + estimateFee(final.exitPrice, final.quantity, true);
    }
    onSubmit(final);
  }, [form, onSubmit]);

  return (
    <div className="trade-form-v2">
      {/* 分区标签 */}
      <div className="trade-sections">
        <button className={`section-tab ${section === 'basic' ? 'active' : ''}`} onClick={() => setSection('basic')}>📋 基本</button>
        <button className={`section-tab ${section === 'risk' ? 'active' : ''}`} onClick={() => setSection('risk')}>⚖️ 风控</button>
        <button className={`section-tab ${section === 'analysis' ? 'active' : ''}`} onClick={() => setSection('analysis')}>📊 分析</button>
        <button className={`section-tab ${section === 'review' ? 'active' : ''}`} onClick={() => setSection('review')}>📝 反思</button>
      </div>

      {/* 盈亏预览（始终显示） */}
      {pnlPreview && (
        <div className={`pnl-bar ${pnlPreview.netPnL >= 0 ? 'positive' : 'negative'}`}>
          <span className="pnl-bar-label">盈亏</span>
          <span className="pnl-bar-value">{formatMoney(pnlPreview.netPnL)}</span>
          <span className="pnl-bar-pct">{formatPercent(pnlPreview.profitPct)}</span>
          <span className="pnl-bar-fee">手续费: {formatMoney(pnlPreview.estimatedFee)}</span>
        </div>
      )}

      {/* Section 1: 基本 */}
      {section === 'basic' && (
        <div className="section-content">
          <div className="form-row">
            <div className="form-group flex-1">
              <label>标的代码</label>
              <input type="text" className={`form-input ${errors.symbol ? 'error' : ''}`}
                value={form.symbol} onChange={e => updateField('symbol', e.target.value.toUpperCase())} placeholder="000001 / AAPL / BTCUSDT" />
              {errors.symbol && <span className="error-text">{errors.symbol}</span>}
            </div>
            <div className="form-group">
              <label>方向</label>
              <div className="direction-toggle">
                <button className={`dir-btn long ${form.direction === 'long' ? 'active' : ''}`} onClick={() => updateField('direction', 'long')}>📈 做多</button>
                <button className={`dir-btn short ${form.direction === 'short' ? 'active' : ''}`} onClick={() => updateField('direction', 'short')}>📉 做空</button>
              </div>
            </div>
          </div>

          <div className="form-row form-row-3">
            <div className="form-group"><label>入场价</label>
              <input type="number" className={`form-input ${errors.entryPrice ? 'error' : ''}`} value={form.entryPrice || ''} onChange={e => updateField('entryPrice', Number(e.target.value))} step="0.01" min="0" /></div>
            <div className="form-group"><label>出场价</label>
              <input type="number" className={`form-input ${errors.exitPrice ? 'error' : ''}`} value={form.exitPrice || ''} onChange={e => updateField('exitPrice', Number(e.target.value))} step="0.01" min="0" /></div>
            <div className="form-group"><label>数量(股/张)</label>
              <input type="number" className={`form-input ${errors.quantity ? 'error' : ''}`} value={form.quantity || ''} onChange={e => updateField('quantity', Number(e.target.value))} step="100" min="0" /></div>
          </div>

          <div className="form-row form-row-3">
            <div className="form-group"><label>手续费</label>
              <input type="number" className="form-input" value={form.fee || ''} onChange={e => updateField('fee', Number(e.target.value))} step="0.01" min="0" placeholder="自动估算" /></div>
            <div className="form-group"><label>交易风格</label>
              <div className="chip-group">{styleOptions.map(o => <button key={o.value} className={`chip ${form.tradeStyle === o.value ? 'active' : ''}`} onClick={() => updateField('tradeStyle', o.value)}>{o.label}</button>)}</div></div>
            <div className="form-group"><label>操作周期</label>
              <select className="form-input" value={form.timeFrame ?? ''} onChange={e => updateField('timeFrame', e.target.value as TimeFrame)}>
                <option value="">选择</option>{timeframeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          </div>
        </div>
      )}

      {/* Section 2: 风控 */}
      {section === 'risk' && (
        <div className="section-content">
          <div className="form-row form-row-3">
            <div className="form-group"><label>止损价</label>
              <input type="number" className="form-input" value={form.stopLoss || ''} onChange={e => updateField('stopLoss', Number(e.target.value))} step="0.01" min="0" /></div>
            <div className="form-group"><label>止盈价</label>
              <input type="number" className="form-input" value={form.takeProfit || ''} onChange={e => updateField('takeProfit', Number(e.target.value))} step="0.01" min="0" /></div>
            <div className="form-group"><label>风险金额(¥)</label>
              <input type="number" className="form-input" value={form.riskAmount || ''} onChange={e => updateField('riskAmount', Number(e.target.value))} step="1" min="0" /></div>
          </div>
          {riskCalc && (
            <div className="risk-card">
              <div className="risk-row"><span>每股风险</span><span className="risk-val">¥{riskCalc.riskPerShare}</span></div>
              <div className="risk-row"><span>总风险</span><span className="risk-val red">¥{riskCalc.totalRisk}</span></div>
              <div className="risk-row"><span>盈亏比 (R:R)</span><span className="risk-val green">1:{riskCalc.rrRatio}</span></div>
            </div>
          )}
        </div>
      )}

      {/* Section 3: 分析 */}
      {section === 'analysis' && (
        <div className="section-content">
          <div className="form-row form-row-2">
            <div className="form-group"><label>交易策略</label>
              <select className="form-input" value={form.strategy ?? ''} onChange={e => updateField('strategy', e.target.value)}>
                <option value="">选择策略</option>{strategyOptions.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="form-group"><label>市场环境</label>
              <div className="chip-group">{conditionOptions.map(o => <button key={o.value} className={`chip ${form.marketCondition === o.value ? 'active' : ''}`} onClick={() => updateField('marketCondition', o.value)}>{o.icon} {o.label}</button>)}</div></div>
          </div>
          <div className="form-group"><label>交易情绪</label>
            <div className="emotion-picker">{emotionOptions.map(opt => <button key={opt.value} className={`emotion-btn ${form.emotion === opt.value ? 'active' : ''}`} onClick={() => updateField('emotion', opt.value)} title={opt.label}>{opt.emoji}</button>)}</div></div>
          <div className="form-group"><label>标签</label>
            <div className="tag-input-wrapper">
              <div className="tags-display">{form.tags?.map(tag => <span key={tag} className="tag-badge">{tag}<button className="tag-remove" onClick={() => removeTag(tag)}>×</button></span>)}</div>
              <input type="text" className="form-input" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="输入标签后回车" /></div></div>
          <div className="form-group"><label>交易理由</label>
            <textarea className="form-textarea" value={form.rationale ?? ''} onChange={e => updateField('rationale', e.target.value)} placeholder="为什么做这笔交易？技术面/基本面/消息面..." rows={2} /></div>
          <div className="form-group"><label>交易计划</label>
            <textarea className="form-textarea" value={form.preTradePlan ?? ''} onChange={e => updateField('preTradePlan', e.target.value)} placeholder="入场条件、仓位管理、出场逻辑..." rows={2} /></div>
        </div>
      )}

      {/* Section 4: 反思 */}
      {section === 'review' && (
        <div className="section-content">
          <div className="form-group"><label>交易笔记</label>
            <textarea className="form-textarea" value={form.notes ?? ''} onChange={e => updateField('notes', e.target.value)} placeholder="记录交易过程的思考、执行情况..." rows={3} /></div>
          <div className="form-group"><label>经验教训</label>
            <textarea className="form-textarea" value={form.lessons ?? ''} onChange={e => updateField('lessons', e.target.value)} placeholder="从这笔交易中学到了什么？下次如何改进？" rows={3} /></div>
        </div>
      )}

      {/* 错误 */}
      {Object.keys(errors).length > 0 && <div className="form-errors">{Object.values(errors).map((e, i) => <p key={i}>⚠ {e}</p>)}</div>}

      {/* 按钮 */}
      <div className="trade-form-footer">
        {onCancel && <button className="btn btn-cancel" onClick={onCancel}>取消</button>}
        <button className="btn btn-submit" onClick={handleSubmit}>保存交易记录</button>
      </div>
    </div>
  );
};

export default TradeForm;
