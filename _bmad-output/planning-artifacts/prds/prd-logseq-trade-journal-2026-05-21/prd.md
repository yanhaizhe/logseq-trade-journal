---
title: logseq-trade-journal PRD
created: 2026-05-21
updated: 2026-05-21
status: final
---

# PRD: logseq-trade-journal

*基于 Logseq DB API 的本地优先交易复盘与资产净值（NAV）看板插件。*

---

## 0. 文档目的

本 PRD 面向 **开发者兼唯一用户 Yale**（未来迭代的回溯参考）以及后续工作流（架构设计 `bmad-create-architecture`、Epic/Story 分解 `bmad-create-epics-and-stories`、开发实现 `bmad-dev-story`）。

本 PRD 建立在已有的 [WDS 产品简报](file://design-artifacts/A-Product-Brief/01-product-brief.md)、[Trigger Map](file://design-artifacts/B-Trigger-Map/00-trigger-map.md)、[UX 场景规格](file://design-artifacts/C-UX-Scenarios/00-ux-scenarios.md)（7 页）以及 [DD-001/002/003 设计交付包](file://design-artifacts/deliveries/) 之上，**不重复搬运**这些产物，而是聚焦于设计与实现之间的翻译层——数据契约、功能需求的精确拆解、范围边界、以及术语纪律。功能和架构决策参考 [project-context.md](file://_bmad-output/project-context.md)。

全文档以 §3 Glossary 锚定词汇，§4 Features 以全局编号 FR-N 定义功能需求，§4 中的 `[ASSUMPTION: ...]` 标签在 §9 汇总确认。

---

## 1. 愿景

logseq-trade-journal 是一款 **Logseq 桌面插件**，为跨市场交易者 Yale 提供 **TradingView 级别的全交互式 K 线复盘工作区**。核心能力：在 Logseq 左侧笔记 Block 与右侧实时 K 线图表之间建立毫秒级双向跳转联动——输入标的代码后 K 线瞬间加载，点击 Block 可一键还原当时图表的完整状态（标的、周期、技术划线、指标）。

它解决的根本问题是：**传统截图式复盘使得图表上下文丧失——Yale 回顾一笔交易时只能看到静态截图，无法与实时 K 线交互、无法验证当时画的技术分析、无法关联策略标签做批量归因分析。** 而在 TraderSync 等云端竞品面前，Yale 拒绝将敏感财务数据上传至商业 SaaS。

本产品以 **100% 本地运行、零外部网络流出** 为底线，交易笔记和数据全部存储在本地 Logseq 图谱和本地 IndexedDB 中。它是 Yale 个人的交易实验室——不是静态剪贴簿，而是可交互、可回放、可审计的复盘引擎。

---

## 2. 目标用户

### 2.1 主要用户画像

**Yale the Yield-Seeker**（唯一用户兼开发者）

跨市场交易者（A 股、加密货币、未来扩展至美股/期货），兼做日内和波段交易，所有级别周期都会查看。Logseq 重度笔记用户，讲求系统化、数据驱动的复盘方法论，对繁琐的截图拼图和手动多币种折算有极低容忍度。隐私至上——绝不将核心净值和交易策略上传到商业云端 SaaS。需要长期维护的复盘系统，工具既是他自己的开发产物，也是持续迭代的个性化交易日志。

### 2.2 工作要完成的事（JTBD）

- **当 收盘后坐在书桌前**，我想 **快速记录当日每一笔交易（品种、方向、价格、数量、策略标签、错误标签）并毫秒级绑定到对应 K 线状态**，以便 **零截图依赖地完成无摩擦复盘**。
- **当 每周/每月的阶段复盘时**，我想 **看到多账户折算后的总资产净值（NAV）走势和红绿盈亏日历**，以便 **宏观透视资金曲线的健康状况**。
- **当 连续亏损或盈利异常时**，我想 **按归因标签（如 #FOMO、#突破买入）过滤交易记录并查看该标签的累计盈亏与最大回撤**，以便 **定位拖累绩效的核心行为模式并制定纠正纪律**。
- **当 首次安装或本地环境变更时**，我想 **一眼看到所有本地服务（FastAPI、数据源 Token）的健康状态**，以便 **一分钟内完成密钥配置并进入工作区**。

### 2.3 非目标用户（v1）

- 移动端用户（iOS/Android）—— v1 仅支持桌面端
- 多用户协作/团队 —— 单人使用，无权限系统
- 非中文交易市场用户 —— v1 界面仅中文
- 程序化/量化交易者 —— v1 不做自动交易执行或策略回测

### 2.4 关键用户旅程

以下 4 条 UJ 覆盖 3 个 DD 交付包的完整闭环：

**UJ-1. Yale 完成一笔交易的复盘并绑定 K 线快照。**

Yale 收盘后打开 Logseq，在左栏新建交易复盘 Block。他输入标的代码 `000001`，右侧 K 线画布瞬间加载日线走势。他点击「录入交易」，弹出的毛玻璃表单中填写买入价 12.50、数量 1000、勾选策略标签 #突破买入 和错误标签 #FOMO，点击确认。买卖三角形标记自动渲染到 K 线对应位置。他绘制趋势线，点击「绑定状态」——K 线快照（符号、周期、划线 JSON）毫秒级写入 Block 属性，按钮高亮完成。**高潮时刻：** 他关闭插件，第二天重新打开，点击昨天的 Block，右侧 K 线瞬间还原当时的图表状态——他可以在趋势线上继续分析。

- **入口状态：** Logseq 桌面端打开，插件双栏已加载。
- **路径：** 新建 Block → 输入代码 → K 线加载 → 录入表单 → 提交 → 标记渲染 → 绘制趋势线 → 绑定快照。
- **边缘情况：** 如果 FastAPI 未启动，底部状态栏红灯 + 一键复制 `./start.sh` 命令。

**UJ-2. Yale 做月底绩效审计——找出亏损源头。**

Yale 切换到 Dashboard 标签页，看板显示多账户折算后的 NAV 折线图（CNY）和本月红绿盈亏日历。他点击「进入归因过滤」按钮，进入审计视图。他在标签区勾选 #FOMO 和 #逆势抗单（AND 逻辑），左侧汇总卡实时计算这两个标签的累计亏损、胜率和最大回撤，下方交易表联动过滤。他双击一笔亏损大户记录，侧边栏在 100ms 内自动打开原始 Logseq Block——他能直接阅读当时写的复盘笔记。最后点击右下角金色导出按钮，MD 审计报告复制到剪贴板。

- **入口状态：** 从 Dashboard 入口进入，前提是已有 DD-001 产生的 TradeRecord 数据。
- **路径：** Dashboard → 查看 NAV + 盈亏日历 → 进入归因过滤 → 勾选标签 → 查看统计 → 双击穿透 → 导出报告。
- **边缘情况：** 无交易记录时 NAV 和日历显示空状态提示，过滤器按钮 disabled。

**UJ-3. Yale 首次安装插件，配置本地环境。**

Yale 首次启用插件，进入 03.1 欢迎自检页。三个服务指示灯在 200ms 内完成检测：FastAPI 红灯（未启动）、Tushare 绿灯（已验证）、本地数据库绿灯。他悬停 FastAPI 红灯旁的帮助图标，磨砂卡片显示 `ECONNREFUSED` 错误码和 `./start.sh` 命令，点击一键复制。他打开终端执行 `./start.sh` 启动 FastAPI 后，点击「重新自检」——所有灯转绿。他点击「进入工作区」，直接进入 UJ-1 的复盘页面。

- **入口状态：** 首次安装插件，或底部状态栏错误图标跳转。
- **路径：** 自检仪表盘 → 排查红灯 → 启动 FastAPI → 重新自检 → 进入工作区。
- **边缘情况：** 全部绿灯时「进入工作区」可用；任何红灯时按钮 disabled 并提示修复。

**UJ-4. Yale 在任意级别 K 线上做笔记并与 Block 双向关联。**

Yale 在日线 K 线图上看到一根关键突破阳线，他右键选择「在此创建笔记」。插件自动在 Logseq 左侧创建一个新 Block，属性自动注入 `symbol=000001, interval=1d, timestamp=2026-05-20T10:30:00`。他写下"放量突破前高，量比 2.3"。之后他切换到 30 分钟线分析当日分时，又创建了一个 Block——这次 `interval=30m`。任何时候点击任意一个 Block，右侧 K 线会自动定位到该级别该时刻。

- **入口状态：** K 线图上交互操作，插件保持活跃。
- **路径：** K 线上创建笔记 → 属性自动注入 → 编辑笔记内容 → 未来点击 Block → K 线还原到该级别该时刻。
- **边缘情况：** 如果该时刻的 K 线数据已不在 IndexedDB 缓存中（超出保留策略），K 线定位到最近可用数据点并提示「历史数据可能不完整」。

---

## 3. 术语表

下游工作流和读者必须严格使用以下术语。在 PRD 中引入新术语的同义词即为纪律违规。

- **Block（块）** — Logseq 中最小内容单元，可带有属性（properties）。本产品中每个交易复盘对应一个 Block。
- **Block 属性（Block Properties）** — Logseq DB API 中的 `block/properties` 字段，存储键值对元数据（如 `trade-symbol`、`trade-price`）。本产品通过 DB API 读写属性，不解析 Markdown 文本。
- **TradeRecord（交易记录）** — 一笔完整交易的核心元数据结构，字段：`direction`、`price`、`size`、`timestamp`、`strategy_tags`、`error_tags`。持久化于 Block 属性中。
- **KlineSnapshot（K 线快照）** — 某个 Block 在特定时刻绑定的图表状态，字段：`symbol`（标的）、`interval`（周期）、`drawing_json`（Canvas 划线数据，上限 50 条对象）、`indicator_json`（指标配置）、`timestamp`（锚点时间，精度到秒）、`bound_block_id`（关联 Block UUID）。
- **标的（Symbol）** — 交易品种代码。遵循规范化规则：A 股 6 位数字、美股全大写、加密货币 `BASE/QUOTE` 格式。
- **周期/级别（Interval）** — K 线时间粒度，支持 `1m`、`5m`、`15m`、`30m`、`1h`、`4h`、`1d`、`1w`、`1M`。
- **归因标签（Attribution Tag）** — 用户自定义的策略/错误分类标签，前缀 `#`（如 `#突破买入`、`#FOMO`）。每个 TradeRecord 可挂载多个标签。
- **NAV（资产净值）** — 多账户在选定基准币种下折算后的总净资产。
- **盈亏日历（PnL Calendar）** — 月度日历网格，按日着色：绿色=当日盈利、红色=当日亏损、无色=无交易。
- **InstrumentConfig（品种配置）** — 每种标的的个性化设置：`symbol`、`name`、`market`（市场类型）、`preferredProvider`（首选数据源覆盖）、`timeframePresets`（常用周期）、`enabled`（是否激活）。存储在 Logseq localStorage `tj_instrument_config` 键下。
- **Provider（数据提供方）** — 实现统一接口 `BaseProvider` 的数据源适配器。现有实现：TushareProvider、AKShareProvider、YFinanceProvider、CCXTProvider、SinaProvider。
- **FastAPI 环回服务** — 运行于 `127.0.0.1:8765` 的 Python 后端，是前端与外部数据源的唯一通信出口。前端 React 不得直接调用任何外部 API。

---

## 4. 功能需求

以下 6 个能力域对应 DD-001/002/003 和 UJ-1 到 UJ-4。每个域先描述行为，再以全局编号 FR-N 定义功能需求。

### 4.1 分屏工作区与双向跳转（THE ENGINE）

**描述：** 核心交互范式——左侧 Logseq 原生编辑器（宿主提供，插件不控制），右侧插件 WebView 渲染 K 线图表。用户在左侧 Block 中输入标的代码或点击已有 Block 时，右侧 K 线在 < 150ms 内加载对应级别和时刻；反向：在 K 线图上任意级别创建笔记，Block 自动注入 `symbol + interval + timestamp` 三要素属性。实现 UJ-1、UJ-4。

#### FR-1: 标的代码输入触发 K 线加载
用户在 Logseq Block 中输入标的代码后，右侧 klinecharts 画布在 < 2s 内加载对应历史 K 线走势。输入空字符串或无效代码时显示空状态提示。

**可测后果：**
- 输入 `000001` 后 K 线日线图加载完成，Performance API `fetchStart → applyNewData` < 2000ms。
- 输入无效代码 `ZZZZZZ` 后画布显示「未找到该标的」占位提示。

#### FR-2: Block 点击毫秒级还原 K 线状态
用户点击已绑定 KlineSnapshot 的 Block 后，右侧 K 线在 < 150ms 内跳转到 `symbol + interval + timestamp` 指定的图表状态，加载 `drawing_json` 恢复所有技术划线，加载 `indicator_json` 恢复指标叠加。

**可测后果：**
- `performance.now()` 从点击事件到 `klinecharts.applyNewData()` 差值 < 150ms。
- Canvas 上的趋势线、水平线、斐波那契回撤等划线完整还原。

#### FR-3: 任意级别 K 线创建笔记并自动注入属性
用户在 K 线图上右键选择「在此创建笔记」，插件在当前级别和时刻创建一个新 Block，属性自动注入 `trade-symbol`、`trade-interval`、`trade-timestamp`（精度到秒）。Block 内容包含级别信息（如「1d · 2026-05-20 10:30」）。

**可测后果：**
- 日线图创建笔记 → `trade-interval = "1d"`；30 分钟线创建 → `trade-interval = "30m"`。
- Block 创建后 Logseq 侧边栏自动展开该 Block。
- 点击该 Block 后 K 线还原到创建时的级别和时刻。

#### FR-4: 多级别切换联动
用户切换 K 线周期（如从日线切换到 30 分钟线），当前 Block 的绑定关系不丢失，但新创建的 Block 使用当前选中的级别。同一个标的的多个 Block 可绑定不同级别。

**可测后果：**
- 在日线绑定的 Block A 点击后还原到日线，在 30 分钟线绑定的 Block B 点击后还原到 30 分钟线。
- 切换周期不影响已有的 KlineSnapshot 数据。

#### FR-5: 分屏比例拖拽记忆
用户可拖拽调整左右分栏宽度比例，比例持久化到 localStorage，下次打开恢复。

**可测后果：**
- 拖拽后 `localStorage.tj_split_ratio` 存储当前比例值。
- 重新打开插件时按存储比例渲染。

**此功能域特有 NFR：**
- K 线跳转延迟 < 150ms（性能硬约束，对应 SM-1）。
- Canvas 渲染帧时间 < 16ms（60fps）。

**待解问题：**
- `[NOTE FOR PM]` 画线 JSON 超过 Logseq 属性值长度限制时的降级策略待验证（Logseq Datascript 对属性值长度的实际限制）。

### 4.2 交易笔记录入

**描述：** 弹出式毛玻璃表单面板，Yale 输入买卖方向、价格、数量，勾选策略标签和错误标签。表单提交后数据写入 Logseq Block 属性，买卖三角形标记自动渲染到 K 线对应时间位置。实现 UJ-1。

#### FR-6: 交易表单弹出与填写
点击「录入交易」FAB 按钮后，Glassmorphism Card Overlay 居中弹出，包含：方向切换（买/卖）、价格 Numeric Input、数量 Numeric Input、策略标签复选区、错误标签复选区。

**可测后果：**
- 方向默认「买入」，点击切换为「卖出」。
- 价格输入负值或 0 时前端校验阻止，边框变红 + 提示「价格必须大于 0」。
- 空字段提交时表单不关闭，空字段红色边框 + 下方「必填项」提示。

#### FR-7: 提交表单并写入 Block 属性
点击「确认写入」后表单关闭，`TradeRecord`（direction、price、size、timestamp、strategy_tags、error_tags）写入当前 Block 的属性中。Block 中自动追加一行可读的交易摘要文本。

**可测后果：**
- 通过 Logseq DB API 查询 `block.properties` 可读到完整的 TradeRecord 字段。
- 买卖三角形标记在 K 线 Canvas 对应时间位置渲染，买入绿色三角、卖出红色三角。
- `[ASSUMPTION: 标记位置以 trade.timestamp 为锚点——TradeRecord 中的 timestamp 字段精度为秒级，与 K 线 OHLC 数据的 timestamp 对齐。]`

#### FR-8: 防重复提交流程
「确认写入」按钮在首次点击后立即 disabled 并显示 loading 动画，50ms 防抖窗口内重复点击无效，仅触发一次写入。

**可测后果：**
- 连续快速点击 5 次后 Logseq DB 中仅存在一条 TradeRecord。
- 提交过程中按钮不可点击、显示 loading。

**此功能域特有 NFR：**
- 表单提交响应 < 50ms（纯本地 Logseq DB 写入）。

### 4.3 K 线图表与买卖标记

**描述：** 基于 klinecharts + @klinecharts/pro 的专业图表渲染，支持周期切换、缩放、平移、指标叠加。交易记录提交后买卖三角形标记自动渲染，hover 弹出微卡片显示交易详情。Canvas 划线工具支持趋势线、水平线、斐波那契等图形。实现 UJ-1。

#### FR-9: K 线图表核心交互
用户可通过鼠标滚轮缩放图表、拖拽平移、点击周期按钮切换 `1m/5m/15m/30m/1h/4h/1d/1w/1M` 级别。

**可测后果：**
- 切换周期后加载对应级别的 OHLC 数据。
- 缩放时屏幕内 K 线数量自适应。

#### FR-10: 买卖标记渲染
TradeRecord 提交后，Canvas 在 `trade.timestamp` 对应位置渲染买卖三角形标记。hover 标记时弹出 Absolute Floating Micro Card 显示方向、价格、数量。

**可测后果：**
- 同一标的多个 TradeRecord 的标记全部渲染，不重叠。
- Hover 微卡片在 50ms 内弹出并跟随鼠标位置。
- `[ASSUMPTION: 标记只在用户当前选中的标的和级别上渲染——跨标的标记不在其他标的图上显示。]`

#### FR-11: Canvas 划线工具
用户可绘制趋势线、水平线、斐波那契回撤线等图形。所有划线对象的 JSON 数据在点击「绑定状态」时序列化写入 Block 属性，并可通过 FR-2 还原。

**可测后果：**
- 绘制趋势线后拖拽控制点可调整。
- 划线对象上限 50 条，第 51 条时 Toast 提示「最多保存 50 条划线」。
- `[ASSUMPTION: 划线 JSON 使用 klinecharts 原生 DrawingData 格式序列化，无需额外解析层。]`

#### FR-12: K 线快照绑定与还原
用户点击「绑定状态」按钮后，KlineSnapshot（包含 symbol、interval、drawing_json、indicator_json、timestamp、bound_block_id）写入当前 Block 属性。按钮高亮绿色脉冲完成反馈。

**可测后果：**
- Block 属性中包含完整 KlineSnapshot JSON。
- 点击已绑定的 Block 后 FR-2 触发还原。

### 4.4 资产净值看板与盈亏日历

**描述：** 跨市场多账户资产净值展示，按选定基准币种自动折算。月度红绿盈亏日历显示每日盈亏分布。实现 UJ-2。

#### FR-13: 多账户 NAV 走势
Dashboard 看板展示多账户折算后的 NAV 折线图。用户可切换基准币种（CNY/USD/USDT），选择查看全部账户或特定账户。

**可测后果：**
- 切换基准币种后 NAV 曲线实时重算 < 100ms。
- Hover NAV 数据点时，毛玻璃悬停卡显示当日总资产 + 各子账户分项 + 当日涨跌幅 + 所用汇率及更新时间。

#### FR-13a: 多源汇率引擎与时效存储
通过 FastAPI 从多个数据源获取汇率（优先级：Tushare → CCXT → YFinance），任一源可用即可。每条汇率记录携带 `fetch_timestamp`（获取时间戳）和 `source`（数据来源）写入 IndexedDB。汇率缓存有时效标记，获取时间超过阈值则触发自动刷新。

**可测后果：**
- IndexedDB 中汇率记录包含 `rate`、`fetch_timestamp`、`source`、`valid_until` 字段。
- Tushare 不可用时自动 fallback CCXT → YFinance。
- 状态栏显示当前汇率来源和更新时间（如「汇率: Tushare · 15:30」）。
- 用户可在设置中配置汇率刷新间隔（默认 24h，最小 1h）。
- `[ASSUMPTION: 每个币种对（如 USD/CNY、USDT/CNY）独立缓存和刷新，不同币种对齐的刷新时间可以不同。]`

#### FR-14: 月度盈亏日历
CSS Grid 渲染月度日历矩阵。每个有交易的日期单元格以红/绿色标识盈亏：绿色=当日盈利、红色=当日亏损、无色=无交易。

**可测后果：**
- 月度日历加载 < 100ms。
- Hover 日历单元格弹出微卡片：当日净盈亏、交易总笔数、胜率、最大单笔亏损。
- 点击左右月箭头切换月份，淡入淡出动画 < 150ms。

#### FR-15: 四窗口时间聚合
「日/周/月/年」四级分段复盘。StatisticsEngine 提供 `aggregateByDay(trades)` / `aggregateByWeek(trades)` / `aggregateByMonth(trades)` / `aggregateByYear(trades)` 四个纯函数，输出标准 `WindowStats` 结构（netPnl、winRate、profitFactor、maxDrawdown、tradeCount、avgHoldingHours、topTagGain、topTagLoss）。

**可测后果：**
- 窗口切换时纯前端内存计算，延迟 < 50ms。
- `avgHoldingHours` 正确区分日内交易（< 6h）与摇摆交易（> 6h）。
- `[ASSUMPTION: 按 trade.exitTime 的本地时区对齐跨市场交易，不做跨时区归一化。]`

### 4.5 归因过滤与审计

**描述：** 按策略/错误标签过滤交易记录。标签 AND/OR 逻辑组合，实时统计过滤后交易集的累计盈亏、胜率、最大回撤。双击交易行穿透至原始 Logseq Block。一键导出 MD 审计报告。实现 UJ-2。

#### FR-16: 标签过滤器
勾选/取消归因标签复选框，支持 AND（同时匹配所有选中标签）和 OR（匹配任一标签）逻辑切换。标签搜索框支持模糊匹配。

**可测后果：**
- 勾选 #FOMO 标签（AND 模式），仅显示同时包含 #FOMO 的交易。
- 勾选 #FOMO + #突破买入（OR 模式），显示包含任一的交易。
- 搜索框输入「抗单」→ 回车自动选中匹配的 #逆势抗单 标签。
- 标签切换 50ms 防抖，最终过滤结果渲染 < 50ms。

#### FR-17: 归因统计卡
标签选中后左侧 Attribution Stats Card 实时更新：累计盈亏（大号数值）、胜率（百分比）、最大回撤（金额+日期）、交易频率。

**可测后果：**
- 勾选标签后统计卡数值 < 50ms 内更新。

#### FR-18: 交易表与双击穿透
过滤后的交易记录以表格展示（日期、标的、方向、价格、数量、盈亏、标签）。双击任意行，Logseq 侧边栏在 < 100ms 内自动聚焦并打开对应的原始 Block。

**可测后果：**
- 双击行后 Logseq API 唤醒并聚焦 Block。
- 虚拟滚动：> 100 行时仅渲染可视区域（首屏 50 行）。

#### FR-19: 一键导出审计报告
点击右下角金色导出 FAB，结构化 MD 审计报告生成并复制至剪贴板，Toast 提示「已复制审计报告」。如剪贴板权限未授予，展开报告文本区域供手动复制。

**可测后果：**
- MD 报告包含过滤器条件、汇总统计、交易明细表。
- 无剪贴板权限时有降级路径。

### 4.6 本地引导与系统健康

**描述：** 首次安装或本地环境异常时，欢迎自检页展示 FastAPI、Tushare Token、本地数据库三项健康检测。红灯时提供一键复制的排查指令。Token 配置弹窗支持遮罩切换、远程校验、原子写入 .env。实现 UJ-3。

#### FR-20: 三服务自检
进入欢迎页后 200ms 内完成 FastAPI（`GET /health`）、Tushare Token（校验端点）、本地数据库（SQLite 连接检测）三项自检。每项以绿/黄/红灯表示就绪/降级/不可用。

**可测后果：**
- FastAPI 未启动 → 红灯 + 文本「未连接」。
- Tushare Token 有效 → 绿灯 + 文本「已验证」；无效 → 红灯。
- 全部绿灯后「进入工作区」按钮可用。

#### FR-21: 红灯排查助手
悬停红灯旁帮助图标，弹出磨砂玻璃卡片显示错误码（如 `ECONNREFUSED`）和排查命令（如 `./start.sh`）。点击命令可一键复制至剪贴板，显示「指令已复制」绿字。

**可测后果：**
- 命令复制后终端粘贴即可执行。
- Terminal 风格代码块使用等宽字体（JetBrains Mono / Fira Code）。

#### FR-22: Token 配置弹窗
Token 输入框默认遮罩（password 类型），点击眼睛图标切换明文/遮罩（延迟 < 100ms）。点击「保存并测试」后通过 FastAPI 代理向 Tushare 发起测试连接（校验响应 < 2s），校验通过才将 Token 写入本地 `.env`。校验失败时弹窗不关闭并显示红色提示。

**可测后果：**
- 无效 Token 校验失败后不写入 .env。
- 校验超时（> 5s）→ 提示「网络超时」，不写入。
- 空 Token 提交被前端阻止，按钮半透明 + 提示「最少 20 个字符」。
- Esc 键关闭弹窗、放弃修改、.env 不变。

#### FR-23: 重新自检
点击「🔄 重新自检」按钮后所有指示灯转为橙色呼吸动画，150ms 内静默更新结果。

**可测后果：**
- Token 配置完成后重新自检 → Tushare 灯由红转绿。

---

## 5. 系统架构与数据契约

### 5.1 架构拓扑

```
Logseq 宿主（左侧原生编辑器）
    │  postMessage
    ▼
React 插件 WebView（右侧 K 线图表）
    │  HTTP REST JSON
    ▼
FastAPI localhost:8765（唯一外部通信出口）
    │
    ├── Tushare（A 股）
    ├── AKShare（A 股免费备选）
    ├── CCXT（加密货币）
    ├── YFinance（美股）
    ├── 汇率源：Tushare / CCXT / YFinance（多源互为 fallback）
```

关键约束：
- 前端 React 不得发起任何外部网络请求，所有外部数据通过 FastAPI 代理。
- 左侧 Logseq 编辑器由宿主提供，插件不控制其渲染。
- 前端与 Logseq 宿主通过 `window.parent.postMessage()` 通信，读写 Block 属性。

### 5.2 Logseq Block 属性 Schema

所有交易相关数据以 `trade-` 前缀的属性存储在 Block 中：

| 属性名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `trade-symbol` | string | 是 | 规范化标的代码 |
| `trade-interval` | string | 是 | K 线级别（1d、30m 等） |
| `trade-timestamp` | ISO 8601 | 是 | 锚点时间，精度到秒 |
| `trade-direction` | "买入" \| "卖出" | 是 | 交易方向 |
| `trade-price` | number | 是 | 成交价格，> 0 |
| `trade-size` | number | 是 | 成交数量，> 0 |
| `trade-strategy-tags` | string[] | 否 | 策略标签数组，如 `["#突破买入"]` |
| `trade-error-tags` | string[] | 否 | 错误标签数组，如 `["#FOMO"]` |
| `trade-kline-snapshot` | JSON string | 否 | KlineSnapshot 序列化 JSON |

### 5.3 KlineSnapshot JSON Schema

```json
{
  "symbol": "000001",
  "interval": "1d",
  "timestamp": "2026-05-20T10:30:00+08:00",
  "drawings": [{ "type": "trendLine", "points": [...], "style": {...} }],
  "indicators": [{ "type": "MA", "params": { "period": 20 } }],
  "bound_block_id": "uuid-of-logseq-block"
}
```

约束：`drawings` 数组上限 50 条对象，超出时 Toast 提示。

### 5.4 IndexedDB 缓存 Schema

| 存储 | 键 | 值 | TTL |
|------|-----|-----|------|
| K 线数据 | `kline/{symbol}/{interval}` | OHLCV 数组 | 按周期：1m/5m/15m/30m=7 天，1h/4h=30 天，1d/1w/1M=365 天 |
| 汇率缓存 | `fx/{from}/{to}` | `{ rate, fetch_timestamp, source, valid_until }` 时效标记结构 | 用户可配（默认 24h，最小 1h） |

`[ASSUMPTION: IndexedDB 缓存键的 TTL 策略如上表——过期数据在下次读取时惰性清理。]`

### 5.5 多品种配置注册表（InstrumentConfig）

每种标的的配置存储在 `localStorage.tj_instrument_config`（JSON 数组）：

```json
[{
  "symbol": "000001",
  "name": "平安银行",
  "market": "cn_stock",
  "preferredProvider": "tushare",
  "timeframePresets": ["1d", "1h", "30m"],
  "enabled": true
}]
```

`[ASSUMPTION: InstrumentConfig 由 Yale 手动维护，v1 不做 GUI 配置界面。新增品种通过直接编辑 JSON 或未来 CLI 工具完成。]`

### 5.6 Provider 降级矩阵

| 市场 | 优先级 1 | 优先级 2 | 优先级 3 | 全部不可用时 |
|------|---------|---------|---------|-----------|
| A 股 | Tushare | AKShare | Sina | 显示缓存数据 + 状态栏黄灯 |
| 加密货币 | CCXT | YFinance | — | 显示缓存 + 黄灯 |
| 美股 | YFinance | — | — | 显示缓存 + 黄灯 |

**汇率数据源降级链（独立）：**

| 币种对示例 | 优先级 1 | 优先级 2 | 优先级 3 | 全部不可用时 |
|-----------|---------|---------|---------|-----------|
| USD/CNY | Tushare | CCXT | YFinance | 继续使用最近一次缓存值（只要 `valid_until` 未过） + 状态栏提示「汇率未刷新」 |
| USDT/CNY | CCXT | Tushare | — | 同上 |

per-instrument 覆盖：如果 `InstrumentConfig.preferredProvider` 非空，优先使用指定 Provider，跳过默认优先级链。

### 5.7 时间窗口聚合器

纯前端 JavaScript 内存计算，输入 `TradeRecord[]` 全集，输出 `WindowStats` 结构。性能约束：1000 笔 TradeRecord 的任意窗口聚合 < 50ms。四个窗口函数：

| 函数 | 自然时间边界 |
|------|------------|
| `aggregateByDay(trades)` | 自然日 00:00-23:59 |
| `aggregateByWeek(trades, weekStart='monday')` | 周一 00:00 → 周日 23:59 |
| `aggregateByMonth(trades)` | 自然月 1 日-月末 |
| `aggregateByYear(trades)` | 自然年 1/1-12/31 |

`[ASSUMPTION: 所有时间按 trade.exitTime 的本地时区对齐。A 股 T+1 和加密货币 7×24 的交易时间差异在聚合层不做特殊处理——按日历日分组即可。]`

---

## 6. 跨域非功能需求

### 6.1 性能

| 指标 | 目标 | 来源 |
|------|------|------|
| Block→K 线跳转延迟 | < 150ms | DD-001 / SM-1 |
| K 线初始加载 | < 2s | DD-001 |
| 表单提交响应 | < 50ms | DD-001 |
| Canvas 标记渲染 | < 16ms (60fps) | DD-001 |
| 自检响应 | < 200ms | DD-003 |
| 盈亏日历加载 | < 100ms | DD-002 |
| 标签过滤联动 | < 50ms（含 50ms 防抖） | DD-002 |
| 时间窗口聚合（1000 笔） | < 50ms | §5.7 |

### 6.2 安全与隐私

- **零外部网络流出：** 前端 React 仅与 `127.0.0.1:8765` 通信，不发起任何跨域或外部请求。
- **Token 存储：** Tushare Token 通过 FastAPI 端点以原子操作（先写临时文件再 rename）写入本地 `.env`。
- **100% 本地运行：** 无云端数据库、无遥测、无第三方 CDN。
- **Logseq 原生安全：** 所有交易数据存储在 Logseq 本地图谱中，跟随 Logseq 自身的同步机制（如 Logseq Sync）。

### 6.3 可用性与降级

**错误层级矩阵：**

| 层级 | 场景 | UX 行为 |
|------|------|---------|
| 致命 | FastAPI 未启动（端口不可达） | DD-003 欢迎页红灯 + 一键复制启动命令；DD-001/002 不可用 |
| 降级 | Tushare Token 无效 | 底部状态栏黄灯 + 自动 fallback AKShare |
| 降级 | 所有 Provider 不可用 | 显示 IndexedDB 缓存数据 + 底部状态栏提示数据新鲜度 |
| 静默 | 汇率缓存过期 | 继续使用缓存值 + 状态栏小字提示「汇率未刷新」 |
| 暂时 | Provider 请求超时 | Toast 通知 + 自动重试 1 次 |

### 6.4 数据持久化与韧性

| 数据类型 | 存储位置 | 生命周期 | 备份/迁移 |
|----------|---------|---------|----------|
| TradeRecord 元数据 | Logseq DB Block 属性 | 永久（跟随图谱） | Logseq 图谱备份 |
| K 线 OHLCV 数据 | 插件 IndexedDB | 按周期 TTL（见 §5.4） | 过期可重新拉取 |
| KlineSnapshot（画线+指标） | Logseq DB Block 属性 | 永久 | Logseq 图谱备份 |
| 用户配置（`tj_*` 前缀） | localStorage | 永久 | 手动导出/导入 JSON |
| Tushare Token | FastAPI 服务器 `.env` | 永久 | 手动备份 `.env` |
| InstrumentConfig | localStorage `tj_instrument_config` | 永久 | 手动导出 JSON |

`[NOTE FOR PM]` 目前无自动化备份方案——Yale 提到「会自己备份」，PRD 接受这个约束。如需未来迭代，可加入一键导出全部配置的 ZIP 打包功能。

### 6.5 平台与兼容性

- **桌面端：** macOS / Windows / Linux（Logseq 桌面客户端）
- **WebView：** Chrome 90+ / Edge 90+
- **视口：** 桌面 1440×900 至 1920×1080（响应式自适应）
- **移动端：** v1 不支持
- **Logseq 版本：** >= 0.10.x（依赖 DB API 稳定性）

### 6.6 可维护性

- 代码架构分层：`components/` → `core/` → `utils/` → `types/`
- 前端：class 式核心逻辑（TradeManager、StatisticsEngine），factory 模式 Provider
- CSS：Vanilla CSS，前缀 `tj-`，kebab-case
- 测试：Vitest node 环境，测试 `utils/` 和 `core/` 的纯函数和类方法
- Python 后端：`snake_case` 命名，`from src.models import X` 相对导入

---

## 7. 非目标（v1 明确不做）

- **实时盯盘/行情推送** — 本产品是复盘工具，不做实时数据推送
- **移动端支持** — v1 仅桌面端
- **云端同步/多设备** — 依赖用户自己的 Logseq 同步方案，插件不做独立云端存储
- **社交分享/策略公开** — 无社区、无公开策略、无导出到社交媒体
- **自动化交易执行** — 无 API 下单、无券商对接
- **AI 交易建议/策略生成** — v1 不做任何形式的 AI 辅助决策
- **多用户协作/团队版** — 单人使用，无权限系统
- **程序化回测引擎** — 无策略回测框架
- **非中文界面** — v1 仅中文
- **InstrumentConfig GUI 编辑器** — v1 手动编辑 JSON

---

## 8. MVP 范围

### 8.1 MVP 内（必须交付）

- FR-1 ~ FR-5：分屏工作区与双向跳转（THE ENGINE）
- FR-6 ~ FR-8：交易笔记录入
- FR-9 ~ FR-12：K 线图表与买卖标记
- FR-20 ~ FR-23：本地引导与系统健康
- 多品种可配置（InstrumentConfig 手动维护）
- A 股 + 加密货币数据源支持（Tushare + CCXT + AKShare fallback）
- `TradeRecord` + `KlineSnapshot` 数据模型完整实现

### 8.2 MVP 外（v2/v3 迭代）

- FR-13 ~ FR-15：NAV 看板与盈亏日历（DD-002，依赖 DD-001 的 TradeRecord）
- FR-16 ~ FR-19：归因过滤与审计（DD-002）
- 美股/期货数据源（YFinance + Tushare 期货版）
- InstrumentConfig GUI 编辑器
- 一键配置备份/恢复 ZIP

### 8.3 交付顺序

```
DD-003（引导：0.5-1 周）
   ↓ 依赖 FastAPI /health 端点就绪
DD-001（复盘引擎：2-3 周）
   ↓ 依赖 Logseq DB API 稳定
DD-002（绩效审计：1.5-2 周）
   依赖 DD-001 的 TradeRecord 数据
```

---

## 9. 成功指标

**首要指标：**
- **SM-1：复盘心流体验** — 双向跳转延迟 < 150ms，零截图依赖率 100%，单笔复盘记录 < 5 分钟。验证 FR-2、FR-5。

**次要指标：**
- **SM-2：折算精度** — 多币种 NAV 100% 折算准确率（0 误差）。验证 FR-13。
- **SM-3：审计效率** — 标签过滤响应 < 50ms，盈亏日历加载 < 100ms。验证 FR-14、FR-16。
- **SM-4：引导速度** — 首次安装到进入工作区 < 1 分钟。验证 FR-20、FR-22。

**反指标（不要优化这些方向）：**
- **SM-C1：不要追求移动端适配** — 不将任何开发时间花在触摸交互或小屏响应式布局上。
- **SM-C2：不要追求实时数据同步** — 不引入 WebSocket 或 SSE 进行实时行情推送。

---

## 10. 风险与缓解

| # | 风险 | 级别 | 缓解措施 |
|---|------|------|---------|
| R1 | Logseq DB API breaking change | 高 | `LogseqDBService` 薄封装门面层；锁定 Logseq >= 0.10.x 版本兼容 |
| R2 | klinecharts 与 WebView 兼容性 | 高 | 已通过现有 ProChart.tsx 验证基本兼容；锁死 klinecharts 9.x |
| R3 | FastAPI 单点故障 | 高 | DD-003 引导页自检 + 一键启动脚本 |
| R4 | 第三方数据源脆弱性（Tushare/AKShare 限流或不可用） | 高 | §5.6 Provider 降级矩阵 + IndexedDB 缓存兜底 |
| R5 | IndexedDB K 线数据膨胀 | 中 | §5.4 分周期 TTL 保留策略 |
| R6 | Zustand Store 状态膨胀导致非必要重渲染 | 中 | Slice 拆分（kline/trade/portfolio/onboarding）；selector 用 useShallow |
| R7 | 多币种浮点精度 | 中 | `roundToDecimals()` 四舍五入至 2 位小数 |
| R8 | Solo 开发者知识链断裂 | 低 | 本 PRD + project-context.md 充当第二大脑 |

---

## 11. 待解问题

1. **[技术验证]** Logseq DB API 属性值的最大长度限制是什么？超过后截断、分片还是拒绝写入？（影响 KlineSnapshot drawing_json 的 50 条划线对象上限设定）
2. **[技术验证]** `@klinecharts/pro` 的 Canvas 自定义渲染 API 在所有目标 WebView 版本中是否一致？
3. **[功能]** 多品种的 InstrumentConfig 初始化数据从哪来？手动逐个录入，还是预置常见品种模板？
4. **[功能]** Token 定时刷新开关的 UI 放在哪里？底部状态栏旁？设置面板？
5. **[功能]** 导出的 MD 审计报告格式是否需要支持中英文双语字段名？

---

## 12. 假设索引

以下假设来自 PRD 正文的 `[ASSUMPTION]` 标签，需确认：

1. **§4.2 FR-7** — TradeRecord 的 timestamp 精度为秒级，与 K 线 OHLC 数据的 timestamp 对齐。
2. **§4.3 FR-10** — 买卖标记只在当前选中标的和级别上渲染。
3. **§4.3 FR-11** — 划线 JSON 使用 klinecharts 原生 DrawingData 格式，无需额外解析。
4. **§4.4 FR-13a** — 每个币种对独立缓存和刷新，不同币种对齐的刷新时间可以不同。
5. **§4.4 FR-15** — 跨市场交易按 trade.exitTime 本地时区对齐，不做跨时区归一化。
6. **§5.4** — IndexedDB 缓存键 TTL 策略如表中定义，过期数据惰性清理。
7. **§5.5** — InstrumentConfig 由 Yale 手动维护，v1 不做 GUI 配置界面。
8. **§5.7** — 日/周/月/年聚合按日历日分组，不做市场交易时间差异处理。
9. **§4.4 FR-13a** — 汇率数据由多源降级链保障（Tushare → CCXT → YFinance），任意源可用即可。
