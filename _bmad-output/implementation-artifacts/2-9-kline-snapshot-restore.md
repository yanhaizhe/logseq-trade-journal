# Story 2.9: K 线快照还原

**Status:** done
**Epic:** 2 - 无缝交易复盘引擎（THE ENGINE）
**FRs:** FR-2（用户点击已绑定 KlineSnapshot 的 Block，K 线在 <150ms 内还原图表状态）
**NFRs:** NFR-1（Block→K线跳转延迟 <150ms）, NFR-4（Canvas 标记渲染帧率 60fps）, NFR-9（零外部网络流出）
**File:** `src/components/KlineChart/KlineChart.tsx`（变更）

---

## User Story

As a Yale,
I want 点击已绑定快照的 Block 后，右侧 K 线瞬间还原到当时的完整图表状态，
So that 我能无缝复盘当时的交易与技术分析判断依据。

## Acceptance Criteria

**AC-1: 历史快照精确还原 (跳转 + 划线 + 指标)**
- **Given** 某个 Block 的属性中包含 `trade-kline-snapshot`
- **When** 用户在 Logseq 中点击该 Block
- **Then** 右侧 K 线在 150ms 内（从接收消息到渲染完成）跳转到该快照对应的 `symbol` 与 `interval` 级别
- **And** 恢复所有技术划线（`drawing_json` 反序列化重建，清除旧划线并排除 `tradeMarker`）
- **And** 恢复所有指标叠加（`indicator_json` 反序列化重建，清除旧指标并重新创建叠加）
- **And** 图表视图精确滚动锚定到 `timestamp` 对应的历史 K 线柱

**AC-2: 缓存触发与竞态防御**
- **Given** 新旧快照的标的或周期不一致，切换会触发异步网络数据拉取
- **When** 切换正在加载时，用户又点击了另一个快照 Block
- **Then** 系统应通过 `loadToken` 守卫拦截并废弃已过时的快照还原操作，仅恢复最终点击的 Block 快照状态，防止数据错乱和图表崩溃。

---

## Developer Context

### 现有代码与实现细节

1. **快照属性接收与反解析**
   - 在 `KlineChart.tsx` 的消息监听 `useEffect` 中，当收到类型为 `logseq-block-changed` 且包含快照属性的 Block 时，触发 `restoreSnapshot` 回调：
     ```typescript
     if (block && block.properties) {
       const snapshotProp = block.properties['trade-kline-snapshot'] ||
                            block.properties['trade/kline-snapshot'] ||
                            block.properties['trade/klineSnapshot'];
       if (snapshotProp) {
         try {
           const snapshot = typeof snapshotProp === 'string' ? JSON.parse(snapshotProp) : snapshotProp;
           if (snapshot && snapshot.symbol) {
             restoreSnapshot(snapshot);
           }
         } catch (e) {
           console.error('Failed to parse snapshot property:', e);
         }
       }
     }
     ```

2. **异步载入与 Pending 机制**
   - 如果目标 `symbol` 或 `interval` 与当前图表状态不一致，需要先更新图表标的/级别以触发异步 K 线数据拉取。
   - 使用 `pendingRestoreSnapshotRef = useRef<any>(null)` 暂存快照。
   - 在 `getHistoryKLineData` 成功获取新数据且 `currentLoadToken === loadTokenRef.current` 时，触发 `setTimeout` 异步恢复划线、指标并调用 `scrollToTimestamp` 滚动。
   - 如果 `symbol` 与 `interval` 均一致，则直接执行 `restoreSnapshotData` 瞬间恢复。

3. **清除与重建方法**
   - **划线清除与创建**：
     ```typescript
     // 清除旧的非 tradeMarker 划线
     const overlays = chart.getOverlays() || [];
     overlays.forEach((o: any) => {
       if (o && o.name !== 'tradeMarker' && o.id) {
         chart.removeOverlay({ id: o.id });
       }
     });
     // 重建
     drawings.forEach((d: any) => chart.createOverlay(d));
     ```
   - **指标清除与创建**：
     ```typescript
     // 清除全部 pane 的指标
     const indicatorsMap = chart.getIndicatorByPaneId();
     // 对 indicatorsMap 进行 ES6 Map 和 Object 兼容性遍历...
     // 重新创建
     indicators.forEach((ind: any) => {
       const isMain = ind.paneId === 'candle_pane';
       chart.createIndicator(ind.name, !isMain, { id: ind.paneId });
     });
     ```

---

## Tasks / Subtasks

- [ ] **Task 1: 实现快照触发监听与 pending 还原机制**
  - [ ] 1.1 在 `KlineChart.tsx` 中新增 `pendingRestoreSnapshotRef` 及 `restoreSnapshot`、`restoreSnapshotData` 回调。
  - [ ] 1.2 在 `logseq-block-changed` 消息事件处理器中，读取属性并调用 `restoreSnapshot`。
  - [ ] 1.3 在 `getHistoryKLineData` 成功回调中，如果存在 `pendingRestoreSnapshotRef` 触发异步还原。
- [ ] **Task 2: 实现划线、指标与视口恢复**
  - [ ] 2.1 在 `restoreSnapshotData` 中实现旧划线、旧指标的清理和新划线、新指标的重建。
  - [ ] 2.2 实现调用 `chart.scrollToTimestamp` 滚动对齐历史快照时间点。
- [ ] **Task 3: 验证与测试**
  - [ ] 3.1 运行 `npm run build` 确保 TypeScript 检查通过无类型错误。
  - [ ] 3.2 运行 `npm run test` 确保 51/51 个既有单元测试依然全部通过。
