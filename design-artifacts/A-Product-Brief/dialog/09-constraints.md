# Step 9: Constraints as Design Parameters

**Completed:** 2026-05-21
**Session:** 1

---

## Purpose

Document the boundaries and parameters that define the technical, architectural, and visual scope of the project. These constraints serve as design parameters, streamlining implementation and focusing effort on the core experience.

---

## Captured Parameters

### 1. Technical Parameters (技术约束)
* **K-Line Library (K线依赖)**:
  * **Design Parameter**: 必须且仅使用 `klinecharts` 和 `@klinecharts/pro` 作为 K 线图渲染核心。
  * **Rationale**: 延续现有代码中的图表底层，无需额外引入大体量的商业图表组件，完全符合现有的轻量化轻前端架构。
* **Open Source Data API (数据源API)**:
  * **Design Parameter**: 依赖项目自带的本地 Python FastAPI 数据服务，不接入商业收费 API。
  * **Rationale**: 利用 `akshare`, `tushare`, `yfinance`, `ccxt` 组合，保障在六大交易品种（A股、加密货币、美股、期货、港股、外汇）下的免费、稳定历史数据供应。

### 2. Architecture Parameters (架构约束)
* **Logseq DB Integration (数据库引擎接入)**:
  * **Design Parameter**: 基于 Logseq 的 **DB (Database-first) 版本 API** 进行块属性读写与双向跳跃。
  * **Rationale**: 摒弃传统的 Markdown 文本解析与文件读写，使用结构化 DB 读写来保证高精度（秒级/时间戳级）定位，避免解析脆弱性。
* **Local-First & Data Privacy (本地优先与隐私)**:
  * **Design Parameter**: 100% 本地运行，所有交易记录、笔记和投资组合数据仅保存在 Logseq 本地数据库和本地配置文件中。
  * **Rationale**: 规避云端 SaaS 的隐私泄露风险与高额订阅费，确保 Yale 的资产和交易隐私不外流。

### 3. Visual & Aesthetic Parameters (视觉与设计约束)
* **Styling Framework (样式控制)**:
  * **Design Parameter**: 仅使用 **Vanilla CSS** 进行手写组件样式与排版，严禁引入 Tailwind CSS 或通用前端 UI 框架（如 Ant Design、Material UI）。
  * **Rationale**: 精准控制高逼格的暗黑科技感、毛玻璃磨砂（Glassmorphism）和流线微动效，防止第三方框架造成样式污染与臃肿。
* **Color Palette & Theme (主题色系)**:
  * **Design Parameter**: 暗黑模式优先。以 HSL 空间精细调和的暗蓝灰色作为基础，使用柔和且高对比度的红/绿或青/粉作为买卖交易信号，确保夜间复盘专注度。

---

## Flexibility Analysis

* **What IS Flexible**:
  * 具体的买卖标记样式与交互动画微调。
  * 投资组合多币种折算时，历史汇率的获取方式（可选择实时汇率接口或手动配置基准汇率）。
  * FastAPI 数据服务与前端插件的通信接口协议细节（可在开发过程中按需调整）。
* **What IS Fixed (Non-negotiable)**:
  * Logseq DB 模式的原生数据结构化联动方式。
  * 核心 K 线库 `klinecharts` 的依赖关系。
  * 100% 数据隐私，本地私有化部署。

---

**Documented in:** `wds-project-outline.yaml` → `constraints`
