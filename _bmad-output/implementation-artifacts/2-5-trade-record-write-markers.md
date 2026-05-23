# Story 2.5: 交易记录写入与标记渲染

**Status:** done
**Epic:** 2 - 无缝交易复盘引擎（THE ENGINE）
**FRs:** FR-7（TradeRecord 写入 Block 属性+买卖标记渲染）, FR-8（确认写入按钮 disabled+loading+50ms 防抖）
**NFRs:** NFR-3（表单提交响应 <50ms）, NFR-4（Canvas 标记渲染 60fps）, NFR-9（零外部网络流出）
**File:** `src/components/KlineChart/KlineChart.tsx`（变更）, `src/app.css`（变更）

---

## User Story

As a Yale,
I want 提交交易表单后数据写入 Block 属性，买卖标记自动渲染到 K 线图上，
So that 我能一眼在图表上看到每笔交易的进出场位置。

## Acceptance Criteria

**AC-1: 写入按钮防抖与 Loading 状态**
**Given** 表单已完整填写
**When** 点击「确认写入」
**Then** 按钮立即 disabled + 显示 loading 旋转动画，50ms 防抖窗口内重复点击无效

**AC-2: TradeRecord 写入 Block 属性**
**Given** 按钮已进入 loading 状态
**When** 验证通过
**Then** TradeRecord（direction/price/size/timestamp/strategy_tags/error_tags）写入当前 Block 属性（通过 Logseq DB Service 或 localStorage 降级）

**AC-3: 表单关闭**
**Given** 数据成功写入
**When** 写入回调返回成功
**Then** 表单关闭，Toast 显示「✅ 交易已录入」，按钮恢复可用状态

**AC-4: K 线 Canvas 买卖标记渲染**
**Given** 存在一笔或多笔已写入的 TradeRecord
**When** 交易提交成功后 / 加载标的后
**Then** K 线 Canvas 在 trade.timestamp 对应的 K 线柱体位置，通过 `chart.createOverlay()` 渲染买卖标记（买入绿色△、卖出红色▽）

**AC-5: 防重复写入**
**Given** 同一 symbol + timestamp + direction + price 已存在
**When** 用户重复点击确认
**Then** Logseq DB 中仅存在一条 TradeRecord（防重复写入验证）

---

## Developer Context

### 现有代码状态

#### 1. `src/components/KlineChart/KlineChart.tsx`（1509 行）

**现有表单提交逻辑（L238-271）：**
- `handleFormSubmit` 回调函数已实现前端表单校验（验证价格和数量必须 >0）。
- **当前行为仅展示 Toast 成功消息，并未将数据实际写入 Logseq DB 或 localStorage。** 这是 Story 2.5 的核心变更点。
- 提交成功后调用 `handleCloseForm()` 重置所有表单状态。

**必须保留的现有行为：**
- `handleFabClick`（L223-236）：空标的拦截 + 初始化表单。
- `handleCloseForm`（L193-202）：完全重置所有表单状态。
- 前端校验逻辑（价格 >0、数量 >0、必填项）不可移除。
- Toast 消息通道 `toastMsg` + 3s 自动消失逻辑（L204-209）。
- Esc 键关闭（L212-221）。

**现有标签数据：**
- `PRESET_PATTERNS`（L60-70）：9 个策略标签预设。
- `PRESET_PSYCHOLOGY`（L72-80）：7 个心理/错误标签预设。
- 已有 `selectedStrategyTags` 和 `selectedErrorTags` 状态，可直接用于写入。

**proChartRef 与 klinecharts overlay API：**
- `proChartRef.current` 持有 `KLineChartPro` 实例（L156）。
- Chart API 通过 `(proChartRef.current as any)._chartApi` 获取（L696）。
- **`TradingNotes.tsx`（L143-183）已有经过验证的 `chart.createOverlay()` 调用模式**，使用 `priceLine` overlay 类型。

#### 2. `src/core/TradeManager.ts`

- `recordTrade(input: TradeInput)` 方法（L25-73）是完整的交易写入流程：校验 → 估算手续费 → 计算盈亏 → 构建 TradeRecord → 调用 `db.insertTrade(trade)` → 返回含 blockId 的完整记录。
- **注意**：`TradeInput` 需要 `entryPrice`、`exitPrice`、`quantity`、`direction`、`entryTime`、`exitTime` 等字段。
- 但 Story 2.5 的简化表单仅填了 `direction`（formSide）、`price`（formPrice）、`size`（formAmount）、`timestamp`（自动）、`strategy_tags`、`error_tags`。
- **重要决策**：由于简化表单缺少 exitPrice 等字段（这是单笔录入而非完整交易闭环），**不应直接调用 `TradeManager.recordTrade()`**。应直接构建简化 record 并通过 `(window as any).__tradeManager` 的 `insertTradeLog` 或自行实现 localStorage 降级写入。

#### 3. `src/core/LogseqDBService.ts`

- `insertTrade(trade: TradeRecord)` 方法（L102-146）：创建以 `{symbol} {YYYY-MM-DD HH:mm}` 命名的页面，将 TradeRecord 写入 Block properties，同时在 journal 页面和标的页面插入引用链接。
- **Block properties 前缀** 为 `trade/`（常量 `P = 'trade/'`，L10）。
- `insertTradeLog(log: TradeLog)` 方法（L411-451）：使用 `trade/{SYM} {YYYY-MM-DD HH-mm}` 页面名称，写入状态机型 TradeLog。

#### 4. `src/types/trade.ts`

- `TradeRecord` 接口（L45-53）：继承自 `TradeInput`，增加 `id`、`profit`、`profitPct`、`netPnL`、`riskRewardRatio`、`riskPercent`、`createdAt` 字段。
- `TradeLog` 接口（L118-164）：完整的多阶段状态机复盘记录。

#### 5. `(window as any).__tradeManager`

- 在 `TradingNotes.tsx`（L87）中通过 `(window as any).__tradeManager` 获取 TradeManager 实例。
- 必须遵循这个全局依赖注入模式。

---

## 技术约束

- 所有样式必须使用 `tj-` 前缀 + kebab-case 规范。
- UI 确保暗黑主题 WCAG AA 对比度。
- 零外部网络流出：Logseq DB API 为 IPC，不经过网络。
- `strict: true` 类型安全，禁止无注释 `any`。
- localStorage 键前缀 `tj_`。
- Canvas 标记渲染必须保持 60fps（<16ms 单帧）。
- 提交响应时间 <50ms（前端校验→写入→反馈）。

---

## Tasks / Subtasks

### Task 1: 提交按钮 disabled + loading + 50ms 防抖 (AC: #1)
- [ ] 1.1 在 `KlineChart.tsx` 中新增 `isSubmitting` 布尔状态，控制「确认写入」按钮的 `disabled` 属性和 loading 动画。
- [ ] 1.2 在 `handleFormSubmit` 中：校验通过后立即 `setIsSubmitting(true)`，并使用 50ms 防抖窗口（通过 `useRef` 记录最后提交时间戳，50ms 内的重复调用直接 `return`）。
- [ ] 1.3 在 `src/app.css` 中为 `.tj-footer-confirm-btn` 追加 `disabled` 态和 `.tj-btn-loading` 旋转 spinner 样式。

### Task 2: 简化 TradeRecord 构建与写入 (AC: #2, #5)
- [ ] 2.1 定义轻量级写入数据结构（inline interface 或复用 `TradeInput` 的 Partial），包含 `direction`、`price` (as entryPrice)、`size` (as quantity)、`timestamp`、`strategy_tags`、`error_tags`、`symbol`。
- [ ] 2.2 实现 `writeTradeRecord` 异步函数：
  - 首先检查 `(window as any).__tradeManager` 是否存在。
  - 若存在：调用 `tm.recordTrade(input)` 写入 Logseq DB（将 `exitPrice` 设为 0 表示单边录入，或使用 `insertTradeLog` API）。
  - 若不存在：降级到 localStorage（键 `tj_trade_records`），追加记录并序列化为 JSON。
- [ ] 2.3 实现防重复写入检查：在写入前，读取已有 TradeRecords（来自 Logseq DB 或 localStorage），查找是否有相同 `symbol + timestamp + direction + price` 的记录，有则跳过并 Toast 提示「该交易已存在，请勿重复录入」。

### Task 3: 表单提交完整流程串联 (AC: #3)
- [ ] 3.1 修改 `handleFormSubmit`：校验通过后调用 `writeTradeRecord`，成功后关闭表单 + Toast「✅ 交易已录入」。
- [ ] 3.2 写入失败时 Toast 报错，按钮恢复可用。
- [ ] 3.3 `finally` 分支中始终 `setIsSubmitting(false)` 重置按钮状态。

### Task 4: K 线买卖标记 Overlay 渲染 (AC: #4)
- [ ] 4.1 创建 `renderTradeMarkers` 函数，接收 TradeRecord 数组和 chartApi 引用。
- [ ] 4.2 对每笔 TradeRecord，调用 `chart.createOverlay()` 渲染：
  - 买入（direction='buy'/'long'）：绿色（`#089981`）向上三角形标记，使用 `priceLine` overlay 并附带 `extendData: '买入 {price}'`。
  - 卖出（direction='sell'/'short'）：红色（`#F23645`）向下三角形标记。
  - 参考 `TradingNotes.tsx` L150-172 已有的 `chart.createOverlay({ name: 'priceLine', ... })` 模式。
- [ ] 4.3 在交易提交成功后立即调用 `renderTradeMarkers` 追加新标记。
- [ ] 4.4 在标的加载完成后（`getHistoryKLineData` 回调 L623 附近），加载该标的的所有 TradeRecord 并渲染标记。

### Task 5: 构建与回归测试 (全部 AC)
- [ ] 5.1 运行 `npm run build` 确保无类型报错。
- [ ] 5.2 运行 `npx vitest run` 确保 51+ 个测试用例全部通过。

### Task 6: 状态更新与文档 (全部 AC)
- [ ] 6.1 更新 `sprint-status.yaml` 中 `2-5-trade-record-write-markers` 状态。
- [ ] 6.2 更新本 Story 文件的 Change Log 与 Status。

### Review Findings
- [x] [Review][Patch] 表单提交并发漏洞（使用 isSubmittingRef 锁修复） [src/components/KlineChart/KlineChart.tsx:411]
- [x] [Review][Patch] 交易记录时间戳定义冲突与防重误杀（改存真实交易时间并对图表标记进行 Snap 校验） [src/components/KlineChart/KlineChart.tsx:438]
- [x] [Review][Patch] 切换标的时未清理缓存的时间戳（handleSelectSymbol 重置 lastBarTimestampRef） [src/components/KlineChart/KlineChart.tsx:902]
- [x] [Review][Patch] 异步重载标记时的竞态条件防范（refreshTradeMarkers 增加当前标的一致性校验） [src/components/KlineChart/KlineChart.tsx:300]
- [x] [Review][Patch] 注册覆盖物中 extendData 对象的安全解构与类型收窄 [src/components/KlineChart/KlineChart.tsx:28]
- [x] [Review][Patch] 自定义覆盖物 totalStep 应设为 1 [src/components/KlineChart/KlineChart.tsx:28]
- [x] [Review][Patch] LocalStorage JSON.parse 异常捕获 [src/components/KlineChart/KlineChart.tsx:334]
- [x] [Review][Patch] handleFormSubmit 中异步 setState 添加 isMountedRef.current 检查 [src/components/KlineChart/KlineChart.tsx:438]
- [x] [Review][Patch] Flex gap 与 inline marginLeft 间距叠加问题修复 [src/components/KlineChart/KlineChart.tsx:1388]
- [x] [Review][Patch] 弹出层与 Toast 样式改用 position: fixed [src/app.css:4427]
- [x] [Review][Patch] refreshTradeMarkers 的 useEffect 增加 currentPeriod 依赖项 [src/components/KlineChart/KlineChart.tsx:365]
- [x] [Review][Patch] handleSelectSymbol 切换标的时立即清除旧的 markers 覆盖物 [src/components/KlineChart/KlineChart.tsx:902]
- [x] [Review][Patch] 修复 unannotated any 类型声明，规避 Strict TS 约束违规 [src/components/KlineChart/KlineChart.tsx:267]

---

## Dev Notes

### klinecharts Overlay API 用法（经 TradingNotes.tsx 验证）

```typescript
// 获取底层 chart API（KLineChartPro 内部私有属性）
const chart = (proChartRef.current as any)._chartApi;

// 创建价格线标记
chart.createOverlay({
  name: 'priceLine',           // 内置 overlay 类型
  extendData: 'Entry',         // 标签文字
  points: [{ value: price }],  // 价格点位
  styles: {
    line: { color: '#2962FF' },
    text: { color: '#ffffff', backgroundColor: '#2962FF' }
  }
});

// 移除所有 overlay（可选，在重载标的时调用）
chart.removeOverlay();
```

### 防抖实现模式（useRef）

```typescript
const lastSubmitRef = useRef<number>(0);

const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
  e.preventDefault();
  const now = Date.now();
  if (now - lastSubmitRef.current < 50) return; // 50ms 防抖
  lastSubmitRef.current = now;
  // ... 校验 + 写入
}, [/* deps */]);
```

### TradeManager 降级策略

项目中 `(window as any).__tradeManager` 仅在 Logseq 宿主环境中可用。在开发/测试环境中，TradeManager 不存在，需降级到 localStorage：

```typescript
const tm = (window as any).__tradeManager as TradeManager | undefined;
if (tm) {
  await tm.recordTrade(input); // Logseq DB
} else {
  // localStorage 降级
  const key = 'tj_trade_records';
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  existing.push(record);
  localStorage.setItem(key, JSON.stringify(existing));
}
```

### Project Structure Notes

- 文件变更范围仅限 `src/components/KlineChart/KlineChart.tsx` 和 `src/app.css`。
- 不创建新文件，所有逻辑内联在 KlineChart 组件中。
- 遵循项目已有的「子组件内联」模式。

### References

- [Source: _bmad-output/planning-artifacts/epics.md L247-262] — Story 2.5 AC 定义
- [Source: _bmad-output/planning-artifacts/epics.md L24-26] — FR-7, FR-8 功能需求
- [Source: _bmad-output/project-context.md L82] — 全局依赖注入 `__tradeManager`
- [Source: src/components/KlineChart/TradingNotes.tsx L143-183] — klinecharts overlay 已验证模式
- [Source: src/core/TradeManager.ts L25-73] — recordTrade 写入流程
- [Source: src/core/LogseqDBService.ts L102-146] — insertTrade DB 写入
- [Source: src/types/trade.ts L18-53] — TradeInput / TradeRecord 类型定义

---

## Previous Story Intelligence

### Story 2.4 Key Learnings

1. **CSS 前缀规范**：必须使用 `tj-` 前缀 + kebab-case（在代码审查中发现不一致后修复）。
2. **WCAG AA 对比度**：暗黑主题下所有文字和控件需确保足够对比度（代码审查关键修复点）。
3. **Esc 键冲突处理**：交易表单的 Esc 事件必须通过 `.tj-trade-form-overlay` 选择器防止冒泡到 Logseq hideMainUI（已在 TradingNotes.tsx L123 处实现守卫）。
4. **表单状态管理**：所有 8 个表单状态变量的完整重置已在 `handleCloseForm` 中实现。
5. **Toast 机制**：统一使用 `setToastMsg(msg)` + CSS `.tj-toast` 样式 + 3s 自动清除。

---

## Dev Agent Record

### Agent Model Used
Gemini 3.5 Flash

### Debug Log References
- 无

### Completion Notes List
- 实现了交易确认按钮的 50ms 防抖及 Loading 旋转动画态
- 实现了简化交易记录的 Dual-Path 写入策略（优先 Logseq 属性块，无宿主环境则降级至 localStorage）
- 实现了 `tradeMarker` 自定义 K 线 Canvas 标记，支持在对应 timestamp 渲染买入绿色三角形(△)与卖出红色▽
- 实现了防重复写入检查，相同标的+方向+价格+时间（1分钟内）的记录将被拦截并提示
- 实现了切换标的时自动重载并渲染该标的的历史交易标记

### File List
- `src/components/KlineChart/KlineChart.tsx`
- `src/app.css`

---

## Change Log
| 日期 | 变更说明 |
|------|----------|
| 2026-05-23 | 创建 Story 2.5 设计规约，包含写入按钮防抖/disabled、TradeRecord Block 写入、klinecharts overlay 买卖标记渲染、防重复写入验证 |
| 2026-05-23 | 完成代码开发与单元测试验证。新增 `tradeMarker` 自定义 Canvas 标记注册与渲染，实现防抖、防重复检测与降级写入机制 |
