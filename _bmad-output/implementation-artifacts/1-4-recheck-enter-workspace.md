# Story 1.4: 重新自检与进入工作区

**Status:** done
**Epic:** 1 - 本地环境引导与系统健康
**FRs:** FR-23
**NFRs:** NFR-5（自检 <200ms），NFR-9（零外部网络流出）
**File:** `src/App.tsx`（变更）, `src/components/Onboarding/WelcomeScreen.tsx`（变更）

---

## User Story

As a Yale,
I want 配置完 Token 后点击「重新自检」按钮刷新所有服务状态，
So that 我能确认环境已全部就绪，然后一键进入复盘工作区。

## Acceptance Criteria

**Given** 在欢迎页完成 Token 配置
**When** 点击「🔄 重新自检」按钮
**Then** 所有指示灯变为橙色呼吸动画，150ms 内更新为最新自检结果
**And** Tushare 灯由红转绿
**And** 全部绿灯后点击「进入工作区」按钮，导航至分屏 K 线工作区（Epic 2）

---

## Developer Context

### 现有代码状态

**WelcomeScreen.tsx（295 行）** 已实现：
- `runHealthCheck()` — 完整自检流程（AbortController + 1500ms timeout + performance.now() 计时）
- `isChecking` 状态 + `checkingRef` 防重复调用
- 「↻ 重新自检」按钮（已存在），`onClick={runHealthCheck}`，`disabled={isChecking}`
- 橙色呼吸动画：`status-dot--checking` 类 + `pulse-checking` keyframes（已实现）
- `dotClass()` 函数：checking 状态下所有灯返回 `status-dot--checking`
- 进入工作区：`handleEnter()` → `onEnterWorkspace(offlineBypass)`
- `enterLocked` 通过 `deriveEnterLocked()` 派生

**App.tsx** 现有逻辑：
- `mode === 'onboarding'` 时渲染 `<WelcomeScreen />`（通过 `&&` 条件渲染）
- `TokenSettingsModal` 的 `onSaved` 回调：`setSettingsOpen(false); setMode('onboarding')`
- `onEnterWorkspace`：`setOfflineMode(isOffline); setMode('kline')`

**关键问题：Token 保存后 WelcomeScreen 未重新自检**

原因分析：
```
用户流程：onboarding → 打开 TokenSettingsModal → 保存成功 →
onSaved() 调用 setMode('onboarding') → 但 mode 本来就是 'onboarding' →
Zustand shallow equal → 无 re-render → WelcomeScreen 未重挂载 →
runHealthCheck 未重新执行
```

Token 保存后用户回到欢迎页，但三条灯仍是旧状态（Tushare 依然红灯），用户困惑"为什么保存了 Token 还是红灯？"

### 需要完善的内容

1. **Token 保存后触发重新自检**：
   - 方案：App.tsx 新增 `recheckKey` state，每次 `onSaved` 时递增
   - 将 `recheckKey` 作为 `<WelcomeScreen key={recheckKey}>` 的 React key
   - key 变化 → React 卸载旧组件 + 挂载新组件 → `useEffect` 自动触发 `runHealthCheck()`
   - 这是最小侵入方案，不修改 WelcomeScreen 内部逻辑

2. **重新自检按钮图标对齐 AC**：
   - AC 要求按钮显示「🔄 重新自检」→ 当前实现为「↻ 重新自检」
   - 修改 icon 字符 `↻` → `🔄`

3. **验证现有功能无回归**：
   - 橙色呼吸动画：`status-dot--checking` + `pulse-checking` keyframes ✅ 已存在
   - Tushare 红转绿：自检返回 `tushare_ok: true` 后自动变绿 ✅ 
   - 进入工作区：全部绿灯后按钮解锁 → `handleEnter()` → `onEnterWorkspace()` ✅
   - 150ms 更新阈值：`performance.now()` 计时 + console.warn ✅

### 技术约束
- React 18 FC 组件，`export default`
- TypeScript strict 模式，`import type` 分离
- Zustand 状态管理，不可引入额外状态库
- 不新增文件，不重写 WelcomeScreen
- 不可破坏现有健康检查流程（AbortController、mountedRef、type guard）

### Props 接口（不变）
```typescript
// WelcomeScreen
interface WelcomeScreenProps {
  onEnterWorkspace: (offlineMode: boolean) => void;
  onOpenSettings: () => void;
}
```

### 数据流（完整链路）
```
TokenSettingsModal.onSaved()
  → App.setSettingsOpen(false)
  → App.setRecheckKey(prev => prev + 1)     // NEW
  → App.setMode('onboarding')
  → React 检测 WelcomeScreen key 变化 → 卸载旧组件 → 挂载新组件
  → WelcomeScreen.useEffect → runHealthCheck()
  → GET /api/health → response → setHealthData()
  → labels 重新计算 → Tushare 由红转绿 → enterLocked = false
  → 用户点击「进入工作区」→ onEnterWorkspace() → App.setMode('kline')
```

### 文件变更
| 文件 | 操作 | 说明 |
|------|------|------|
| `src/App.tsx` | 变更 | 新增 `recheckKey` state，作为 WelcomeScreen key；onSaved 中递增 |
| `src/components/Onboarding/WelcomeScreen.tsx` | 变更 | 按钮 icon `↻` → `🔄` |

### 已有 CSS（无需变更）
- `.status-dot--checking` + `@keyframes pulse-checking` — 橙色呼吸 ✅
- `.welcome-btn-retest` + `.retest-icon--spinning` — 按钮样式 ✅
- `.welcome-btn-enter` / `--locked` / `--warning` — 进入按钮 ✅
- `.welcome-locked-hint` — 锁定提示 ✅

### 项目上下文（来自 project-context.md）
- 组件：`export default`, `React.FC<Props>`
- CSS：类名前缀 `welcome-`（现有）
- 导入：`@/` 路径别名，`import type` 分离
- 通信：`http://127.0.0.1:8765` 唯一后端地址
- 代码风格：无注释

---

## Tasks / Subtasks

### Task 1: Token 保存后触发重新自检
- [x] 1.1 App.tsx 新增 `const [recheckKey, setRecheckKey] = useState(0)`
- [x] 1.2 `<WelcomeScreen key={recheckKey}>` 使用动态 key
- [x] 1.3 `onSaved` 回调中调用 `setRecheckKey(prev => prev + 1)`
- [x] 1.4 验证：保存 Token → 弹窗关闭 → WelcomeScreen 卸载+挂载 → 自检自动执行

### Task 2: 按钮文案对齐 AC
- [x] 2.1 WelcomeScreen 中「重新自检」按钮 icon `↻` → `🔄`

### Task 3: 验证 AC 与测试
- [x] 3.1 确认橙色呼吸动画在单击「重新自检」后正常显示
- [x] 3.2 确认 Tushare Token 有效时自检后灯由红转绿
- [x] 3.3 确认全部绿灯后「进入工作区」按钮可用，点击导航至 K 线工作区
- [x] 3.4 运行 `tsc --noEmit` + `npx vitest run` 全量回归

### Review Findings

**defer:**
- [x] [Review][Defer] `offlineMode` 状态暂未消费 [App.tsx:L43] — `setOfflineMode(isOffline)` 在 onEnterWorkspace 中写入，但 App.tsx 内无消费方。该状态为 Epic 2（K 线工作区离线模式）预留，届时激活

---

## Dev Agent Record

### Implementation Plan
1. App.tsx 新增 `recheckKey` state + 作为 WelcomeScreen key
2. `onSaved` 中递增 `recheckKey` 触发强制重挂载
3. WelcomeScreen 修改按钮 icon `↻` → `🔄`
4. 验证完整链路：保存 Token → 自动自检 → 灯变绿 → 进入工作区
5. tsc + vitest 验证无回归

### Debug Log
- 2026-05-22: 开始实现 Story 1.4
- 2026-05-22: App.tsx 新增 `recheckKey` state，作为 WelcomeScreen 动态 key
- 2026-05-22: `onSaved` 回调中 `setRecheckKey(prev => prev + 1)` 触发强制重挂载
- 2026-05-22: WelcomeScreen 按钮 icon `↻` → `🔄` 对齐 AC
- 2026-05-22: tsc --noEmit 通过，vitest 40/40 通过
- 2026-05-22: 实现完成，Status → review

### Completion Notes
实现了 Token 保存后自动触发重新自检的完整链路：
1. **recheckKey 机制**：App.tsx 新增 `useState(0)` 追踪自检触发次数，作为 `<WelcomeScreen key={recheckKey}>` 的 React key
2. **onSaved 触发**：Token 保存成功后 `setRecheckKey(prev => prev + 1)` 递增 key → React 卸载旧 WelcomeScreen + 挂载新实例 → `useEffect` 自动调用 `runHealthCheck()` → GET /api/health → Tushare 灯由红转绿
3. **按钮 icon**：`↻` → `🔄` 对齐 AC
4. 无破坏：橙色呼吸动画、性能计时、AbortController、type guard 全部保持

---

## File List
| 文件 | 操作 | 状态 |
|------|------|------|
| `src/App.tsx` | 变更 | done |
| `src/components/Onboarding/WelcomeScreen.tsx` | 变更 | done |

---

## Change Log
| 日期 | 变更说明 |
|------|----------|
| 2026-05-22 | 基于 epics/PRD/架构/现有代码上下文创建完整 Story 文件 |
| 2026-05-22 | 实现完成：recheckKey 强制重挂载、按钮 icon 🔄、Token 保存后自动自检链路 |
