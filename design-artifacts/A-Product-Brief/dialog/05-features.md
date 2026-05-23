# Step 5: Core Features

**Completed:** 2026-05-21
**Session:** 1

---

## Purpose

Capture the essential features and requirements of the Trade Journal plugin, defining the specific capabilities across Study Mode, Trader Mode, and the high-precision linkage mechanism.

---

## Feature Matrix

### 1. Study Mode (学习与理论复盘)
* **左右分栏布局 (Split-Screen Layout)**: 
  * 左侧为 Logseq 原生 Markdown/DB 笔记编辑器，右侧为嵌入式高画质 `KLineChart` 技术分析面板。
  * 支持自由拖拽调节分栏比例，适配不同屏幕分辨率。
* **图表状态快照绑定 (Chart State Binding)**:
  * 每一个 Logseq 块（Block）可静默绑定 `kline/symbol`、`kline/timeframe`、`kline/timestamp` 和 `kline/drawings`（画线 JSON 数据）属性。
  * 用户在右侧图表进行划线（均线、趋势线、通道、斐波那契回调等）时，坐标与类型信息实时存入对应的 Logseq 块属性中。

### 2. Linkage Engine (高精度双向联动引擎)
* **从笔记跳转图表 (Jump to Chart)**:
  * 点击绑定了 K 线属性的 Logseq 块，右侧图表在 150ms 内瞬间完成重绘，平滑缩放并定位到精确的时间戳（支持到分/时秒级）。
* **从图表跳转笔记 (Jump to Block)**:
  * 在 K 线图表上的任意 K 线 Bar（或特定的画线/标记点）双击，可立即在左侧 Logseq 编辑器中自动创建/定位到关联的笔记 Block。

### 3. Trader Mode (交易复盘与资产管理 - 借鉴 TraderSync 优势)
* **图表买卖点标记 (K-Line Execution Markers)**:
  * 基于录入的交易成交明细，自动在 K 线图上对应的精确时间戳和价格位置绘制买入（向上青/绿箭头）和卖出（向下红/粉箭头）标记，点击标记可穿透查看交易明细。
* **多维度绩效分析看板 (Advanced Analytics & Filtering)**:
  * 提取交易记录，支持按标的、周期、交易策略（Setups）、交易错误（Mistakes）进行多维度筛选和盈亏归因。
  * 提供交易时段、星期几等时间的统计分布图表。
* **盈亏日历视图 (PnL Calendar)**:
  * 交互式的月度日历，每日以绿/红背景及数值展示盈亏，点击特定日期可下钻查看当天的所有交易记录和复盘笔记。
* **多账户投资组合与资产分析 (Portfolio & NAV Analysis)**:
  * 支持多市场多账户资产划转与记录。
  * 自动折算不同本币（CNY, USD, USDT），实时汇总生成账户总资产净值（NAV）历史曲线。
  * 展示当前的资产分配比例及跨市场风险敞口。
  * 交易录入时，基于总资产及设置的风控比例，自动推荐仓位大小（例如：单笔止损限制在总资产 1% 以内）。

### 4. Data Service (本地数据服务)
* **多市场 K 线接入**:
  * 运行于本地的 Python FastAPI 服务，对接 AKShare/Tushare (A股及期货)、YFinance (美股及港股) 以及 CCXT (加密货币)。
  * 提供搜索标的、获取标的基本信息、下载历史 K 线（支持多周期：日线、1小时、5分钟等）的 API。

---

**Documented in:** `wds-project-outline.yaml` → `features`
