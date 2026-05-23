---
design_intent: C
design_status: completed
---
# 01: Yale's Frictionless Trade Review Flow (Yale 的无摩擦复盘心流体验)

**Project:** logseq-trade-journal
**Created:** 2026-05-21
**Method:** Whiteport Design Studio (WDS)

---

## Transaction (Q1)

**What this scenario covers:**
在 Logseq 中记录包含交易细节的笔记并毫秒级跳转绑定 K 线快照现场（无截图、无拼图复盘）。

---

## Business Goal (Q2)

**Goal:** ⭐ PRIMARY GOAL: 极致高效的复盘心流体验 (THE ENGINE)
**Objective:** 跳转延迟 <150ms，100% 零截图依赖，单笔复盘记录时间 <5 分钟。

---

## User & Situation (Q3)

**Persona:** Yale the Yield-Seeker (Primary ⭐)
**Situation:** 晚上收盘后，Yale 坐在书桌前，双栏屏幕亮着。他经历了一天的交易与编码，感到有些疲惫，但依然希望遵循交易纪律快速记录下当日的一笔实盘操作，并以极低的心智摩擦将笔记与 K 线状态绑定。

---

## Driving Forces (Q4)

**Hope:** 能通过快捷键一键在 Logseq 笔记中生成与当前 TradingView 级别 K 线图表状态（标的、周期、技术划线 JSON、指标）绑定的高精度时间戳属性，实现零截图复盘。

**Worry:** 录入过程过于繁琐（拼图、裁剪、频繁在券商和笔记软件间切换）导致复盘中断，或者在回溯笔记时无法还原真实的动态图表交互现场。

> CONSTRAINT: One sentence per component. Phrases, not paragraphs.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Desktop (Logseq 桌面客户端 + 本地浏览器/FastAPI 环回服务)
**Entry:** Yale 在桌面端打开 Logseq，并展开 logseq-trade-journal 插件的左右双栏工作区，在左栏新建一个空白的交易复盘 Block。

---

## Best Outcome (Q7)

**User Success:**
Yale 在 5 分钟内完成了交易记录与归因标签挂载，并通过快捷键将笔记与右侧实时 K 线图表（包含他绘制的趋势线和买卖标记）进行绑定，随时可以一键高精度还原现场。

**Business Success:**
实现跳转延迟 <150ms 的心流交互，完全杜绝截图对本地存储的占用，确保 Yale 持续保持每日复盘的交易纪律。

---

## Shortest Path (Q8)

1. **Split-Screen K-Line View (Study Lab & Trading Notes 工作区)** — Yale 在左侧 Logseq 编辑器中创建日记 Block，输入要复盘的股票/代币代码，右侧 `klinecharts` 画布瞬间加载出对应的历史 K 线图。
2. **Trade Input Form (交易录入表单面板)** — Yale 点击“录入交易”按钮，弹出表单面板，Yale 输入买卖价格、数量，并勾选策略/错误归因标签（如 #突破买入、#FOMO）。
3. **Split-Screen K-Line View (Study Lab & Trading Notes 工作区)** — 交易数据静默写入 Logseq 块属性，右侧 K 线图自动回显买卖三角形标记；Yale 在图表上绘制一条支撑趋势线，点击“绑定状态”，将 K 线标的、周期、技术指标及划线 JSON 毫秒级写入 Logseq Block 属性 ✓

---

## Trigger Map Connections

**Persona:** Yale the Yield-Seeker (Primary ⭐)

**Driving Forces Addressed:**
- ✅ **Want:** 无摩擦的复盘心流体验 (时间戳毫秒跳转恢复 K 线状态，零截图依赖)
- ❌ **Fear:** 复盘记录的高摩擦导致半途而废 (拼图、裁剪、复制粘贴耗费心智)

**Business Goal:** ⭐ PRIMARY GOAL: 极致高效的复盘心流体验 (THE ENGINE)

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| 01.1 | `01.1-split-screen-kline-view/` | 在左侧 Logseq 输入标的代码，右侧 K 线图瞬间加载对应历史走势，完成标的初定位。 | 点击“录入交易”按钮，弹出表单面板。 |
| 01.2 | `01.2-trade-input-form/` | 在弹出的表单中录入买卖价、数量及归因标签。 | 点击“确认写入”，关闭表单并保存交易记录。 |
| 01.3 | `01.3-split-screen-kline-view/` | 自动在 K 线渲染买卖三角形标记，手动绘制趋势划线并一键绑定 K 线快照状态至 Logseq 笔记块属性。 | 点击“绑定状态”，成功写入 Block 并高亮完成。 ✓ |
