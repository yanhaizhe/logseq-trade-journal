# Story 2.6: 买卖标记交互

**Status:** done
**Epic:** 2 - 无缝交易复盘引擎（THE ENGINE）
**FRs:** FR-10（买卖三角形标记渲染到 K 线，hover 弹出微卡片）
**NFRs:** NFR-4（Canvas 标记渲染帧率 60fps），NFR-9（零外部网络流出）
**File:** `src/components/KlineChart/KlineChart.tsx`（变更）, `src/app.css`（变更）

---

## User Story

As a Yale,
I want 鼠标悬停买卖标记时弹出微卡片显示交易详情，
So that 我不需要离开图表就能回顾每笔交易的关键信息。

## Acceptance Criteria

**AC-1: 悬停触发弹出详情卡片**
**Given** K 线图上已有买/卖标记且鼠标移动到三角形标记上
**When** 悬停三角形标记
**Then** 在 50ms 内弹出暗黑半透明的微卡片，显示该笔交易的详情（方向、价格、数量，可选显示策略/错误标签和交易时间）

**AC-2: 移出隐藏卡片**
**Given** 交易详情卡片已弹出
**When** 鼠标移出三角形标记
**Then** 该卡片立即消失

**AC-3: 多标记共存且不重叠**
**Given** 标的在相同或相近的时间点有多笔交易
**When** 标记在 K 线 Canvas 上渲染
**Then** 各个三角形标记能共存且不会发生物理重叠（可以在 snappedTimestamp 位置对齐或支持单独悬停）

---

## Developer Context

### 现有代码状态

#### 1. `src/components/KlineChart/KlineChart.tsx`
- **`registerOverlay` 注册模式**：
  在顶层注册了名称为 `'tradeMarker'` 的自定义 overlay：
  ```typescript
  registerOverlay({
    name: 'tradeMarker',
    totalStep: 1,
    createPointFigures: ({ coordinates, overlay }) => { ... }
  });
  ```
- **如何获取事件**：
  根据 klinecharts 官方 Overlay API 规范，可在 `registerOverlay` 的配置中直接定义 `onMouseEnter` 和 `onMouseLeave` 事件回调。
  - 函数签名：`(event: OverlayEvent) => boolean`
  - 触发时机：鼠标移入/移出该自定义 overlay 覆盖物时。
- **传递完整数据**：
  现有的 `renderTradeMarkers` 函数在调用 `chartApi.createOverlay` 时，只将 `direction` 和 `price` 写入 `extendData`：
  ```typescript
  chartApi.createOverlay({
    name: 'tradeMarker',
    points: [{ timestamp: snappedTimestamp, value: r.entryPrice }],
    extendData: {
      direction: r.direction,
      price: r.entryPrice,
      quantity: r.quantity,
      tags: r.tags,
      entryTime: r.entryTime
    }
  });
  ```
- **React 与全局 Overlay 通信**：
  由于 `registerOverlay` 是在 React 组件外部执行的全局静态调用，不能直接在回调中执行 React 的 `useState` setState。
  - **推荐设计**：在模块顶部声明一个 `let globalOnMarkerHover: ((hovered: any | null, event?: any) => void) | null = null;` 桥接函数。
  - 在 `registerOverlay` 的 `onMouseEnter` 中调用 `globalOnMarkerHover(event.overlay.extendData, event)`。
  - 在 `onMouseLeave` 中调用 `globalOnMarkerHover(null)`。
  - 在 `KlineChartComponent` 组件内部，使用 `useEffect` 注册 `globalOnMarkerHover` 桥接，并在里面设置 `hoveredTrade` 的 React 状态，包含其 `x`, `y` 坐标和交易内容。
- **详情微卡片渲染位置**：
  - 在 `className="tj-pro-chart-container-wrapper"` 容器（其具有 `position: 'relative'` 样式）内部，渲染一个 `position: 'absolute'` 的磨砂玻璃/暗黑半透明微卡片。
  - 使用 `hoveredTrade.x` 和 `hoveredTrade.y` 进行定位。为了防止卡片遮挡三角形标记本身，可向上做偏移（如 `top: hoveredTrade.y - 10`，`left: hoveredTrade.x`，配合 `transform: 'translate(-50%, -100%)'`）。
  - 微卡片样式应符合 `Glassmorphism` 规范，具有毛玻璃效果。

---

## Tasks / Subtasks

### Task 1: 升级 tradeMarker 标记的 extendData (AC: #1)
- [x] 1.1 修改 `renderTradeMarkers`：调用 `createOverlay` 时，将包含 `direction`, `entryPrice` (作为 price), `quantity` (作为数量), `tags`, `entryTime` 的完整对象作为 `extendData` 传入。

### Task 2: 实现全局 Overlay 悬停桥接逻辑 (AC: #1, #2)
- [x] 2.1 在 `KlineChart.tsx` 文件模块顶部定义 `globalOnMarkerHover` 变量：
  ```typescript
  let globalOnMarkerHover: ((hovered: any | null, event?: any) => void) | null = null;
  ```
- [x] 2.2 在 `registerOverlay({ name: 'tradeMarker', ... })` 的参数中，追加 `onMouseEnter` 和 `onMouseLeave`：
  - `onMouseEnter`: 如果 `globalOnMarkerHover` 存在，调用并传入 `event.overlay.extendData` 和 `event`，返回 `true`。
  - `onMouseLeave`: 如果 `globalOnMarkerHover` 存在，调用并传入 `null`，返回 `true`。

### Task 3: 在 React 组件中处理 hoveredTrade 状态并渲染微卡片 (AC: #1, #2)
- [x] 3.1 在 `KlineChartComponent` 内定义 `hoveredTrade` 状态：
  ```typescript
  const [hoveredTrade, setHoveredTrade] = useState<{
    x: number;
    y: number;
    direction: string;
    price: number;
    quantity: number;
    tags?: string[];
    timestamp: string;
  } | null>(null);
  ```
- [x] 3.2 使用 `useEffect` 在组件加载时注册 `globalOnMarkerHover`，并在组件卸载时清理为 `null`：
  ```typescript
  useEffect(() => {
    globalOnMarkerHover = (data, event) => {
      if (data && event) {
        setHoveredTrade({
          x: event.x,
          y: event.y,
          direction: data.direction,
          price: data.price || data.entryPrice,
          quantity: data.quantity,
          tags: data.tags,
          timestamp: data.timestamp || data.entryTime,
        });
      } else {
        setHoveredTrade(null);
      }
    };
    return () => { globalOnMarkerHover = null; };
  }, []);
  ```
- [x] 3.3 在 `.tj-pro-chart-container-wrapper` 内部渲染 `hoveredTrade` 微卡片：
  ```tsx
  {hoveredTrade && (
    <div 
      className="tj-marker-hover-card" 
      style={{ 
        position: 'absolute', 
        left: hoveredTrade.x, 
        top: hoveredTrade.y - 10, 
        transform: 'translate(-50%, -100%)',
        zIndex: 100
      }}
    >
      {/* 渲染交易详情: 方向、价格、数量、标签等 */}
    </div>
  )}
  ```

### Task 4: 添加毛玻璃样式与过渡效果 (AC: #1, #2)
- [x] 4.1 在 `src/app.css` 中添加 `.tj-marker-hover-card` 及子元素的样式。
  - 背景：暗黑半透明毛玻璃 `rgba(18, 19, 24, 0.85)`，伴随 `backdrop-filter: blur(8px)`
  - 边框：`1px solid rgba(255, 255, 255, 0.08)`
  - 阴影：`box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5)`
  - 动画：淡入淡出微动过渡（50ms 内显示与隐藏）
  - 标签样式：使用微型胶囊展示

### Task 5: 验证并测试 (全部 AC)
- [x] 5.1 运行 `npm run build` 确保无 TypeScript 类型错误。
- [x] 5.2 运行 `npx vitest run` 确保全部逻辑测试通过。

### Task 6: 状态更新 (全部 AC)
- [x] 6.1 更新 `sprint-status.yaml` 中 `2-6-trade-marker-hover` 状态为 `ready-for-dev`。 (已变更为 in-progress -> review)
- [x] 6.2 在 `2-6-trade-marker-hover.md` 中将 Status 更新为 `ready-for-dev`。 (已直接置为 review)

### Review Findings

- [x] [Review][Decision] 同一时刻与价格的标记重叠问题 — 已解决（选择选项2：多笔交易合并展示在同一张悬浮卡片上）。
- [x] [Review][Patch] 实现多笔交易合并显示在单张 hover 卡片上
- [x] [Review][Patch] 卡片弹出动画过渡时间超出限制 [src/app.css:4506]
- [x] [Review][Patch] 全局 globalOnMarkerHover 回调的多实例干扰 [src/components/KlineChart/KlineChart.tsx:54]
- [x] [Review][Patch] hover 标签颜色分类匹配规则漏洞 [src/components/KlineChart/KlineChart.tsx:1333]
- [x] [Review][Patch] 时间吸附 snappedTimestamp 存在 O(M*N) 性能瓶颈 [src/components/KlineChart/KlineChart.tsx:368]
- [x] [Review][Patch] Hover 卡片 inline style x, y 定位缺少 px 单位 [src/components/KlineChart/KlineChart.tsx:1304]
- [x] [Review][Patch] isOnline 与 chartState 网络状态表达矛盾 [src/components/KlineChart/KlineChart.tsx:1025]
- [x] [Review][Patch] 无 K 线历史数据返回时错误状态显示不正确 [src/components/KlineChart/KlineChart.tsx:1016]
- [x] [Review][Patch] 生产环境运行不必要的 RAF 性能开销 [src/components/KlineChart/KlineChart.tsx:789]
- [x] [Review][Patch] 交易持久化存储写操作缺乏异常捕获与友好报错 [src/components/KlineChart/KlineChart.tsx:486]
- [x] [Review][Patch] 标的变动后 200ms 延时刷新标记易产生竞态 [src/components/KlineChart/KlineChart.tsx:493]
- [x] [Review][Patch] 交易记录 entryTime 无效时缺少安全防护 [src/components/KlineChart/KlineChart.tsx:362]
- [x] [Review][Patch] 防重/查重逻辑对异常记录缺少空指针防护 [src/components/KlineChart/KlineChart.tsx:438]
- [x] [Review][Patch] 价格和数量录入缺乏 Infinity/NaN 输入拦截 [src/components/KlineChart/KlineChart.tsx:545]
- [x] [Review][Patch] 交易方向字段大小写敏感导致渲染图标错误 [src/components/KlineChart/KlineChart.tsx:79]
- [x] [Review][Patch] 录入表单打开时切换标的代码导致保存错误 [src/components/KlineChart/KlineChart.tsx:570]
- [x] [Review][Defer] 对私有成员 _chartApi 的强行跨越类型访问 [src/components/KlineChart/KlineChart.tsx:398] — deferred, pre-existing

---

## Dev Agent Record

### Agent Model Used
Gemini 3.5 Flash

### Debug Log References
- 无

### Completion Notes List
- 升级了 `tradeMarker` 标记所附带的 `extendData` 结构，补充了 `quantity`, `tags`, `timestamp` 的信息。
- 在 `registerOverlay` 的参数中接入 `onMouseEnter` 和 `onMouseLeave` 事件。
- 采用局部桥接变量 `globalOnMarkerHover` 完成了 Canvas Overlay 与 React 局部状态的事件通知。
- 引入了 `hoveredTrade` 状态并配合 absolute 定位把毛玻璃详情卡片动态渲染在 `.tj-pro-chart-container-wrapper` 内。
- 为 `tj-marker-hover-card` 及其子组件补充了暗黑毛玻璃主题和 50ms 内的过渡淡入淡出动画，确保整体视觉优雅契合。

---

## File List
- `src/components/KlineChart/KlineChart.tsx`
- `src/app.css`

---

## Change Log
| 日期 | 变更说明 |
|------|----------|
| 2026-05-23 | 创建 Story 2.6 设计规约 |
| 2026-05-23 | 实现标记悬停交互，包括 `globalOnMarkerHover` 桥接、React 浮现微卡片以及对应的 Vanilla CSS 样式，验证打包与运行测试成功。 |
