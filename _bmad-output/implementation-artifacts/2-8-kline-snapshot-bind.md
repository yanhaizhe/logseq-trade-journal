# Story 2.8: K 线快照绑定

**Status:** done
**Epic:** 2 - 无缝交易复盘引擎（THE ENGINE）
**FRs:** FR-12（点击「绑定状态」按钮，KlineSnapshot 写入 Block 属性，按钮绿色脉冲反馈）
**NFRs:** NFR-4（Canvas 标记渲染帧率 60fps）, NFR-9（零外部网络流出）
**File:** `src/components/KlineChart/KlineChart.tsx`（变更）

---

## User Story

As a Yale,
I want 点击「绑定状态」按钮将当前 K 线完整状态（标的/周期/划线/指标）一键写入 Block 属性，
So that 未来任何时候点击 Block 都能毫秒级还原当时的图表现场。

## Acceptance Criteria

**AC-1: 「绑定状态」按钮渲染与高亮反馈**
- **Given** K 线图表已渲染
- **When** 选中有效标的时，在界面上（录入交易按钮旁）渲染一个「绑定状态」按钮
- **Then** 点击该按钮后，按钮触发一个绿色发光脉冲（pulse）动画反馈，持续 500ms
- **And** 底部状态条短暂显示 `✅ K线快照状态已成功绑定`，提示 2 秒后淡出消失

**AC-2: KlineSnapshot 属性精确序列化与写入**
- **Given** 用户在图表上绘制了若干条划线，且开启了某些主图/副图指标
- **When** 点击「绑定状态」按钮时
- **Then** 获取并序列化当前图表的状态，构造成 `KlineSnapshot` 结构体：
  ```typescript
  interface KlineSnapshot {
    symbol: string;         // 标的代码，例如 'AAPL'
    interval: string;       // 周期，例如 '1D' / '1H'
    drawing_json: string;   // 序列化后的用户划线 JSON 字符串（过滤掉 tradeMarker）
    indicator_json: string; // 序列化后的当前指标配置 JSON 字符串
    timestamp: number;      // 当前最右侧/最后一根 K 线的时间戳 (Unix 时间戳，秒级)
    bound_block_id: string; // 绑定的 Logseq Block UUID
  }
  ```
- **And** 调用 Logseq SDK `logseq.Editor.upsertBlockProperty(activeBlockUuid, 'trade-kline-snapshot', jsonString)` 将快照写入当前活动 Block。

**AC-3: 无活动 Block 时的拦截降级**
- **Given** 页面刚刚加载，Logseq 宿主尚未选中任何 Block（`activeBlockUuid` 为 null）
- **When** 点击「绑定状态」时
- **Then** 阻止保存，且右上角 Toast 警告提示 `⚠️ 请先在 Logseq 中选择一个笔记 Block`

---

## Developer Context

### 现有代码状态与实现细节

1. **Logseq 活动 Block 追踪**
   - 宿主 `src/main.tsx` 侧已有每 300ms 轮询 `logseq.Editor.getCurrentBlock()` 并分发 `logseq-block-changed` 消息的机制。
   - **实现方案**：在 `KlineChart.tsx` 中新增监听 React Effect：
     ```typescript
     const [activeBlockUuid, setActiveBlockUuid] = useState<string | null>(null);

     useEffect(() => {
       const handleMessage = (event: MessageEvent) => {
         const msg = event.data;
         if (msg && msg.type === 'logseq-block-changed') {
           setActiveBlockUuid(msg.block?.uuid || null);
         }
       };
       window.addEventListener('message', handleMessage);
       return () => window.removeEventListener('message', handleMessage);
     }, []);
     ```

2. **划线序列化 (drawing_json)**
   - 调用 `chart.getOverlays()`，滤除其中的 `tradeMarker` 标记，仅保留用户画线。
   - 对保留的划线进行字段精简映射：
     ```typescript
     const drawings = (chart.getOverlays() || [])
       .filter((o: any) => o && o.name !== 'tradeMarker')
       .map((o: any) => ({
         name: o.name,
         points: o.points,
         styles: o.styles,
         lock: o.lock,
         visible: o.visible,
         extendData: o.extendData
       }));
     ```

3. **指标序列化 (indicator_json)**
   - 调用 `chart.getIndicatorByPaneId()`。如果不传 paneId，它会返回一个嵌套的 `Map<string, Map<string, Indicator>>`。
   - 提取所有主图和副图指标的信息：
     ```typescript
     const indicatorsMap = chart.getIndicatorByPaneId();
     const activeIndicators: { paneId: string; name: string }[] = [];
     if (indicatorsMap instanceof Map) {
       indicatorsMap.forEach((paneMap, paneId) => {
         if (paneMap instanceof Map) {
           paneMap.forEach((indicator, name) => {
             activeIndicators.push({ paneId, name });
           });
         }
       });
     }
     ```

4. **Logseq 写入与反馈 (AC-1/AC-2)**
   - 获取 `const ls = (window as any).logseq`。
   - 调用 `await ls.Editor.upsertBlockProperty(activeBlockUuid, 'trade-kline-snapshot', JSON.stringify(snapshot))`。
   - 将按钮状态设为 pulse 状态触发动效。设置底部状态条文字并控制延迟 2000ms 归零。

---

## Tasks / Subtasks

- [ ] **Task 1: 实现活动 Block 监听与界面按钮渲染 (AC-1/AC-3)**
  - [ ] 1.1 在 `KlineChart.tsx` 中添加消息监听器，保存当前活动 `activeBlockUuid`。
  - [ ] 1.2 在 `tj-record-trade-fab` 旁边渲染一个「绑定状态」按钮，添加发光脉冲 Class 动效（由 React 状态控制 500ms 后重置）。
  - [ ] 1.3 如果 `activeBlockUuid` 为 null，点击时调用 `setToastMsg` 提示用户先选择 Block。
- [ ] **Task 2: 实现状态提取与 Logseq 属性写入 (AC-2)**
  - [ ] 2.1 编写划线和指标的提取方法，打包构造 `KlineSnapshot` JSON 字符串。
  - [ ] 2.2 通过 `window.logseq` 的 `Editor.upsertBlockProperty` 将其写入属性。
  - [ ] 2.3 设置底部提示文本，并在 2 秒后自动淡出重置。
- [ ] **Task 3: 验证并测试**
  - [ ] 3.1 运行 `npm run build` 确保 TypeScript 检查通过无类型错误。
  - [ ] 3.2 运行 `npm run test` 确保 51/51 个既有单元测试依然全部通过。

---

## Dev Notes

- **CSS 动效设计**：使用 CSS keyframe 动画渲染绿色脉冲阴影（例如 `box-shadow: 0 0 0 10px rgba(34, 197, 94, 0)`）。
- **指标恢复预备**：Story 2.8 只需要完成快照**绑定写入**，还原工作留给下个 Story 2.9 完成。
