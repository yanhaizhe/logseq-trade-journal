# Step 4: Product Concept

**Completed:** 2026-05-21
**Session:** 1

---

## Purpose

Capture the designer's STRUCTURAL vision - the founding principle or key feature that defines the product concept.

**Not just requirements - the IDEA.**

---

## Concept Exploration

**Agent asked:**
这个以“Markdown 块级属性作为图表状态的持久化载体”来运转的动态联动原则，是否准确地抓住了你想要的“双向联动”精髓？你希望在 K 线图上画线时，Logseq 自动在左侧生成的 Block 文本内容长什么样？

**User described:**
1. 不是以 Markdown 的方式，而是以 Logseq DB 版本的方式联动。
2. 可以联动，且联动最好精确到时间级别（非仅日期级别，需支持具体分/时秒级的时间戳锚定）。

---

## Deep Dive

### Core Structural Idea

**The founding principle:**
**「将 K 线动态状态结构化为 Logseq DB 块实体属性，以时间戳为核心轴线实现跨周期的高精度双向活性绑定」**
本插件不依赖原生的文本 Markdown 轮询或粗粒度的文件解析，而是利用 Logseq DB 的原生数据库实体模型。将 K 线的图表元数据（标的、周期、技术指标、画线 JSON、高精度时间戳）以强类型 DB 属性方式绑定在 Block 实体中。

**Concrete example:**
用户在右侧 5 分钟级别 BTC 图表上的 `2026-05-21 21:42:00` 蜡烛柱上绘制了一个“双底形态”颈线，并双击该处添加文本笔记。
Logseq 数据库侧自动在当前页面创建或修改一个 Block 实体，写入：
- 块文本：`BTC 5m 双底形态颈线突破确认`
- DB 属性字段：
  - `kline/symbol`: `"BTC/USDT"`
  - `kline/timeframe`: `"5m"`
  - `kline/timestamp`: `"2026-05-21 21:42:00"`
  - `kline/drawings`: `"[{\"type\":\"horizontal-line\",\"price\":67250.5}]"`
点击该 Logseq 块时，K 线图表能直接跳过搜索，瞬间重绘并滚动到该精确蜡烛柱中央。

### Why This Matters

**User's rationale:**
* **性能与稳定性**：Logseq DB 版本将所有笔记和块实体对象关系数据库化，通过结构化 API 进行 CRUD 比读写物理 Markdown 文件更为安全、快速和可靠。
* **信息高纯度**：用户在做日内交易（如外汇、Crypto、日内期货）或细致的技术形态学习时，仅仅“定位到天”是远远不够的，必须“精细到具体的蜡烛线（K线 Bar）级别”。

**Problem it solves:**
* 解决了传统 Logseq 插件在文本层面上用正则匹配或 Markdown 属性读写的脆弱性。
* 解决了在日内多笔交易复盘时，无法分清哪笔交易对应哪个具体 1分钟/5分钟 K 线位置的痛点。

---

## Reflection Checkpoint

**Agent's synthesis:**
产品结构设计应该全面拥抱 Logseq DB API。在底层，通过结构化数据库字段存储 K 线图表状态元数据；在 UI 层，当用户在 K 线图上操作或点击特定柱子时，Logseq 侧进行毫秒级高精度时间同步，直接读写 Block 数据库条目。

**User response:**
- [x] Confirmed
- [ ] Corrected

**Corrections (if any):**
用户强调：核心是基于 Logseq DB 版本，而不是普通的 Markdown 文本解析，联动颗粒度要达到时间级别。

---

## Concept Documentation

**Core concept:**
**Logseq DB 原生驱动的时间轴高精度交互式 K 线复盘底座。**

**Implementation principle:**
1. **DB 实体解耦**：每一个笔记/交易记录在 Logseq 数据库中都是带有 `kline/` 前缀强类型属性的 DB 块。
2. **高精度定位协议**：K 线图组件（KLineChart）支持按时间戳（Timestamp）指令集定位。当接收到 DB 块的数据更新事件时，通过时间戳索引直接将视口滚动并聚焦在对应的 K 线 Bar。
3. **静默属性存取**：所有 K 线的配置和划线 JSON 都作为 Logseq DB 块实体的数据库字段，不在编辑界面对用户产生视觉干扰，保证用户能专注于当前笔记文本。

---

## Related Features

Features that stem from this concept:
1. **DB 字段自动映射**：在右侧图表进行划线或添加标记时，系统静默往 Logseq 数据库中写入或更新对应块的 `kline/drawings` JSON。
2. **高精度 K 线时间定位器**：支持从 Logseq DB 块记录的一行带时间戳的交易日志，一键让右侧 K 线视口“平滑移动/缩放”至该时间点。
3. **多周期联动归纳**：在 Logseq DB 建立页面关联，能够实现从日线主趋势块，向下钻取（Drill down）到具体的 5 分钟级别细节交易块。

---

**Documented in:** `wds-project-outline.yaml` → `product_concept`
**Impacts:** Navigation structure, information architecture, feature priorities
