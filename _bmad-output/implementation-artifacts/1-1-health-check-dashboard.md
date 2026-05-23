# Story 1.1: 三服务自检仪表盘

**Status:** done
**Epic:** 1 - 本地环境引导与系统健康
**FRs:** FR-20
**NFRs:** NFR-5 (自检响应 <200ms)
**File:** `src/components/Onboarding/WelcomeScreen.tsx` (变更)

---

## User Story

As a Yale,
I want 打开插件时一眼看到 FastAPI/Tushare/本地数据库三项服务的绿黄红状态灯，
So that 我能立刻知道本地环境是否就绪，决定是否需要排查。

## Acceptance Criteria

**Given** 首次启用插件或从底部状态栏错误图标跳转
**When** 进入欢迎页
**Then** 三盏状态灯在 200ms 内渲染完成
**And** FastAPI 可达时显示绿灯+「运行中」、不可达时显示红灯+「未连接 (127.0.0.1:8765)」
**And** Tushare Token 有效时绿灯+「已验证」、无效时红灯
**And** 全部绿灯时「进入工作区」按钮可用，任何红灯时按钮 disabled+提示修复

---

## Developer Context

### 现有代码状态
`WelcomeScreen.tsx` 已有初始实现，包含：三服务健康检查、绿/红状态灯、重新自检按钮、进入工作区按钮、离线旁路逻辑。需要按详细规格校对和完善。

### 现有代码保留项（不可破坏）
- `runHealthCheck()` — 调用 `GET http://127.0.0.1:8765/api/health`，1.5s 超时
- `handleCopy()` — 复制 `chmod +x start.sh && ./start.sh` 命令
- `handleEnter()` — 调用 `onEnterWorkspace(offlineBypass)`
- `offlineBypass` 逻辑 — Tushare 不可用但 SQLite 有缓存时的降级判断
- 黄色指示灯（Tushare 降级可用时）已有实现

### 需要完善的内容
1. **状态标签文案对齐 PRD 规格**：
   - FastAPI: `运行中` / `未连接 (127.0.0.1:8765)`
   - Tushare: `已验证` / `未配置`
   - SQLite: `正常` / `异常`
2. **API GET /api/health 响应字段对齐**：确认返回字段 `fastapi_ok`, `tushare_configured`, `tushare_ok`, `sqlite_ok`, `sqlite_has_data` 与实际后端一致
3. **自检 <200ms 验证**：`performance.now()` 测量 `runHealthCheck` 执行时间

### 技术约束
- React 18 FC 组件，`export default`
- TypeScript strict 模式，`import type` 分离
- Vanilla CSS，类名 `tj-` 前缀 + kebab-case（当前使用 `welcome-` 前缀，保持一致即可）
- 暗黑毛玻璃主题
- `Fetch API` 仅与 `127.0.0.1:8765` 通信，无外部请求

### 文件变更
| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/Onboarding/WelcomeScreen.tsx` | 变更 | 校对完善状态标签、指示灯逻辑 |
| `src/app.css` | 可能需要 | 确保 `welcome-*` 相关 CSS 的暗黑主题合规 |

### 依赖
- FastAPI `/api/health` 端点已就绪（`server/src/router.py`）
- Zustand store 无需变更（当前通过 props 通信）

### 项目上下文（来自 project-context.md）
- 组件: `export default`, `React.FC<Props>`
- CSS: 前缀 `tj-` (此处 `welcome-` 前缀已存在，保持一致)
- 导入: `@/` 路径别名, `import type` 分离类型
- 通信: `http://127.0.0.1:8765` 唯一后端地址

---

## Dev Agent Guardrails

### 禁止事项
- ❌ 不要重写整个组件，在现有代码基础上修改
- ❌ 不要移除 `offlineBypass` 逻辑
- ❌ 不要改变现有的 `welcome-` CSS 类名前缀
- ❌ 不要引入新依赖库
- ❌ 不要发起外部网络请求

### 必须遵循
- ✅ 保持现有 `useCallback` / `useEffect` 模式
- ✅ 所有新增文本使用中文
- ✅ 表单/状态提示使用颜色+文本双重反馈

---

## Tasks / Subtasks

### Task 1: 状态标签文案对齐 PRD 规格
- [x] 1.1 FastAPI 状态标签：绿色 `运行中`，红色 `未连接 (127.0.0.1:8765)`
- [x] 1.2 Tushare 状态标签：绿色 `已验证`，红色 `未配置`，黄色保持 `离线可用`
- [x] 1.3 确认 SQLite 标签 `正常`/`异常` 已正确

### Task 2: API 响应字段对齐
- [x] 2.1 确认 `HealthData` 接口字段与后端 `/api/health` 响应一致
- [x] 2.2 Tushare `tushare_configured` 字段接入红色逻辑（未配置 → `未配置`）
- [x] 2.3 黄色降级指示灯 `offlineBypass` 逻辑保持不变

### Task 3: 进入工作区按钮状态逻辑
- [x] 3.1 确认 `enterLocked` 在 FastAPI 红灯时正确 disabled
- [x] 3.2 红灯时按钮提示文本改为「请先修复服务连接问题」
- [x] 3.3 `offlineBypass` 降级模式按钮保持可用（黄色样式）

### Task 4: 自检性能测量与测试
- [x] 4.1 使用 `performance.now()` 测量 `runHealthCheck` 执行时间
- [x] 4.2 编写单元测试验证组件逻辑（边界条件、派生状态）
- [x] 4.3 验证自检渲染在 200ms 内完成（NFR-5）

---

## Dev Agent Record

### Implementation Plan
基于现有 `WelcomeScreen.tsx` 代码进行精准修改：
1. 改造 `statusLabel` 为 `fastApiLabel` / `tushareLabel` / `sqliteLabel` 三个独立函数
2. 接入 `tushare_configured` 字段区分「未配置」与「无效令牌」
3. 在 `runHealthCheck` 中加入 `performance.now()` 测量
4. 编写单元测试覆盖所有状态组合

### Debug Log
- 2026-05-22: 提取 `HealthData` 类型至 `src/types/health.ts`，提取 `deriveHealthLabels`/`deriveEnterLocked`/`deriveOfflineBypass` 纯函数至 `src/utils/healthCheckLabels.ts`
- 2026-05-22: 更新 `WelcomeScreen.tsx` 标签文案，使用 `deriveHealthLabels` 统一推导逻辑
- 2026-05-22: `runHealthCheck` 加入 `performance.now()` 测量，超过 200ms 阈值时 console.warn
- 2026-05-22: 新增 `welcome-locked-hint` CSS 样式，红灯时显示「请先修复服务连接问题」

### Completion Notes
- 标签文案已对齐 PRD 规格：FastAPI `运行中`/`未连接 (127.0.0.1:8765)`，Tushare `已验证`/`离线可用`/`未配置`，SQLite `正常`/`异常`
- API 响应字段 `fastapi_ok`/`tushare_configured`/`tushare_ok`/`sqlite_ok`/`sqlite_has_data` 与后端一致
- `offlineBypass`、`enterLocked` 逻辑完整保留
- 新增 19 个单元测试覆盖所有状态组合和边界条件，全部通过
- TypeScript strict 模式编译通过，已有 36 个测试全部通过无回归

---

## Senior Developer Review (AI)

**Review Outcome:** Changes Requested
**Review Date:** 2026-05-22
**Action Items:**

- [x] [Decision][Medium] `tushare_configured` 字段已定义但未被消费 — 是否需要在 UI 中区分"Token 未配置"（红灯：`未配置`）与"Token 已配置但无效"（红灯：`无效`）？当前 `tushareLabel` 将所有非绿色状态统一显示为 `未配置` — 已确认：细分处理，configured=false→`未配置`，configured=true但ok=false→`无效`
- [x] [Decision][Medium] `enterLocked` 范围 — AC 要求"任何红灯时按钮 disabled"，但当前仅 FastAPI 红灯锁定。offlineBypass 允许 Tushare 红灯时进入（黄色降级），这与 AC 的"任何红灯"描述可能冲突。需确认产品意图 — 已确认：保持当前行为，仅 FastAPI 红灯锁定
- [x] [Patch][High] useEffect 缺少清理逻辑，组件卸载后 fetch 完成时的 setState 会触发 React 警告 `src/components/Onboarding/WelcomeScreen.tsx`
- [x] [Patch][Medium] 响应缺少运行时校验：未检查 HTTP status、未区分 AbortError 与 SyntaxError、缺少类型守卫 `src/components/Onboarding/WelcomeScreen.tsx`
- [x] [Patch][Medium] `onEnterWorkspace` / `onOpenSettings` 缺少运行时防御，父组件传入 undefined 时会导致 TypeError 白屏 `src/components/Onboarding/WelcomeScreen.tsx`
- [x] [Patch][Low] `navigator.clipboard.writeText` 失败时静默无反馈，用户无法感知复制失败 `src/components/Onboarding/WelcomeScreen.tsx`
- [x] [Patch][Low] `deriveHealthLabels` 内部重复实现了 `deriveOfflineBypass` 的同构逻辑，应直接调用后者 `src/utils/healthCheckLabels.ts`
- [x] [Patch][Low] `runHealthCheck` 缺少内部防重入守卫，未来若有其他代码路径绕过按钮 disabled 调用会产生并发请求 `src/components/Onboarding/WelcomeScreen.tsx`
- [x] [Defer] URL `127.0.0.1:8765` 硬编码在组件中 — 属于项目架构层面的配置化决策，非本 Story 范围
- [x] [Defer] bash 命令 `chmod +x start.sh && ./start.sh` 硬编码 — 属于已有行为，非本变更引入

---

### Review Follow-ups (AI)

- [x] [AI-Review][Decision] 确认 tushare_configured 字段用法
- [x] [AI-Review][Decision] 确认 enterLocked 范围（是否应包含任何红灯）
- [x] [AI-Review][Patch] 添加 useEffect 清理逻辑
- [x] [AI-Review][Patch] 添加响应运行时校验
- [x] [AI-Review][Patch] 添加 props 运行时防御
- [x] [AI-Review][Patch] 添加 clipboard 失败反馈
- [x] [AI-Review][Patch] 消除 deriveHealthLabels 重复逻辑
- [x] [AI-Review][Patch] 添加 runHealthCheck 防重入守卫

---

## File List
| 文件 | 操作 | 状态 |
|------|------|------|
| `src/components/Onboarding/WelcomeScreen.tsx` | 变更 | done |
| `src/types/health.ts` | 新增 | done |
| `src/utils/healthCheckLabels.ts` | 新增 | done |
| `src/app.css` | 变更 | done |
| `tests/derive-health-labels.test.ts` | 新增 | done |

---

## Change Log
| 日期 | 变更说明 |
|------|----------|
| 2026-05-22 | 初始化 Tasks/Subtasks、Dev Agent Record、File List、Change Log 段落 |
| 2026-05-22 | 实现全部 4 个 Task：状态标签对齐、API 字段对齐、按钮逻辑、性能测量与测试 |
