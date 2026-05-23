# Business Goals & Objectives

> Strategic goals and measurable objectives for logseq-trade-journal

**Document:** Trigger Map - Business Goals
**Created:** 2026-05-21
**Status:** COMPLETE

---

## Vision

建立一个基于 **Logseq DB (Database-first) API** 原生驱动的 TradingView 级别全交互式交易学习与复盘系统。本系统以高精度时间戳为绑定核心，实现左侧 Markdown/DB 笔记块与右侧动态 K 线图表状态的毫秒级双向跳转联动。在确保 100% 本地隐私的前提下，为跨市场交易者提供宏观资产净值（NAV）与投资组合风控看板，帮助交易者在复盘心流中不断精进交易认知。

---

## Business Objectives

### ⭐ PRIMARY GOAL: 极致高效的复盘心流体验 (THE ENGINE)
- **Statement:** 缩短交易复盘链路，通过高精度时间戳秒级双向跳转与零截图快照属性，将单笔交易复盘记录时间从 30 分钟降至 5 分钟内。
- **Metric:** 双向跳转延迟时间，零截图依赖率，平均单笔记录耗时。
- **Target:** 跳转延迟 <150ms，100% 零截图依赖，单笔交易记录与复盘时间 <5 分钟。
- **Timeline:** 3 个月
- **Impact:** 这一目标驱动所有其他目标。只有当记录和复盘变得毫无摩擦且极其流畅时，交易者才会乐意持续记录，从而沉淀出足够高质量的本地数据库，支撑后续的投资组合与策略归因分析。

---

### 🚀 PORTFOLIO & ATTRIBUTION ANALYSIS (Driven by Primary Goal)

**Objective 1: 多市场资产准确对账与 NAV 曲线生成**
- **Statement:** 自动聚合 A股、港股、美股、期货、加密货币等跨市场资产，进行 CNY/USD/USDT 实时汇率折算与对账，生成宏观 NAV 变动曲线。
- **Metric:** 多币种折算精度，NAV 曲线更新耗时，资产对账准确率。
- **Target:** 100% 折算准确率（误差为 0），NAV 曲线更新延迟 <200ms。
- **Timeline:** 4 个月

**Objective 2: 交易策略与错误归因看板 (TraderSync 核心优势)**
- **Statement:** 实现 K 线图上成交标记自动绘制，盈亏日历红绿看板，以及交易策略与错误标签的多维度过滤器。
- **Metric:** 标记绘制准确度，日历看板渲染响应延迟。
- **Target:** 买卖标记绘制准确率 100%，盈亏日历及过滤看板加载延迟 <100ms。
- **Timeline:** 5 个月

---

### 🌟 LOCAL-FIRST PRIVACY SECURITY (Real-World Benefits for the User)

**Note:** 这是 logseq-trade-journal 为使用者（Yale）创造的现实利益——确保个人最敏感的资产与交易策略数据完全掌控在自己手中，不受任何外部云端服务或审查的威胁。

**Objective 3: 零云端依赖的绝对数据隐私安全**
- **Statement:** 所有交易明细、个人资产分布、折算汇率、复盘笔记等敏感数据均完全保存在本地 Logseq DB 与本地 FastAPI 服务中。
- **Metric:** 外部网络请求拦截率，离线可用性。
- **Target:** 100% 外部未授权请求拦截（插件零外部外发连接），100% 离线完美运行。
- **Timeline:** 3 个月
- **Benefit to User:** 让 Yale 免受商业 SaaS 服务高昂订阅费及数据泄露的隐忧，提供持久、安全、真正本地化自给自足的交易复盘武器库。

---

## The Flywheel: How Goals Connect

**THE ENGINE (Priority #1):**
- 目标 1: 极致高效的复盘心流体验
- Timeline: 3 个月
- 这使得 Yale 能够随时毫无心理摩擦地记录交易。每一次点击 Block 与 K 线状态的高效联动，都增强了复盘心流的愉悦感，从而源源不断地积累精准的交易快照数据。

**PORTFOLIO & ATTRIBUTION (Priority #2):**
- 目标 2 & 3: 跨市场 NAV 与归因分析
- Timeline: 4-5 个月
- 只有在 Priority #1 沉淀了精确且高质量的本地数据流后，投资组合看板和策略归因分析才有了事实基础。Yale 能够直观洞察到哪些策略在赚取收益，哪些行为在造成回撤。

**LOCAL-FIRST SECURITY (Priority #3):**
- 目标 4: 零云端依赖的安全隐私
- Timeline: 3 个月
- 随着复盘数据与资产对账越发深入，数据隐私的重要性呈指数级上升。100% 本地化的运行机制让 Yale 无后顾之忧地扩充其系统，使其成为不可替代的个人核心数字资产。

---

## Success Metrics Alignment

### How Trigger Map Connects to Objectives (Properly Prioritized):

**⭐ PRIMARY: Creating Awesome Yale Who Becomes a Consistent Trader → Achieves:**
- ✅ **100% 零截图依赖** (THE ENGINE - Yale 摆脱了传统凌乱截图，习惯了以 Logseq 属性承载 K 线快照的轻量化工作流)
- ✅ **单笔复盘时长从 30min 缩短至 <5min** (极大地释放了复盘心智负担)
- ✅ **复盘思考与视觉上下文的无缝整合**
- **Timeline: 3 个月**
- **This drives ALL other objectives**

**🚀 SECONDARY: Consistent Review Data Drives Performance Optimization → Achieves:**
- ✅ **多币种 NAV 变动一目了然** (排除 CNY/USD/USDT 汇率波动的干扰)
- ✅ **TraderSync 级别的买卖点回显与策略标签过滤** (清晰定位优势策略与重灾区错误)
- ✅ **复盘日历盈亏一目了然** (通过可视化的红绿盈亏日历强化纪律感知)
- **Timeline: 4-5 个月**

**🌟 TERTIARY: Ultimate Platform Control Empowers Personal Digital Sovereignty → Achieves:**
- ✅ **100% 离线完美可用** (无任何未授权数据外传)
- ✅ **终身免订阅费的本地交易复盘系统** (摆脱对 SaaS 订阅的持续性开销)
- ✅ **数据完全本地双链控制** (随时可以使用 Logseq DB 原生接口开发其他个人统计视图)
- **Timeline: 3 个月**
- **Benefit: Yale 获得完全独立、自主的个人交易知识库与资产分析中枢。**

---

## Related Documents

- **[00-trigger-map.md](00-trigger-map.md)** - Visual overview and navigation
- **[02-Yale-the-Yield-Seeker.md](02-Yale-the-Yield-Seeker.md)** - Primary persona
- **[05-Key-Insights.md](05-Key-Insights.md)** - Strategic implications

---

_Back to [Trigger Map](00-trigger-map.md)_
