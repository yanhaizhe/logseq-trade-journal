---
design_intent: Scenario 03
design_status: specified
---
# 03: Yale's Privacy-first Local Workspace Setup & Health Onboarding (Yale 的隐私优先本地工作区设置与健康度引导)

**Project:** logseq-trade-journal
**Created:** 2026-05-21
**Method:** Whiteport Design Studio (WDS)

---

## Transaction (Q1)

**What this scenario covers:**
欢迎与本地自检状态引导，配置 `.env` 中的 Tushare Token 或其他数据源 API 密钥，确保环境就绪。

---

## Business Goal (Q2)

**Goal:** 🌟 TERTIARY GOALS: 100% 本地数据绝对隐私安全
**Objective:** 100% 数据拦截（无外部网络流动），100% 离线完美运行。

---

## User & Situation (Q3)

**Persona:** Yale the Yield-Seeker (Primary ⭐)
**Situation:** 第一次加载插件，或者本地服务环境发生改变（如 Token 失效、端口冲突）时。Yale 需要在 Logseq 中查看系统自检状态，确保 FastAPI 进程已经正常拉起，且所需要的数据接口密钥全部验证通过，从而保障后续无缝的使用体验。

---

## Driving Forces (Q4)

**Hope:** 能通过极简、直观的欢迎仪表盘，一次性看到所有本地服务与数据源的状态（FastAPI, Tushare, Akshare 等），并引导快捷完成密钥配置。

**Worry:** 密钥配置错误、本地服务断开却没有任何提示，导致后续记录笔记时 K 线图加载失败，打断复盘心流。

> CONSTRAINT: One sentence per component. Phrases, not paragraphs.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Desktop
**Entry:** 首次安装启用插件，或者在状态栏点击错误/未连接图标跳转。

---

## Best Outcome (Q7)

**User Success:**
一眼识别所有依赖项状态（全绿），并在 1 分钟内完成 Token 修改与重连，顺利进入复盘工作区。

**Business Success:**
降低由于本地环境配置问题造成的首次使用挫败感，零配置障碍。

---

## Shortest Path (Q8)

1. **Welcome Screen (欢迎与自检状态页)** — Yale 看到各项本地依赖服务的健康检测（FastAPI、数据源 Token 状态），若有缺失则显示提示。
2. **Token Settings Form (密钥配置面板)** — Yale 点击“配置”按钮，在暗黑磨砂面板中输入/更新 Tushare Token 并保存至本地 `.env`。
3. **Welcome Screen (欢迎与自检状态页)** — 插件自动重新触发自检，服务全部转为正常绿色，Yale 点击“进入工作区”按钮进入交易复盘页 ✓

---

## Trigger Map Connections

**Persona:** Yale the Yield-Seeker (Primary ⭐)

**Driving Forces Addressed:**
- ✅ **Want:** 无摩擦的复盘心流体验 (本地环境自检与自动状态回显)
- ❌ **Fear:** 敏感财务与策略数据泄露 (本地运行，.env 文件本地存储)

**Business Goal:** 🌟 TERTIARY GOALS: 100% 本地数据绝对隐私安全

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| 03.1 | `03.1-welcome-screen/` | 展现本地依赖服务的健康检测（FastAPI、数据源 Token 状态）。 | 点击“配置”按钮，弹出密钥配置面板。 |
| 03.2 | `03.2-token-settings-form/` | 输入/更新 Tushare Token 并保存至本地 `.env`。 | 点击“保存并测试”，保存并重返欢迎状态页触发二次自检。 |
| 03.3 | `03.1-welcome-screen/` | 确认状态全绿，引导点击“进入工作区”进入复盘页面。 | 点击“进入工作区”，加载 01.1 复盘页。 ✓ |
