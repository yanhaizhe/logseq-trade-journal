---
stepsCompleted: [1, 2, 3, 4]
status: complete
inputDocuments: ['prds/prd-logseq-trade-journal-2026-05-21/prd.md', 'architecture.md', 'project-context.md']
---

# logseq-trade-journal - Epic 分解

## 概述

本文档基于 PRD（24 条 FR-N）、架构决策文档和项目上下文，将需求分解为可实现的 Epic 和 Story。

## 需求清单

### 功能需求

| ID | 描述 | 来源 |
|----|------|------|
| FR-1 | 用户输入标的代码后，右侧 K 线画布在 <2s 内加载对应历史走势 | PRD §4.1 |
| FR-2 | 用户点击已绑定 KlineSnapshot 的 Block，K 线在 <150ms 内还原图表状态（symbol + interval + timestamp + 划线 + 指标） | PRD §4.1 |
| FR-3 | 用户在任何级别 K 线上创建笔记，Block 自动注入 symbol + interval + timestamp 属性 | PRD §4.1 |
| FR-4 | 切换 K 线周期不影响已有绑定关系，不同 Block 可绑定不同级别 | PRD §4.1 |
| FR-5 | 拖拽分屏比例持久化到 localStorage，下次打开恢复 | PRD §4.1 |
| FR-6 | 点击「录入交易」弹出毛玻璃表单：方向切换、价格、数量、策略标签、错误标签 | PRD §4.2 |
| FR-7 | 提交表单后 TradeRecord 写入 Block 属性，买卖三角形标记渲染到 K 线 Canvas | PRD §4.2 |
| FR-8 | 「确认写入」按钮首次点击后 disabled+loading，50ms 防抖防重复提交 | PRD §4.2 |
| FR-9 | 用户可缩放、平移、切换 K 线周期（1m/5m/15m/30m/1h/4h/1d/1w/1M） | PRD §4.3 |
| FR-10 | 买卖三角形标记（买入绿色、卖出红色）渲染到 K 线，hover 弹出微卡片 | PRD §4.3 |
| FR-11 | 用户可绘制趋势线/水平线/斐波那契等，上限 50 条，JSON 序列化写入 Block 属性 | PRD §4.3 |
| FR-12 | 点击「绑定状态」按钮，KlineSnapshot 写入 Block 属性，按钮绿色脉冲反馈 | PRD §4.3 |
| FR-13 | Dashboard 展示多账户折算 NAV 折线图，可切换基准币种和账户 | PRD §4.4 |
| FR-13a | 多源汇率引擎（Tushare→CCXT→YFinance），时效存储含 fetch_timestamp/source/valid_until | PRD §4.4 |
| FR-14 | CSS Grid 月度盈亏日历，红绿色标识盈亏，hover 微卡片，月份切换动画 <150ms | PRD §4.4 |
| FR-15 | 日/周/月/年四级时间窗口聚合，纯前端 <50ms，输出 WindowStats | PRD §4.4 |
| FR-16 | 标签 AND/OR 过滤器 + 模糊搜索，50ms 防抖，联动更新 | PRD §4.5 |
| FR-17 | 归因统计卡实时更新累计盈亏/胜率/最大回撤/交易频率 | PRD §4.5 |
| FR-18 | 交易表虚拟滚动展示过滤结果，双击行 <100ms 穿透至原始 Logseq Block | PRD §4.5 |
| FR-19 | 一键导出结构化 MD 审计报告至剪贴板（无权限时降级到手动复制） | PRD §4.5 |
| FR-20 | 三服务自检（FastAPI/Tushare/本地数据库），200ms 内绿/黄/红灯指示 | PRD §4.6 |
| FR-21 | 红灯悬停显示错误码+排查命令，一键复制至剪贴板 | PRD §4.6 |
| FR-22 | Token 配置弹窗：遮罩切换、远程校验（<2s）、校验通过才原子写入 .env | PRD §4.6 |
| FR-23 | 重新自检按钮，指示灯橙色呼吸动画，150ms 内更新结果 | PRD §4.6 |

### 非功能需求

| ID | 描述 | 阈值 |
|----|------|------|
| NFR-1 | Block→K线跳转延迟 | <150ms |
| NFR-2 | K线初始加载 | <2s |
| NFR-3 | 表单提交响应 | <50ms |
| NFR-4 | Canvas 标记渲染帧率 | 60fps (<16ms) |
| NFR-5 | 自检响应 | <200ms |
| NFR-6 | 盈亏日历加载 | <100ms |
| NFR-7 | 标签过滤联动 | <50ms |
| NFR-8 | 时间窗口聚合（1000笔） | <50ms |
| NFR-9 | 零外部网络流出 | 100% |
| NFR-10 | 100% 本地运行 | — |
| NFR-11 | 多币种折算精度 | 四舍五入至 2 位小数 |

### 附加需求（架构）

- Zustand Store 拆分为 4 slice：klineSlice / tradeSlice / portfolioSlice / onboardingSlice
- Provider 降级矩阵：A 股 Tushare→AKShare→Sina，加密货币 CCXT→YFinance
- 汇率多源聚合层 `server/src/providers/fx.py`
- IndexedDB 缓存 TTL：1m/5m/15m/30m=7天，1h/4h=30天，1d+=365天
- 前后端手动维护类型定义（pydantic v2 ↔ TypeScript）
- API 响应格式：`{ data: T, error?: { code, message } }`
- 日期格式：ISO 8601 字符串
- 构建顺序：`tsc && vite build`

### UX 设计需求

- 暗黑毛玻璃（Glassmorphism）视觉主题
- Vanilla CSS + `tj-` 前缀 + kebab-case
- Glassmorphism Card Overlay（交易表单、Token 弹窗、Hover 微卡片统一风格）
- Primary Glowing Button（渐变+发光+Active 缩放反馈）
- Fixed Frosted Status Strip（底部状态栏，指示灯绿/黄/红）
- Absolute Floating Micro Card（Dark Translucent，hover 探针）
- Custom Klinecharts Container + Canvas 标记覆盖层
- 表单验证多模态反馈（颜色+图标+文本三重提示）
- 暗黑主题 WCAG AA 对比度（≥4.5:1）
- 键盘 Tab 可达 + Esc 取消 + Enter 提交

### FR 覆盖映射

| FR | Epic | FR | Epic | FR | Epic |
|----|------|----|------|----|------|
| FR-1 | Epic 2 | FR-9 | Epic 2 | FR-17 | Epic 3 |
| FR-2 | Epic 2 | FR-10 | Epic 2 | FR-18 | Epic 3 |
| FR-3 | Epic 2 | FR-11 | Epic 2 | FR-19 | Epic 3 |
| FR-4 | Epic 2 | FR-12 | Epic 2 | FR-20 | Epic 1 |
| FR-5 | Epic 2 | FR-13 | Epic 3 | FR-21 | Epic 1 |
| FR-6 | Epic 2 | FR-13a | Epic 3 | FR-22 | Epic 1 |
| FR-7 | Epic 2 | FR-14 | Epic 3 | FR-23 | Epic 1 |
| FR-8 | Epic 2 | FR-15 | Epic 3 | — | — |
| — | — | FR-16 | Epic 3 | — | — |

## Epic 列表

### Epic 1: 本地环境引导与系统健康
用户首次安装或环境异常时，一眼看到所有本地服务状态（FastAPI/Tushare/数据库），红灯时一键复制排查命令，1 分钟内完成 Token 配置并校验，全部绿灯后进入工作区。
**FRs 覆盖：** FR-20, FR-21, FR-22, FR-23

### Epic 2: 无缝交易复盘引擎（THE ENGINE）
用户打开双栏工作区，输入标的代码后 K 线瞬间加载，在任意级别 K 线上创建笔记并双向绑定，弹出表单录入交易（买卖/价格/标签）后标记自动渲染到 Canvas，绘制趋势线后一键绑定 K 线快照状态至 Block 属性。
**FRs 覆盖：** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12

### Epic 3: 组合业绩审计看板
用户切换到 Dashboard 查看多账户多币种折算后的 NAV 走势曲线和红绿盈亏日历，进入归因过滤视图按标签（AND/OR）筛选交易，实时查看累计盈亏/胜率/最大回撤，双击交易行穿透至原始 Block，一键导出 MD 审计报告。
**FRs 覆盖：** FR-13, FR-13a, FR-14, FR-15, FR-16, FR-17, FR-18, FR-19

---

## Epic 1: 本地环境引导与系统健康

用户首次安装或环境异常时，一眼看到所有本地服务状态（FastAPI/Tushare/数据库），红灯时一键复制排查命令，1 分钟内完成 Token 配置并校验，全部绿灯后进入工作区。

### Story 1.1: 三服务自检仪表盘

As a Yale,
I want 打开插件时一眼看到 FastAPI/Tushare/本地数据库三项服务的绿黄红状态灯，
So that 我能立刻知道本地环境是否就绪，决定是否需要排查。

**Acceptance Criteria:**

**Given** 首次启用插件或从底部状态栏错误图标跳转
**When** 进入欢迎页
**Then** 三盏状态灯在 200ms 内渲染完成
**And** FastAPI 可达时显示绿灯+「运行中」、不可达时显示红灯+「未连接 (127.0.0.1:8765)」
**And** Tushare Token 有效时绿灯+「已验证」、无效时红灯
**And** 全部绿灯时「进入工作区」按钮可用，任何红灯时按钮 disabled+提示修复

### Story 1.2: 红灯排查助手

As a Yale,
I want 红灯悬停时看到错误码和可一键复制的排查命令，
So that 我不需要记住或手动敲终端命令。

**Acceptance Criteria:**

**Given** FastAPI 状态灯为红色
**When** 悬停红灯旁的帮助图标
**Then** 磨砂玻璃卡片弹出，显示错误码（如 ECONNREFUSED）和排查命令（如 ./start.sh）
**And** 点击命令文本后自动复制至剪贴板，显示「指令已复制」绿字
**And** 卡片使用等宽字体（JetBrains Mono / Fira Code）模拟 Terminal 风格

### Story 1.3: Token 配置弹窗与校验

As a Yale,
I want 在磨砂玻璃弹窗中输入/更新 Tushare Token，提交前先校验有效性，
So that 我不会把无效 Token 写入配置文件导致后续 K 线加载失败。

**Acceptance Criteria:**

**Given** 在欢迎页点击「配置密钥」按钮
**When** 弹窗弹出
**Then** Token 输入框默认 password 遮罩模式
**And** 点击眼睛图标切换明文/遮罩（<100ms），图标在眼睛/闭眼间过渡
**And** 输入少于 20 字符时「保存并测试」按钮半透明 disabled+下方提示「最少 20 个字符」
**And** 输入有效 Token 点击「保存并测试」后按钮 loading，<2s 内完成校验，通过后弹窗关闭
**And** 输入无效 Token 校验失败后弹窗不关闭，表单顶部显示红色「校验失败：Token 无效」
**And** 校验超时（>5s）提示「网络超时，请检查本地服务状态」
**And** 按 Esc 键关闭弹窗、放弃修改、.env 不变

### Story 1.4: 重新自检与进入工作区

As a Yale,
I want 配置完 Token 后点击「重新自检」按钮刷新所有服务状态，
So that 我能确认环境已全部就绪，然后一键进入复盘工作区。

**Acceptance Criteria:**

**Given** 在欢迎页完成 Token 配置
**When** 点击「🔄 重新自检」按钮
**Then** 所有指示灯变为橙色呼吸动画，150ms 内更新为最新自检结果
**And** Tushare 灯由红转绿
**And** 全部绿灯后点击「进入工作区」按钮，导航至分屏 K 线工作区（Epic 2）

---

## Epic 2: 无缝交易复盘引擎（THE ENGINE）

用户打开双栏工作区，输入标的代码后 K 线瞬间加载，在任意级别 K 线上创建笔记并双向绑定，弹出表单录入交易（买卖/价格/标签）后标记自动渲染到 Canvas，绘制趋势线后一键绑定 K 线快照状态至 Block 属性。

### Story 2.1: 分屏双栏工作区框架

As a Yale,
I want 打开插件后看到左侧 Logseq 编辑器与右侧 K 线图表的双栏布局，可拖拽调整比例，
So that 我能在同一界面中一边写笔记一边看 K 线图。

**Acceptance Criteria:**

**Given** 插件已加载在 Logseq 桌面端
**When** 进入复盘工作区
**Then** 左侧渲染 Logseq 原生编辑器区域（宿主提供），右侧渲染插件 WebView 图表区域
**And** 双栏比例从 localStorage.tj_split_ratio 读取上次记忆值，首次使用为默认 50:50
**And** 拖拽分栏分隔线后比例实时变化，释放鼠标后新比例写入 localStorage
**And** 右侧 K 线区域初始显示空状态提示（未输入标的代码）

### Story 2.2: 标的代码输入与 K 线加载

As a Yale,
I want 在左侧 Block 中输入标的代码后，右侧 K 线画布自动加载对应历史走势，
So that 我能快速从笔记上下文切换到图表分析。

**Acceptance Criteria:**

**Given** 左侧创建新 Block 或点击已有 Block
**When** Block 中包含有效标的代码（如 000001）
**Then** 右侧 K 线画布在 <2s 内加载该标的日线历史 OHLCV 数据并渲染
**And** 输入无效代码（如 ZZZZZZ）时画布显示「未找到该标的」占位
**And** FastAPI 离线时画布保持灰度「数据服务未连接」状态
**And** 底部状态栏显示 FastAPI 连接指示灯（绿/红）

### Story 2.3: K 线图表交互

As a Yale,
I want 在 K 线图上缩放、平移、切换不同周期，
So that 我能灵活分析不同时间维度的价格走势。

**Acceptance Criteria:**

**Given** 右侧 K 线画布已加载某个标的的日线数据
**When** 滚动鼠标滚轮
**Then** 图表缩放，可视 K 线数量自适应变化
**And** 拖拽图表平移浏览不同时间区间
**And** 点击周期按钮（1m/5m/15m/30m/1h/4h/1d/1w/1M）后切换级别，加载对应 OHLCV 数据
**And** Canvas 渲染帧率维持在 60fps（<16ms/帧）

### Story 2.4: 交易表单录入

As a Yale,
I want 点击「录入交易」按钮弹出表单，填写买卖方向、价格、数量并勾选策略/错误标签，
So that 我能以极低摩擦记录每一笔实盘交易。

**Acceptance Criteria:**

**Given** 右侧 K 线已加载标的
**When** 点击「录入交易」FAB 按钮
**Then** 玻璃拟态表单卡片居中弹出，包含方向切换（买入/卖出）、价格 Numeric Input、数量 Numeric Input、策略标签复选区、错误标签复选区
**And** 方向默认「买入」，点击切换为「卖出」
**And** 价格输入负值或 0 时前端校验阻止（红框+提示「价格必须大于 0」）
**And** 空字段提交时表单不关闭，空字段红框+「必填项」提示
**And** 标签复选区可多选，搜索框支持模糊匹配
**And** 点击「取消」或按 Esc 关闭表单，不保存

### Story 2.5: 交易记录写入与标记渲染

As a Yale,
I want 提交交易表单后数据写入 Block 属性，买卖标记自动渲染到 K 线图上，
So that 我能一眼在图表上看到每笔交易的进出场位置。

**Acceptance Criteria:**

**Given** 表单已完整填写
**When** 点击「确认写入」
**Then** 按钮立即 disabled+loading，50ms 防抖窗口内重复点击无效
**And** TradeRecord（direction/price/size/timestamp/strategy_tags/error_tags）写入当前 Block 属性
**And** 表单关闭
**And** K 线 Canvas 在 trade.timestamp 位置渲染买卖三角形标记（买入绿色△、卖出红色▽）
**And** Logseq DB 中仅存在一条 TradeRecord（防重复写入验证）

### Story 2.6: 买卖标记交互

As a Yale,
I want 鼠标悬停买卖标记时弹出微卡片显示交易详情，
So that 我不需要离开图表就能回顾每笔交易的关键信息。

**Acceptance Criteria:**

**Given** K 线图上已有买/卖标记
**When** 鼠标悬停三角形的买卖标记
**Then** 50ms 内弹出暗黑半透明微卡片，显示方向、价格、数量
**And** 鼠标移出后微卡片消失
**And** 同一标的多笔交易标记全部渲染，不重叠

### Story 2.7: Canvas 划线工具

As a Yale,
I want 在 K 线图上手动绘制趋势线、水平线等分析图形，
So that 我能用技术分析辅助交易决策。

**Acceptance Criteria:**

**Given** K 线画布已渲染
**When** 选择划线工具（趋势线/水平线/斐波那契等）并绘制
**Then** 图形在 Canvas 上正常渲染，控制点可拖拽调整
**And** 绘制第 51 条划线时 Toast 提示「最多保存 50 条划线」
**And** 已绘制的划线在切换周期后保持显示（如果该级别支持）

### Story 2.8: K 线快照绑定

As a Yale,
I want 点击「绑定状态」按钮将当前 K 线完整状态（标的/周期/划线/指标）一键写入 Block 属性，
So that 未来任何时候点击 Block 都能毫秒级还原当时的图表现场。

**Acceptance Criteria:**

**Given** K 线上已绘制技术分析图形
**When** 点击「绑定状态」按钮
**Then** 按钮绿色脉冲反馈完成
**And** KlineSnapshot（symbol/interval/drawing_json/indicator_json/timestamp/bound_block_id）写入 Block 属性
**And** 底部状态栏短暂显示「已绑定」

### Story 2.9: K 线快照还原

As a Yale,
I want 点击已绑定快照的 Block 后，右侧 K 线瞬间还原到当时的完整图表状态，
So that 我能复盘当时的交易判断依据。

**Acceptance Criteria:**

**Given** 某个 Block 已包含 KlineSnapshot 属性
**When** 在 Logseq 中点击该 Block
**Then** performance.now() 从 click 事件到 klinecharts.applyNewData() <150ms
**And** K 线跳转到 snapshot.timestamp 对应的 symbol+interval
**And** Canvas 上恢复所有划线（drawing_json 反序列化渲染）
**And** 恢复所有指标叠加（indicator_json 反序列化）

### Story 2.10: 任意级别 K 线笔记创建

As a Yale,
I want 在任何级别的 K 线图上右键创建笔记，Block 自动注入当前 symbol + interval + timestamp，
So that 我可以在日线、30 分钟线等多个级别分别记录分析，点击任意 Block 自动还原到对应级别。

**Acceptance Criteria:**

**Given** 当前 K 线为 1d 级别
**When** 右键选择「在此创建笔记」
**Then** Logseq 左侧创建新 Block，属性自动注入 trade-symbol=当前标的、trade-interval=1d、trade-timestamp=当前鼠标位置时间（精度到秒）
**And** Block 内容包含级别信息描述（如「1d · 2026-05-20 10:30」）
**And** 切换到 30m 级别后创建笔记，trade-interval=30m
**And** 点击日线级别笔记 → K 线还原到日线该时刻；点击 30m 笔记 → 还原到 30m 该时刻

---

## Epic 3: 组合业绩审计看板

用户切换到 Dashboard 查看多账户多币种折算后的 NAV 走势曲线和红绿盈亏日历，进入归因过滤视图按标签（AND/OR）筛选交易，实时查看累计盈亏/胜率/最大回撤，双击交易行穿透至原始 Block，一键导出 MD 审计报告。

### Story 3.1: 多源汇率引擎

As a Yale,
I want 系统从多个数据源自动获取汇率并按来源+时间戳存储，
So that 多币种 NAV 折算时有可靠的汇率数据，且知道数据来源和时效。

**Acceptance Criteria:**

**Given** FastAPI 已启动
**When** 前端请求汇率 USD/CNY
**Then** FastAPI 依次尝试 Tushare→CCXT→YFinance，首个成功即可
**And** 返回的汇率写入 IndexedDB，包含 rate/fetch_timestamp/source/valid_until 字段
**And** 全部数据源不可用时，使用最近一次未过期的缓存值
**And** 状态栏显示「汇率: CCXT · 15:30」格式的来源和更新时间
**And** 用户可在设置中配置刷新间隔（默认 24h，最小 1h）

### Story 3.2: 多账户 NAV 走势看板

As a Yale,
I want 在 Dashboard 看到多账户按选定基准币种折算后的 NAV 折线图，
So that 我能宏观透视总资产曲线的健康状况。

**Acceptance Criteria:**

**Given** 切换到 Dashboard 标签页
**When** 页面加载
**Then** SVG NAV 折线图渲染，默认基准币种 CNY，全部账户
**And** 切换基准币种（CNY/USD/USDT）或选择特定账户后 NAV 曲线实时重算 <100ms
**And** Hover 数据点时毛玻璃悬停卡弹出：当日总资产+各子账户分项+当日涨跌幅+所用汇率及更新时间
**And** 无交易记录时 NAV 区域显示空状态提示

### Story 3.3: 月度盈亏日历

As a Yale,
I want 在 Dashboard 看到本月日历矩阵，每天有交易的日期以红/绿色标识盈亏，
So that 我能一眼看清本月每天的盈利/亏损分布。

**Acceptance Criteria:**

**Given** Dashboard 已加载
**When** 渲染盈亏日历
**Then** CSS Grid 渲染当月日历，有交易的日期着色（盈利绿色、亏损红色、无交易无色）
**And** 整个日历渲染 <100ms
**And** Hover 有交易单元格弹出微卡片：当日净盈亏、交易笔数、胜率、最大单笔亏损
**And** 点击月箭头切换至上月/下月，淡入淡出动画 <150ms

### Story 3.4: 时间窗口聚合引擎

As a Yale,
I want StatisticsEngine 支持按日/周/月/年四个级别聚合交易数据，
So that 我能在不同时间粒度下审视交易表现。

**Acceptance Criteria:**

**Given** 已有 TradeRecord 数据
**When** 调用 aggregateByDay(trades) / aggregateByWeek(trades) / aggregateByMonth(trades) / aggregateByYear(trades)
**Then** 返回标准 WindowStats 结构（netPnl/winRate/profitFactor/maxDrawdown/tradeCount/avgHoldingHours/topTagGain/topTagLoss）
**And** 1000 笔 TradeRecord 任意窗口聚合 <50ms
**And** 按 trade.exitTime 本地时区对齐
**And** avgHoldingHours 正确计算并区分日内（<6h）与摇摆交易（>6h）

### Story 3.5: 归因标签过滤器

As a Yale,
I want 勾选或搜索特定策略/错误标签后看板数据和交易表实时联动过滤，
So that 我能快速定位 #FOMO 或 #突破买入 等特定行为模式的交易集合。

**Acceptance Criteria:**

**Given** 进入归因过滤视图
**When** 勾选 #FOMO 标签（AND 模式）
**Then** 仅显示同时包含 #FOMO 的交易，左侧统计卡和右侧交易表同步更新 <50ms
**And** 切换 OR 模式后勾选 #FOMO+#突破买入，显示包含任一标签的交易
**And** 搜索框输入「抗单」后回车，自动选中匹配的 #逆势抗单 标签
**And** 50ms 防抖窗口内快速切换勾选仅执行最终过滤，无中间闪烁

### Story 3.6: 归因统计卡与交易表穿透

As a Yale,
I want 标签过滤后左侧归因统计卡显示累计盈亏/胜率/最大回撤，双击交易行直通原始 Block，
So that 我能从宏观统计深入到每一笔具体交易笔记。

**Acceptance Criteria:**

**Given** 已选中归因标签
**When** 统计卡更新
**Then** 显示累计盈亏（大号数值）/胜率（百分比）/最大回撤（金额+日期）/交易频率
**And** 下方交易表虚拟滚动展示过滤结果（>100行时首屏50行）
**And** 双击交易表中任意行，Logseq 侧边栏 <100ms 自动聚焦并打开原始 Block
**And** 表中每行显示日期/标的/方向/价格/数量/盈亏/标签

### Story 3.7: 一键导出审计报告

As a Yale,
I want 点击导出按钮将当前过滤条件下的审计报告以结构化 Markdown 格式复制到剪贴板，
So that 我能粘贴到 Logseq 笔记中永久保存或分享复盘结论。

**Acceptance Criteria:**

**Given** 在归因过滤视图，已选中标签
**When** 点击右下角金色导出 FAB
**Then** MD 报告生成并复制至剪贴板，Toast 提示「已复制审计报告」
**And** 报告包含过滤器条件、汇总统计、交易明细表
**And** 剪贴板权限未授予时展开报告文本区供手动复制
**And** 无标签选中时导出全部交易数据
