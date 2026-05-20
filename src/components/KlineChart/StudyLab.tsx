import React, { useState, useEffect } from 'react';

interface ExampleItem {
  symbol: string;
  name: string;
  period: string;
  date: string;
  note: string;
}

interface Pattern {
  id: string;
  name: string;
  desc: string;
  tip: string;
  examples: ExampleItem[];
}

interface StudyLabProps {
  onSelectSymbol: (symbol: string) => void;
  proChart: any;
}

const PRESET_PATTERNS: Pattern[] = [
  {
    id: 'double_bottom',
    name: '双底 (Double Bottom)',
    desc: '价格两次下跌至相近水平支撑位，形成“W”字形，通常预示趋势反转。',
    tip: '买入条件：突破颈线并回踩确认，结合成交量放大。',
    examples: [
      { symbol: 'BTC/USDT', name: '比特币 W底突破', period: '4H', date: '2024-03-05', note: '请在4小时图表跳转到 2024-03-05 附近观察双底形成。' },
      { symbol: 'AAPL', name: '苹果公司 触底反弹', period: 'daily', date: '2023-10-27', note: '日线级别双底测试 165 支撑位。' }
    ]
  },
  {
    id: 'head_shoulders_bottom',
    name: '头肩底 (Head & Shoulders Bottom)',
    desc: '由左肩、头部、右肩组成的反转形态，头部最低，左右肩对称，颈线为阻力位。',
    tip: '买入条件：突破颈线收盘确认，止损设在右肩下方。',
    examples: [
      { symbol: 'ETH/USDT', name: '以太坊 经典头肩底', period: '1H', date: '2024-01-22', note: '1小时图上左肩 2150，头部 2100，右肩 2180，颈线突破做多。' }
    ]
  },
  {
    id: 'bullish_engulfing',
    name: '看涨吞没 (Bullish Engulfing)',
    desc: '一根大阳线完全包住前一根阴线的实体，表明多头力量瞬间压倒空头。',
    tip: '买入条件：发生在下降趋势末端，阳线实体越大越好。',
    examples: [
      { symbol: '600519', name: '贵州茅台 吞没见底', period: 'daily', date: '2024-02-05', note: '日线大阳线吞没前一日阴线，探底回升。' }
    ]
  },
  {
    id: 'smc_bos',
    name: 'SMC 结构破坏 (BOS)',
    desc: 'Break of Structure。顺应大周期趋势，价格突破了前一个结构高点/低点，确认趋势延续。',
    tip: '入场点：寻找回踩产生的 OB (订单块) 或 FVG (失衡区) 进场。',
    examples: [
      { symbol: 'TSLA', name: '特斯拉 日线BOS延续', period: 'daily', date: '2024-04-29', note: '日线级别结构破坏，确立上涨通道。' }
    ]
  }
];

const PRESET_THEORIES = [
  {
    name: '均线交叉系统 (MA Cross)',
    desc: '使用短期均线(如20日)和长期均线(如50日)的交叉作为趋势启动信号。',
    indicator: 'MA'
  },
  {
    name: '强弱指标震荡 (RSI Oscillation)',
    desc: 'RSI(14) 监测动量。低于30为超卖区，寻找反弹；高于70为超买区。',
    indicator: 'RSI'
  },
  {
    name: '趋向指标共振 (MACD Divergence)',
    desc: 'MACD 快慢线交叉及柱状图强弱。用于捕捉价格新高而指标未创新高的背离形态。',
    indicator: 'MACD'
  }
];

export const StudyLab: React.FC<StudyLabProps> = ({ onSelectSymbol, proChart }) => {
  const [activeSubTab, setActiveSubTab] = useState<'patterns' | 'theories' | 'my_collection'>('patterns');
  const [myCollections, setMyCollections] = useState<ExampleItem[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('tj_my_collections');
    if (saved) {
      try {
        setMyCollections(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const handleApplyIndicator = (name: string) => {
    const chart = proChart?._chartApi;
    if (chart) {
      try {
        // Clear sub indicators first or just add
        const isMain = name === 'MA';
        chart.createIndicator(name, !isMain);
        showToast(`已在图表加载 ${name} 指标`);
      } catch (e) {
        console.error(e);
        showToast(`加载 ${name} 失败，可在主界面上手动添加`);
      }
    } else {
      showToast('图表加载中，请稍后再试');
    }
  };

  const showToast = (msg: string) => {
    setCopiedText(msg);
    setTimeout(() => setCopiedText(null), 3000);
  };

  const handleLocateExample = (ex: ExampleItem) => {
    onSelectSymbol(ex.symbol);
    showToast(`已切换至 ${ex.symbol}。复盘目标日期: ${ex.date}`);
  };

  const handleDeleteCollection = (idx: number) => {
    const updated = myCollections.filter((_, i) => i !== idx);
    setMyCollections(updated);
    localStorage.setItem('tj_my_collections', JSON.stringify(updated));
    showToast('删除收录案例成功');
  };

  return (
    <div className="tj-study-lab">
      {/* 吐司提示 */}
      {copiedText && <div className="tj-toast">{copiedText}</div>}

      {/* 子导航 */}
      <div className="study-sub-tabs">
        <button
          className={`sub-tab-btn ${activeSubTab === 'patterns' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('patterns')}
        >
          K线形态库
        </button>
        <button
          className={`sub-tab-btn ${activeSubTab === 'theories' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('theories')}
        >
          指标实验室
        </button>
        <button
          className={`sub-tab-btn ${activeSubTab === 'my_collection' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('my_collection')}
        >
          我的搜集 ({myCollections.length})
        </button>
      </div>

      <div className="study-content-scroll">
        {/* K线形态库 */}
        {activeSubTab === 'patterns' && (
          <div className="patterns-section">
            {PRESET_PATTERNS.map((pat) => (
              <div key={pat.id} className="pattern-card">
                <div className="pattern-card-header">
                  <h4>{pat.name}</h4>
                </div>
                <p className="pattern-desc">{pat.desc}</p>
                <div className="pattern-tip">
                  <strong>💡 操作要点:</strong> {pat.tip}
                </div>
                <div className="pattern-examples-title">经典教学案例:</div>
                <div className="pattern-examples-list">
                  {pat.examples.map((ex, i) => (
                    <div key={i} className="example-item-box" onClick={() => handleLocateExample(ex)}>
                      <div className="example-title">
                        <span>{ex.name}</span>
                        <span className="ex-badge">{ex.period}</span>
                      </div>
                      <div className="example-note">{ex.note}</div>
                      <div className="example-footer">
                        <span>标的: <b>{ex.symbol}</b></span>
                        <span className="locate-action-btn">🎯 点击联动图表</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 指标实验室 */}
        {activeSubTab === 'theories' && (
          <div className="theories-section">
            {PRESET_THEORIES.map((theo, idx) => (
              <div key={idx} className="theory-card">
                <h4>{theo.name}</h4>
                <p className="theory-desc">{theo.desc}</p>
                <button
                  className="theory-action-btn"
                  onClick={() => handleApplyIndicator(theo.indicator)}
                >
                  ⚡ 一键加载 {theo.indicator} 指标到图表
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 我的搜集 */}
        {activeSubTab === 'my_collection' && (
          <div className="my-collection-section">
            {myCollections.length === 0 ? (
              <div className="collection-empty">
                <p>暂无收录案例</p>
                <span className="helper-text">
                  提示: 在交易体系的“复盘记录”环节，勾选“同步收录至形态教学库”即可将您的优秀交易案例归纳在这里。
                </span>
              </div>
            ) : (
              myCollections.map((col, idx) => (
                <div key={idx} className="example-item-box my-coll-box">
                  <div className="example-title">
                    <span>{col.name}</span>
                    <span className="ex-badge my-badge">{col.period}</span>
                  </div>
                  <div className="example-note">{col.note}</div>
                  <div className="example-footer">
                    <span>标的: <b>{col.symbol}</b> | 时间: {col.date}</span>
                    <div className="actions">
                      <button className="locate-btn" onClick={() => handleLocateExample(col)}>
                        🎯 定位
                      </button>
                      <button className="delete-btn" onClick={() => handleDeleteCollection(idx)}>
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
