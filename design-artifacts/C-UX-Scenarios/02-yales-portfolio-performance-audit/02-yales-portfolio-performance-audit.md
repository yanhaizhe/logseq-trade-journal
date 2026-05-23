---
design_intent: S
design_status: specified
---
# 02: Yale's Portfolio Performance Audit (Yale 的投资组合绩效审计)

**Project:** logseq-trade-journal
**Created:** 2026-05-21
**Method:** Whiteport Design Studio (WDS)

---

## Transaction (Q1)

**What this scenario covers:**
跨市场多账户资产对账、NAV 折算趋势分析以及交易策略/行为错误的归因过滤。

---

## Business Goal (Q2)

**Goal:** 🚀 SECONDARY GOALS: 跨市场多币种资产对账与归因
**Objective:** 100% 折算准确率（0误差），盈亏日历加载时间 <100ms。

---

## User & Situation (Q3)

**Persona:** Yale the Yield-Seeker (Primary ⭐)
**Situation:** 在一个交易周期（例如周度或月度）结束时，或者在经历了连续亏损/盈利后，Yale 坐在书桌前，想要审视自己这期间的资产净值（NAV）曲线、盈亏分布（红绿日历），并过滤特定归因标签（如 #FOMO 或 #突破买入）以审计自己的交易行为和组合表现。

---

## Driving Forces (Q4)

**Hope:** 能在一个界面中合并折算多市场多币种（CNY、USD、USDT）账户的资产净值，绘制清晰的 NAV 曲线，并通过红绿盈亏日历与归因标签过滤器，秒级定位出拉低绩效的坏习惯。

**Worry:** 汇率折算不准导致资产报表失真，或者盈亏日历与过滤卡顿，无法直观归纳出亏损的主要错误源。

> CONSTRAINT: One sentence per component. Phrases, not paragraphs.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Desktop
**Entry:** Yale 在 Logseq 中切换到“资产与绩效看板”视图，直接看到最新的多账户 NAV 走势与红绿盈亏日历。

---

## Best Outcome (Q7)

**User Success:**
100% 准确折算跨市场多账户 NAV，盈亏日历 <100ms 响应，快速过滤并发现本周 80% 的亏损源于 #FOMO 情绪性交易，明确了下周需要纠正的交易纪律。

**Business Success:**
100% 本地运算，零外部网络流动，提供极速响应的对账和归因体验，防止用户放弃记录。

---

## Shortest Path (Q8)

1. **Daily Performance Dashboard (日复盘与绩效统计看板)** — Yale 看到多账户折算的 NAV 走势，以及本月红绿盈亏日历（盈亏金额一目了然）。
2. **Attribution Filter View (归因过滤视图)** — Yale 点击看板上的归因标签过滤器，勾选错误标签（如 #FOMO），看板数据和交易列表瞬间更新，展示该错误导致的累积盈亏和最大单笔回撤，辅助 Yale 完成绩效审计 ✓

---

## Trigger Map Connections

**Persona:** Yale the Yield-Seeker (Primary ⭐)

**Driving Forces Addressed:**
- ✅ **Want:** 宏观投资组合与 NAV 透视 (多账户、多币种 NAV 变动一目了然)；交易策略与行为错误归因 (买卖标记上图，盈亏日历直观过滤)
- ❌ **Fear:** 复盘记录的高摩擦导致放弃 (本地高效对账)；敏感财务与策略数据泄露 (本地绝对隐私安全)

**Business Goal:** 🚀 SECONDARY GOALS: 跨市场多币种资产对账与归因

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| 02.1 | `02.1-daily-performance-dashboard/` | 看到多账户折算的 NAV 走势，以及本月红绿盈亏日历（盈亏金额一目了然）。 | 点击看板上的归因标签过滤器按钮，进入归因过滤视图。 |
| 02.2 | `02.2-attribution-filter-view/` | 勾选特定归因/错误标签，实时看板数据和交易列表联动筛选，计算该特定错误的累计损失和回撤指标。 | 审计完成，点击重置或切换回常规视图。 ✓ |
