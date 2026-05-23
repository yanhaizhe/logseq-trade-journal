# Step 10A: Platform & Device Strategy

**Completed:** 2026-05-21
**Session:** 1

---

## Purpose

Define the target platform, supported devices, interaction models, and offline capabilities to align the user experience with the desktop environment of Logseq.

---

## Strategy Details

### 1. Primary Platform (主要平台)
* **Logseq Desktop Plugin (Logseq 桌面客户端插件)**:
  * 运行在 Logseq 的桌面环境（基于 Electron 壳）。
  * 前端以 React 单页应用形式嵌入，通过 iframe 或 Logseq iframe-ui 渲染。
  * 后端数据服务运行于本地的 Python FastAPI (uvicorn)。

### 2. Supported Devices & Priority (设备支持与优先级)
* **Desktop Only (仅桌面端)**:
  * **Supported OS**: macOS, Windows, Linux (与 Logseq 桌面版保持一致)。
  * **Device Priority**: **Desktop-first / Desktop-only (桌面唯一优先)**。
  * **Rationale**: 技术分析复盘（尤其是 TradingView 级别的 K 线精细画线、拖动、多指标同屏）以及高效率的 Logseq 理论笔记记录，对屏幕尺寸和操作精度要求极高，手机端或平板端无法提供同等心流体验。目前不考虑移动端适配。

### 3. Interaction Models (交互模型)
* **Mouse & Keyboard (鼠标与键盘精密操作)**:
  * **图表操作**: 点击缩放 K 线、鼠标滚轮平移视图、拖拽绘制技术指标线（趋势线、斐波那契回调线等）。
  * **跳转机制**: 
    * 双击 K 线特定 Bar 自动聚焦左侧 Logseq 编辑器，并创建/定位到对应时间戳的 Block。
    * 点击左侧 Logseq Block，右侧图表毫秒级响应并平滑滑动定位。
  * **快捷键**: 键盘快捷键（如 Space 键暂停/运行、Command/Ctrl+Z 撤销图表画线）。

### 4. Technical Requirements (技术要求与本地特性)
* **100% Offline Capable (纯离线运行)**:
  * 插件所有逻辑与本地数据服务皆运行在 localhost 环回网络中，无需公网访问（下载历史 K 线除外）。
* **Native Device Features (原生设备特性)**:
  * **本地文件系统存取**: 读取和写入 Logseq 的本地 DB 数据库，以及读取本地 `.env` 配置文件（如 Tushare 秘钥）。
  * **本地 TCP 端口通信**: 前端插件（Vite）通过 Local HTTP Request 与本地 Python FastAPI 服务（端口 8765）进行数据交换。

---

## Rationale & Design Implications

* **Why this makes sense**:
  * Logseq DB 版本作为面向知识管理的新一代引擎，在桌面端能够发挥最大功效。
  * 纯桌面端交互允许我们设计高信息密度的双栏布局（左笔记、右图表，辅以交易录入/资产统计浮窗），为交易者提供“全景复盘工作台”的沉浸感。
  * 离线架构免去了处理复杂的云同步冲突、网络抖动造成的延迟，确保 <150ms 联动目标的达成。

---

**Documented in:** `wds-project-outline.yaml` → `platform_strategy`
