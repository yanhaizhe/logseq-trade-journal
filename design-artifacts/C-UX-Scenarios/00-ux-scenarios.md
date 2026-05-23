# UX Scenarios: logseq-trade-journal

> Scenario outlines connecting Trigger Map personas to concrete user journeys

**Created:** 2026-05-21
**Author:** Yale with Saga
**Method:** Whiteport Design Studio (WDS)

---

## Scenario Summary

| ID | Scenario | Persona | Pages | Priority | Status |
|----|----------|---------|-------|----------|--------|
| 01 | Yale's Frictionless Trade Review Flow (无摩擦复盘心流体验) | Yale the Yield-Seeker | 3 | ⭐ P1 | ✅ Outlined |
| 02 | Yale's Portfolio Performance Audit (投资组合绩效审计) | Yale the Yield-Seeker | 2 | ⭐ P1 | ✅ Outlined |
| 03 | Yale's Privacy-first Local Workspace Setup & Health Onboarding (隐私优先本地配置与自检) | Yale the Yield-Seeker | 2 | P2 | ✅ Outlined |

---

## Scenarios

### [01: Yale's Frictionless Trade Review Flow (Yale 的无摩擦复盘心流体验)](file:///Users/yanhaizhe/Documents/aionui-work/logseq-trade-journal/design-artifacts/C-UX-Scenarios/01-yales-frictionless-trade-review/01-yales-frictionless-trade-review.md)
- **Persona:** Yale the Yield-Seeker — 无摩擦的复盘心流体验 (时间戳毫秒跳转恢复 K 线状态，零截图依赖)
- **Pages:** 01.1-split-screen-kline-view, 01.2-trade-input-form, 01.3-split-screen-kline-view
- **User Value:** 5分钟内完成一笔交易记录及画线状态绑定，彻底摆脱截图摩擦。
- **Business Value:** 高效的复盘心流促成用户形成每日交易反思的纪律。

---

### [02: Yale's Portfolio Performance Audit (Yale 的投资组合绩效审计)](file:///Users/yanhaizhe/Documents/aionui-work/logseq-trade-journal/design-artifacts/C-UX-Scenarios/02-yales-portfolio-performance-audit/02-yales-portfolio-performance-audit.md)
- **Persona:** Yale the Yield-Seeker — 宏观投资组合与 NAV 透视；交易策略与行为错误归因
- **Pages:** 02.1-daily-performance-dashboard, 02.2-attribution-filter-view
- **User Value:** 合并折算多币种资产净值（NAV），并过滤错误标签（如 #FOMO）来审计交易绩效。
- **Business Value:** 帮助用户精确定位亏损源，纠正交易坏习惯，避免资产盲目损耗。

---

### [03: Yale's Privacy-first Local Workspace Setup & Health Onboarding (Yale 的隐私优先本地工作区设置与健康度引导)](file:///Users/yanhaizhe/Documents/aionui-work/logseq-trade-journal/design-artifacts/C-UX-Scenarios/03-yales-local-onboarding/03-yales-local-onboarding.md)
- **Persona:** Yale the Yield-Seeker — 本地环境自检与密钥配置
- **Pages:** 03.1-welcome-screen, 03.2-token-settings-form
- **User Value:** 直观查看本地 FastAPI 与数据源连接状态，便捷修改 .env 配置。
- **Business Value:** 确保 100% 数据隐私安全前提下，零门槛顺利起步，降低配置挫败感。

---

## Page Coverage Matrix

| Page | Scenario | Purpose in Flow |
|------|----------|----------------|
| **01.1-split-screen-kline-view** | 01 | 展现 Logseq 笔记与 dynamic K 线联动分屏工作区 |
| **01.2-trade-input-form** | 01 | 悬浮模态框录入交易标的、价格、仓位及归因标签 |
| **01.3-split-screen-kline-view** | 01 | K 线标记回显，支持图表划线一键绑定至 Logseq Block |
| **02.1-daily-performance-dashboard** | 02 | 看到跨市场多账户折算的 NAV 走势与红绿盈亏日历 |
| **02.2-attribution-filter-view** | 02 | 勾选特定归因标签实时联动统计该标签下的绩效 and 最大回撤 |
| **03.1-welcome-screen** | 03 | 本地 FastAPI 与数据接口服务的健康度自检状态面板 |
| **03.2-token-settings-form** | 03 | 本地存储的 Tushare Token 修改与连接校验表单 |

**Coverage:** 7/7 pages assigned to scenarios

---

## Next Phase

These scenario outlines feed into **Phase 4: UX Design** where each page gets:
- Detailed page specifications
- Wireframe sketches
- Component definitions
- Interaction details

---

_Generated with Whiteport Design Studio framework_
