import React, { useState, useEffect } from 'react';
import type { TradeLog } from '@/types/trade';

interface TradingNotesProps {
  currentSymbol: string;
  currentPeriod: string;
  currentPrice: number;
  onSelectSymbol: (symbol: string) => void;
}

const PRESET_PATTERNS = [
  '双底/双顶',
  '头肩底/头肩顶',
  '看涨吞没/看跌吞没',
  'Pinbar 锤子线/流星线',
  'BOS 结构破坏',
  '流动性扫荡',
  'S/R 支撑阻力互换',
  'OB 订单块/需求区',
  'VCP 波动紧缩'
];

const PRESET_PSYCHOLOGY = [
  '冷静耐心',
  '完全遵守纪律',
  'FOMO/追高',
  '报复交易',
  '恐惧缩手',
  '贪婪扛单',
  '提前平仓'
];

export const TradingNotes: React.FC<TradingNotesProps> = ({
  currentSymbol,
  currentPeriod,
  currentPrice,
  onSelectSymbol,
}) => {
  const [logs, setLogs] = useState<TradeLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'observe' | 'plan' | 'active' | 'closed'>('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  // Form states
  const [fundamentalSector, setFundamentalSector] = useState('');
  const [fundamentalCatalyst, setFundamentalCatalyst] = useState('');
  const [technicalSelection, setTechnicalSelection] = useState('多头排列趋势');
  const [selectionReason, setSelectionReason] = useState('');

  // Plan states
  const [planEntry, setPlanEntry] = useState(0);
  const [planSL, setPlanSL] = useState(0);
  const [planTP, setPlanTP] = useState(0);
  const [totalCapital, setTotalCapital] = useState(100000);
  const [riskPercent, setRiskPercent] = useState(1);

  // Technical checks
  const [trendAligned, setTrendAligned] = useState(true);
  const [levelConfirmed, setLevelConfirmed] = useState(true);
  const [signalConfirmed, setSignalConfirmed] = useState(true);
  const [ratioOk, setRatioOk] = useState(true);
  const [sizingOk, setSizingOk] = useState(true);

  const [techStructure, setTechStructure] = useState('');
  const [techLevel, setTechLevel] = useState('');
  const [techTrigger, setTechTrigger] = useState('');
  const [techVolumeFlow, setTechVolumeFlow] = useState('');

  // Active / Management states
  const [actualEntry, setActualEntry] = useState(0);
  const [stopUpdates, setStopUpdates] = useState('');
  const [scaleActions, setScaleActions] = useState('');

  // Exit & Review states
  const [actualExit, setActualExit] = useState(0);
  const [pnl, setPnl] = useState(0);
  const [exitReason, setExitReason] = useState('触及计划止盈');
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);
  const [selectedPsych, setSelectedPsych] = useState<string[]>([]);
  const [disciplineRating, setDisciplineRating] = useState(5);
  const [reviewNotes, setReviewNotes] = useState('');
  const [syncToStudy, setSyncToStudy] = useState(true);

  const tm = typeof window !== 'undefined' ? (window as any).__tradeManager : null;

  // Load logs
  useEffect(() => {
    const loadLogs = async () => {
      if (tm) {
        try {
          const dbLogs = await tm.getAllTradeLogs();
          setLogs(dbLogs);
          return;
        } catch (e) {
          console.error('Failed to load trade logs from Logseq DB:', e);
        }
      }

      const saved = localStorage.getItem('tj_trade_logs');
      if (saved) {
        try {
          setLogs(JSON.parse(saved));
        } catch {}
      }
    };

    loadLogs();
  }, [tm]);

  const saveLogsToStorage = (updated: TradeLog[]) => {
    setLogs(updated);
    if (!tm) {
      localStorage.setItem('tj_trade_logs', JSON.stringify(updated));
    }
  };

  const handleCreateObserve = async () => {
    let newLog: TradeLog = {
      id: Date.now().toString(),
      status: 'observe',
      symbol: currentSymbol,
      period: currentPeriod,
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString().slice(0, 5),
      selectionReason,
      fundamentalInfo: { sector: fundamentalSector, catalyst: fundamentalCatalyst },
      technicalSelection,
      planPrice: { entry: currentPrice, sl: currentPrice * 0.95, tp: currentPrice * 1.1, ratio: 2 },
      checklist: { trendAligned: true, levelConfirmed: true, signalConfirmed: true, ratioOk: true, sizingOk: true },
      technicalAnalysis: { structure: '', level: '', trigger: '', volumeFlow: '' },
      execution: { actualEntry: currentPrice, riskPercent: 1, totalCapital: 100000, suggestedSize: 0 },
      management: { stopUpdates: '', scaleActions: '' },
      exit: { actualExit: 0, pnl: 0, rValue: 0, reason: '' },
      review: { patternTags: [], disciplineRating: 5, psychologyTags: [], reviewNotes: '', syncToStudy: true }
    };

    if (tm) {
      try {
        const blockId = await tm.insertTradeLog(newLog);
        newLog.id = blockId;
      } catch (e) {
        console.error('Failed to insert trade log to Logseq DB:', e);
      }
    }

    saveLogsToStorage([newLog, ...logs]);
    resetForm();
    setShowNewForm(false);
  };

  const resetForm = () => {
    setFundamentalSector('');
    setFundamentalCatalyst('');
    setTechnicalSelection('多头排列趋势');
    setSelectionReason('');
    setPlanEntry(0);
    setPlanSL(0);
    setPlanTP(0);
    setActualEntry(0);
    setActualExit(0);
    setPnl(0);
    setSelectedPatterns([]);
    setSelectedPsych([]);
    setDisciplineRating(5);
    setReviewNotes('');
    setStopUpdates('');
    setScaleActions('');
    setTechStructure('');
    setTechLevel('');
    setTechTrigger('');
    setTechVolumeFlow('');
  };

  const handleUpdateToPlan = (id: string) => {
    const log = logs.find(l => l.id === id);
    if (!log) return;
    setEditingLogId(id);
    // Preset fields
    setPlanEntry(log.planPrice.entry || currentPrice);
    setPlanSL(log.planPrice.sl || currentPrice * 0.95);
    setPlanTP(log.planPrice.tp || currentPrice * 1.1);
  };

  const handleSavePlan = async (id: string) => {
    const entryDiff = planEntry - planSL;
    const ratio = entryDiff > 0 ? (planTP - planEntry) / entryDiff : 0;

    const logToUpdate = logs.find(l => l.id === id);
    if (!logToUpdate) return;

    const newLog: TradeLog = {
      ...logToUpdate,
      status: 'plan' as const,
      planPrice: { entry: planEntry, sl: planSL, tp: planTP, ratio },
      checklist: { trendAligned, levelConfirmed, signalConfirmed, ratioOk, sizingOk },
      technicalAnalysis: {
        structure: techStructure,
        level: techLevel,
        trigger: techTrigger,
        volumeFlow: techVolumeFlow
      },
      execution: {
        ...logToUpdate.execution,
        riskPercent,
        totalCapital,
        suggestedSize: entryDiff > 0 ? (totalCapital * (riskPercent / 100)) / entryDiff : 0
      }
    };

    if (tm) {
      try {
        await tm.updateTradeLog(id, newLog);
      } catch (e) {
        console.error('Failed to update trade log in Logseq DB:', e);
      }
    }

    const updated = logs.map(log => log.id === id ? newLog : log);
    saveLogsToStorage(updated);
    setEditingLogId(null);
    resetForm();
  };

  const handleActivatePosition = (id: string) => {
    const log = logs.find(l => l.id === id);
    if (!log) return;
    setEditingLogId(id);
    setActualEntry(log.planPrice.entry);
  };

  const handleSaveActive = async (id: string) => {
    const logToUpdate = logs.find(l => l.id === id);
    if (!logToUpdate) return;

    const newLog: TradeLog = {
      ...logToUpdate,
      status: 'active' as const,
      execution: {
        ...logToUpdate.execution,
        actualEntry: actualEntry
      },
      management: {
        stopUpdates,
        scaleActions
      }
    };

    if (tm) {
      try {
        await tm.updateTradeLog(id, newLog);
      } catch (e) {
        console.error('Failed to update active trade log in Logseq DB:', e);
      }
    }

    const updated = logs.map(log => log.id === id ? newLog : log);
    saveLogsToStorage(updated);
    setEditingLogId(null);
    resetForm();
  };

  const handleClosePosition = (id: string) => {
    const log = logs.find(l => l.id === id);
    if (!log) return;
    setEditingLogId(id);
    setActualExit(currentPrice);
  };

  const handleSaveClosed = async (id: string) => {
    const log = logs.find(l => l.id === id);
    if (!log) return;

    const actualEnt = log.execution.actualEntry || log.planPrice.entry;
    const planStop = log.planPrice.sl;
    const riskDiff = Math.abs(actualEnt - planStop);
    const rVal = riskDiff > 0 ? (actualExit - actualEnt) / riskDiff : 0;

    const newLog: TradeLog = {
      ...log,
      status: 'closed' as const,
      exit: {
        actualExit,
        pnl,
        rValue: rVal,
        reason: exitReason
      },
      review: {
        patternTags: selectedPatterns,
        disciplineRating,
        psychologyTags: selectedPsych,
        reviewNotes,
        syncToStudy
      }
    };

    if (tm) {
      try {
        await tm.updateTradeLog(id, newLog);
      } catch (e) {
        console.error('Failed to update closed trade log in Logseq DB:', e);
      }
    }

    const updated = logs.map(l => l.id === id ? newLog : l);
    saveLogsToStorage(updated);

    // Sync to study collections if checked
    if (syncToStudy) {
      const collectionItem = {
        symbol: log.symbol,
        name: `${log.symbol} ${selectedPatterns.join('/') || '交易案例'}`,
        period: log.period,
        date: new Date().toLocaleDateString(),
        note: `实盘平仓：${exitReason}。实际R值: ${rVal.toFixed(2)}R。复盘反思: ${reviewNotes}`
      };
      const savedCollections = localStorage.getItem('tj_my_collections');
      let collections = [];
      if (savedCollections) {
        try { collections = JSON.parse(savedCollections); } catch {}
      }
      collections = [collectionItem, ...collections];
      localStorage.setItem('tj_my_collections', JSON.stringify(collections));
    }

    setEditingLogId(null);
    resetForm();
  };

  const handleDeleteLog = async (id: string) => {
    if (window.confirm('确定要删除这条交易记录吗？')) {
      if (tm) {
        try {
          await tm.deleteTradeLog(id);
        } catch (e) {
          console.error('Failed to delete trade log from Logseq DB:', e);
        }
      }
      const updated = logs.filter(l => l.id !== id);
      saveLogsToStorage(updated);
    }
  };

  // Performance calculations
  const closedLogs = logs.filter(l => l.status === 'closed');
  const winCount = closedLogs.filter(l => l.exit.rValue > 0).length;
  const winRate = closedLogs.length > 0 ? (winCount / closedLogs.length) * 100 : 0;
  const totalR = closedLogs.reduce((acc, l) => acc + l.exit.rValue, 0);
  const expectancy = closedLogs.length > 0 ? totalR / closedLogs.length : 0;

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.status === filter;
  });

  return (
    <div className="tj-trading-notes">
      {/* 绩效小看板 */}
      <div className="performance-banner">
        <div className="banner-item">
          <span className="label">已结清</span>
          <span className="value">{closedLogs.length} 笔</span>
        </div>
        <div className="banner-item">
          <span className="label">系统期望值</span>
          <span className={`value ${expectancy >= 0 ? 'up' : 'down'}`}>
            {expectancy.toFixed(2)} R
          </span>
        </div>
        <div className="banner-item">
          <span className="label">交易胜率</span>
          <span className="value">{winRate.toFixed(1)}%</span>
        </div>
      </div>

      {/* 头部控制器 */}
      <div className="notes-controls">
        {!showNewForm && !editingLogId && (
          <button className="tj-add-btn" onClick={() => setShowNewForm(true)}>
            + 新建选股观察/计划
          </button>
        )}
        <div className="filter-select">
          <select value={filter} onChange={(e: any) => setFilter(e.target.value)}>
            <option value="all">🔍 显示全部记录</option>
            <option value="observe">🔭 1. 选股观察</option>
            <option value="plan">📐 2. 交易计划</option>
            <option value="active">📈 3. 持仓管理</option>
            <option value="closed">🏁 4. 已平仓复盘</option>
          </select>
        </div>
      </div>

      {/* 新建选股观察表单 */}
      {showNewForm && (
        <div className="new-observe-form">
          <h4>新建标的筛选观察</h4>
          <div className="form-group">
            <span className="info-badge">自动绑定: {currentSymbol} ({currentPeriod}) @ {currentPrice}</span>
          </div>
          <div className="form-group">
            <label>概念/板块行业</label>
            <input
              type="text"
              placeholder="例如: 半导体设备、AI大模型、跨境电商"
              value={fundamentalSector}
              onChange={(e) => setFundamentalSector(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>核心基本面/题材利好</label>
            <textarea
              placeholder="例如: 季度业绩超预期50%，产品开始放量..."
              value={fundamentalCatalyst}
              onChange={(e) => setFundamentalCatalyst(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>技术面初筛状态</label>
            <select value={technicalSelection} onChange={(e) => setTechnicalSelection(e.target.value)}>
              <option value="多头排列趋势">多头排列趋势 (二阶段均线)</option>
              <option value="周线级别底突破">周线级别底部突破</option>
              <option value="波动率紧缩收敛">波动率紧缩收敛 (VCP)</option>
              <option value="回踩关键成交量支撑">回踩密集筹码支撑</option>
              <option value="流动性扫荡结构破坏">流动性扫荡并破坏结构</option>
            </select>
          </div>
          <div className="form-group">
            <label>选股核心理由 (必填)</label>
            <textarea
              placeholder="请输入您选中该标的进入池子的核心理由..."
              required
              value={selectionReason}
              onChange={(e) => setSelectionReason(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button className="cancel-btn" onClick={() => setShowNewForm(false)}>取消</button>
            <button className="confirm-btn" onClick={handleCreateObserve} disabled={!selectionReason.trim()}>
              保存至观察池
            </button>
          </div>
        </div>
      )}

      {/* 列表或编辑表单 */}
      <div className="logs-timeline">
        {filteredLogs.length === 0 && !showNewForm && (
          <div className="timeline-empty">暂无该分类的交易日志</div>
        )}

        {filteredLogs.map((log) => {
          const isEditing = editingLogId === log.id;

          if (isEditing) {
            // RENDER EDIT PANEL ACCORDING TO CURRENT STATUS
            return (
              <div key={log.id} className="edit-log-panel card">
                {log.status === 'observe' && (
                  <>
                    <h4>制订 📐 交易计划: {log.symbol}</h4>
                    <div className="form-group row">
                      <div>
                        <label>计划买入/入场价</label>
                        <input type="number" step="any" value={planEntry} onChange={(e) => setPlanEntry(Number(e.target.value))} />
                      </div>
                      <div>
                        <label>计划技术防守止损</label>
                        <input type="number" step="any" value={planSL} onChange={(e) => setPlanSL(Number(e.target.value))} />
                      </div>
                      <div>
                        <label>计划目标止盈</label>
                        <input type="number" step="any" value={planTP} onChange={(e) => setPlanTP(Number(e.target.value))} />
                      </div>
                    </div>

                    <div className="calculator-box">
                      <h5>📊 风控与建议仓位计算器</h5>
                      <div className="row">
                        <div>
                          <label>总资金 (元/USD)</label>
                          <input type="number" value={totalCapital} onChange={(e) => setTotalCapital(Number(e.target.value))} />
                        </div>
                        <div>
                          <label>单笔风险比例 (%)</label>
                          <input type="number" step="0.1" value={riskPercent} onChange={(e) => setRiskPercent(Number(e.target.value))} />
                        </div>
                      </div>
                      <div className="calc-result">
                        <div>建议仓位数量: <b>{planEntry > planSL ? ((totalCapital * (riskPercent / 100)) / (planEntry - planSL)).toFixed(0) : 0}</b></div>
                        <div>预设盈亏比: <b className="up">{planEntry > planSL ? ((planTP - planEntry) / (planEntry - planSL)).toFixed(2) : 0} R</b></div>
                      </div>
                    </div>

                    <div className="checklist-box">
                      <h5>🛡️ 交易系统核心要素确认</h5>
                      <label><input type="checkbox" checked={trendAligned} onChange={(e) => setTrendAligned(e.target.checked)} /> 趋势顺向 (多时区对齐)</label>
                      <label><input type="checkbox" checked={levelConfirmed} onChange={(e) => setLevelConfirmed(e.target.checked)} /> 处于关键支撑阻力区 (S/R, OTE)</label>
                      <label><input type="checkbox" checked={signalConfirmed} onChange={(e) => setSignalConfirmed(e.target.checked)} /> 触发K线形态/指标金叉确认</label>
                      <label><input type="checkbox" checked={ratioOk} onChange={(e) => setRatioOk(e.target.checked)} /> 盈亏比是否符合 1:2 以上</label>
                      <label><input type="checkbox" checked={sizingOk} onChange={(e) => setSizingOk(e.target.checked)} /> 仓位大小符合单一风险限制</label>
                    </div>

                    <div className="form-group">
                      <label>技术分析细节记录 (选填)</label>
                      <input type="text" placeholder="市场结构 BOS 细节" value={techStructure} onChange={(e) => setTechStructure(e.target.value)} />
                      <input type="text" placeholder="关键支撑阻力位置特征" value={techLevel} onChange={(e) => setTechLevel(e.target.value)} />
                      <input type="text" placeholder="入场K线/触发源" value={techTrigger} onChange={(e) => setTechTrigger(e.target.value)} />
                      <input type="text" placeholder="量能配合度特征" value={techVolumeFlow} onChange={(e) => setTechVolumeFlow(e.target.value)} />
                    </div>

                    <div className="form-actions">
                      <button className="cancel-btn" onClick={() => setEditingLogId(null)}>取消</button>
                      <button className="confirm-btn" onClick={() => handleSavePlan(log.id)}>保存交易计划</button>
                    </div>
                  </>
                )}

                {log.status === 'plan' && (
                  <>
                    <h4>确认并记录 📈 入场交易: {log.symbol}</h4>
                    <div className="form-group">
                      <label>实际买入/入场成交价</label>
                      <input type="number" step="any" value={actualEntry} onChange={(e) => setActualEntry(Number(e.target.value))} />
                    </div>
                    <div className="form-group">
                      <label>追踪止损修改日志</label>
                      <input type="text" placeholder="如: 突破高点，移损至保本保本价" value={stopUpdates} onChange={(e) => setStopUpdates(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>持仓中分批加仓/减仓操作记录</label>
                      <input type="text" placeholder="如: 达到1.5R阻力，减仓30%" value={scaleActions} onChange={(e) => setScaleActions(e.target.value)} />
                    </div>
                    <div className="form-actions">
                      <button className="cancel-btn" onClick={() => setEditingLogId(null)}>取消</button>
                      <button className="confirm-btn" onClick={() => handleSaveActive(log.id)}>保存持仓详情</button>
                    </div>
                  </>
                )}

                {log.status === 'active' && (
                  <>
                    <h4>结清平仓 🏁 出场复盘: {log.symbol}</h4>
                    <div className="form-group row">
                      <div>
                        <label>实际平仓离场价格</label>
                        <input type="number" step="any" value={actualExit} onChange={(e) => setActualExit(Number(e.target.value))} />
                      </div>
                      <div>
                        <label>实际盈亏金额 (元/USD)</label>
                        <input type="number" value={pnl} onChange={(e) => setPnl(Number(e.target.value))} />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>离场具体原因</label>
                      <select value={exitReason} onChange={(e) => setExitReason(e.target.value)}>
                        <option value="触及计划止盈">🎯 触及计划止盈</option>
                        <option value="触及计划止损">🛡️ 触及计划止损</option>
                        <option value="技术结构破坏提前手动平仓">⚠️ 结构走坏提前平仓</option>
                        <option value="情绪焦虑提早止盈离场">🤦 情绪原因提前出场</option>
                      </select>
                    </div>

                    <div className="tag-selector-group">
                      <label>K线形态 / 概念多选归类</label>
                      <div className="tag-pills">
                        {PRESET_PATTERNS.map(pat => {
                          const active = selectedPatterns.includes(pat);
                          return (
                            <button
                              key={pat}
                              type="button"
                              className={`tag-pill ${active ? 'active' : ''}`}
                              onClick={() => {
                                if (active) {
                                  setSelectedPatterns(selectedPatterns.filter(p => p !== pat));
                                } else {
                                  setSelectedPatterns([...selectedPatterns, pat]);
                                }
                              }}
                            >
                              {pat}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="tag-selector-group">
                      <label>交易执行心态勾选</label>
                      <div className="tag-pills">
                        {PRESET_PSYCHOLOGY.map(psy => {
                          const active = selectedPsych.includes(psy);
                          return (
                            <button
                              key={psy}
                              type="button"
                              className={`tag-pill ${active ? 'active' : ''}`}
                              onClick={() => {
                                if (active) {
                                  setSelectedPsych(selectedPsych.filter(p => p !== psy));
                                } else {
                                  setSelectedPsych([...selectedPsych, psy]);
                                }
                              }}
                            >
                              {psy}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>系统纪律执行星级 (1-5星)</label>
                      <input
                        type="range" min="1" max="5"
                        value={disciplineRating}
                        onChange={(e) => setDisciplineRating(Number(e.target.value))}
                      />
                      <span>【评分：{disciplineRating} 星】</span>
                    </div>

                    <div className="form-group">
                      <label>复盘反思总结</label>
                      <textarea
                        placeholder="记录这笔交易的得失，学到了什么？下次如何改善？"
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={syncToStudy}
                          onChange={(e) => setSyncToStudy(e.target.checked)}
                        /> 同步收录至“形态教学库”进行长期复盘
                      </label>
                    </div>

                    <div className="form-actions">
                      <button className="cancel-btn" onClick={() => setEditingLogId(null)}>取消</button>
                      <button className="confirm-btn" onClick={() => handleSaveClosed(log.id)}>保存平仓日志</button>
                    </div>
                  </>
                )}
              </div>
            );
          }

          // NORMAL RENDER CARD
          return (
            <div key={log.id} className={`log-card ${log.status}`}>
              <div className="card-header-meta">
                <span className={`status-badge ${log.status}`}>
                  {log.status === 'observe' && '🔭 观察中'}
                  {log.status === 'plan' && '📐 计划中'}
                  {log.status === 'active' && '📈 持仓中'}
                  {log.status === 'closed' && '🏁 已平仓'}
                </span>
                <span className="log-date">{log.date}</span>
              </div>

              <div className="card-symbol-info">
                <h3>{log.symbol}</h3>
                <span className="period-tag">{log.period}</span>
                {log.status === 'closed' && (
                  <span className={`r-value-badge ${log.exit.rValue >= 0 ? 'up' : 'down'}`}>
                    {log.exit.rValue >= 0 ? '+' : ''}{log.exit.rValue.toFixed(2)} R
                  </span>
                )}
              </div>

              {/* CARD DETAILS */}
              <div className="card-body">
                {/* Observe phase content */}
                <div className="detail-section">
                  <strong>选股题材:</strong> {log.fundamentalInfo.sector || '未记录'} | {log.fundamentalInfo.catalyst || '未记录'}
                  <br />
                  <strong>技术初筛:</strong> {log.technicalSelection}
                  <br />
                  <strong>选股理由:</strong> {log.selectionReason}
                </div>

                {/* Plan phase content */}
                {log.status !== 'observe' && (
                  <div className="detail-section highlight">
                    <strong>计划价格:</strong> 入场 {log.planPrice.entry} | 止损 {log.planPrice.sl} | 止盈 {log.planPrice.tp}
                    <br />
                    <strong>初始盈亏比:</strong> {log.planPrice.ratio.toFixed(2)} R | 建议买入: {log.execution.suggestedSize.toFixed(0)}股
                    {log.technicalAnalysis.structure && (
                      <div className="tech-analysis-lines">
                        <strong>技术共振:</strong> 结构: {log.technicalAnalysis.structure} | 支撑: {log.technicalAnalysis.level} | 触发: {log.technicalAnalysis.trigger}
                      </div>
                    )}
                  </div>
                )}

                {/* Active holding content */}
                {log.status === 'active' && (
                  <div className="detail-section holding-active">
                    <strong>实际入场价:</strong> {log.execution.actualEntry}
                    {log.management.stopUpdates && <div><strong>追踪止损:</strong> {log.management.stopUpdates}</div>}
                    {log.management.scaleActions && <div><strong>加减仓记录:</strong> {log.management.scaleActions}</div>}
                  </div>
                )}

                {/* Closed results & reviews */}
                {log.status === 'closed' && (
                  <div className="detail-section closed-result">
                    <strong>成交结果:</strong> 平仓价 {log.exit.actualExit} | 盈亏: {log.exit.pnl} 元 | 离场原因: {log.exit.reason}
                    <br />
                    <strong>形态打标:</strong> {log.review.patternTags.map(t => <span key={t} className="tag-span">#{t}</span>)}
                    <br />
                    <strong>心态执行:</strong> {log.review.psychologyTags.map(p => <span key={p} className="tag-span psy">#{p}</span>)}
                    <br />
                    <strong>执行评分:</strong> {'⭐'.repeat(log.review.disciplineRating)}
                    <br />
                    <strong>复盘总结:</strong> {log.review.reviewNotes || '无反思总结'}
                  </div>
                )}
              </div>

              {/* CARD ACTIONS */}
              <div className="card-actions">
                <button className="action-btn-neutral" onClick={() => onSelectSymbol(log.symbol)}>
                  🎯 定位图表
                </button>

                {tm && (
                  <button
                    className="action-btn-neutral"
                    title="在 Logseq 编辑器中打开该笔记块"
                    onClick={() => {
                      try {
                        (window as any).logseq?.App?.pushState('page', { uuid: log.id });
                        (window as any).logseq?.hideMainUI();
                      } catch (e) {
                        console.error('Failed to navigate in Logseq:', e);
                      }
                    }}
                  >
                    📖 笔记
                  </button>
                )}

                {log.status === 'observe' && (
                  <button className="action-btn-primary" onClick={() => handleUpdateToPlan(log.id)}>
                    📐 制定交易计划
                  </button>
                )}

                {log.status === 'plan' && (
                  <button className="action-btn-primary" onClick={() => handleActivatePosition(log.id)}>
                    📈 触发激活持仓
                  </button>
                )}

                {log.status === 'active' && (
                  <button className="action-btn-primary" onClick={() => handleClosePosition(log.id)}>
                    🏁 结清平仓复盘
                  </button>
                )}

                <button className="action-btn-danger" onClick={() => handleDeleteLog(log.id)} title="删除日志">
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
