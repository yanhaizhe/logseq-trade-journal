# Key Insights & Strategic Implications

> How the Trigger Map informs design and development decisions for logseq-trade-journal

**Document:** Trigger Map - Key Insights
**Created:** 2026-05-21
**Status:** COMPLETE

---

## The Flywheel: Yale the Yield-Seeker Drives Everything

**THE ENGINE (Priority #1):**
- Yale the Yield-Seeker is the primary target group.
- Timeline: 3 个月
- 消除复盘笔记与 K 线状态链接的物理摩擦，建立零截图的高效复盘工作流。这极大地激发了 Yale 每日记录笔记的纪律性，成为沉淀精准历史数据的引擎。

**Performance Attribution (Priority #2):**
- 依赖于 Yale 持续记录的高精度复盘数据。
- Timeline: 4-5 个月
- 自动生成跨市场合并 NAV 曲线，并在 K 线图上标记成交、生成盈亏日历，从而帮助 Yale 定位高盈亏比的交易策略，过滤情绪化交易错误。

**Absolute Digital Sovereignty (Priority #3):**
- 随着复盘数据越发详尽，100% 本地隐私的重要性日益凸显。
- Timeline: 3 个月
- 无外部云端数据流动，确保 Yale 的核心资产明细、策略和缺陷统计永远完全在个人离线数据库中自给自足。

---

## Primary Development Focus

1. **Create Awesome Yale Who Becomes a Consistent Trader** - 帮助 Yale 从传统静态截图与分散记账中解脱出来，转型为纪律严明的系统化交易者。
2. **Eliminate Jump Friction** - 确保 Logseq 属性数据块与 K 线图表状态（标的、周期、划线 JSON、指标）之间的毫秒级双向跳转联动。
3. **Multi-Currency NAV Aggregation** - 精确聚合 CNY、USD、USDT 三种币种的折算，建立抗汇率漂移的合并净值收益曲线。
4. **Attribution & Execution Markers** - 仿照 TraderSync 在 K 线上实现精准买卖点回显与红绿盈亏日历，简化行为标记。
5. **Absolute Data Isolation** - 将所有读写操作闭环至 Logseq DB 原生接口与本地 FastAPI（`localhost:8765`）环回地址，杜绝网络泄露。

---

## Critical Success Factors

- **Sub-150ms Interaction Latency**: 从点击 Logseq 笔记块到右侧 K 线图载入指定标的、划线及指标的跳转渲染必须流畅无阻，否则会打破复盘心流。
- **100% Formula Accuracy**: 资产对账与多币种折算必须确保 0 误差，NAV 收益与回撤率的算法须严密无漂移，否则会导致交易反馈失真。
- **Screenshot-Free Implementation**: 必须建立起利用 Logseq 属性承载 K 线状态快照的逻辑，确保无需用户手动截图、贴图即可保存复盘视觉现场。
- **Zero Configuration Friction**: 本地 FastAPI 服务必须支持一键脚本自动启停，检测到 `.env` 中缺少特定 Token 时可静默优雅降级而不崩溃。
- **Pure Vanilla CSS Aesthetics**: 在无 Tailwind 及第三方组件库依赖的前提下，完全手写出精致暗黑毛玻璃风格的 UI，以获得极致的交互质感。

---

## Design Implications

### Content Priorities Based on Triggers:

**Split-Screen Workspace Must:**
- 实现左右视口左右拖拽自由缩放，支持在窄屏或宽屏下保持良好的排版平衡。
- 确保当鼠标在左侧 Logseq 笔记列表滚动或聚焦于某个含有时间戳属性的 Block 时，右侧 K 线图出现垂直的对应时间引导线。
- 在状态栏静默显示本地 FastAPI 服务的连接状态（OK、降级或离线）。

**Interactive K-Line Viewport Must:**
- 在图表工具栏中放置快速周期切换、常用指标（均线、成交量、MACD等）以及画线工具面板。
- 自动将 Block 绑定的画线 JSON 渲染至 Canvas，并支持在图表上手动拖拽划线，在松开鼠标时静默写入 Block 属性。
- 支持双击图表任意 K 线，在左侧自动定位或创建该时间戳对应的笔记块。

**Execution Markers Must:**
- 根据本地交易明细，在 price 轴对应的 Bar 上方或下方自动生成醒目的买（绿色向上三角形）与卖（红色向下三角形）标记。
- 在鼠标 hover 成交标记时，弹出极简的黑色半透明卡片，显示成交价、仓位变化以及归因标签。

**PnL Calendar Grid Must:**
- 以月份为单位展示盈亏日历格子，盈亏以深红（亏损）、深绿（盈利）及灰色（无交易）显示。
- 每个格子里静默展示当日的总收益金额，点击格子即可将左侧 Logseq 笔记列表过滤为该日的记录。

**NAV & Risk Dashboard Must:**
- 顶部放置醒目的总 NAV 折算本币值及总仓位暴露度（使用红色高亮风控杠杆报警）。
- 提供可交互折线图展示 NAV 走势，以及多市场（A股/Crypto/美股）资产占比饼图。

---

## Emotional Transformation Goals

- **无摩擦联动的掌控感**: "我在记录交易笔记时，点击文字就能立刻恢复当时K线的分析场景，感觉两边的数据融为一体，毫无阻力。"
- **资产穿透的清晰感**: "看着跨市场的资产自动合并换算成统一的NAV曲线，我终于对自己的整体仓位和资金管理有了绝对清晰的掌控。"
- **缺陷暴露的反思感**: "盈亏日历上的红绿分布和错误标签统计，让我直观地看到了自己的交易纪律缺陷，从而可以针对性地修正。"
- **隐私安全的踏实感**: "因为不需要把任何财务隐私上传到云端，我知道我的所有敏感资产数据和交易秘密都是绝对安全的。"
- **纪律交易的专业感**: "我不再是个被繁琐复盘截图和对账折磨得想放弃的业余玩家，而是一个纪律严明、逻辑清晰的系统化交易者。"

---

## Design Focus Statement

**The logseq-trade-journal workspace transforms Yale from an anxious, screenshot-burdened manual logger into a disciplined, data-driven system trader who uses interactive visual database links as a personal trading laboratory, not a static scrapbook.**

**Primary Design Target:** Yale the Yield-Seeker (Developer-Trader)

**Must Address (Critical for Flow & Privacy):**
1. 财务策略泄露隐忧 → 100% 本地 Logseq DB 接口读取 + 本地 FastAPI 解析，隔离外网。
2. 截图和手动记录的物理阻力 → 单击 Block 高精度时间戳跳转 K 线状态，划线自动转 JSON 属性保存。
3. 跨市场资产混乱与折算困难 → 自动拉取 CCXT 及 AKShare 汇率，一秒折算多币种 NAV。
4. 归因分析困难 → 自动映射买卖标记并关联至策略标签（FOMO、反弹等）。

**Should Address (Supporting UX Excellence):**
1. 盈亏日历红绿反馈 → 可视化日历展示，可直接点击跳转特定日交易。
2. 状态可视化 → 静默状态栏汇报 Tushare 等接口降级及本地进程通信。
3. 画线撤销重做 → 支持常用 TradingView 交互直觉，减少逻辑摩擦。

---

## Development Phases

### **First Deliverable: logseq-trade-journal Core Workspace**
Focus on empowering Yale to establish the basic frictionless review flow:
- **Workspace Layout** - 左右自由拖拽分屏，Vanilla CSS 毛玻璃暗黑配色。
- **FastAPI Core Service** - Python 接口爬取（CCXT/AkShare/YFinance），本地 8765 端口服务自动拉起与优雅降级。
- **Klinecharts Canvas Integration** - 加载 K 线核心画布，配置基本指标与双击锚定机制。
- **Bi-directional Binding** - Logseq DB API 读写属性，实现 Block 到 K 线状态的毫秒级恢复。

### **Future Phases: Advanced Analytics**
- **Phase 2: Multi-Currency NAV Dashboard** - 融合汇率自动折算与 NAV 折线图展示。
- **Phase 3: Execution Markers & Tooltips** - 在 Canvas 上动态绘制买卖箭头并挂载 hover 详情。
- **Phase 4: PnL Calendar & Filter Panel** - 红绿格日历，支持点击日期与标签条件过滤。
- **Phase 5: Drawing JSON Persistence** - 完善复杂技术划线（斐波那契、趋势通道等）的 JSON 读写，彻底告别截图依赖。

---

## Related Documents

- **[00-trigger-map.md](00-trigger-map.md)** - Visual overview and navigation
- **[01-Business-Goals.md](01-Business-Goals.md)** - Objectives and metrics
- **[02-Yale-the-Yield-Seeker.md](02-Yale-the-Yield-Seeker.md)** - Primary persona
- **[06-Feature-Impact.md](06-Feature-Impact.md)** - Feature mapping and prioritization scoring

---

_Back to [Trigger Map](00-trigger-map.md)_
