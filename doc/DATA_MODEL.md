# TradeCraft 数据模型与 Logseq 块结构设计

> 版本 1.0

---

## 一、设计原则

1. **Logseq 是唯一数据源** — 不存在外部数据库，所有业务数据以 pages/blocks/properties 形式存储
2. **Page 是实体，Block 是属性/子项** — 一个交易 = 一个 Page，开仓参数 = 该 Page 下的子 Block
3. **[[]] 是关系** — 知识条目 ↔ 交易记录 ↔ 策略 ↔ 标注，全部通过双向链接关联
4. **Properties 是结构化字段** — 可查询、可聚合、可排序
5. **命名约定保持可读性** — Page 名称即实体标识，人能直接看懂

---

## 二、核心实体 Page 命名约定

| 实体类型 | Page 命名模式 | 示例 |
|---------|-------------|------|
| 知识条目 | `知识库/分类/子分类/条目名` | `知识库/技术分析/K线形态/头肩顶` |
| 交易记录 | `T/YYYY-MM-DD/品种-NN` | `T/2026-05-21/TSLA-01` |
| 策略定义 | `策略/策略名` | `策略/趋势跟踪/均线回踩` |
| 复盘记录 | 嵌入交易 Page 的子 block | 无独立 Page |
| 图表标注 | 嵌入关联 Page 的子 block | 无独立 Page |
| 自选列表 | `自选/分组名` | `自选/美股` |
| 风控设置 | `设置/风控规则` | — |
| 图表模板 | `设置/图表模板/模板名` | — |
| 交易日记 | `日记/YYYY-MM-DD` | Logseq 原生日记 |

---

## 三、知识条目 (Knowledge Entry)

### 3.1 Page 结构

```
页面: [[知识库/技术分析/K线形态/头肩顶]]

  knowledge-category:: [[技术分析/K线形态]]
  knowledge-level:: [[高级]]
  mastery:: 85
  last-reviewed:: 2026-05-21
  review-count:: 3
  difficulty:: 4
  direction:: [[看跌]]

  📌 核心要点
    - 头肩顶是看跌反转形态
    - 右肩必须低于头部，通常也低于左肩
    - 颈线突破 + 放量 = 确认
    - 目标位 = 头部到颈线的垂直距离

  📖 详细内容
    (Markdown 内容，由研习室渲染)

  📊 练习记录
    📝 练习 #3 (2026-05-21 · 评分: 85%)
      exercise-type:: [[画线练习]]
      score:: 85
      deviations:: [[{"name":"右肩标注","deviation":2.3,"note":"建议关注影线低点"}]]
      annotations-saved:: 4
    
    📝 练习 #2 (2026-05-15 · 评分: 72%)
      exercise-type:: [[实战识别]]
      score:: 72

  🔗 关联
    [[趋势线画法]]
    [[成交量分析]]
    [[复合头肩形态]]
    [[双顶]]
    [[T/2026-05-15/BTC-02]]
```

### 3.2 Properties 说明

| Property | 类型 | 说明 |
|----------|------|------|
| `knowledge-category` | `[[]]` 链接 | 在知识库中的分类路径 |
| `knowledge-level` | `[[]]` 链接 | 初级/中级/高级 |
| `mastery` | 数字 0-100 | 掌握度百分比 |
| `last-reviewed` | 日期 | 最近复习日期 |
| `review-count` | 数字 | 复习总次数 |
| `difficulty` | 数字 1-5 | 难度评级 |
| `direction` | `[[]]` 链接 | 看涨/看跌/中性 |

---

## 四、交易记录 (Trade Record)

### 4.1 Page 结构

```
页面: [[T/2026-05-21/TSLA-01]]

  trade-status:: [[已平仓]]
  trade-type:: [[做多]]
  instrument:: [[TSLA]]
  market:: [[美股]]
  timeframe:: [[1h]]
  strategy:: [[趋势跟踪/均线回踩]]

  📈 开仓
    entry-time:: 2026-05-21T10:30:00
    entry-price:: 248.50
    position-size:: 150
    position-unit:: [[股]]
    position-value:: 37275.00
    stop-loss:: 242.00
    stop-type:: [[固定止损]]
    take-profit:: 260.00
    risk-amount:: 975.00
    risk-pct:: 1.95

  📉 平仓
    exit-time:: 2026-05-21T15:45:00
    exit-price:: 255.20
    exit-type:: [[主动止盈]]
    pnl:: 1005.00
    pnl-pct:: 2.70
    r-multiple:: 1.03
    fee:: 5.00
    net-pnl:: 1000.00

  🧠 决策记录
    entry-bias:: 昨日突破下降趋势线，今日回踩MA20获得支撑，15min出现看涨吞没确认
    exit-reason:: 到达前高阻力位255附近，主动止盈
    plan-compliance:: 7
    mistake:: [[入场犹豫]] (开仓时犹豫了2分钟，价格多走了0.3%)
    edge-quality:: 3

  🎭 交易心理
    entry-mood:: [[冷静]]
    holding-mood:: [[略焦虑]]
    exit-mood:: [[满意]]
    mood-note:: 浮盈回撤时想提前平仓，提醒自己相信结构

  {{renderer :kline-trade, TSLA, 1h, trade-id=T/2026-05-21/TSLA-01}}

  📝 复盘
    review-date:: 2026-05-21
    review-score:: 7
    review-checklist:: [[{"item":"入场符合策略规则","pass":true},{"item":"止损设置合理","pass":true},{"item":"仓位符合风控","pass":true},{"item":"最佳时机入场","pass":false,"note":"犹豫了2分钟"},{"item":"遵守持仓计划","pass":true},{"item":"无情绪冲动","pass":false,"note":"浮盈回撤想提前平仓"},{"item":"按计划出场","pass":true},{"item":"到达目标位","pass":false,"note":"主动止盈"}]]
    improvement:: ["用限价单替代市价单，减少入场滑点","设置价格预警，减少盯盘频率","重温 [[交易心理/持仓焦虑]]"]
    good-points:: ["方向判断正确","止损设置合理","按风险计算仓位"]

  🔗 关联
    theory-source:: [[支撑与阻力]] [[趋势线画法]] [[头肩顶]]
    strategy-page:: [[策略/趋势跟踪/均线回踩]]
    chart-annotations:: [[ann_tl_001]] [[ann_support_242]]
    related-trades:: [[T/2026-05-20/AAPL-03]]
```

### 4.2 Properties 说明

| Property | 类型 | 说明 |
|----------|------|------|
| `trade-status` | `[[]]` | 持仓中/已平仓/已取消/模拟 |
| `trade-type` | `[[]]` | 做多/做空 |
| `instrument` | `[[]]` | 交易品种 |
| `market` | `[[]]` | 所属市场 |
| `timeframe` | `[[]]` | 交易周期 |
| `strategy` | `[[]]` | 使用的策略 |
| `entry-price` | 数字 | 开仓价 |
| `exit-price` | 数字 | 平仓价 |
| `position-size` | 数字 | 仓位数量 |
| `stop-loss` | 数字 | 止损价 |
| `take-profit` | 数字 | 止盈价 |
| `risk-amount` | 数字 | 风险金额 |
| `risk-pct` | 数字 | 风险百分比 |
| `pnl` | 数字 | 盈亏金额 |
| `pnl-pct` | 数字 | 盈亏百分比 |
| `r-multiple` | 数字 | R倍数 (盈亏/风险) |
| `plan-compliance` | 数字 1-10 | 计划执行度 |
| `review-score` | 数字 1-10 | 复盘评分 |
| `edge-quality` | 数字 1-5 | 交易机会质量 |
| `entry-mood` | `[[]]` | 入场情绪 |
| `holding-mood` | `[[]]` | 持仓情绪 |
| `exit-mood` | `[[]]` | 出场情绪 |

---

## 五、策略定义 (Strategy)

### 5.1 Page 结构

```
页面: [[策略/趋势跟踪/均线回踩]]

  strategy-status:: [[实盘运行中]]
  strategy-type:: [[趋势跟踪]]
  created:: 2026-03-01
  version:: 2.1
  author:: [[我]]

  ⏱️ 适用周期
    [[日线]] [[4h]] [[1h]]

  📊 适用品种
    [[TSLA]] [[AAPL]] [[NVDA]] [[META]]

  📥 入场规则
    rule-1:: 价格处于明确上升趋势（MA50 > MA200 且斜率向上）
    rule-2:: 价格回踩 MA20 或 MA50
    rule-3:: 回踩时出现反转K线形态（吞没/锤子线/启明星）
    rule-4:: 下一根K线确认反转 → 入场
    entry-timing:: [[确认入场]]

  🛑 止损规则
    stop-method:: [[结构止损]]
    stop-placement:: 回踩低点下方 0.5 ATR
    max-stop-distance:: 3%
    trailing-stop:: [[启用]]
    trailing-activation:: 1.5R
    trailing-distance:: 1.0 ATR

  🎯 止盈规则
    tp1:: 1.5R
    tp1-size:: 50%
    tp2:: 2.5R
    tp2-size:: 30%
    tp3:: 4.0R
    tp3-size:: 20%

  ⚖️ 仓位规则
    risk-per-trade:: 2%
    max-concurrent:: 3
    max-correlated:: 2

  📊 过滤条件
    filter-1:: ATR(14) > 1.5% (波动率足够)
    filter-2:: 成交量 > 20日均量 (活跃)
    filter-3:: 无重大新闻事件 (避免跳空)

  📈 回测统计
    backtest-period:: 2024-01 → 2026-04
    backtest-trades:: 127
    win-rate:: 54%
    profit-factor:: 1.9
    sharpe:: 1.5
    max-drawdown:: 14%

  🔄 迭代记录
    v2.1 (2026-05)
      - 收紧追踪止损从 2 ATR → 1.5 ATR
      - 增加成交量过滤
    v2.0 (2026-03)
      - 从固定止损改为结构止损
      - 增加分批止盈
    v1.0 (2025-11)
      - 初始版本，仅 MA20 回踩

  🔗 关联
    theory:: [[均线系统]] [[支撑与阻力]] [[成交量分析]]
    executions:: [[查询: strategy=趋势跟踪/均线回踩]]
```

---

## 六、图表标注 (Chart Annotation)

### 6.1 Block 结构

标注不创建独立 Page，而是嵌入在关联的 Page 下：

```
📐 下降趋势线 (2026-03-15 → 2026-05-20)
  ann-id:: ann_tl_001
  ann-tv-id:: tv_drawing_5f3a2b
  ann-type:: [[trendline]]
  ann-category:: [[阻力]]
  ann-points:: [[{"time":1710460800,"price":280},{"time":1716249600,"price":240}]]
  ann-color:: #ef4444
  ann-style:: dashed
  ann-width:: 1.5
  ann-notes:: 已突破，回踩确认支撑有效。若后续跌破240则趋势延续。
  ann-tags:: [[关键趋势线]] [[待观察]]
  ann-source:: [[T/2026-05-21/TSLA-01]]
  ann-symbol:: [[TSLA]]
  ann-interval:: [[日线]]
  ann-visible:: true
  ann-created:: 2026-05-21T10:00:00Z
  ann-updated:: 2026-05-21T14:30:00Z
```

### 6.2 Properties 说明

| Property | 类型 | 说明 |
|----------|------|------|
| `ann-id` | 字符串 | 标注唯一 ID |
| `ann-tv-id` | 字符串 | TradingView 原生绘图 ID |
| `ann-type` | `[[]]` | trendline/horizontal/rect/fibonacci/text/arrow/pattern |
| `ann-category` | `[[]]` | 支撑/阻力/入场/止损/目标/信号/盘整/备注 |
| `ann-points` | JSON | 节点数组 `[{time, price}, ...]` (压缩) |
| `ann-color` | 颜色 | hex 色值 |
| `ann-style` | 字符串 | solid/dashed/dotted |
| `ann-notes` | 文本 | Markdown 笔记 |
| `ann-tags` | `[[]]` 列表 | 标签 |
| `ann-source` | `[[]]` | 来源: 交易 Page / 知识 Page |
| `ann-symbol` | `[[]]` | 品种 |
| `ann-interval` | `[[]]` | K线周期 |
| `ann-visible` | 布尔 | 图表上显示/隐藏 |

---

## 七、风控设置

### 7.1 Page 结构

```
页面: [[设置/风控规则]]

  account-size:: 50000
  risk-per-trade:: 2.0
  max-daily-loss:: 3.0
  max-weekly-loss:: 5.0
  max-monthly-loss:: 10.0
  max-total-risk:: 6.0
  max-concurrent-positions:: 5
  max-correlated-positions:: 3
  max-position-size-pct:: 25.0
  min-r-multiple:: 1.5
  force-stop-after:: [[连续3笔亏损]]
  cooldown-after-big-loss:: [[24小时]]
  daily-review-required:: true
```

---

## 八、自选列表

### 8.1 Page 结构

```
页面: [[自选/美股]]

  watchlist-group:: [[美股]]
  
  TSLA
    instrument:: [[TSLA]]
    added:: 2026-01-15
    notes:: 波动大，适合趋势跟踪
    alert-price:: 240
    alert-direction:: [[下方]]
  
  AAPL
    instrument:: [[AAPL]]
    added:: 2026-02-01
    notes:: 走趋势时很流畅
  
  NVDA
    instrument:: [[NVDA]]
    added:: 2026-03-10
    notes:: AI主线，动量强势
    alert-price:: 1100
    alert-direction:: [[上方]]
```

---

## 九、数据查询示例

### 9.1 查询本月所有已平仓交易

```clojure
;; Logseq Datascript 查询 (高级用法)
[:find (pull ?b [:block/properties])
 :where
 [?b :block/properties ?props]
 [(get ?props :trade-status) ?status]
 [(contains? ?status "已平仓")]
 [?b :block/page ?p]
 [?p :block/name ?name]
 [(clojure.string/starts-with? ?name "T/2026-05")]
 ;; ... 实际使用 logseq.DB.datascriptQuery 或 API
```

### 9.2 通过 Logseq API 聚合（简化版）

实际上，通过 block properties 和页面搜索即可完成大多数查询：

```javascript
// 查询某策略的所有交易
async function getTradesByStrategy(strategyName) {
  // 搜索所有引用该策略页面的 block
  const refs = await logseq.DB.getPageReferencedBlocks(strategyName);
  // 过滤出交易记录 Page
  return refs.filter(b => b.page.name.startsWith('T/'));
}

// 计算胜率
async function getWinRate(period) {
  const trades = await getTradesByPeriod(period);
  const wins = trades.filter(t => parseFloat(t.properties?.pnl) > 0);
  return wins.length / trades.length;
}

// 获取资金曲线
async function getEquityCurve(startDate, endDate) {
  const trades = await getTradesByDateRange(startDate, endDate);
  let equity = initialCapital;
  return trades.map(t => {
    equity += parseFloat(t.properties?.pnl || 0);
    return { date: t.properties?.['entry-time'], equity };
  });
}
```

---

## 十、跨实体关联图谱

```
                        ┌─────────────────────┐
                        │    知识库            │
                        │  知识/技术分析/...    │
                        └──────┬──────┬───────┘
                               │      │
              ┌────────────────┘      └────────────────┐
              │ [[theory-source]]     [[前置知识]]       │
              ▼                                        ▼
    ┌─────────────────┐                      ┌─────────────────┐
    │   交易记录        │     [[strategy]]     │   策略定义        │
    │   T/.../TSLA-01  │◄────────────────────│   策略/趋势跟踪    │
    └────────┬─────────┘                      └────────┬─────────┘
             │                                         │
             │ [[chart-annotations]]    [[executions]]  │
             ▼                                         ▼
    ┌─────────────────┐                      ┌─────────────────┐
    │   图表标注        │                      │  其他交易记录     │
    │   ann_tl_001     │                      │  T/.../AAPL-03  │
    │   (嵌入交易Page)  │                      │  T/.../NVDA-07  │
    └─────────────────┘                      └─────────────────┘
             │
             │ [[ann-source]]
             ▼
    ┌─────────────────┐
    │   学习笔记        │
    │   (嵌入知识Page)  │
    └─────────────────┘
```

所有实体通过 `[[]]` 链接形成完整的知识-实战网络。一个知识条目可以链接到多笔交易，一笔交易可以引用多个知识点和策略，一个标注可以同时属于交易记录和学习笔记。

---

## 十一、存储限制与优化

| 限制项 | 阈值 | 策略 |
|--------|------|------|
| 单 Page block 数 | < 500 块 | 长期交易的复盘累积分页 |
| 单 property 大小 | < 10KB | 标注 JSON 超限溢出到附件文件 |
| 标注点数 | < 20 点 | 复杂形态使用 TradingView 原生 pattern 工具 |
| 回测数据 | 不入 Logseq | 仅存储统计摘要，原始数据存本地 CSV |
| 历史交易 | 不限 | 按年/月归档到子目录 |
| 图表截图 | 不入 Logseq | 存本地 `assets/` 文件夹，Page 中引用路径 |
