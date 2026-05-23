# Step 11: Tone of Voice & UI Microcopy Guidelines

**Completed:** 2026-05-21
**Session:** 1

---

## Purpose

Establish clear rules and attributes for UI microcopy, error handling, warning states, and system notifications. This ensures the interface communicates in a tone that respects the user's trading discipline, technical focus, and need for deep, uninterrupted workflow focus.

---

## Tone Attributes

### 1. 精准与理性 (Precise & Objective)
* **Rule**: 界面文案应当保持绝对的中立和客观。不含情感煽动色彩，用详实的数据与指标揭示状态。
* **Why**: 交易心理学的核心在于控制情绪。系统文案（尤其是回撤、亏损、风险警告）必须理性客观，如实反映客观财务状况。

### 2. 干练与技术化 (Technical & Crisp)
* **Rule**: 避免冗余和口语化修饰。直接使用标准的金融、交易及开发术语（例如：NAV, Drawdown, Order Book, Localhost, DB Entity, Timestamp）。
* **Why**: 针对 Yale 个人（交易者 + 开发者）量身定制，使用干练的专业术语能够极大提升阅读与反应效率。

### 3. 静默与聚焦 (Silent & Focused)
* **Rule**: 弱化非必要状态的强提示（如成功保存通知、普通同步完成通知）。将日常交互状态集成到极简状态栏中，保持“左侧编辑笔记，右侧看盘”的心流状态不受弹窗干扰。
* **Why**: 确保用户在使用 Logseq 时，注意力能够百分百聚焦在当前的交易理论学习或笔记内容上。

---

## Microcopy Reference Sheet

### 1. Form Fields & Buttons
* **Good**: `确认录入` (Confirm Entry), `重绘图表` (Redraw), `折算基准: CNY` (Currency: CNY)
* **Bad**: `把这笔交易存起来` (Save this trade), `点我刷新` (Refresh me)

### 2. Success & Loading Messages
* **Good**: `K 线就绪 (AKShare)` / `正在读取 Tushare 数据 (localhost:8765)...`
* **Bad**: `加载成功！快来看你的K线吧！` / `正在努力为您拼命读取数据中...`

### 3. Warnings & Errors
* **Good**: `未检测到 Tushare API Token。已自动回退到 AKShare 本地接口。`
* **Bad**: `哎呀，网络出了点小状况，数据获取失败了，快去检查一下你的配置吧。`

---

**Documented in:** `wds-project-outline.yaml` → `tone_of_voice`
