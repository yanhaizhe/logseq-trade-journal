# Story 1.2: 红灯排查助手

**Status:** done
**Epic:** 1 - 本地环境引导与系统健康
**FRs:** FR-21
**NFRs:** NFR-5（自检响应 <200ms），NFR-9（零外部网络流出）
**File:** `src/components/Onboarding/WelcomeScreen.tsx`（变更）

---

## User Story

As a Yale,
I want 红灯悬停时看到错误码和可一键复制的排查命令，
So that 我不需要记住或手动敲终端命令。

## Acceptance Criteria

**Given** FastAPI 状态灯为红色
**When** 悬停红灯旁的帮助图标
**Then** 磨砂玻璃卡片弹出，显示错误码（如 ECONNREFUSED）和排查命令（如 ./start.sh）
**And** 点击命令文本后自动复制至剪贴板，显示「指令已复制」绿字
**And** 卡片使用等宽字体（JetBrains Mono / Fira Code）模拟 Terminal 风格

---

## Developer Context

### 现有代码状态

`WelcomeScreen.tsx` 已实现 FR-20 自检仪表盘，包含：
- 三服务状态行（FastAPI / Tushare / SQLite）
- CLI 辅助命令区（FastAPI 离线时显示 `chmod +x start.sh && ./start.sh` + 复制按钮）
- `handleCopy()` — 复制命令逻辑，已有 `copied`/`copyFailed` 状态
- `mountedRef` / `checkingRef` / `abortRef` — 生命周期管理 refs

**本 Story 需要在现有代码基础上扩展，而非重写。**

### 不可破坏的现有功能
- `runHealthCheck()` 及其性能测量逻辑
- `handleCopy()` — 已有 "已复制" / "复制失败" 反馈模式
- `handleEnter()` — 进入工作区逻辑
- `offlineBypass` 降级逻辑
- 三服务状态指示灯（绿/黄/红）
- CLI 辅助命令区（保留不删）

### 需要新增的内容

1. **帮助图标触发器**：
   - 每个状态行右侧添加 `?` 帮助图标（仅在该服务红灯时可见/可悬停）
   - 图标使用 Unicode `ℹ` 或 SVG，保持与暗黑毛玻璃主题一致
   - 图标不可选中（`user-select: none`）

2. **磨砂玻璃诊断卡片（Popover）**：
   - 悬停图标时弹出，离开时消失（150ms 淡入淡出过渡）
   - 背景：`rgba(30, 31, 42, 0.92)` + `backdrop-filter: blur(16px)`
   - 卡片内容：
     - 错误码行（如 `ECONNREFUSED`）— 红色高亮
     - 排查命令（如 `./start.sh`）— 等宽字体 Terminal 风格
     - 点击命令文本触发复制
   - 定位：相对于图标定位，`position: absolute`，z-index 高于状态行

3. **Terminal 风格命令块**：
   - 字体：`'Courier New', 'SF Mono', monospace`（项目已有此字体栈，与现有 `.welcome-cli-row code` 一致）
   - 背景：`rgba(0, 0, 0, 0.6)` 深色终端风格
   - 左侧 `$` 提示符（灰色）
   - 右侧复制按钮（复用现有 `handleCopy` 范式）
   - 复制后显示「指令已复制」绿字（AC 要求）

4. **诊断数据映射**：
   - FastAPI 不可达 → 错误码 `ECONNREFUSED`，命令 `./start.sh`
   - 仅本 Story 需要 FastAPI 诊断（AC 条件限定 FastAPI 红灯）
   - 后续 Story 可为 Tushare/SQLite 扩展错误码

### 技术约束
- React 18 FC 组件，`export default`
- TypeScript strict 模式，`import type` 分离
- Vanilla CSS，类名 `welcome-` 前缀
- 暗黑毛玻璃主题
- Fetch 仅与 `127.0.0.1:8765` 通信
- **不要引入 React Router**
- **不要引入新依赖库**（popover 用纯 CSS + React state 实现）
- 复制逻辑复用现有 `handleCopy` 模式

### 文件变更
| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/Onboarding/WelcomeScreen.tsx` | 变更 | 新增帮助图标 + 诊断弹窗组件 |
| `src/app.css` | 变更 | 新增 popover / help-icon 样式 |

### 依赖
- 无新依赖
- 依赖 Story 1.1 产出的 `HealthData` 类型和 `deriveHealthLabels`

### 项目上下文（来自 project-context.md）
- 组件：`export default`, `React.FC<Props>`
- CSS：类名前缀 `welcome-`（现有约定保持一致）
- 导入：`@/` 路径别名，`import type` 分离
- 通信：`http://127.0.0.1:8765` 唯一后端地址
- 测试：Vitest，仅测试纯函数逻辑
- 代码风格：无注释（遵循项目规则）

---

## Tasks / Subtasks

### Task 1: 提取诊断数据映射纯函数
- [x] 1.1 创建 `src/utils/healthDiagnostics.ts`：`getDiagnostic(healthData)` 返回 `{ errorCode, command, hint }`
- [x] 1.2 FastAPI 不可达时返回 `{ errorCode: 'ECONNREFUSED', command: './start.sh', hint: '在终端执行上述命令启动本地后端服务' }`

### Task 2: 实现诊断弹窗组件（内联在 WelcomeScreen）
- [x] 2.1 添加 `hoveredRow` state（`null | 'fastapi'`）
- [x] 2.2 每个服务状态行右侧渲染帮助图标（仅在红灯时可见）
- [x] 2.3 实现 `DiagnosticPopover` 内联组件：接收 `errorCode`/`command`/`hint` props
- [x] 2.4 悬停时 `onMouseEnter`/`onMouseLeave` 控制显示/隐藏（150ms 过渡）
- [x] 2.5 命令文本点击触发复制，显示「指令已复制」反馈（复用现有 pattern：1800ms 自动恢复）

### Task 3: CSS 样式
- [x] 3.1 `.welcome-help-icon` — 帮助图标样式（颜色 `rgba(255,255,255,0.4)`，hover 变亮）
- [x] 3.2 `.welcome-diagnostic-popover` — 磨砂玻璃弹窗（blur + rgba 背景 + 定位）
- [x] 3.3 `.welcome-diag-error-code` — 错误码红色文字
- [x] 3.4 `.welcome-diag-command` — Terminal 风格命令块（深色背景 + 等宽字体 + `$` 前缀 + 复制按钮）
- [x] 3.5 弹窗淡入淡出动画（opacity transition 150ms）

### Task 4: 测试
- [x] 4.1 编写 `tests/health-diagnostics.test.ts` 测试 `getDiagnostic` 纯函数
- [x] 4.2 验证 null healthData / FastAPI ok / FastAPI not ok 三种情况

---

## Dev Agent Record

### Implementation Plan
1. 创建 `src/utils/healthDiagnostics.ts` — 轻量诊断数据映射纯函数
2. 在 `WelcomeScreen.tsx` 中添加 `hoveredRow` state + 帮助图标 + `DiagnosticPopover` 内联组件
3. 添加 CSS 样式（popover / help-icon / diag 系列）
4. 编写单元测试

### Debug Log
- 2026-05-22: 创建 `src/utils/healthDiagnostics.ts` — `getDiagnostic()` 纯函数，映射 FastAPI 不可达 → ECONNREFUSED
- 2026-05-22: 在 `WelcomeScreen.tsx` 中新增 `DiagnosticPopover` 内联组件 + `hoveredRow`/`diagCopy` state
- 2026-05-22: `handleCopyCommand()` 复制逻辑复用现有 pattern（mountedRef guard + 1800ms 超时恢复）
- 2026-05-22: 添加诊断弹窗完整 CSS（磨砂玻璃背景 + 150ms 淡入动画 + Terminal 风格命令块）

### Completion Notes
- FastAPI 红灯时状态行右侧出现 ℹ 帮助图标，悬停弹出诊断卡片
- 卡片显示 ECONNREFUSED 错误码（红色等宽字体）和 `$ ./start.sh` Terminal 风格命令块
- 点击命令块 → 命令复制至剪贴板 → 按钮文字变为「已复制」绿字
- 纯 CSS popover，无第三方依赖，150ms 动画过渡
- 3 个单元测试覆盖 getDiagnostic，40 测试全部通过无回归

---

## Senior Developer Review (AI)

**Review Outcome:** Changes Requested
**Review Date:** 2026-05-22
**Action Items:**

- [x] [Patch][High] `.welcome-status-row` 缺少 `position: relative`，导致 popover 的 `position: absolute; top: 100%; right: 0` 定位错误 `src/app.css`
- [x] [Patch][Medium] 复制失败（catch）路径缺少 `setTimeout` 恢复，按钮永久显示"失败" `src/components/Onboarding/WelcomeScreen.tsx`
- [x] [Patch][Medium] 复制成功文案「已复制」与 AC 要求的「指令已复制」不一致 `src/components/Onboarding/WelcomeScreen.tsx`
- [x] [Patch][Medium] 重新自检时 `fastapiDiag` 变为 null，popover 消失后不自检完成后可能突然重现 `src/components/Onboarding/WelcomeScreen.tsx`
- [x] [Patch][Medium] popover 触发绑定在整行而非仅帮助图标，AC 要求"悬停帮助图标"时弹出 `src/components/Onboarding/WelcomeScreen.tsx`
- [x] [Defer] `getDiagnostic` 仅返回 ECONNREFUSED，未区分超时/500等不同故障 — 后续扩展诊断映射时可完善
- [x] [Defer] `DiagCopyState` 全局共享 — 仅当前只有 1 个 popover 时无问题，多 popover 场景需重构
- [x] [Defer] Popover 可能超出视口边界 — 边缘场景，当前窗口尺寸足够时不触发
- [x] [Defer] `hoveredRow` 类型 `null | string` 过宽 — 小优化，不影响功能
- [x] [Defer] `diagCopyTimerRef` 回调后未重置 — 无害，仅管理精度问题

---

### Review Follow-ups (AI)

- [x] [AI-Review][Patch] 添加 `position: relative` 到 `.welcome-status-row`
- [x] [AI-Review][Patch] 修复复制失败路径缺少 setTimeout 恢复
- [x] [AI-Review][Patch] 复制文案「已复制」→「指令已复制」
- [x] [AI-Review][Patch] 重新自检时保持 popover 可交互或优雅淡出
- [x] [AI-Review][Patch] popover 触发范围改为仅图标

---

## File List
| 文件 | 操作 | 状态 |
|------|------|------|
| `src/utils/healthDiagnostics.ts` | 新增 | done |
| `src/components/Onboarding/WelcomeScreen.tsx` | 变更 | done |
| `src/app.css` | 变更 | done |
| `tests/health-diagnostics.test.ts` | 新增 | done |

---

## Change Log
| 日期 | 变更说明 |
|------|----------|
| 2026-05-22 | 基于 epics/PRD/架构/Story 1.1 上下文创建完整 Story 文件 |
| 2026-05-22 | 实现全部 4 个 Task：诊断映射函数、弹窗组件、CSS 样式、单元测试 |
