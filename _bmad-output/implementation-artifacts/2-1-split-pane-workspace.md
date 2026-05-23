# Story 2.1: 分屏双栏工作区框架

**Status:** review
**Epic:** 2 - 无缝交易复盘引擎（THE ENGINE）
**FRs:** FR-5
**NFRs:** NFR-1（Block→K线 <150ms），NFR-2（K线加载 <2s）
**File:** `src/App.tsx`（变更）, `src/app.css`（变更）

---

## User Story

As a Yale,
I want 打开插件后看到左侧 Logseq 编辑器与右侧 K 线图表的双栏布局，可拖拽调整比例，
So that 我能在同一界面中一边写笔记一边看 K 线图。

## Acceptance Criteria

**Given** 插件已加载在 Logseq 桌面端
**When** 进入复盘工作区
**Then** 左侧渲染 Logseq 原生编辑器区域（宿主提供），右侧渲染插件 WebView 图表区域
**And** 双栏比例从 localStorage.tj_split_ratio 读取上次记忆值，首次使用为默认 50:50
**And** 拖拽分栏分隔线后比例实时变化，释放鼠标后新比例写入 localStorage
**And** 右侧 K 线区域初始显示空状态提示（未输入标的代码）

---

## Developer Context

### 现有代码状态

**App.tsx** 已实现：
- `mode === 'kline'` 渲染 `<KlineChartComponent>`（通过 `&&` 条件渲染）
- `handleResizeStart` — 插件 iframe 窗口缩放拖拽（right/bottom/bottom-right handles）
- `handleMoveStart` — 插件 iframe 窗口拖动（nav bar）
- 导航栏 `.app-nav` + resize handles `.resize-handle`
- `onEnterWorkspace` 从 WelcomeScreen 导航到 `setMode('kline')`

**KlineChart.tsx** 已实现（约 600 行）：
- 完整 K 线加载（klinecharts Pro + DataRouter）
- 侧边栏面板（自选/学习/交易/委托/成交/深度）
- 标的信息栏、深度图 Canvas 渲染
- `height` prop：默认 560px

**关键架构事实：**
- Logseq 插件以 WebView iframe 嵌入宿主。宿主编辑器左侧始终存在，插件通过 iframe 定位实现"分屏"效果
- 当前 App.tsx 已有完整的窗口拖拽/缩放能力（`handleMoveStart` / `handleResizeStart`），iframe 通过 `window.frameElement` 控制位置和尺寸
- **Story 1.4 已实现** `recheckKey` 机制 + Token 保存 → 自动自检 → 进入 K 线工作区

### 需要完善的内容

1. **分屏比例持久化**：
   - App.tsx 初始化时从 `localStorage.tj_split_ratio` 读取比例，默认 `0.5`
   - 写入 `window.frameElement.style.width` 来设置 iframe 宽度
   - `handleResizeStart` 中释放鼠标后写入 `localStorage.tj_split_ratio`

2. **K 线区域空状态提示**：
   - `mode === 'kline'` 但 `chartConfig.symbol` 为空（首次进入）时显示空状态
   - 空状态 UI：图标 + 提示文字「输入标的代码开始复盘」+ 快速输入框
   - 可复用现有 idle 模式的 quick-symbol 组件样式

3. **进入工作区入口**：
   - WelcomeScreen 中 `onEnterWorkspace` 已设置 `setMode('kline')` ✅
   - 确保从 onboarding → kline 切换时 K 线区域显示空状态（首次无 symbol）

4. **布局约束**：
   - iframe 最小宽度 320px（已有 handleResizeStart 中 `Math.max(320, ...)`）
   - 初始位置：iframe 偏右，露出左侧 Logseq 编辑器

### 技术约束
- React 18 FC 组件，`export default`
- TypeScript strict 模式，`import type` 分离
- Vanilla CSS，类名前缀 `tj-` + kebab-case
- Zustand 单 store，无需引入额外路由库
- 不新增文件，不重写现有 KlineChart
- `localStorage` 键必须使用 `tj_` 前缀
- 通信：`window.parent.postMessage()` ↔ Logseq 宿主

### 数据流
```
App mount
  → 读取 localStorage.tj_split_ratio（默认 0.5）
  → 计算 iframe width = window.innerWidth * ratio
  → 设置 frameElement.style.width

WelcomeScreen → onEnterWorkspace → setMode('kline')
  → 渲染 <KlineChartComponent>（symbol 为空 → 空状态）

handleResizeStart('right') → 拖拽缩放
  → mouseup → 计算 ratio = newWidth / window.innerWidth
  → 写入 localStorage.tj_split_ratio
  → postMessage({ type: 'resize', width, height }) 通知宿主
```

### 文件变更
| 文件 | 操作 | 说明 |
|------|------|------|
| `src/App.tsx` | 变更 | 分屏比例初始化+持久化，K 线空状态 UI，iframe 初始定位 |
| `src/app.css` | 变更 | K 线空状态样式（`.kline-empty-state`） |

### 项目上下文（来自 project-context.md）
- 组件：`export default`, `React.FC<Props>`
- CSS：类名前缀 `tj-` + kebab-case
- 导入：`@/` 路径别名，`import type` 分离
- localStorage 键：`tj_` 前缀
- 通信：`window.parent.postMessage()`
- 代码风格：无注释

---

## Tasks / Subtasks

### Task 1: 分屏比例持久化
- [x] 1.1 App mount 时读取 `localStorage.tj_split_ratio`，默认 `0.5`
- [x] 1.2 根据比例计算并设置 iframe 初始宽度
- [x] 1.3 `handleResizeStart('right')` 的 mouseup 中写入 `localStorage.tj_split_ratio`
- [x] 1.4 iframe 初始位置定位（`left`/`top`），确保右侧留有编辑器空间

### Task 2: K 线区域空状态
- [x] 2.1 `mode === 'kline'` 且无 symbol 时显示空状态 UI
- [x] 2.2 空状态内容：图标 📊 + 标题「复盘工作区」+ 提示「输入标的代码开始分析」+ 快速输入框
- [x] 2.3 输入框支持 Enter 提交，调用现有 `loadChart` 逻辑

### Task 3: 静态验收与测试
- [x] 3.1 确认首次进入时 iframe 宽度 = 屏幕宽度 × 50%
- [x] 3.2 确认拖拽分隔线后比例写入 localStorage 并持久化
- [x] 3.3 确认 K 线区域空状态正确渲染
- [x] 3.4 确认输入 symbol 后 K 线正常加载
- [x] 3.5 运行 `tsc --noEmit` + `npx vitest run` 全量回归

---

## Dev Agent Record

### Implementation Plan
1. App.tsx 添加 `useEffect` 初始化读取 `tj_split_ratio` 并设置 iframe 宽度
2. 修改 `handleResizeStart` mouseup 写入 split ratio
3. 添加 K 线空状态条件渲染 UI
4. 添加 `.kline-empty-state` 等 CSS 样式
5. 验证完整链路：onboarding → 进入工作区 → 空状态 → 输入 symbol → K 线加载
6. tsc + vitest 验证无回归

### Debug Log
- 在拖拽松开后需要立即获得最新的宽度比例。由于 React 状态异步更新，若依赖 state 会有延迟。我们在 mouseup (onUp) 时直接从 DOM 的 `iframe.clientWidth` 实时提取宽度并除以 `totalWidth` 计算，这样可以完美避开状态延迟，写入 localStorage 极速且类型安全。

### Completion Notes
- **分屏比例与尺寸位置初始化**：在 App 挂载的 `useEffect` 中，读取 `tj_split_ratio`（默认为 `0.5`），计算 iframe 宽度并设为 right-aligned (`left = totalWidth - iframeWidth`)。首次挂载若无标的缓存，则自动清除 symbol 以进入空状态。
- **持久化与重置**：在 resize 结束时，将最新比例写入 `localStorage.tj_split_ratio`；点击“恢复默认大小”时，除了重置宽高，还会同步把 ratio 设为 `0.5`、`left` 重定位至右侧，并同步写入 `localStorage`。
- **K 线空状态 UI**：为 K 线工作区首屏及 Onboarding 进入工作区提供了专用的 `.tj-kline-empty-state`。支持通过 Input 框 Enter 键或点击按钮，调用 `loadChart` 输入标的，即刻载入 klinecharts 图表。
- **构建与测试通过**：运行 `npm run build` (tsc 检查 + Vite 构建) 及 `npx vitest run` (40 个测试用例) 全部 100% 通过，无回归。

---

## File List
| 文件 | 操作 | 状态 |
|------|------|------|
| `src/App.tsx` | 变更 | modified |
| `src/app.css` | 变更 | modified |

---

## Change Log
| 日期 | 变更说明 |
|------|----------|
| 2026-05-22 | 实现了分屏双栏工作区框架与持久化、空状态 UI 渲染及 Enter 载入逻辑 |
| 2026-05-22 | 基于 epics/PRD/架构/现有代码上下文创建完整 Story 文件 |
