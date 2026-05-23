# Step 6: Inspiration & References (including Competitor Analysis)

**Completed:** 2026-05-21
**Session:** 1

---

## Competitor Analysis

### Competitor 1: TraderSync
* **What they do well (Strengths):**
  1. **直观的 K 线买卖标记（Execution Markers）**：自动在图表上以箭头形式绘制成交买卖点（买入/卖出价格与时间），复盘极其直观。
  2. **多维度绩效看板（Advanced Analytics）**：支持按星期几、交易时段、策略标签（Setups）、交易错误（Mistakes）进行多维度盈亏归因。
  3. **盈亏日历（PnL Calendar）**：日历视图直观展示每日红绿盈亏，方便点击特定日期穿透查看交易。
* **Where they fall short (Weaknesses):**
  1. **数据隐私性差**：交易记录和资产敏感数据必须上传至其云端服务器。
  2. **知识管理割裂**：无法与用户个人的理论学习知识库（Logseq 双链网）深度绑定，写交易笔记极其死板。
  3. **高昂的订阅费**：SaaS 模式，个人长期使用成本较高。
* **How we'll differentiate (Our Approach):**
  * 在 Logseq DB 本地安全存储的前提下，在 KLineChart 面板中**吸纳 TraderSync 的买卖标记、多维度统计与日历视图优势**。

### Competitor 2: TradingView
* **What they do well (Strengths):**
  1. 极其流畅和丰富的技术指标与动态画线工具（画笔、黄金分割、趋势线等）。
  2. 多周期切换以及流畅的图表缩放。
* **Where they fall short (Weaknesses):**
  * 笔记功能局限于单一图表，无法将多标的、多周期的画线笔记串联成个人知识库体系。
* **How we'll differentiate (Our Approach):**
  * 保持现有的 `KLineChart` 核心画线工具，将其状态（周期、划线 JSON）数据库化绑定至 Logseq 块，实现“TradingView 级别的画线体验 + Logseq 级别的知识串联”。

---

## Style & Visual Preferences

* **Overall aesthetic:** 现代科技感暗黑模式，采用磨砂玻璃感（Glassmorphism）和细腻的色彩过渡。
* **Color preferences:** 
  * 暗色底色（如 HSL 微调暗青/深蓝灰），避免刺眼的纯黑。
  * 交易买卖信号采用柔和、高对比度的绿（买）/红（卖）或青/粉。
* **Level of complexity:** 富交互（Rich），确保图表控制区、笔记区与报表看板在单页中高密度且井然有序地呈现。

---

**Documented in:**
- `design-artifacts/A-Product-Brief/dialog/06-inspiration.md`
- `wds-project-outline.yaml` → `inspiration`
