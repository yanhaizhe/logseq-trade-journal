---
project_name: 'logseq-trade-journal'
user_name: 'yale'
date: '2026-05-21'
sections_completed: ['technology_stack', 'typescript_rules', 'react_rules', 'testing_rules', 'code_quality_rules', 'workflow_rules', 'critical_rules']
existing_patterns_found: 24
status: 'complete'
rule_count: 44
optimized_for_llm: true
---

# logseq-trade-journal AI 项目上下文

_本文档包含 AI Agent 在本项目中实现代码时必须遵循的关键规则和模式。聚焦于 AI 可能遗漏的非显而易见细节。_

---

## 技术栈与版本

### 前端 (Logseq 插件)
| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^18.3.1 | UI 框架，jsx: react-jsx（自动 JSX 转换） |
| TypeScript | ^5.4.5 | strict: true，target: ES2020 |
| Vite | ^5.3.1 | 构建工具，base: './'，端口 4567 |
| vite-plugin-logseq | ^1.1.2 | Logseq 插件构建适配 |
| Zustand | ^4.5.2 | 全局状态管理（单一 store） |
| klinecharts | ^9.8.6 | 专业 K 线图表渲染 |
| @klinecharts/pro | ^0.1.1 | K 线高级功能（指标、画线） |
| @logseq/libs | ^0.2.3 | Logseq 插件 SDK |
| dayjs | ^1.11.10 | 日期处理 |
| idb | ^8.0.3 | IndexedDB 封装（本地数据缓存） |
| papaparse | ^5.4.1 | CSV 解析 |

### 后端 (Python 数据服务)
| 技术 | 版本 | 用途 |
|------|------|------|
| FastAPI | >=0.104.0 | Web 框架，环回地址 127.0.0.1:8765 |
| uvicorn | >=0.24.0 | ASGI 服务器 |
| pydantic | >=2.0.0 | 数据校验 |
| Tushare | >=1.2.89 | A 股/期货数据源 |
| AKShare | >=1.12.0 | 免费备选数据源 |
| YFinance | >=0.2.30 | 美股数据源 |
| CCXT | >=4.0.0 | 加密货币统一接口 |
| pandas/numpy | >=2.0.0/>=1.24.0 | 数据处理 |

### 测试
| 技术 | 版本 | 配置 |
|------|------|------|
| Vitest | ^1.6.0 | globals: true, environment: 'node' |

### 关键约束
- 路径别名 `@/` → `src/`（仅 src 内使用，tests/ 用相对路径）
- CSS 不拆分：`cssCodeSplit: false`
- 构建前必须先 `tsc` 类型检查：`"build": "tsc && vite build"`
- Dev server 端口: 4567（前端）/ 8765（后端）

---

## 关键实现规则

### TypeScript 语言规则

- **strict: true** — 所有代码必须通过严格模式类型检查，禁止 `any` 除非有充分理由
- **import type 分离** — 仅用于类型的导入必须使用 `import type { X } from '...'`
- **路径别名规则** — `src/` 内所有文件使用 `@/` 别名；`tests/` 内使用相对路径（如 `../src/core/StatisticsEngine`）
- **JSX 自动转换** — `jsx: react-jsx`，无需手动 `import React from 'react'`
- **ES2020 target** — 可使用 optional chaining (`?.`)、nullish coalescing (`??`)、dynamic import
- **默认导出 vs 命名导出** — React 组件用 `export default`；工具函数/类/类型用命名导出 `export class/function/interface`
- **类型定义位置** — 组件 Props 接口与组件同文件，命名 `XxxProps`；跨模块共享类型放在 `src/types/` 下
- **禁止路径穿越** — 不得使用 `../../` 形式的相对路径穿越到 src/types 或 src/utils；一律用 `@/` 别名

### React 框架规则

- **函数组件，非 class 组件** — 全部使用 `React.FC<Props>` 类型标注的函数组件
- **Hook 使用规范** — `useCallback` 包裹所有事件处理函数，`useMemo` 用于派生状态，`useRef` 用于 DOM 引用和可变存储
- **无 React Router** — 页面/视图切换通过 Zustand store 的 `mode` 字段控制，无任何路由库
- **组件目录结构** — `components/ComponentName/ComponentName.tsx`，目录名与主组件名一致
- **子组件内联** — 同一页面内的辅助子组件可在同一文件中定义，不强制拆分为独立文件
- **单例在模块顶层** — 服务实例在模块顶层创建（如 `new DataService()`），不在组件 render 内创建
- **与 Logseq 宿主通信** — 使用 `window.parent?.postMessage()` 发送消息，`useEffect` 中监听 `window` message 事件
- **全局依赖注入** — TradeManager 通过 `(window as any).__tradeManager` 获取
- **CSS 约定** — 类名前缀 `tj-` + kebab-case（如 `tj-pro-chart-wrapper`，`tj-sidebar-tabs`）

### 测试规则

- **框架：Vitest** — `globals: true`，无需显式 import `describe`/`it`/`expect`
- **运行环境：node** — `environment: 'node'`，纯逻辑测试，不涉及 DOM/组件渲染
- **测试范围** — 仅测试 `src/utils/` 和 `src/core/` 的纯函数和类方法；无组件/K线图表测试
- **文件组织** — 测试文件在 `tests/` 根目录平铺，命名 `*.test.ts`
- **导入方式** — tests/ 中一律使用相对路径（如 `../src/core/StatisticsEngine`），不使用 `@/` 别名
- **类型导入** — `import type` 分离类型导入
- **工厂函数** — 用工厂函数构造测试数据（如 `makeTrade(overrides)` 提供默认值 + 可选覆盖）
- **命名** — 测试描述使用中文，简洁明确（如 `'空列表返回 0'`，`'做多盈利'`）
- **结构** — `describe` 对应一个方法/模块，`it` 对应一个测试场景

### 代码质量与风格

- **核心逻辑使用 class** — `src/core/` 下服务/引擎全部用 class 组织（如 `TradeManager`、`StatisticsEngine`），非函数式风格
- **工具函数纯函数** — `src/utils/` 下全部为无副作用的纯函数（如 `calcPnL`、`roundToDecimals`、`formatMoney`）
- **构造函数依赖注入** — class 构造函数接收外部依赖（如 `TradeManager` 接收 `LogseqDBService`）
- **JSDoc 注释** — 文件头部用 JSDoc 描述用途；方法/函数在必要时加 JSDoc
- **localStorage 键前缀** — 所有 localStorage key 使用 `tj_` 前缀（如 `tj_last_symbol`、`tj_watchlist`）
- **Python 命名** — 后端 `snake_case` 文件名和函数名（如 `ccxt_provider.py`、`get_kline_data()`）
- **无注释代码** — 代码中不保留注释掉的旧代码，发现应立即清理

### 开发工作流规则

- **构建顺序** — 前端: `tsc && vite build`；后端: `python main.py` 或 `uvicorn main:app --port 8765`
- **启动脚本** — 使用项目根目录的 `start.sh` / `stop.sh` 管理 FastAPI 生命周期
- **WebView 目标** — Logseq 桌面端 WebView 为 Chrome 90+ / Edge 90+ 级别

### 关键避坑规则

- **禁止引入路由库** — 项目不使用 react-router 等任何路由库，视图切换由 Zustand `mode` 控制
- **禁止外部网络流出** — 所有数据请求必须经过 localhost FastAPI 代理，前端不得直接调用外部 API
- **禁止使用 `any`** — strict 模式下任何 `any` 使用必须有明确的注释说明原因
- **多项目边界** — 前端/后端是独立项目，不要在前端代码中 import Python 模块
- **Python 相对导入** — 后端使用相对导入 `from src.models import ...`，不要引入跨模块绝对路径
- **window 全局变量** — `__tradeManager` 是约定注入点，新增全局变量须遵循 `__xxx` 命名并加 `(window as any)` 类型断言
- **localStorage 污染** — 所有存储键必须使用 `tj_` 前缀，避免与 Logseq 宿主或其他插件冲突
- **IndexedDB 异步** — `idb` 库的 IndexedDB 操作为异步 Promise 风格，不要在同步上下文中使用

---

## 使用指南

**AI Agent 必读：**

- 在实现任何代码前先阅读本文件
- 严格遵循所有规则，不得偏离
- 有疑问时选择更严格的方案
- 如果发现新出现的模式，更新本文件

**人工维护：**

- 保持本文件精简，聚焦 Agent 真正需要知道的内容
- 技术栈变更时同步更新
- 每季度审查过时规则
- 随着时间推移删除已变为常识的规则

最后更新：2026-05-21
