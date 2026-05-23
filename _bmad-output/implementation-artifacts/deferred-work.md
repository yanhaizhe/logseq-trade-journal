# Deferred Work

## Deferred from: code review of 1-1-health-check-dashboard (2026-05-22)

- URL `127.0.0.1:8765` 硬编码在组件中 — 属于项目架构层面的配置化决策，非本 Story 范围
- bash 命令 `chmod +x start.sh && ./start.sh` 硬编码 — 属于已有行为，非本变更引入

## Deferred from: code review of 1-2-error-diagnosis-helper (2026-05-22)

- `getDiagnostic` 仅返回 ECONNREFUSED，未区分超时/500等不同故障 — 后续扩展诊断映射时可完善
- `DiagCopyState` 全局共享 — 仅当前只有 1 个 popover 时无问题，多 popover 场景需重构
- Popover 可能超出视口边界 — 边缘场景，当前窗口尺寸足够时不触发
- `hoveredRow` 类型 `null | string` 过宽 — 小优化，不影响功能
- `diagCopyTimerRef` 回调后未重置 — 无害，仅管理精度问题

## Deferred from: code review of 1-3-token-config-modal (2026-05-22)

- 仅含空白字符的 Token 输入提示歧义 — minor UX edge case，用户输入纯空格场景极罕见
- API 地址 `127.0.0.1:8765` 硬编码 — project-wide architectural decision，所有 localhost 通信均硬编码
- `onClose` 非稳定引用导致重复注册事件监听 — parent component concern，非本 Story 范围

## Deferred from: code review of 1-4-recheck-enter-workspace (2026-05-22)

- `offlineMode` 状态暂未消费 — 在 `onEnterWorkspace` 中通过 `setOfflineMode(isOffline)` 写入，App.tsx 内无读取方，为 Epic 2（K 线工作区离线模式）预留状态

## Deferred from: code review of 2-2-symbol-input-kline-load (2026-05-23)

- Logseq block 焦点轮询 300ms 带来的潜在性能开销 — 300ms 轮询属于故事规约指定频率，且 API 开销轻微，暂缓处理。
- 遗留的 2.1 缩放及定位相关 Edge Cases (如 sandbox 中 getFrameElement 返回 null、拖拽重置、Watchlist 错误结构等) — 均为 pre-existing 已通过的故事逻辑，不影响本故事运行，为防代码污染暂予搁置。

## Deferred from: code review of 2-3-kline-chart-interaction (2026-05-23)

- 港股与美股交易所初始化的 SZ 属性硬编码 — 属于原本的初始化代码逻辑，在此次变动中仅替换了变量名称，不属于本故事新引入的漏洞。
- 标的搜索接口缺乏输入防抖与请求撤销处理 — 属于已有的搜索模态框历史遗留行为，需在搜索模块整体重构时统一解决。
- TradingNotes 短仓/做空的盈亏比边界计算漏洞 — 属于 TradingNotes 组件内部既有的交易表单边界计算漏洞，非 2.3 开发范围。

## Deferred from: code review of 2-6-trade-marker-hover.md (2026-05-23)

- 对私有成员 `_chartApi` 的强行跨越类型访问：通过 `(proChartRef.current as any)._chartApi` 强行突破类型系统访问内部私有变量，依赖库的内部实现细节，在 `klinecharts` 版本升级时该内部变量一旦更改，代码将直接崩溃。

## Deferred from: code review of 2-7-canvas-drawing-tools (2026-05-23)

- 多实例 globalOnMarkerHover 竞争冲突：`globalOnMarkerHover` 是全局共享变量，多实例场景下会发生覆盖和覆盖为 null。
- getTradesBySymbol 返回非数组类型校验缺失：从 DB 或 localStorage 读取数据若为空或非数组在 existing.some 等处会报错崩溃。
- entryPrice 为 null/undefined/NaN 时生成无效 overlay 隐患：缺乏在数据清洗层面对 entryPrice 的有效数值校验。
- 标的搜索 API 缺乏防抖与并发竞态处理：连续快速输入时旧的慢网络请求响应可能覆盖新的快请求结果。
- FPS 监控告警阈值（32ms）与 NFR-4 性能红线（60fps，即 16.67ms）不匹配：开发环境下的帧丢告警阈值过宽，无法有效阻断 30fps-60fps 之间的性能恶化。
- 数据加载 Catch 块在未挂载时执行状态变更可能引发 React 内存泄漏警告：`setIsOnline` / `setChartState` 缺乏 `isMountedRef.current` 挂载守卫。
- 私有成员 `_chartApi` 突破类型访问隐患：虽然声明了接口，但仍依赖了底层的私有 API 内部实现细节。
- LocalStorage 交易读写异常时发生覆盖数据损坏丢失风险：`JSON.parse` 报错时，现有实现会清空整个 list 从而擦除用户数据。
- 表单提交后关闭弹窗与极慢写请求时序冲突：可能误关闭用户之后打开并输入新数据的表单。
- 标的切换时录入表单中的 formSymbol 未能即时同步。
