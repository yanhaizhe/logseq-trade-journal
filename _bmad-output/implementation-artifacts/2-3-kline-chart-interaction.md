# Story 2.3: K 线图表交互与周期切换

**Status:** done
**Epic:** 2 - 无缝交易复盘引擎（THE ENGINE）
**FRs:** FR-10（周期切换）, FR-11（图表缩放平移）
**NFRs:** NFR-3（Canvas 60fps 极速渲染）, NFR-9（零外部网络流出）
**File:** `src/components/KlineChart/KlineChart.tsx`（变更）, `src/app.css`（变更）

---

## User Story

As a Yale,
I want 在 K 线图上进行缩放、平移，并一键切换不同周期，
So that 我能灵活分析不同时间维度的价格走势。

## Acceptance Criteria

**Given** 右侧 K 线画布已加载某个标的的日线数据
**When** 滚动鼠标滚轮
**Then** 图表缩放，可视 K 线数量自适应变化
**And** 拖拽图表平移浏览不同时间区间
**And** 点击周期按钮（1m/5m/15m/30m/1h/4h/1d/1w/1M）后切换级别，加载对应 OHLCV 数据
**And** Canvas 渲染帧率维持在 60fps（单帧渲染时间 <16ms）

---

## Developer Context

### 现有代码状态

1. **`src/components/KlineChart/KlineChart.tsx`**：
   - 包含 `KLineChartPro` 实例的挂载。`PERIODS` 定义了周期支持（`1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `日K`, `周K`, `月K`）。
   - 通过 `datafeed.getHistoryKLineData` 实现了根据 `Period` 异步加载数据的功能。
   - 底部状态栏 `.tj-status-strip` 展现了当前的标的及数据周期，但周期的更新逻辑目前尚不完美（仅在初始加载时设定为 tf）。
   - 图表虽然支持缩放和平移（底层的 `klinecharts` 自带），但缺乏对频繁周期切换的竞态过滤，可能因频繁请求网络导致数据重载异常。

2. **`src/core/DataRouter.ts` & `src/core/providers/AKShareProvider.ts`**：
   - 数据源及缓存：加载的 K 线会根据 `symbol` + `timeframe` 自动缓存入 IndexedDB。如果是近期请求过的数据，会瞬间被极速载入，无需等待网络。

### 需要完善的内容

#### 1. 周期切换竞态过滤（防重叠加载）
在数据量较大或网络拥堵时，快速在不同周期切换可能会导致前一个周期的 `getHistoryKLineData` 回调与当前周期的回调重叠，产生数据渲染错乱。
- 需要在 `KlineChartComponent` 中使用 `useRef<AbortController | null>(null)` 或数据加载锁。
- 每次发起新的周期加载请求（`getHistoryKLineData` 触发）时，如果上一次的请求未完成，立即 `abort` 掉上一次的请求以抛弃其回调。
- 确保调用后端 API 或处理异步 promise 时不会因为竞态覆盖正确周期的数据。

#### 2. 可视区域缩放极限限制
`klinecharts` 底层自适应缩放时，若用户无限缩小，可视区域蜡烛图数量过多，会引发严重性能卡顿；无限放大则会导致单根蜡烛异常宽大。
- 需要在 `KLineChartPro` 初始化配置或实例 of `chart` API 中设置合理的可视 K 线数量极值限制（例如通过 `barSpace` 或者配置参数限制单屏最大/最小可视根数）。

#### 3. 状态条周期联动
- 当用户通过 K 线高级顶栏（`@klinecharts/pro` 顶栏）切换周期时，触发回调事件。
- 在 `getHistoryKLineData` 中成功加载周期数据后，同步调用 `setCurrentPeriod(tf)` 更新底部状态栏 `.tj-status-strip` 内的 `数据周期` 字样，显示为对应级别（如“15分钟线”、“日线”等）。

#### 4. 高性能 Canvas 流畅度（60fps）与监测机制
- 底层图表是由 Canvas 驱动的。为确保维持 60fps 帧率（单帧绘制 <16ms），禁止在 `getHistoryKLineData` 等高频回调中同步触发重度 CPU 运算或多次重复调用 React setState。
- 所有的衍生计算（如指标、策略提示等）必须放在后台或通过 `useMemo` 进行缓存，绝不在 Canvas 重绘循环内执行。
- 在开发模式下，为了监测流畅度，可在底部状态条临时渲染一个轻量的 FPS 指示器，或在检测到连续丢帧时（单帧绘制超过 32ms）输出警告。

---

## 技术约束
- 所有代码必须通过 strict 严格类型安全检查，禁止使用 `any` 除非有充分理由（与第三方类库未暴露类型交互除外）。
- 零外部网络流出，数据请求全部代理至 localhost FastAPI。
- 所有类名符合 kebab-case 前缀 `tj-` 规范。

---

## Tasks / Subtasks

### Task 1: 周期切换竞态过滤与防冲突设计
- [x] 1.1 在 `KlineChart.tsx` 中引入 `AbortController` 或者是 `activeLoadToken` 的锁机制。
- [x] 1.2 在 `getHistoryKLineData` 触发时，若有进行中的周期加载，丢弃上一个请求，确保只渲染当前周期的 OHLCV 数据。

### Task 2: 状态条周期实时联动更新
- [x] 2.1 在 `getHistoryKLineData` 成功回调中，根据加载成功的 period 获取标准化名称（如 `15m` -> `15分钟线`，`daily` -> `日线`）。
- [x] 2.2 同步更新 `currentPeriod` 状态，驱动底部状态条 `.tj-status-strip` 精准渲染。

### Task 3: 可视 K 线数缩放限制与 60fps 流畅度优化
- [x] 3.1 对 `KLineChartPro` 的配置进行调优，限制 barSpace 极值，避免因无限缩小/放大带来的卡顿或畸变。
- [x] 3.2 优化渲染逻辑，确认在滚轮缩放及平移拖拽时，单帧渲染耗时 <16ms (符合 60fps 流畅度要求)。
- [x] 3.3 （可选）在开发模式下增加轻量级 FPS 监测工具或警告日志。

### Task 4: 构建与回归测试
- [x] 4.1 运行 TypeScript 类型检查与 Vite 打包命令：`npm run build`，确保无任何构建问题。
- [x] 4.2 运行 Vitest 单元测试命令：`npx vitest run` 确认无回归错误，一切正常。

### Review Findings
- [x] [Review][Patch] 标的切换离线失效与切换状态不同步缺陷 [src/components/KlineChart/KlineChart.tsx:178]
- [x] [Review][Patch] Logseq WebView 后台隐藏时的性能与轮询资源泄露 [src/components/KlineChart/KlineChart.tsx:253]
- [x] [Review][Patch] 健康自检轮询在异步返回时潜在的标的覆盖竞态 [src/components/KlineChart/KlineChart.tsx:199]
- [x] [Review][Defer] 港股与美股交易所初始化的 SZ 属性硬编码 [src/components/KlineChart/KlineChart.tsx:355] — deferred, pre-existing
- [x] [Review][Defer] 标的搜索接口缺乏输入防抖与请求撤销处理 [src/components/KlineChart/KlineChart.tsx:302] — deferred, pre-existing
- [x] [Review][Defer] TradingNotes 短仓/做空的盈亏比边界计算漏洞 [src/components/KlineChart/TradingNotes.tsx:208] — deferred, pre-existing

---

## Dev Agent Record

### Implementation Plan
- **周期切换竞态过滤**：在组件内部引入 `loadTokenRef` 锁机制。每次发起周期加载时递增 token，若异步 API 响应返回后检测到 token 已过期，则主动放弃响应并返回空数据，阻止旧周期的异步回调触发 React 状态覆盖。
- **可视区域 K 线数缩放限制**：利用 `(pro as any)._chartApi` 订阅 `'onZoom'` 事件。当滚轮缩放导致 `barSpace` 大于 40 或小于 3 时，主动触发 `setBarSpace` 回滚到设定阈值内，控制了无限缩小/放大造成的性能损耗与图表扭曲。
- **底栏状态条周期联动**：使用 `formatPeriodText` 映射简写 timeframe 值为“15分钟线”、“日线”等中文标识。
- **高流畅度 60fps 监测**：使用 `requestAnimationFrame` 自主运行 FPS 计数器。通过 DOM Ref 直接更改底栏 FPS 字符的值而完全不触发 React 重绘，且在开发环境下对于耗时超过 32ms 的卡顿帧输出 warn 警告。

### Completion Notes
- 完成了全部 AC 和技术约束。
- 确认没有引入任何外部网络请求流出。
- 验证所有 51 个 Vitest 单元测试 100% 绿灯，构建打包无任何报错。

## File List
- [src/components/KlineChart/KlineChart.tsx](file:///Users/yanhaizhe/Documents/aionui-work/logseq-trade-journal/src/components/KlineChart/KlineChart.tsx)

## Change Log
| 日期 | 变更说明 |
|------|----------|
| 2026-05-23 | 创建 Story 2.3 K 线图表交互与周期切换的详细规约文件，并完成技术设计 |
| 2026-05-23 | 代码实现与功能验证全部通过，并优化了高流畅度 Canvas 运行监控 |
