# Story 2.2: 标的代码输入与 K 线加载

**Status:** done
**Epic:** 2 - 无缝交易复盘引擎（THE ENGINE）
**FRs:** FR-1, FR-20（FastAPI连接指示灯）
**NFRs:** NFR-2（K线初始加载 <2s）, NFR-9（零外部网络流出）
**File:** `src/main.tsx`（变更）, `src/App.tsx`（变更）, `src/components/KlineChart/KlineChart.tsx`（变更）, `src/app.css`（变更）

---

## User Story

As a Yale,
I want 在左侧 Block 中输入标的代码后，右侧 K 线画布自动加载对应历史走势，
So that 我能快速从笔记上下文切换到图表分析。

## Acceptance Criteria

**Given** 左侧创建新 Block 或点击已有 Block
**When** Block 中包含有效标的代码（如 000001）
**Then** 右侧 K 线画布在 <2s 内加载该标的日线历史 OHLCV 数据并渲染
**And** 输入无效代码（如 ZZZZZZ）时画布显示「未找到该标的」占位
**And** FastAPI 离线时画布保持灰度「数据服务未连接」状态
**And** 底部状态栏显示 FastAPI 连接指示灯（绿/红）

---

## Developer Context

### 现有代码状态

1. **`src/main.tsx`**：
   - 宿主侧插件入口，负责初始化 Logseq 并挂载 React App。
   - 包含 `postToApp(msg)` 方法向 React WebView 发送 postMessage。
   - 目前缺少对 Block 焦点或内容变化的监听。

2. **`src/App.tsx`**：
   - React 根组件，负责控制分屏比例与视图切换。
   - 包含 message 事件监听器，接收宿主消息（如 `switch-mode`, `visibility-changed`）。
   - 包含 `loadChart(symbol)` 用于加载 K 线标的并设置全局 Zustand 的 `chartConfig.symbol`。
   - 当 `chartConfig.symbol` 为空时，渲染空状态组件 `.tj-kline-empty-state`。

3. **`src/components/KlineChart/KlineChart.tsx`**：
   - 核心 K 线图表渲染组件，集成 `KLineChartPro`。
   - 包含 `currentSymbol` 状态（初始化为 `initialSymbol`）。
   - 包含 `getHistoryKLineData` 用于调用 `dataRouter.fetchKLine(...)` 获取 OHLCV 数据。
   - 包含自选股面板、委托盘、最新成交模拟、深度图等子面板。
   - 目前仅从 `initialSymbol` 载入 K 线，未监听 Props 的 `symbol` 动态变化。
   - 缺少连接状态检测（每 15s 轮询）与底部指示灯面板。
   - 缺少服务离线或未找到标的时的异常占位图层。

4. **`src/core/DataRouter.ts`**：
   - 提供 `checkAKShareHealth(): Promise<boolean>` 用于检测 FastAPI 离线状态。
   - `fetchKLine` 方法会在数据缺失或网络失败时抛出错误。

### 需要完善的内容

#### 1. Logseq Block 焦点轮询与消息转发（宿主侧 `src/main.tsx`）
Logseq 插件 SDK 未提供原生的 Block 聚焦或点击事件。最稳妥的方案是：
- 在 `main.tsx` 中使用 `setInterval` 启动一个 300ms 的轮询器。
- 轮询调用 `logseq.Editor.getCurrentBlock()`。
- 跟踪上一次的 `lastBlockUuid` 和 `lastBlockContent` 字段。
- 当检测到当前 block 发生改变（uuid 改变，或内容 content 被修改）时，调用 `postToApp({ type: 'logseq-block-changed', block })` 转发。
- 如果 block 为 null，则转发 `block: null` 消息以同步清除状态。

#### 2. Block 内容正则解析与标的自动加载（App 侧 `src/App.tsx`）
- 监听 `logseq-block-changed` 消息。
- 提取标的提取规则：
  - **优先从 Block 属性提取**：读取 `block.properties?.['trade/symbol']` 或 `block.properties?.symbol`。
  - **文本正则表达式提取**：如果属性为空，则匹配 `block.content` 正文文本：
    - **A股**：6 位数字（`\b\d{6}\b`）
    - **美股**：2-5 位全大写字母（`\b[A-Z]{2,5}\b`）
    - **加密货币**：`\b[A-Z]{2,10}(?:\/)?USDT\b`（支持 `BTCUSDT` 或 `BTC/USDT` 的模糊兼容）
- 一旦成功捕获到标的代码，且该代码与全局 Zustand store 中的 `chartConfig.symbol` 不同时，自动调用 `loadChart(extractedSymbol)` 加载对应图表。

#### 3. Props 变化响应与多模态异常占位（组件侧 `src/components/KlineChart/KlineChart.tsx`）
- **同步 `symbol` Props**：
  - 添加 `useEffect` 监听 props 中的 `symbol` 变化。
  - 当 Props.symbol 改变且与 `currentSymbol` 不同时，自动调用 `handleSelectSymbol(symbol)`，驱动 `KLineChartPro` 重载该标的数据。
- **异常捕获与状态变量**：
  - 在组件中定义 `chartState` 状态变量：`'normal' | 'not_found' | 'offline'`。
  - 在 `getHistoryKLineData` 时捕获数据加载失败。
  - 判定失败原因：
    - 网络超时/不可达（如 `Failed to fetch`，或者通过 `dataRouter.checkAKShareHealth()` 确认离线）：设置 `chartState` 为 `'offline'`。
    - 服务在线但无此标的数据（FastAPI 成功响应但报错无数据）：设置 `chartState` 为 `'not_found'`。
    - 加载成功：将 `chartState` 设为 `'normal'`。
- **灰度画布与磨砂玻璃覆盖层**：
  - 当 `chartState === 'not_found'`：在 K 线组件上方渲染磨砂玻璃覆盖层 `.tj-kline-error-overlay`，显示提示：「未找到标的: {symbol}」。
  - 当 `chartState === 'offline'`：对 K 线容器容器应用灰色 CSS 滤镜（`filter: grayscale(1) opacity(0.5);`），同时渲染覆盖层 `.tj-kline-error-overlay`，显示提示：「数据服务未连接（127.0.0.1:8765），正在尝试重新连接...」。

#### 4. FastAPI 健康度自检与指示灯（组件侧 `src/components/KlineChart/KlineChart.tsx`）
- 在 `KlineChartComponent` 底部新增固定毛玻璃状态条（Status Strip），并在右下角渲染 FastAPI 连接状态指示灯（`.tj-status-light`）。
- 启动 `setInterval` 轮询健康自检，每 15 秒执行一次 `dataRouter.checkAKShareHealth()`。
- 连接正常时指示灯显示为绿色（添加 `.online` 类名，显示「数据服务：连接正常」）。
- 连接断开时指示灯变为红色（添加 `.offline` 类名，显示「数据服务：连接异常」），并在此期间强行将 `chartState` 变更为 `'offline'`。

### 技术约束
- 所有代码均符合 TypeScript `strict: true`。
- 所有存储键强制加上 `tj_` 前缀（例如 `tj_last_symbol`）。
- 所有类名符合前缀 `tj-` + kebab-case 的规范。
- 零外部网络流出，数据请求全部代理至 localhost FastAPI。

### 数据流
```
[Logseq 宿主] 
  → 300ms 轮询 getCurrentBlock() 
  → postMessage({ type: 'logseq-block-changed', block }) 
    ↓
[App.tsx] 
  → 提取属性/正则匹配 symbol 
  → loadChart(symbol) 
  → 更新 Zustand store.chartConfig.symbol
    ↓
[KlineChart.tsx] 
  → useEffect 监测 Props.symbol 变化 
  → proChartRef.current.setSymbol(symbol) 
  → datafeed.getHistoryKLineData()
    ├─► 成功: 渲染图表, 状态置为 'normal'
    ├─► 无效标的: 捕获异常, 状态置为 'not_found', 弹出毛玻璃提示
    └─► 离线: 捕获异常/15s轮询发现离线, 状态置为 'offline', 画布灰度化并提示
```

### 文件变更
| 文件 | 操作 | 说明 |
|------|------|------|
| `src/main.tsx` | 变更 | 新增 300ms Block 焦点轮询，并利用 `postToApp` 发送 Block 变更事件 |
| `src/App.tsx` | 变更 | 新增对 `logseq-block-changed` 消息的监听及正则提取 symbol 的逻辑，触发 `loadChart` |
| `src/components/KlineChart/KlineChart.tsx` | 变更 | 同步 Props 变化，新增健康度自检轮询（15s），多模态占位图层，底部指示灯面板 |
| `src/app.css` | 变更 | 新增异常占位覆盖层 `.tj-kline-error-overlay`、状态条 `.tj-status-strip`、指示灯 `.tj-status-light` 的样式 |
---

## Tasks / Subtasks

### Task 1: Logseq Block 变动与点击监听转发
- [x] 1.1 在 `src/main.tsx` 中添加 300ms `setInterval` 轮询器。
- [x] 1.2 轮询内获取 `logseq.Editor.getCurrentBlock()`，当 `uuid` 或 `content` 发生改变时，触发 `postToApp({ type: 'logseq-block-changed', block })`。

### Task 2: App 消息接收与 Symbol 属性/文本提取
- [x] 2.1 在 `src/App.tsx` 的 message 处理器中处理 `logseq-block-changed` 事件。
- [x] 2.2 提取属性中的 `symbol` 或 `trade/symbol` 属性。
- [x] 2.3 若属性不存在，使用正则匹配 content 中的 A股/美股/加密货币代码，提取出合法的标的。
- [x] 2.4 当提取到的标的与当前 Zustand 存储的标的不同，调用 `loadChart(symbol)`。

### Task 3: K 线画布多模态渲染与状态灯联动
- [x] 3.1 在 `src/components/KlineChart/KlineChart.tsx` 中使用 `useEffect` 侦听并同步 Props 的 `symbol`。
- [x] 3.2 在组件内添加 `chartState` 用于记录 `'normal' | 'not_found' | 'offline'`。
- [x] 3.3 在 `getHistoryKLineData` 加载失败时捕获错误，分流为 `'offline'` 或 `'not_found'` 状态。
- [x] 3.4 渲染异常覆盖层 UI `.tj-kline-error-overlay`，针对 `'offline'` 状态将 K 线容器样式附加 `filter: grayscale(1) opacity(0.5)` 灰度属性。
- [x] 3.5 组件挂载时启动 15 秒轮询，调用 `dataRouter.checkAKShareHealth()` 监测健康状态。
- [x] 3.6 新增底部状态条 `.tj-status-strip`，包含指示灯 `.tj-status-light`，依据轮询结果动态更新绿/红状态及文本提示。

### Task 4: 构建与回归测试
- [x] 4.1 在 `src/app.css` 编写异常覆盖层、底部状态栏、指示灯的 CSS 样式。
- [x] 4.2 运行类型检查与构建命令：`npm run build` (`tsc && vite build`) 确保无错误。
- [x] 4.3 运行 Vitest 单元测试命令：`npx vitest run` 确认所有测试全部绿灯通过。

---

## File List
- `[NEW]` [symbol.ts](file:///Users/yanhaizhe/Documents/aionui-work/logseq-trade-journal/src/utils/symbol.ts) - 标的代码提取与标准化工具
- `[NEW]` [symbol.test.ts](file:///Users/yanhaizhe/Documents/aionui-work/logseq-trade-journal/tests/symbol.test.ts) - 标的提取单元测试 (Vitest)
- `[MODIFY]` [main.tsx](file:///Users/yanhaizhe/Documents/aionui-work/logseq-trade-journal/src/main.tsx) - 宿主侧 300ms getCurrentBlock 轮询与 postMessage 消息发送
- `[MODIFY]` [App.tsx](file:///Users/yanhaizhe/Documents/aionui-work/logseq-trade-journal/src/App.tsx) - App 层消息接收转发与 `chartConfig.symbol` 状态驱动
- `[MODIFY]` [KlineChart.tsx](file:///Users/yanhaizhe/Documents/aionui-work/logseq-trade-journal/src/components/KlineChart/KlineChart.tsx) - K线图表多模态异常处理、15s连接自检、自建底部指示灯状态条
- `[MODIFY]` [app.css](file:///Users/yanhaizhe/Documents/aionui-work/logseq-trade-journal/src/app.css) - 追加错误磨砂玻璃覆盖层、底部指示灯状态栏布局样式

---

## Dev Agent Record
- **Implementation & Completion Notes**:
  - **Logseq Block 轮询机制**: 在 `src/main.tsx` 新增 300ms `setInterval` 轮询当前编辑 block，若发生改变或选中空 block 时利用 `postToApp` 发送 `logseq-block-changed` 消息。处理了 undefined 类型安全性问题。
  - **标的代码解析正则**: 提取并实现 `extractSymbol` 纯函数，优先读取属性中 `trade/symbol` 与 `symbol`，其次采用正则匹配：A股匹配 6 位数字，美股匹配 2-5 位大写字母，加密货币优先匹配 `[A-Z]{2,10}(/)USDT`。并在解析加密货币时对无斜杠的代码自动格式化为带斜杠的 CCXT 期望规格（例如 `BTCUSDT` -> `BTC/USDT`），极大提高了兼容容灾性。
  - **App 消息分流机制**: 在 `src/App.tsx` 建立对 `logseq-block-changed` 的状态处理。通过 `chartSymbolRef` 和 `loadChartRef` 控制组件事件绑定，在 symbol 发生更新时调用 `loadChart`，不发生重复注册 message 事件的性能损耗。
  - **K线多模态状态覆盖层**: 引入 `chartState` 和 `isOnline`。在 `getHistoryKLineData` 数据加载失败的 catch 闭包中，使用 `checkAKShareHealth()` 动态判定是标的不存在（`'not_found'`）还是服务离线（`'offline'`）。在此基础上渲染了精致毛玻璃异常遮罩图层，在离线时强行把图表容器应用灰度 CSS filter（`grayscale(1) opacity(0.5)`）。
  - **健康度状态条自检**: 引入 15秒 `setInterval` 轮询检查 FastAPI 服务连接，在 `KlineChart` 组件正下方展现状态栏及红/绿双色指示状态灯。对于离线异常状态提供手动“重新连接”重试按钮。
  - **项目合规与测试验证**: 完成所有 AC 后，执行类型自检及 `npm run build` 无任何 TS 警告或报错。运行 Vitest 全部 49 个单元测试用例，100% 绿灯全部顺利通过，零 Regression。

---

## Change Log
| 日期 | 变更说明 |
|------|----------|
| 2026-05-23 | 实现标的代码提取逻辑、宿主 300ms 轮询、15s FastAPI 连接性自检、底部状态指示条与多模态磨砂遮罩覆盖层，全部单元测试及打包构建 100% 绿灯通过 |
| 2026-05-22 | 基于 epics/架构/宿主源码分析，完成 Story 2.2 的详细规格及技术设计草案 |

---

## Review Findings

### Tasks from Code Review (AI-Review)
- [x] [Review][Patch] Block 失去焦点或空 block（block: null）时没有同步清空 `chartConfig.symbol` 状态 [src/App.tsx:255]
- [x] [Review][Patch] 部分新增的 CSS 类名 and 状态类名缺少 `tj-` 前缀 [src/components/KlineChart/KlineChart.tsx:123]
- [x] [Review][Patch] 引入外部 Google Fonts 字体（Inter），违反零外部网络流出约束 [src/app.css:1]
- [x] [Review][Patch] 健康自检定时器因为回调函数依赖更新而频繁销毁与重置 (Timer Churn) [src/components/KlineChart/KlineChart.tsx:170]
- [x] [Review][Patch] React 18 Strict Mode 下 `initializedRef.current` 导致 K线图开发环境下渲染失效 [src/components/KlineChart/KlineChart.tsx:273]
- [x] [Review][Patch] 美股代码正则提取过于贪婪（如 BUY, SELL, TODO 等大写常用语被误识别为 symbol） [src/utils/symbol.ts:40]
- [x] [Review][Patch] 鼠标拖拽/缩放缺乏 `pointercancel` 监听，导致手势中断时界面拖拽卡死 [src/App.tsx:280]
- [x] [Review][Patch] 严格的 properties 属性类型检查（typeof === 'string'）导致 Logseq 纯数字属性匹配失效 [src/utils/symbol.ts:16]
- [x] [Review][Defer] Logseq block 焦点轮询 300ms 带来的潜在性能开销 [src/main.tsx:107] — deferred, pre-existing
- [x] [Review][Defer] 遗留的 2.1 缩放及定位相关 Edge Cases (如 sandbox 中 getFrameElement 返回 null、拖拽重置、Watchlist 错误结构等) [src/App.tsx:85] — deferred, pre-existing
