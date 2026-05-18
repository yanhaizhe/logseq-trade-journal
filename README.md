# 📈 Logseq Trade Journal

> 基于 Logseq DB 版 + KLineChart 的 **K线形态学习** 与 **每日交易记录与复盘** 笔记插件

## 功能

| 模块 | 命令 | 说明 |
|------|------|------|
| 📊 K线图 | `/kline` | 插入交互式K线图，支持多周期 + 技术指标 |
| 📝 交易记录 | `/trade` | 结构化交易录入，自动计算盈亏 |
| 🔍 日复盘 | `/review` | 生成日复盘模板，含统计与逐笔回顾 |
| 🕯️ 形态库 | `/pattern` | K线形态速查（Phase 2） |

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 运行测试
npm test

# 构建
npm run build
```

构建产物在 `dist/` 目录，加载到 Logseq 插件目录即可使用。

## 项目结构

```
src/
├── main.tsx              # 插件入口，注册命令
├── App.tsx               # 顶层组件（路由分发）
├── store.ts              # Zustand 状态管理
├── app.css               # 全局样式
├── core/                 # 核心服务层
│   ├── LogseqDBService.ts    # Logseq DB CRUD
│   ├── TradeManager.ts       # 交易业务逻辑
│   ├── StatisticsEngine.ts   # 统计计算
│   └── DataService.ts        # K线数据获取
├── components/           # UI 组件
│   ├── KlineChart/       # KLineChart 封装
│   ├── TradeForm/        # 交易录入表单
│   └── Review/           # 复盘视图
├── types/                # TypeScript 类型
└── utils/                # 工具函数
```

## Phase 1 MVP 交付物

- [x] 项目脚手架（Vite + React + TypeScript）
- [x] KLineChart 封装（多周期、指标、CSV导入）
- [x] 交易录入表单（自动盈亏计算）
- [x] 日复盘视图（统计卡片 + 逐笔回顾）
- [x] Logseq DB 数据存取封装
- [x] 统计引擎（胜率、盈亏比、资金曲线）
- [x] 完整单元测试（17 tests passing）

## Phase 2 规划

- [ ] 50+ K线形态定义库
- [ ] 形态识别引擎
- [ ] `/pattern` 形态卡片
- [ ] 形态-交易自动关联
- [ ] 形态测验（游戏化学习）

## 技术栈

- **React 18** + **TypeScript 5**
- **KLineChart 9** - K线图表渲染
- **Zustand** - 状态管理
- **Day.js** - 日期处理
- **PapaParse** - CSV 解析
- **Vite 5** - 构建工具
- **Vitest** - 测试框架
