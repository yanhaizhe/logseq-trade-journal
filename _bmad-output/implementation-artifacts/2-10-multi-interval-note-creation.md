# Story 2.10: 任意级别 K 线笔记创建

**Status:** done
**Epic:** 2 - 无缝交易复盘引擎（THE ENGINE）
**FRs:** FR-3（在任何级别 K 线上创建笔记，Block 自动注入 symbol + interval + timestamp 属性）, FR-4（切换 K 线周期不影响已有绑定关系，不同 Block 可绑定不同级别）
**NFRs:** NFR-1（Block→K线跳转延迟 <150ms）, NFR-4（Canvas 标记渲染帧率 60fps）, NFR-9（零外部网络流出）
**File:** `src/components/KlineChart/KlineChart.tsx`（变更）

---

## User Story

As a Yale,
I want 在任意级别的 K 线图上右键点击并选择「在此创建笔记」，系统能在 Logseq 左侧创建携带标的/级别/时间戳属性的 Block，
So that 我能在多周期维度分别编写复盘记录，且点击 Block 时能精确跳转还原至对应图表状态。

## Acceptance Criteria

**AC-1: 右键菜单与时间戳捕获**
- **Given** K 线图表已渲染完成
- **When** 用户在图表 Canvas 上右键点击时
- **Then** 拦截默认的浏览器右键菜单，就地弹出磨砂玻璃样式的自定义菜单，显示 `📝 在此创建笔记`
- **And** 通过 `chart.convertFromPixel` 算法精确捕获右键点击处的 Unix 时间戳 (秒级)
- **And** 点击菜单外任意处或按下 Esc 键时，菜单自动关闭消失

**AC-2: 创建携带关联属性的笔记 Block**
- **Given** 右键菜单已弹出，且 Logseq 侧已选中活动 Block（`activeBlockUuid` 不为 null）
- **When** 点击 `📝 在此创建笔记`
- **Then** 调用 Logseq SDK `logseq.Editor.insertBlock` 插入一个同级 Block
- **And** 新 Block 的正文内容为级别和格式化时间的描述（例如 `1D · 2026-05-20 00:00`）
- **And** 属性对象中自动注入:
  - `trade-symbol`: 当前标的 (如 'AAPL')
  - `trade-interval`: 当前周期级别 (如 '1D' / '30m')
  - `trade-timestamp`: 捕获的 Unix 时间戳 (秒级数字)
- **And** 右上角 Toast 提示 `✅ 已成功在 Logseq 创建笔记 Block`
- **And** 无活动 Block 选中时拦截并 Toast 提示 `⚠️ 请先在 Logseq 中选择一个笔记 Block`

**AC-3: 笔记跳转与还原**
- **Given** 某个 Block 的 properties 包含 `trade-symbol`、`trade-interval` 和 `trade-timestamp`（但不含完整的 `trade-kline-snapshot`）
- **When** 用户在 Logseq 中点击该 Block
- **Then** 右侧 K 线无缝跳转至该 `symbol` + `interval` 级别，并精确滚动至 `timestamp` 对应的历史位置
- **And** **特别注意**：由于该 Block 仅是文本笔记（非快照），跳转时不清除或修改用户当前图表已有的技术划线和指标叠加状态，提供平滑的浏览体验。

---

## Developer Context

### 现有代码与实现细节

1. **坐标转换 (convertFromPixel)**
   - Canvas 事件坐标的获取：
     ```typescript
     const rect = container.getBoundingClientRect();
     const x = e.clientX - rect.left;
     const y = e.clientY - rect.top;
     ```
   - 通过 `chart.convertFromPixel([{ x, y }], { paneId: 'candle_pane' })` 转换为时间戳。

2. **新建同级 Block 与属性注入**
   - 插入同级 Block 调用 API：
     ```typescript
     await ls.Editor.insertBlock(activeBlockUuid, content, {
       properties: {
         'trade-symbol': currentSymbol,
         'trade-interval': intervalText,
         'trade-timestamp': timestamp,
       },
       sibling: true,
     });
     ```

3. **还原逻辑的兼容**
   - 修改 `restoreSnapshotData`，令其只在 snapshot 对象中含有非 undefined 的 `drawing_json` 或 `indicator_json` 字段时才执行清理与恢复划线/指标。如果是纯笔记跳转，由于不传这两个字段，因此它们在 `restoreSnapshotData` 中会保持原样不被清除。

---

## Tasks / Subtasks

- [x] **Task 1: 实现右键上下文菜单与坐标转换**
  - [x] 1.1 在 `KlineChart.tsx` 中增加 `contextMenu` 状态，监听 Canvas 容器的 `contextmenu` 事件，拦截默认菜单。
  - [x] 1.2 通过 `chart.convertFromPixel` 提取时间戳并唤起自定义菜单。
  - [x] 1.3 编写全局点击与按键监听，以便在菜单外点击时自动关闭菜单。
- [x] **Task 2: 实现 Logseq 同级 Block 写入与属性注入**
  - [x] 2.1 编写 `handleCreateNoteAtTimestamp` 回调，校验 `activeBlockUuid`。
  - [x] 2.2 组装属性对象，调用 `logseq.Editor.insertBlock` 写入新 Block。
  - [x] 2.3 在 `app.css` 中增加 `.tj-context-menu` 的暗色毛玻璃与悬停交互样式。
- [x] **Task 3: 实现纯笔记跳转还原**
  - [x] 3.1 在 `logseq-block-changed` 消息事件处理器中，若无 snapshot，则检测是否包含 `trade-symbol`、`trade-interval`、`trade-timestamp`。
  - [x] 3.2 如果存在，将其构造成简易快照（无 `drawing_json`/`indicator_json`），调用 `restoreSnapshot` 进行只跳转、不清除的还原。
  - [x] 3.3 修改 `restoreSnapshotData` 对 `drawing_json`/`indicator_json` 的空值防崩与非 undefined 条件防御。
- [x] **Task 4: 验证与测试**
  - [x] 4.1 运行 `npm run build` 确保 TypeScript 检查通过无类型错误。
  - [x] 4.2 运行 `npm run test` 确保 51/51 个既有单元测试依然全部通过。
