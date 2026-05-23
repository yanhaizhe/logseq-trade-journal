# Story 1.3: Token 配置弹窗与校验

**Status:** done
**Epic:** 1 - 本地环境引导与系统健康
**FRs:** FR-22
**NFRs:** NFR-5（自检 <200ms），NFR-9（零外部网络流出）
**File:** `src/components/Onboarding/TokenSettingsModal.tsx`（变更）

---

## User Story

As a Yale,
I want 在磨砂玻璃弹窗中输入/更新 Tushare Token，提交前先校验有效性，
So that 我不会把无效 Token 写入配置文件导致后续 K 线加载失败。

## Acceptance Criteria

**Given** 在欢迎页点击「配置密钥」按钮
**When** 弹窗弹出
**Then** Token 输入框默认 password 遮罩模式
**And** 点击眼睛图标切换明文/遮罩（<100ms），图标在眼睛/闭眼间过渡
**And** 输入少于 20 字符时「保存并测试」按钮半透明 disabled+下方提示「最少 20 个字符」
**And** 输入有效 Token 点击「保存并测试」后按钮 loading，<2s 内完成校验，通过后弹窗关闭
**And** 输入无效 Token 校验失败后弹窗不关闭，表单顶部显示红色「校验失败：Token 无效」
**And** 校验超时（>5s）提示「网络超时，请检查本地服务状态」
**And** 按 Esc 键关闭弹窗、放弃修改、.env 不变

---

## Developer Context

### 现有代码状态

`TokenSettingsModal.tsx` 已有完整初始实现（227 行），包含：
- 遮罩/明文切换（`type={showToken ? 'text' : 'password'}`）
- 眼睛图标 `👁` / `🙈` 切换
- 5 秒自动遮罩（`handleInputBlur` + `autoMaskTimerRef`）
- `POST http://127.0.0.1:8765/api/save-token` 提交
- `isVerifying` / `isFailed` / `isSuccess` 三态状态机
- Esc 键关闭（`useEffect` + `keydown` listener）
- Overlay 点击关闭 + 卡片 `stopPropagation`
- 成功/失败提示
- focus 管理（`useRef<HTMLInputElement>`）

**端点行为（后端已就绪）：**
- `POST /api/save-token` 接受 `{ token: string }` 
- 后端做 56 位 hex 格式校验 → 不合格返回 `status: "error", message: "Token 格式无效"`
- 格式通过则发起 Tushare dummy 连接测试 → 失败返回 `status: "error", message: "Token 校验失败"`
- 全部通过则原子写入 `server/.env` + 热重载 DataRouter

### 不可破坏的现有功能
- Esc 关闭弹窗
- Overlay 点击关闭
- 自动遮罩 5 秒恢复
- 成功/loading/失败状态流转
- Focus 管理
- `stopPropagation` 防止卡片内点击穿透

### 需要完善的内容（对照 AC）

1. **最小字符从 10 → 20**：
   - `canSubmit` 条件改为 `>= 20`
   - 新增红色提示文本「最少 20 个字符」（低于阈值时显示）
   - 空 Token 也被前端阻止

2. **眼睛图标过渡 < 100ms**：
   - 眼睛图标已有 `🙈`/`👁` 切换，当前是即时切换
   - 建议保持（emoji 切换天然 < 100ms），无需 CSS transition
   - 确认 `aria-label` 已正确切换

3. **Fetch 超时处理（> 5s）**：
   - 当前 `fetch` 无超时限制
   - 需要添加 `AbortController` + 5s `setTimeout`
   - 超时时 `status = 'failed'`, `errorMsg = '网络超时，请检查本地服务状态'`

4. **错误提示位置和文案对齐 AC**：
   - AC：失败提示在"表单顶部" — 当前在输入框下方
   - AC 文案：「校验失败：Token 无效」/「Token 格式无效」
   - 区分：后端 `status === 'error'` → 使用后端返回的 `data.message`
   - 超时 →「网络超时，请检查本地服务状态」

5. **校验 < 2s 不破坏现有行为**：
   - 后端校验已控制在单个 API 调用内，无需前端额外处理
   - 保持 `isVerifying` 状态 + 按钮 loading 文本

6. **类型安全增强**：
   - `resp.json()` 返回未知类型，需添加类型守卫
   - `errorMsg` 状态已存在，无需变更

### 技术约束
- React 18 FC 组件，`export default`
- TypeScript strict 模式，`import type` 分离
- Vanilla CSS，类名前缀 `settings-`（已有）
- 暗黑毛玻璃主题
- Fetch 仅与 `127.0.0.1:8765` 通信
- 不要引入新依赖库
- 不要重写整个组件

### Props 接口（来自 App.tsx 调用方）
```typescript
interface TokenSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}
```
- `isOpen` 控制渲染，`false` 时返回 `null`
- `onClose` 关闭弹窗（App.tsx 中 `setSettingsOpen(false)`）
- `onSaved` 保存成功回调（触发 WelcomeScreen 重新自检）

### 文件变更
| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/Onboarding/TokenSettingsModal.tsx` | 变更 | 按 AC 校对：最小长度、超时处理、错误提示位置/文案 |
| `src/app.css` | 可能需要 | 如需调整错误提示位置样式 |

### 项目上下文（来自 project-context.md）
- 组件：`export default`, `React.FC<Props>`
- CSS：类名前缀 `settings-`（现有）
- 导入：`@/` 路径别名，`import type` 分离
- 通信：`http://127.0.0.1:8765` 唯一后端地址
- 代码风格：无注释

---

## Tasks / Subtasks

### Task 1: 最小字符限制改为 20
- [x] 1.1 `canSubmit` 条件 `>= 10` → `>= 20`，`handleSave` 内联 `length < 10` → `< 20`
- [x] 1.2 低于 20 字符且非空时，按钮下方显示「最少 20 个字符」红色提示
- [x] 1.3 空 Token + 提交时前端静默阻止（按钮保持 disabled）

### Task 2: Fetch 超时处理（> 5s）
- [x] 2.1 `handleSave` 中为 fetch 添加 `AbortController` + 5s timeout
- [x] 2.2 超时后设置 `status = 'failed'`, `errorMsg = '网络超时，请检查本地服务状态'`
- [x] 2.3 组件卸载清理 `abortRef`

### Task 3: 错误提示位置和文案对齐 AC
- [x] 3.1 将 `.settings-error-text` 从输入框下方移至表单顶部（`.settings-form-body` 第一个子元素）
- [x] 3.2 失败文案直接使用后端返回的 `data.message`（后端已提供中文错误信息）
- [x] 3.3 校验成功 <600ms 后自动关闭 + 调用 `onSaved`

### Task 4: 类型安全增强
- [x] 4.1 为后端响应添加类型守卫/接口（`SaveTokenResponse`）
- [x] 4.2 重构 `handleSave` 使用 `mountedRef` 防卸载 setState

### Task 5: 测试
- [x] 5.1 无需新增纯函数测试（本 Story 主要为 UI 行为，逻辑已在组件内）
- [x] 5.2 运行全量回归测试确保无破坏

### Review Findings

**decision-needed:**
- [x] [Review][Decision] **Escape 键在验证中关闭弹窗无用户提示** — 已修复：verifying 状态下 Esc/Overlay/X 关闭前弹出 confirm 确认框

**patch:**
- [x] [Review][Patch] **成功 600ms setTimeout 未清理** [TokenSettingsModal.tsx:L122-L127] — 已修复：`successTimerRef` 追踪定时器 ID，unmount 时清理
- [x] [Review][Patch] **handleSave 缺少 status 检查导致可并发提交** [TokenSettingsModal.tsx:L96-L97] — 已修复：函数体开头 `if (status === 'verifying') return;`
- [x] [Review][Patch] **fetch 响应未检查 HTTP 状态码** [TokenSettingsModal.tsx:L107-L112] — 已修复：`resp.ok` 检查 + 单独错误处理
- [x] [Review][Patch] **JSON 解析失败被误报为连接失败** [TokenSettingsModal.tsx:L132-L143] — 已修复：SyntaxError 独立分支显示「服务器返回了异常数据」
- [x] [Review][Patch] **toggleVisibility 未清除 autoMaskTimer** [TokenSettingsModal.tsx:L90-L93] — 已修复：切换前 clearTimeout
- [x] [Review][Patch] **settings-overlay--verifying CSS 未应用** [TokenSettingsModal.tsx:L163] — 已修复：overlay className 拼接 `--verifying`
- [x] [Review][Patch] **handleSave 未清除 autoMaskTimer** [TokenSettingsModal.tsx:L96-L99] — 已修复：调用 `cancelAutoMask()` 清除定时器
- [x] [Review][Patch] **验证中点击遮罩层可关闭弹窗** [TokenSettingsModal.tsx:L163] — 已修复：overlay 使用 `safeClose`（含 confirm）

**defer:**
- [x] [Review][Defer] 仅含空白字符时提示歧义 — defer, minor UX edge case
- [x] [Review][Defer] API 地址硬编码 127.0.0.1:8765 — defer, project-wide architectural decision
- [x] [Review][Defer] onClose 非稳定引用导致重复注册事件 — defer, parent component concern

---

## Dev Agent Record

### Implementation Plan
1. 基于现有 TokenSettingsModal 精准修改（非重写）
2. 最小字符 10 → 20，空 Token 前端阻止
3. 添加 fetch AbortController + 5s timeout
4. 错误提示移至表单顶部，文案用后端 message
5. 添加 mountedRef 防止卸载 setState
6. 运行 tsc + vitest 验证

### Debug Log
- 2026-05-22: 开始实现 Story 1.3
- 2026-05-22: 完成 Task 1 — `canSubmit` 和 `handleSave` 最小字符从 10 改为 20，新增 `showMinLengthHint` + `.settings-min-length-hint` 样式
- 2026-05-22: 完成 Task 2 — 添加 `AbortController` + 5s timeout，超时提示「网络超时，请检查本地服务状态」，清理阶段 abort
- 2026-05-22: 完成 Task 3 — `.settings-error-text` 移至 `.settings-form-body` 第一个子元素，margin 从 -8px 改为 0
- 2026-05-22: 完成 Task 4 — 新增 `SaveTokenResponse` 接口，`handleSave` 使用 `mountedRef` 防卸载 setState
- 2026-05-22: tsc --noEmit 通过，vitest 40/40 通过
- 2026-05-22: 实现完成，Status → review

### Completion Notes
实现了 TokenSettingsModal 的 4 项精准修复：
1. **最小字符限制 10→20**：`canSubmit` 和 `handleSave` 条件同步改为 `>= 20`，按钮下方红色提示「最少 20 个字符」（仅在非空且短于 20 时显示）
2. **Fetch 5s 超时**：`AbortController` + `signal` 传入 fetch，`setTimeout` 5s 触发 abort，`AbortError` 分支返回「网络超时，请检查本地服务状态」
3. **错误提示移顶**：`.settings-error-text` 从输入框下方移到 `.settings-form-body` 首个子元素，margin 归零适配 flex gap
4. **类型安全**：新增 `SaveTokenResponse` 接口标注 `resp.json()` 返回类型，`mountedRef` 防止组件卸载后的 setState 副作用
保留所有现有功能：Esc/Overlay 关闭、5s 自动遮罩、成功/loading/失败状态流转、Focus 管理、stopPropagation

---

## File List
| 文件 | 操作 | 状态 |
|------|------|------|
| `src/components/Onboarding/TokenSettingsModal.tsx` | 变更 | done |
| `src/app.css` | 变更 | done |

---

## Change Log
| 日期 | 变更说明 |
|------|----------|
| 2026-05-22 | 基于 epics/PRD/架构/现有代码上下文创建完整 Story 文件 |
| 2026-05-22 | 实现完成：最小字符 10→20、AbortController 5s 超时、错误提示移顶、SaveTokenResponse 类型守卫、mountedRef 防泄漏 |
