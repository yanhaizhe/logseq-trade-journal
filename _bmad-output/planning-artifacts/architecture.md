---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: ['prds/prd-logseq-trade-journal-2026-05-21/prd.md', 'project-context.md']
workflowType: 'architecture'
project_name: 'logseq-trade-journal'
user_name: 'yale'
date: '2026-05-21'
lastStep: 8
status: 'complete'
completedAt: '2026-05-21'
---

# 架构决策文档

_本文档通过逐步发现协同构建。每个架构决策通过 ADR 格式逐一追加。_

---

## 项目上下文分析

### 需求概览

**功能需求：** 24 条 FR-N，分布于 6 个能力域：

| 能力域 | FR 范围 | 数量 | 架构影响 |
|--------|---------|------|---------|
| 分屏工作区与双向跳转 | FR-1 ~ FR-5 | 5 | 双运行时通信（React ↔ Logseq 宿主），Canvas 渲染，KlineSnapshot 序列化 |
| 交易笔记录入 | FR-6 ~ FR-8 | 3 | 表单验证，Logseq DB API 属性写入，防抖 |
| K 线图表与标记 | FR-9 ~ FR-12 | 4 | klinecharts Pro Canvas，买卖标记覆盖层，画线 JSON 序列化 |
| NAV 看板与盈亏日历 | FR-13 ~ FR-15 + FR-13a | 4 | 多源汇率引擎，IndexedDB 时效缓存，时间窗口聚合计算，SVG 图表 |
| 归因过滤与审计 | FR-16 ~ FR-19 | 4 | 标签 AND/OR 过滤引擎，虚拟滚动表格，Logseq Block 穿透定位，MD 导出 |
| 本地引导与健康 | FR-20 ~ FR-23 | 4 | 三服务并行自检，FastAPI 代理 Token 校验，原子写入 .env |

**非功能需求（驱动架构决策）：**

- 性能 SLA：跳转 <150ms，K线加载 <2s，日历 <100ms，过滤 <50ms，Canvas 60fps
- 安全与隐私：零外部网络流出，100% 本地运行，Token 原子写入 .env
- 可用性降级：四层错误体系（致命/降级/静默/暂时）
- 数据持久化：Logseq Block 属性 + IndexedDB + localStorage 三层存储
- 平台：Desktop-only，Chrome 90+ WebView，仅 1920×1080 视口

### 规模与复杂度

- **主技术域：** 混合架构 — Logseq 插件 WebView（React 前端）+ Python FastAPI localhost 后端
- **复杂度级别：** Medium
- **架构组件估计：** 7 个核心模块（LogseqDBService、TradeManager、StatisticsEngine、DataRouter+4 Providers、IndexedDBCache、Zustand Store、FastAPI 端点层）
- **实时能力：** 无（纯请求-响应模式，无 WebSocket）
- **多租户：** 无（单用户）
- **监管合规：** 无

### 技术约束与依赖

- **klinecharts 9.x 锁定** — Canvas 图表渲染的唯一依赖，不可更换
- **Logseq DB API 不解耦** — 核心差异化能力（时间戳定位）依赖于此
- **FastAPI 单出口** — 所有外部数据必须通过 localhost:8765 代理
- **零路由库** — 视图切换纯 Zustand mode 枚举
- **Vanilla CSS + tj- 前缀** — 禁止 Tailwind/组件库
- **Python 3.12+ / pydantic v2** — 后端类型严格约束

### 已识别跨域关注点

1. **Provider 降级** — 前端不得感知哪个 Provider 在服务；DataRouter 封装全部 fallback 逻辑
2. **IndexedDB 缓存策略** — K 线数据（分周期 TTL）+ 汇率数据（时效标记）需统一缓存层
3. **Zustand Store 边界** — 3 个交付包重度依赖不同 slice，slice 职责不清会导致跨包回归
4. **双运行时通信** — postMessage（React ↔ Logseq 宿主）+ REST JSON（React ↔ FastAPI）两种协议
5. **时间戳一致性** — TradeRecord.timestamp 需与 K 线 OHLC 数据对齐，精度到秒

---

## 技术栈评估

项目已有完整代码基础，非绿地项目。以下技术栈已在 `project-context.md` 和 `package.json` / `requirements.txt` 中锁定：

| 层级 | 技术 | 版本 | 约束 |
|------|------|------|------|
| 前端框架 | React | ^18.3.1 | jsx: react-jsx 自动转换 |
| 语言 | TypeScript | ^5.4.5 | strict: true, ES2020 |
| 构建 | Vite + vite-plugin-logseq | ^5.3.1 / ^1.1.2 | base: './', cssCodeSplit: false |
| 状态管理 | Zustand | ^4.5.2 | 单一 store + slice 拆分 |
| 图表 | klinecharts + @klinecharts/pro | ^9.8.6 / ^0.1.1 | Canvas 渲染 |
| 样式 | Vanilla CSS | — | `tj-` 前缀, 暗黑毛玻璃主题 |
| 后端 | FastAPI + uvicorn + pydantic v2 | >=0.104.0 | 127.0.0.1:8765 |
| 数据 | Tushare / AKShare / CCXT / YFinance | — | Provider 策略模式 |
| 测试 | Vitest | ^1.6.0 | globals: true, node 环境 |

无需 starter 模板选择——已有代码基础直接作为架构起点。技术决策已在 project-context.md 完整记录。

---

## 核心架构决策

### 决策优先级分析

**关键决策（阻塞实现）：** 无——所有关键决策已在现有代码和 PRD 中落实。

**已定决策：** 以下 18 项决策已由现有代码库、PRD 和 project-context.md 明确，仅需确认。

**延迟决策（发布后）：** InstrumentConfig GUI 编辑器（v1 手动维护 JSON）、一键配置备份/恢复 ZIP。

### 数据架构

| 决策 | 方案 | 依据 |
|------|------|------|
| 交易元数据存储 | Logseq DB Block 属性 | PRD §5.2，核心差异化能力——时间戳定位依赖 DB API |
| K 线数据缓存 | IndexedDB (idb)，按周期设 TTL | PRD §5.4：1m/5m/15m/30m=7天，1h/4h=30天，1d+ =365天 |
| 汇率数据缓存 | IndexedDB 时效标记结构 `{rate, fetch_timestamp, source, valid_until}` | PRD FR-13a |
| 用户配置 | localStorage `tj_` 前缀 | project-context §关键避坑——避免与 Logseq 宿主冲突 |
| 聚合计算 | 纯前端 JavaScript 内存聚合（无 SQL） | PRD §5.7：交易量 <5000 笔，<50ms |
| 前后端类型 | 手动维护两套类型定义（pydantic v2 ↔ TypeScript） | 单开发者维护成本可接受，无需 OpenAPI 代码生成 |

### 认证与安全

| 决策 | 方案 | 依据 |
|------|------|------|
| 认证系统 | 无——单用户，零权限模型 | PRD §2.3 Non-Users |
| 网络隔离 | 前端仅连接 127.0.0.1:8765，零外部流出 | PRD §6.2 |
| Token 持久化 | FastAPI 原子写入 .env（先写临时文件再 rename） | PRD FR-22 |
| 通信加密 | 无 TLS——纯本地环回，外部不可达 | 127.0.0.1 无网络暴露风险 |
| 数据备份 | 依赖 Logseq 图谱备份 + 用户手动备份 IndexedDB | PRD §6.4 |

### API 与通信模式

| 决策 | 方案 | 依据 |
|------|------|------|
| 协议 | REST JSON（Content-Type: application/json） | Winston ADR-1：无实时推送需求，REST 调试友好 |
| 版本化 | `/api/v1/` URL 前缀 | 未来端点变更时向后兼容 |
| 错误码 | 统一枚举 `ErrorCode`，前后端共享定义 | 现有 router.py 已有基础 |
| React↔Logseq | window.parent.postMessage() | project-context §React 框架规则 |
| 请求方式 | 纯拉取模式，无 WebSocket/SSE/polling（汇率定时刷新除外） | 用户主动触发，无被动通知需求 |

### 前端架构

| 决策 | 方案 | 依据 |
|------|------|------|
| 组件模式 | React.FC<Props> + export default + Props 接口同文件 | project-context §React |
| 路由策略 | 无路由库，Zustand `mode` 枚举驱动视图切换 | project-context §关键避坑 |
| 样式方案 | Vanilla CSS + `tj-` 前缀 + kebab-case + 暗黑毛玻璃 | project-context §React |
| **Zustand Slice 边界** | 4 slice：kline / trade / portfolio / onboarding | 确认 |
| Slice 性能约束 | selector 使用 useShallow 或精确字段，防止非必要重渲染 | PRD 风险 R6 |

Zustand Slice 职责定义：

| Slice | 职责 | 消费方 |
|-------|------|--------|
| klineSlice | 当前图表状态（symbol, interval, timestamp, drawingData, markers） | DD-001 (FR-1~12) |
| tradeSlice | 交易记录列表、当前编辑中的 TradeRecord、标签过滤结果 | DD-001 (FR-6~8) + DD-002 部分 |
| portfolioSlice | NAV 数据、汇率缓存、盈亏日历数据、归因过滤状态、WindowStats | DD-002 (FR-13~19) |
| onboardingSlice | 自检结果（healthStatus）、Token 配置状态 | DD-003 (FR-20~23) |

### 部署与基础设施

| 决策 | 方案 |
|------|------|
| 运行环境 | Logseq Desktop Plugin（Electron WebView，Chrome 90+） |
| 后端启动 | uvicorn main:app --host 127.0.0.1 --port 8765（start.sh/stop.sh） |
| 前端构建 | `tsc && vite build`，输出 dist/ |
| 开发模式 | Vite HMR（localhost:4567）+ vite-plugin-logseq |
| CI/CD | 无——手动构建与测试 |

### 决策影响分析

**实现顺序：**

```
DD-003（引导, 0.5-1周）→ 需要 FastAPI /health 端点
    ↓
DD-001（复盘引擎, 2-3周）→ 需要 klineSlice + tradeSlice + Logseq DB API
    ↓
DD-002（绩效审计, 1.5-2周）→ 依赖 DD-001 产出的 TradeRecord 数据
```

**跨组件依赖：**
- `KlineSnapshot`（DD-001 写入）→ `BoundBlockID`（DD-002 读取穿透）
- `TradeRecord.strategy_tags`（DD-001 写入）→ `AttributionStats`（DD-002 归因统计）
- `InstrumentConfig.preferredProvider`（DD-003 配置）→ DataRouter 优先级链（DD-001 消费）

---

## 实现模式与一致性规则

> **权威来源：** `_bmad-output/project-context.md`（44 条规则）已在命名、结构、格式、通信、流程五个维度覆盖全部 AI Agent 冲突点。以下为映射关系，具体规则见该文件。

### 模式覆盖映射

| 冲突类别 | project-context.md 对应章节 | 示例规则 |
|----------|---------------------------|---------|
| **命名冲突** | TypeScript 语言规则 + React 框架规则 | 组件 export default、类 PascalCase、CSS `tj-` 前缀 |
| **结构冲突** | React 框架规则 + 测试规则 | 组件目录同名、tests/ 平铺、core/ 用 class、utils/ 纯函数 |
| **格式冲突** | TypeScript 语言规则 + 关键避坑 | import type 分离、`@/` 路径别名、禁止 `any` |
| **通信冲突** | React 框架规则 + 关键避坑 | postMessage ↔ Logseq、REST JSON ↔ FastAPI、Zustand mode 路由 |
| **流程冲突** | 测试规则 + 开发工作流 | Vitest globals: true、`tsc && vite build`、中文测试描述 |

### 架构层特有的补充模式

| 模式 | 约定 | 原因 |
|------|------|------|
| **API 响应格式** | `{ data: T, error?: { code: string, message: string } }` | 前端统一 error handling |
| **API 日期格式** | ISO 8601 字符串（`2026-05-21T10:30:00+08:00`） | 跨前后端一致 |
| **JSON 字段** | camelCase（TypeScript 端）/ snake_case（Python 端保持 pydantic 默认） | 各自语言惯用法，FastAPI 自动转换 |
| **Provider 接口** | `BaseProvider` 抽象类，方法签名 `async getKline(symbol, interval, start, end): Promise<OHLCV[]>` | 统一数据源适配 |
| **Zustand Action** | `setXxx` 命名，副作用在 action 内处理 | 现有 store.ts 模式 |
| **错误日志** | `console.error` 仅开发模式，生产模式静默 + 状态栏/Toast 用户提示 | 本地桌面环境无需远程日志 |

---

## 项目结构与边界

### 完整项目目录结构

```
logseq-trade-journal/
├── src/
│   ├── main.tsx                    # 入口：挂载 React 到 Logseq WebView
│   ├── App.tsx                     # 根组件：mode 枚举驱动视图切换
│   ├── store.ts                    # Zustand 全局 store（4 slice）
│   ├── app.css                     # 全局样式（暗黑毛玻璃主题）
│   │
│   ├── components/
│   │   ├── KlineChart/             # DD-001 FR-1~5, FR-9~12
│   │   │   ├── KlineChart.tsx      #   主组件：分屏工作区
│   │   │   ├── ProChart.tsx        #   klinecharts Pro 集成
│   │   │   ├── StudyLab.tsx        #   Canvas 划线工具
│   │   │   └── TradingNotes.tsx    #   笔记与 Block 交互
│   │   ├── TradeForm/
│   │   │   └── TradeForm.tsx       # DD-001 FR-6~8：交易录入表单
│   │   ├── Review/                 # DD-002
│   │   │   ├── DailyReview.tsx     #   看板页面入口 (已有)
│   │   │   ├── PnLCalendar.tsx     #   盈亏日历 (待新增)
│   │   │   ├── NAVChart.tsx        #   NAV SVG 图表 (待新增)
│   │   │   └── AttributionFilter.tsx # 归因过滤面板 (待新增)
│   │   └── Onboarding/             # DD-003
│   │       ├── WelcomeScreen.tsx   #   FR-20~21, FR-23 (待校对)
│   │       └── TokenSettingsModal.tsx # FR-22 (待校对)
│   │
│   ├── core/
│   │   ├── TradeManager.ts         # DD-001 FR-7：TradeRecord CRUD
│   │   ├── StatisticsEngine.ts     # DD-002 FR-15：时间窗口聚合 (待扩展)
│   │   ├── DataService.ts          # DD-001 FR-1~3：数据获取编排
│   │   ├── DataRouter.ts           # Provider 优先级链路由
│   │   ├── LogseqDBService.ts      # Logseq DB API 门面
│   │   ├── CustomDatafeed.ts       # klinecharts 自定义数据源适配
│   │   ├── providers/
│   │   │   ├── types.ts
│   │   │   ├── AKShareProvider.ts
│   │   │   └── TushareProvider.ts
│   │   └── cache/
│   │       └── IndexedDBCache.ts   # K 线+汇率缓存
│   │
│   ├── types/
│   │   ├── trade.ts                # TradeRecord, KlineSnapshot
│   │   ├── chart.ts                # K 线图表类型
│   │   └── logseq.ts               # Logseq API 类型
│   │
│   └── utils/
│       ├── calculator.ts           # 盈亏计算、浮点精度
│       ├── format.ts               # 格式化
│       └── validation.ts           # 表单校验
│
├── server/                         # Python FastAPI
│   ├── main.py                     # uvicorn 入口
│   └── src/
│       ├── models.py               # pydantic 数据模型
│       ├── router.py               # DataRouter + 端点定义
│       └── providers/
│           ├── base.py             # BaseProvider 抽象类
│           ├── tushare.py
│           ├── akshare.py
│           ├── yfinance.py
│           ├── ccxt_provider.py
│           └── sina.py
│
├── tests/
│   ├── calculator.test.ts
│   └── statistics.test.ts
│
├── _bmad-output/
│   ├── project-context.md
│   └── planning-artifacts/
│       ├── architecture.md
│       └── prds/
│
├── package.json / tsconfig.json / vite.config.ts / vitest.config.ts
├── requirements.txt
├── start.sh / stop.sh
└── index.html
```

### 能力域到文件映射

| 能力域 | 前端文件 | 后端端点 | 测试 |
|--------|---------|---------|------|
| 分屏与跳转 (FR-1~5) | KlineChart.tsx, TradingNotes.tsx, LogseqDBService.ts | GET /kline | — |
| 交易录入 (FR-6~8) | TradeForm.tsx, TradeManager.ts | — | — |
| K 线标记 (FR-9~12) | ProChart.tsx, StudyLab.tsx | — | — |
| 汇率引擎 (FR-13a) | IndexedDBCache.ts | GET /fx | — |
| NAV 看板 (FR-13~15) | DailyReview.tsx, NAVChart.tsx, PnLCalendar.tsx, StatisticsEngine.ts | — | statistics.test.ts |
| 归因过滤 (FR-16~19) | AttributionFilter.tsx, DailyReview.tsx | — | — |
| 本地引导 (FR-20~23) | WelcomeScreen.tsx, TokenSettingsModal.tsx | GET /health, POST /api/save-token | — |

### 架构边界

| 边界 | 通信方式 | 契约 |
|------|---------|------|
| React ↔ Logseq 宿主 | window.parent.postMessage() | Block 属性读写 |
| React ↔ FastAPI | HTTP REST JSON（fetch） | `/api/v1/*` 端点 |
| FastAPI ↔ 外部数据源 | HTTP/HTTPS（httpx） | Provider API |
| Zustand Slice 间 | 直接读写 store 字段 | 4 slice 职责互不重叠 |
| 前端 ↔ IndexedDB | idb Promise API | 键格式 `kline/{symbol}/{interval}` |

### 需要新增/变更的文件

| DD | 操作 | 文件 |
|----|------|------|
| DD-002 | **新增** | `src/components/Review/AttributionFilter.tsx` |
| DD-002 | **新增** | `src/components/Review/PnLCalendar.tsx` |
| DD-002 | **新增** | `src/components/Review/NAVChart.tsx` |
| DD-002 | **变更** | `src/core/StatisticsEngine.ts`（新增 aggregateByWeek/Month/Year） |
| DD-003 | **变更** | `src/components/Onboarding/WelcomeScreen.tsx`（按规格校对） |
| DD-003 | **变更** | `src/components/Onboarding/TokenSettingsModal.tsx`（校验+遮罩） |
| 全局 | **变更** | `src/store.ts`（拆分为 4 slice） |
| 全局 | **新增** | `server/src/providers/fx.py`（汇率多源聚合） |

---

## 架构验证结果

### 一致性验证 ✅

全部 18 项决策互相兼容。React 18 + TypeScript strict + Zustand 4.5 + klinecharts 9.x + FastAPI localhost 形成闭合技术环，无版本冲突。project-context.md 44 条规则 + 架构补充 6 条模式覆盖命名/结构/格式/通信/流程五维度，无矛盾。

### 需求覆盖验证 ✅

FR-1 到 FR-23（含 FR-13a）全部有架构支撑，每个能力域指向具体文件和端点。NFR 全覆盖：性能 SLA 内嵌为架构约束，安全隐私在数据架构和 API 边界中落实，可用性降级通过 Provider 矩阵保障。

### 实现就绪验证 ✅

18 项决策分类覆盖数据/安全/API/前端/部署，完整目录树 + 能力域映射 + 新增/变更文件清单就绪。

### 差距分析

- **关键差距：** 无
- **关注点：** Zustand 4 slice 拆分影响现有 store.ts 重构；DD-002 3 个新组件从零开发需参考 DD-001 模式；汇率 Provider 聚合层需新增 FastAPI 端点
- **可延后：** IndexedDB TTL cleanup worker、前后端 OpenAPI 代码生成

### 完整性检查清单

| 维度 | 状态 |
|------|------|
| 需求分析（4/4） | [x] [x] [x] [x] |
| 架构决策（4/4） | [x] [x] [x] [x] |
| 实现模式（4/4） | [x] [x] [x] [x] |
| 项目结构（4/4） | [x] [x] [x] [x] |

### 架构就绪评估

**总体状态：** ✅ READY FOR IMPLEMENTATION（16/16 检查项通过，零关键差距）

**信心等级：** 高——基于完整 PRD + 现有代码库 + project-context.md 三重验证。
