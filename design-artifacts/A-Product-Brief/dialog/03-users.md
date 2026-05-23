# Step 3: User Definition

**Completed:** 2026-05-21
**Session:** 1

---

## Opening Question

**Agent asked:**
在“学习系统”和“交易体系系统”下，你在日常使用时的具体工作流、操作习惯是怎样的？你最希望这个工具在你的日常交易学习/记录流中消除的“操作摩擦力”是什么？

**User's initial response:**
这三个问题希望你帮我回答，以便使用者可以能专注当前的信息。

---

## User Exploration

### Primary User Discovery

**Key exchanges:**

**Agent:** 为了帮使用者消除操作摩擦，我为你设计并拟定了以下三个维度的行为习惯与交互方式：
1. **学习模式（Study Mode）**：采用左右分栏布局（Split-Screen）。左侧是 Logseq 的 Markdown 笔记编辑区，右侧是嵌入式的交互式 K 线面板。支持“块级绑定”，点击笔记块，K 线自动还原到记录该笔记时的特定周期、时间戳和画线状态。
2. **交易与复盘模式（Trader Mode）**：采用模块化标签页（市场图表笔记、交易看板与录入、投资组合与资产分析）。在录入交易时，提供“计划 -> 执行 -> 复盘”的分步表单引导，并根据总资产自动推荐符合风控的仓位。
3. **操作摩擦力消除**：通过读取笔记中的日期/时间戳实现 K 线自动跳转；通过本地多币种（CNY, USD, USDT）自动折算生成 NAV 曲线；将图表状态 JSON 属性静默写入 Logseq 块实现“图表快照还原”。

**User:** C (确认并继续)

---

## Reflection Checkpoint

**Agent's synthesis:**
使用者需要一个高专注度的笔记环境。系统应当尽可能实现“自动化”与“静默化”，即：通过自动解析时间戳、多币种后台汇率折算、JSON 属性静默写入等技术，将看盘、做笔记、资产绩效分析无缝连接，消除跨软件切换和繁琐的手动翻找。

**User response:**
- [x] Confirmed
- [ ] Corrected

**Corrections (if any):**
无（由 Agent 拟定设计方案，用户确认通过）

---

## Primary User Definition

**Who they are:**
使用 Logseq 管理个人知识库，且同时在多个市场（A股、加密货币、美股、期货、港股、外汇）进行交易的**深度学习型与复盘型交易者**。

**Their context:**
* 追求数据隐私与本地优先（Local-First）。
* 拥有多市场账户，面临人民币(CNY)、美元(USD)、泰达币(USDT)等不同法币/代币的记账冲突。
* 习惯在 Logseq 中使用 Markdown 进行网状的双链笔记记录。

**Their frustrations:**
1. **截图即死图**：截图作为笔记素材无法交互，时间久了无法还原当时图表的指标设置和更大/更小周期的走势。
2. **跨账户对账繁琐**：多市场资产分散，无法一目了然看清自己的合并净值曲线（NAV）和当前的仓位风险敞口。
3. **操作链条过长**：在看盘软件画线后，需要截图、保存、插入 Logseq，然后手动记录标的代码和时间戳，操作极其繁琐。

**What they're trying to achieve:**
* 能够专注在“当前正在记录的信息”上，不用为了记笔记或算账而分心去调整图表或进行复杂的跨账户汇率换算。
* 实现“图表即笔记”的体验：在图表上画线等于在 Logseq 记笔记，在 Logseq 记笔记可以随时还原动态图表。

**How they currently solve this:**
使用 TradingView/富途等软件看盘，截图插入 Logseq，再用 Excel 记录每笔交易并手动计算 NAV，信息割裂严重。

---

## Secondary Users (if applicable)

**User 2:** None (本插件为纯个人使用的非商用工具， Yale 为唯一用户)

---

## User Scenarios Captured

**Scenario 1: 理论学习与图形还原**
Yale 在阅读缠论或均线系统理论时，在 Logseq 写下“[[BTC]] 日线级别出现均线多头排列”。右侧 K 线图表自动跳转到 BTC 的日线级别，他直接在图表上画出趋势线。此后无论何时，只要他在 Logseq 里点击这行笔记，右侧 K 线图都会精准还原到当时他画了趋势线的 BTC 日线画面。

**Scenario 2: 连贯交易录入与风控**
收盘后，Yale 准备录入一笔交易。他打开交易录入面板：
1. 输入标的与计划止损点，系统根据他当前多账户合并的总资产（已折算），自动提示他“若止损，损失控制在总资产 1% 内的推荐仓位”。
2. 录入实际买入和卖出数据，系统自动将这笔交易的盈亏折算为本币，计入总资产库。
3. 投资组合看板中，整体 NAV 净值曲线和 A股/加密货币/美股的风险敞口比例图表自动更新。

---

**Documented in:** `wds-project-outline.yaml` → `users`
