# Feature Impact Analysis: logseq-trade-journal

## Scoring

由于本项目为 100% 个人专用软件，因此用户画像仅包含 Yale (Primary Persona ⭐) 一人。

**Primary Persona (⭐) Scoring:**
- High Impact = 5 pts (直接解决核心 Want 或消除核心 Fear)
- Medium Impact = 3 pts (辅助支持核心体验)
- Low Impact = 1 pt (Nice-to-have 或与核心诉求偏离)

**Max Possible Score:** 5 pts  
**Must Have Threshold:** 5 pts (Primary High)  
**Consider Threshold:** 3 pts (Primary Medium)  
**Defer/Discard Threshold:** 1 pt (Primary Low)  

---

## Prioritized Features

| Rank | Feature | Score | Decision | Core Alignment |
| ---- | ------- | ----- | -------- | -------------- |
| 1 | Block-Timestamp Bi-directional Sync (高精度时间戳双向跳转) | 5 | Must Have MVP | Wants #1 (无摩擦复盘心流体验) / Fears #2 (记录高摩擦) |
| 2 | Interactive Klinecharts Viewport (基于 klinecharts 的交互式 K 线) | 5 | Must Have MVP | Wants #1 (无摩擦复盘心流体验) / 消除截图依赖 |
| 3 | Multi-currency NAV Curve Aggregation (CNY/USD/USDT 资产合并对账) | 5 | Must Have MVP | Wants #2 (宏观资产变动透视) |
| 4 | Execution Buy/Sell Markers (Canvas 买卖点标记回显) | 5 | Must Have MVP | Wants #3 (交易策略与行为归因 - TraderSync 优势) |
| 5 | PnL Calendar Grid (红绿盈亏日历看板) | 5 | Must Have MVP | Wants #3 (交易策略与行为归因 - TraderSync 优势) |
| 6 | Local-first Loopback Scrapers (FastAPI 本地环回数据服务) | 5 | Must Have MVP | Fears #1 (绝对隐私数据不泄露) / 保证 100% 离线可用 |
| 7 | Strategy & Mistake Custom Tags (策略与行为错误标签过滤) | 3 | Consider MVP | Wants #3 (促进交易归因与反思) |
| 8 | Drawing State (JSON) Persistence (画线 JSON 状态序列化读写) | 3 | Consider MVP | Wants #1 (彻底消除截图依赖，保存划线分析现场) |
| 9 | Real-time Price Notification (本地实时价格盯盘/预警) | 1 | Defer | 对于“复盘学习”非核心诉求，属于“盘中执行”范畴 |
| 10 | Cloud Sync & Social Sharing (云端数据备份与社交分享) | 1 | Discard/Defer | 违背 Fears #1 (极端隐私泄露) 诉求，且个人工具不需要社交属性 |

---

## Decisions

### **Must Have MVP (Score: 5):**

- **Block-Timestamp Bi-directional Sync (5)**: 鼠标点击 Logseq 包含时间戳属性的 Block 时，右侧 K 线自动跳转至对应 Bar，且双击 K 线 Bar 自动在左侧创建或定位笔记 Block。
- **Interactive Klinecharts Viewport (5)**: 嵌入 `klinecharts` / `@klinecharts/pro` 渲染高精度图表，支持缩放、平移及基本指标计算，替代静态复盘截图。
- **Multi-currency NAV Curve Aggregation (5)**: 本地化多市场资金对账，根据 CCXT / AkShare / YFinance 的历史汇率数据进行 CNY/USD/USDT 合并折算，渲染 NAV 净值走率。
- **Execution Buy/Sell Markers (5)**: 根据本地交易记录，自动在 Kline Canvas 上渲染绿色三角买入与红色三角卖出标记，hover 悬浮显示成交明细。
- **PnL Calendar Grid (5)**: 渲染月度格子日历，根据当日最终平仓结算盈亏渲染绿色（盈利）或红色（亏损）底色，支持点击日期过滤复盘笔记。
- **Local-first Loopback Scrapers (5)**: 使用 Python FastAPI 本地进程拉取 AkShare, Tushare, CCXT, YFinance 数据，限制只在 `127.0.0.1` 环回接口通信，拒绝云端数据同步。

### **Consider for MVP (Score: 3):**

- **Strategy & Mistake Custom Tags (3)**: 允许在复盘日志中以 Logseq DB 属性挂载标签（如 `#FOMO` `#突破买入`），并能通过侧边栏对图表和笔记进行标签组合过滤。
- **Drawing State (JSON) Persistence (3)**: 序列化 Canvas 上的画线图形（如支撑线、通道），与 Logseq 笔记块属性进行联动保存与读取恢复。

### **Defer / Discard (Score: 1):**

- **Real-time Price Notification (1)**: 本地盯盘与价格突破警报，在离线且以复盘为主的场景中优先级较低，未来可作为本地后台服务考虑。
- **Cloud Sync & Social Sharing (1)**: 社交分享与云端共享，由于 Yale 的强隐私诉求与个人非商用工具属性，对此项进行剔除，确保插件 100% 离线自给自足。

---

## Related Documents

- **[00-trigger-map.md](00-trigger-map.md)** - Visual overview and navigation
- **[01-Business-Goals.md](01-Business-Goals.md)** - Objectives and metrics
- **[02-Yale-the-Yield-Seeker.md](02-Yale-the-Yield-Seeker.md)** - Primary persona
- **[05-Key-Insights.md](05-Key-Insights.md)** - Strategic implications

---

_Back to [Trigger Map](00-trigger-map.md)_
