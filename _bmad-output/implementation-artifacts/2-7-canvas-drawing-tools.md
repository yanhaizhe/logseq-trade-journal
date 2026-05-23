# Story 2.7: Canvas 划线工具

**Status:** done
**Epic:** 2 - 无缝交易复盘引擎（THE ENGINE）
**FRs:** FR-11（用户可绘制趋势线/水平线/斐波那契等，上限 50 条，JSON 序列化写入 Block 属性）
**NFRs:** NFR-4（Canvas 标记渲染帧率 60fps）
**File:** `src/components/KlineChart/KlineChart.tsx`（变更）

---

## User Story

As a Yale,
I want 在 K 线图上手动绘制趋势线、水平线等分析图形，且数量限制在 50 条以内，
So that 我能用技术分析辅助交易决策，并避免画布堆积过多杂乱图形。

## Acceptance Criteria

**AC-1: Canvas 划线正常渲染与控制点拖拽**
- **Given** K 线画布已渲染，且 Pro 划线工具栏可见
- **When** 选中划线工具（如趋势线、水平线、斐波那契等）并在 Canvas 上点击绘制
- **Then** 图形能够在 Canvas 上正确显示，且选中后其控制点（handle points）可以被自由拖拽调整位置

**AC-2: 划线数量上限 50 条限制**
- **Given** K 线画布上已存在 50 条用户划线（即除 `'tradeMarker'` 外的所有 overlays）
- **When** 尝试绘制第 51 条划线时
- **Then** 自动将该第 51 条划线从 Canvas 中移除，拦截其添加
- **And** 右上角弹出 Toast 提示 `⚠️ 最多保存 50 条划线`

**AC-3: 切换周期保持显示**
- **Given** 已在某周期（如日 K）绘制了一些划线
- **When** 点击周期按钮切换周期（如切换到 1H 周期）
- **Then** 已经绘制的划线不能消失，必须在对应的时间和价格位置继续正确渲染，且支持继续拖拽控制点

---

## Developer Context

### 现有代码状态与实现细节

1. **`klinecharts-pro` 划线工具集成**
   - 在 `KlineChart.tsx` 初始化 `KLineChartPro` 实例时，已经默认开启了 `drawingBarVisible: true`。因此侧边栏绘图工具栏是直接渲染的，绘图逻辑由 `klinecharts` 底层自动处理。
   
2. **划线上限 50 条的拦截设计 (AC-2)**
   - 在 `klinecharts` 中，所有的划线图形都是通过 `chart.createOverlay(options)` 进行创建的。
   - 由于划线工具是由 Pro 侧栏内部按钮调用的，我们无法直接向这些内置的绘图触发逻辑注入限制。
   - **拦截方案**：在组件初始化 `KLineChartPro` 后，对底层 `_chartApi` 实例的 `createOverlay` 方法进行装饰（装饰者模式）：
     ```typescript
     const chart = (pro as any)._chartApi;
     if (chart) {
       const originalCreateOverlay = chart.createOverlay.bind(chart);
       chart.createOverlay = (options: any) => {
         const isTradeMarker = options?.name === 'tradeMarker';
         const id = originalCreateOverlay(options);
         
         if (!isTradeMarker && id) {
           const currentDrawings = chart.getOverlays().filter((o: any) => o.name !== 'tradeMarker');
           if (currentDrawings.length > 50) {
             chart.removeOverlay({ id });
             setToastMsg('⚠️ 最多保存 50 条划线');
           }
         }
         return id;
       };
     }
     ```
   - **说明**：此方案仅装饰 `createOverlay` 方法，保留原本的返回值（生成的 overlay ID）以兼容内部组件的预期。当过滤出来的划线超过 50 个时，立即利用 ID 调用 `removeOverlay` 将其物理清除。

3. **生命周期与清除**
   - 切换标的（`handleSelectSymbol`）时，应当将所有划线和交易标记清除（因为划线仅对特定标的有效），通常 `klinecharts` 的 `setSymbol` 不会自动删除原有 overlays。
   - 检查并在切换标的时，除了 `chart.removeOverlay({ name: 'tradeMarker' })` 之外，是否需要清空其他 overlays，或等待 Story 2.8/2.9 快照持久化后再决定。
   - 当前在 `handleSelectSymbol` 中切换标的，应彻底清除上一只股的所有划线以防残留。

---

## Tasks / Subtasks

- [x] **Task 1: 装饰 `createOverlay` 实现 50 条划线拦截限制 (AC-2)**
  - [x] 1.1 在 `KlineChart.tsx` 的 `useEffect` 初始化 `new KLineChartPro(...)` 后的接口绑定处，对 `chart.createOverlay` 进行装饰包裹。
  - [x] 1.2 在包裹函数中，如果是除 `'tradeMarker'` 外的划线，在创建后调用 `chart.getOverlays()` 过滤出当前所有划线并计数。
  - [x] 1.3 如果划线数量超过 50，则调用 `chart.removeOverlay({ id })` 清除该划线，并通过 `setToastMsg('⚠️ 最多保存 50 条划线')` 气泡提示用户。
- [x] **Task 2: 标的切换时清空画线 (AC-1)**
  - [x] 2.1 修改 `handleSelectSymbol`，在清除 `'tradeMarker'` overlays 的同时，清除其他所有用户划线，以防老标的的趋势线残留至新标的画布。
- [x] **Task 3: 验证并测试全部 AC**
  - [x] 3.1 运行 `npm run build` 确保 TypeScript 检查通过无类型错误。
  - [x] 3.2 运行 `npm run test` 确保 51/51 个既有单元测试依然全部通过。

### Review Findings

- [x] [Review][Patch] getOverlays null/undefined elements guard in symbol selection [src/components/KlineChart/KlineChart.tsx:768-773]
- [x] [Review][Patch] getOverlays null/undefined/empty guard in createOverlay decorator [src/components/KlineChart/KlineChart.tsx:1135-1136]
- [x] [Review][Patch] TypeScript any rule violation (missing reason comments) [src/components/KlineChart/KlineChart.tsx]
- [x] [Review][Defer] Multi-instance globalOnMarkerHover concurrency conflict [src/components/KlineChart/KlineChart.tsx:51] — deferred, pre-existing
- [x] [Review][Defer] getTradesBySymbol return type checks [src/components/KlineChart/KlineChart.tsx:464] — deferred, pre-existing
- [x] [Review][Defer] entryPrice null/undefined/NaN validation [src/components/KlineChart/KlineChart.tsx:404] — deferred, pre-existing
- [x] [Review][Defer] Search API concurrent request race conditions [src/components/KlineChart/KlineChart.tsx:951-967] — deferred, pre-existing
- [x] [Review][Defer] FPS drop monitor threshold (32ms vs 16.67ms) [src/components/KlineChart/KlineChart.tsx:871] — deferred, pre-existing
- [x] [Review][Defer] Unmounted component state update memory leak in datafeed [src/components/KlineChart/KlineChart.tsx:1091-1111] — deferred, pre-existing
- [x] [Review][Defer] Private _chartApi usage risk [src/components/KlineChart/KlineChart.tsx:1122] — deferred, pre-existing
- [x] [Review][Defer] LocalStorage data loss risk on parsing exception [src/components/KlineChart/KlineChart.tsx:528] — deferred, pre-existing
- [x] [Review][Defer] Form reset timing conflict in handleCloseForm [src/components/KlineChart/KlineChart.tsx:657] — deferred, pre-existing
- [x] [Review][Defer] Symbol switch form symbol mismatch [src/components/KlineChart/KlineChart.tsx:753] — deferred, pre-existing

---

## Dev Notes

- **划线过滤规则**：`chart.getOverlays().filter(o => o.name !== 'tradeMarker')`
- **Toast 联动**：直接触发 `setToastMsg` React 状态值即可触发毛玻璃 Toast。

### 统一项目结构对齐

- 本次变更属于 K 线图表与标记能力域。
- 仅变更 `src/components/KlineChart/KlineChart.tsx` 文件。

### 参考文献

- klinecharts 官方文档关于 Overlay 的生命周期及操作方法：`getOverlays()`, `removeOverlay()`, `createOverlay()`。

---

## Dev Agent Record

### Agent Model Used

Gemini 1.5 Pro (Antigravity Agent)

### Debug Log References

- 无

### Completion Notes List

- ✅ 装饰并重写了 `chart.createOverlay`，统计除 `tradeMarker` 外的用户划线。当超过 50 条限制时，使用 ID 对新增的划线进行物理移除并触发 `setToastMsg('⚠️ 最多保存 50 条划线')` 气泡提示。
- ✅ 在 `handleSelectSymbol` 切换标的时，清空原标的上的所有划线和交易标记，防止残留。
- ✅ 扩展了 `KLineChartInstance` 的 TypeScript 接口声明。
- ✅ 项目在本地成功构建并且 51/51 个单元测试全量通过。

### File List
- `src/components/KlineChart/KlineChart.tsx`

### Change Log
- 2026-05-23: 完成 Story 2.7，实现 Canvas 划线工具 50 条上限及切换标的清空。
