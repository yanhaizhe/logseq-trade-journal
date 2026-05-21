# TradingView 集成与 K线标注系统设计

> TradeCraft 交易工坊 — 图表工坊模块技术方案
> 版本 1.0

---

## 一、集成架构概览

图表工坊在 TradingView Advanced Chart Widget 之上构建了增强层，实现标注的持久化、双向同步和与 Logseq 知识库的深度关联。

```
                        ┌──────────────────────────┐
                        │     Logseq Graph          │
                        │   (block properties)      │
                        └────────────┬─────────────┘
                                     │ 读写标注数据
                        ┌────────────▼─────────────┐
                        │  标注同步引擎 (自研)        │
                        │  AnnotationSyncEngine     │
                        │                           │
                        │  • 监听 TV 绘图事件        │
                        │  • 序列化/反序列化标注      │
                        │  • 读写 Logseq blocks      │
                        │  • 冲突解决                │
                        └────────────┬─────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
    ┌─────────▼────────┐  ┌─────────▼────────┐  ┌─────────▼────────┐
    │  TradingView     │  │  增强工具栏       │  │  标注列表面板     │
    │  Widget (iframe) │  │  (自定义操作)     │  │  (侧边/底部)      │
    │                  │  │                  │  │                  │
    │  • 内置绘图工具   │  │  • 一键保存       │  │  • 标注列表       │
    │  • 所有指标       │  │  • 关联笔记       │  │  • 筛选/排序      │
    │  • 多周期        │  │  • 创建交易信号    │  │  • 显示/隐藏      │
    │  • 多布局        │  │  • 截图导出       │  │  • 批量管理       │
    └──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 二、TradingView Widget 嵌入方案

### 2.1 选择 Advanced Chart Widget

使用 TradingView 官方 [Advanced Chart Widget](https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/)，原因：

| 对比维度 | Advanced Chart Widget | Lightweight Charts | 自绘 Canvas |
|---------|----------------------|-------------------|------------|
| 内置绘图工具 | ✅ 全量 (趋势线/斐波那契/形态等 50+) | ❌ 需自建 | ❌ 需自建 |
| 技术指标 | ✅ 100+ 内置 | ❌ 需自建 | ❌ 需自建 |
| 多周期切换 | ✅ 原生支持 | ❌ | ❌ |
| 数据源 | ✅ 内置/自定义均可 | ✅ | ✅ |
| 学习成本 | 低 (已熟悉) | 中 | 高 |
| 标注同步难度 | 中 (通过 widget API) | 高 (全自建) | 高 (全自建) |

### 2.2 Widget 初始化

```javascript
// 在 Logseq plugin 的 iframe 中加载
const widget = new TradingView.widget({
  container_id: 'tv-chart-container',
  library_path: '/charting_library/',
  locale: 'zh',
  disabled_features: [
    'header_widget',           // 隐藏默认顶栏 (用自定义工具栏替代)
    'header_symbol_search',    // 隐藏品种搜索 (在自定义工具栏中)
    'header_compare',          // 隐藏对比功能
    'header_saveload',         // 隐藏默认保存/加载 (用标注同步引擎替代)
    'use_localstorage_for_settings', // 禁用本地存储 (配置在 Logseq)
  ],
  enabled_features: [
    'study_templates',
    'hide_left_toolbar_by_default',
  ],
  custom_css_url: '/tradecraft-tv-theme.css',
  loading_screen: { backgroundColor: '#0d1117' },
  overrides: {
    'paneProperties.background': '#0d1117',
    'paneProperties.backgroundType': 'solid',
    'paneProperties.vertGridProperties.color': '#21262d',
    'paneProperties.horzGridProperties.color': '#21262d',
    'paneProperties.crossHairProperties.color': '#8b949e',
    'scalesProperties.textColor': '#8b949e',
    'scalesProperties.lineColor': '#30363d',
  },
  studies_overrides: {
    'volume.volume.color.0': 'rgba(248,81,73,0.5)',
    'volume.volume.color.1': 'rgba(63,185,80,0.5)',
  },
});
```

### 2.3 与 Widget 的通信

Widget 加载在 iframe 中，通过 `postMessage` 与父页面通信：

```
父页面 (图表工坊 React App)
    ↕ postMessage
TradingView iframe
    ↕ Widget API
TradingView Chart
```

```javascript
// 父页面 → Widget: 加载数据/标注
iframe.contentWindow.postMessage({
  type: 'load_data',
  symbol: 'BTCUSDT',
  interval: '4h',
  annotations: [...]
}, '*');

// Widget → 父页面: 绘图事件
window.addEventListener('message', (event) => {
  if (event.data.type === 'drawing_created') {
    annotationSync.onAnnotationCreated(event.data.drawing);
  }
  if (event.data.type === 'drawing_modified') {
    annotationSync.onAnnotationModified(event.data.drawing);
  }
  if (event.data.type === 'drawing_deleted') {
    annotationSync.onAnnotationDeleted(event.data.drawingId);
  }
});
```

### 2.4 数据源策略

TradingView Widget 默认需要数据 feed。两种方案：

**方案 A: 使用 TradingView 内置数据 (推荐)**
- 适用于加密货币、外汇等 TradingView 覆盖的品种
- 无需自建数据服务
- 在 widget 配置中设置 `datafeed: new Datafeeds.UDFCompatibleDatafeed('https://demo-feed-url')`

**方案 B: 自定义数据源**
- 适用于 A 股等特殊品种
- 通过本地 CSV 导入或自建 API
- 实现 TradingView 的 [UDF (Universal Data Feed) 协议](https://www.tradingview.com/charting-library-docs/latest/connecting_data/UDF)

```javascript
// 自定义 UDF datafeed
const customDatafeed = {
  onReady: (callback) => {
    callback({ supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W'] });
  },
  resolveSymbol: (symbolName, onResolve, onError) => {
    // 从本地缓存或 API 获取品种信息
    const symbolInfo = getSymbolInfo(symbolName);
    onResolve(symbolInfo);
  },
  getBars: (symbolInfo, resolution, from, to, onHistoryCallback, onError) => {
    // 从本地 CSV 缓存或 API 获取 K线数据
    const bars = getBarsFromCache(symbolInfo.name, resolution, from, to);
    if (bars.length) onHistoryCallback(bars, { noData: false });
    else onHistoryCallback([], { noData: true });
  },
};
```

---

## 三、标注系统设计

### 3.1 标注类型分层

TradingView Widget 提供丰富的绘图工具，TradeCraft 在此基础上定义了标注的分层语义：

```
层级 1: TradingView 原生绘图工具 (完全保留，不可修改)
  ├── 趋势线 / 水平线 / 射线 / 线段
  ├── 矩形 / 平行通道 / 三角形
  ├── 斐波那契回撤 / 扩展 / 时间区间
  ├── 文字标签 / 箭头 / 图标
  ├── 所有形态工具 (头肩/双底/三角/旗形...)
  └── 测量工具 (价格区间/时间区间/角度)

层级 2: TradeCraft 标注增强 (附加在原生绘图上的元数据)
  ├── 标注类型标签 (支撑/阻力/入场/止损/目标/信号)
  ├── 文字笔记 (富文本 Markdown)
  ├── Logseq 关联 (知识条目/交易记录/策略文档)
  ├── 标签系统 (关键位/形态/信号/待验证)
  └── 可见性控制 (显示/隐藏/条件显示)
```

### 3.2 标注数据结构

每个标注 = TradingView 原生绘图对象 + TradeCraft 元数据：

```typescript
interface TradeCraftAnnotation {
  // ── 核心标识 ──
  id: string;                    // 唯一 ID (ann_xxx)
  tvDrawingId: string;           // TradingView 原生绘图的内部 ID
  
  // ── 类型信息 ──
  type: AnnotationType;          // trendline | horizontal | rect | fib | text | arrow | pattern
  category: AnnotationCategory;  // support | resistance | entry | stop | target | signal | zone | note
  
  // ── 几何数据 (从 TradingView 获取) ──
  points: ChartPoint[];          // 标注的关键点 [{time, price}, ...]
  options: DrawingOptions;       // 颜色/线型/粗细等
  
  // ── 元数据 (TradeCraft 附加) ──
  notes: string;                 // Markdown 笔记内容
  tags: string[];                // 标签 ['关键支撑', '多头防线']
  logseqLinks: LogseqLink[];     // 关联的 Logseq 页面 [[...]]
  source: string;                // 来源：学习笔记 / 交易记录 / 图表工坊
  
  // ── 状态 ──
  createdAt: string;             // ISO 时间
  updatedAt: string;             
  visible: boolean;              // 是否在图表上显示
}
```

### 3.3 标注在 Logseq 中的表达

每个标注在 Logseq 中映射为一个 block，properties 存储结构化数据：

```
📐 下降趋势线 (2026-03-15 → 2026-05-20)
  ann-id:: ann_tl_001
  ann-tv-id:: tv_drawing_5f3a2b
  ann-type:: [[trendline]]
  ann-category:: [[支撑]]
  ann-points:: [[{"time":1710460800,"price":280},{"time":1716249600,"price":240}]]
  ann-color:: #ef4444
  ann-style:: dashed
  ann-notes:: 已突破，回踩确认支撑有效。若后续有效跌破 240，下跌趋势延续。
  ann-tags:: [[关键趋势线]], [[待观察]]
  ann-source:: [[T/2026-05-21/TSLA-01]]
  ann-created:: 2026-05-21T10:00:00Z
  ann-visible:: true
```

**为什么选择 block properties 而非独立的 JSON 文件？**

| 对比维度 | block properties | 独立 JSON 文件 |
|---------|-----------------|---------------|
| 与笔记共存 | ✅ 标注嵌入笔记上下文 | ❌ 分离存储 |
| 双向链接 | ✅ 直接使用 `[[]]` | ❌ 需自建 |
| 全文搜索 | ✅ Logseq 原生搜索 | ❌ |
| 图谱视图 | ✅ 自动关联 | ❌ |
| 编辑体验 | ✅ 在 Logseq 中直接编辑 notes | 需切换工具 |
| 同步复杂度 | 中 (需处理 Datascript DB) | 低 |
| 大数据量性能 | 标注点 JSON 较大时影响 DB | ✅ 无影响 |

选择 block properties 的折中方案：标注的元数据（类型/标签/笔记/关联）存在 properties，大量几何点数据压缩后存储，极端情况下(>100个标注点)溢出到附件文件但保持引用。

### 3.4 双向同步机制

```
                    ┌─────────────────────────┐
                    │   Logseq Datascript DB   │
                    │   (block properties)      │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
    ┌─────────▼──────┐  ┌──────▼───────┐  ┌──────▼───────┐
    │ 标注变更事件    │  │ 块变更事件    │  │ 冲突检测器    │
    │ (来自TV)       │  │ (来自Logseq)  │  │              │
    └─────────┬──────┘  └──────┬───────┘  └──────┬───────┘
              │                │                  │
              └────────┬───────┘                  │
                       │                          │
              ┌────────▼──────────────────────────▼──┐
              │        AnnotationSyncEngine          │
              │                                      │
              │  def onTVDrawingChanged(drawing):    │
              │    ann = serialize(drawing)           │
              │    block = find_or_create_block(ann)  │
              │    if not conflict(block, ann):       │
              │      update_block_properties(block, ann)│
              │                                      │
              │  def onLogseqBlockChanged(block):     │
              │    if not block.has_ann_properties:   │
              │      return                           │
              │    ann = deserialize(block)           │
              │    if ann.visible:                    │
              │      tv.update_or_create_drawing(ann) │
              │    else:                              │
              │      tv.remove_drawing(ann.tv_id)     │
              └──────────────────────────────────────┘
```

**冲突解决策略：**

1. **版本时间戳** — 每个标注维护 `updatedAt`，比较 TV 侧和 Logseq 侧的更新时间，后者胜出
2. **去抖** — TV 绘图拖拽过程中产生大量事件，500ms 去抖后才写入 Logseq
3. **循环检测** — 标注从 TV → Logseq → DB 事件 → 回调 TV 时，通过 `tvDrawingId` 匹配跳过更新（已经是目标状态）
4. **删除保护** — 在 Logseq 中删除标注 block 时，弹窗确认是否同时从图表移除

---

## 四、标注交互设计

### 4.1 创建标注

```
用户在图表工坊的 K线图上绘图:

方式 1: 使用 TradingView 左侧原生绘图工具栏
  → 选择工具 (趋势线/矩形/斐波那契...)
  → 在图表上拖拽绘制
  → TV 触发 drawing_created 事件
  → 标注同步引擎捕获 → 弹出元数据编辑浮窗:

  ┌─────────────────────────────────────────┐
  │  📐 新建标注                             │
  │                                         │
  │  类型: 趋势线 (自动识别)                   │
  │  分类: [支撑 ▼] [阻力] [入场] [止损]...    │
  │                                         │
  │  标签:                                   │
  │  [关键趋势线 ✕] [添加标签...]              │
  │                                         │
  │  笔记:                                   │
  │  ┌─────────────────────────────────────┐ │
  │  │ 下降趋势线，当前价格已在线上方运行3天   │ │
  │  │ 若回踩确认支撑有效可考虑做多           │ │
  │  └─────────────────────────────────────┘ │
  │                                         │
  │  关联: [未关联 ▼]                         │
  │                                         │
  │         [取消]  [仅保存标注]  [💾 保存并关联笔记] │
  └─────────────────────────────────────────┘

方式 2: 使用自定义工具栏按钮 (快捷标注)
  → 点击 [📍入场点] → 光标变为十字 → 点击图表 → 
    自动创建 'entry' 类型标注，默认关联当前活动交易

方式 3: 从 Logseq block 生成标注
  → 用户在某条笔记中写 "@chart[TSLA,1h] 支撑位 242"
  → 当图表工坊打开 TSLA 1h 图时 → 自动渲染该标注
```

### 4.2 查看/编辑标注

```
在图表上:
  → 鼠标悬停标注 → 显示 tooltip (类型 + 笔记摘要)
  → 双击标注 → 打开编辑浮窗 (同上)
  → 右键标注 → 菜单: [编辑] [关联笔记] [截图分享] [删除]

在标注列表面板中:
  → 每条标注显示: 类型图标 + 价格/时间 + 笔记首行
  → 点击标注 → 图表自动定位到该标注 + 高亮
  → 点击 ✎ → 编辑元数据
  → 点击 👁 → 切换显示/隐藏
  → 点击 🔗 → 跳转到关联的 Logseq 页面
```

### 4.3 标注的图表定位

当用户从 Logseq 点击标注链接时，图表工坊需要自动定位:

```javascript
// 收到定位请求
function focusAnnotation(annotationId) {
  // 1. 确保已切换到正确的品种/周期
  const ann = getAnnotation(annotationId);
  if (currentSymbol !== ann.symbol || currentInterval !== ann.interval) {
    switchSymbol(ann.symbol, ann.interval);
  }
  
  // 2. 滚动图表使标注可见
  const timeRange = getAnnotationTimeRange(ann);
  widget.chart().setVisibleRange({
    from: timeRange.start - 86400 * 7,  // 多显示一周
    to: timeRange.end + 86400 * 7,
  });
  
  // 3. 高亮标注 (闪烁效果)
  highlightDrawing(ann.tvDrawingId, 2000);
}
```

---

## 五、多图联动

### 5.1 布局模式

图表工坊支持四种布局，通过网格 CSS 实现：

```
单图模式:      双图对比:        三图(多周期):    四图网格:
┌──────────┐  ┌────┬────┐     ┌────┬────┐    ┌────┬────┐
│          │  │    │    │     │ 日线 │ 4H │    │    │    │
│  主图    │  │ A  │ B  │     ├────┼────┤    ├────┼────┤
│          │  │    │    │     │ 1H  │    │    │    │    │
└──────────┘  └────┴────┘     └────┴────┘    └────┴────┘
```

每个格子嵌入一个独立的 TradingView Widget (多个 iframe)。

### 5.2 跨图同步

当用户在一个图上创建标注时，可选同步到其他图：

```
跨图同步策略:
  ├── 同一品种、不同周期 → 自动投影 (时间对齐，价格不变)
  │   例: 在日线画 242 支撑线 → 4H 和 1H 图上自动显示同价位水平线
  │
  ├── 不同品种 → 不自动同步 (用户手动关联)
  │   例: BTC 和 ETH 走势对比，标注不自动同步
  │
  └── 关联品种 → 提示用户是否同步
      例: TSLA 标注了一条趋势线 → 提示"是否在 NVDA 图上同步此标注？"
```

实现：
```javascript
// 跨图标注投影
function projectAnnotation(annotation, sourceChart, targetChart) {
  if (annotation.type === 'horizontal') {
    // 水平线: 同价格直接复制
    targetChart.createDrawing({
      type: 'horizontal',
      price: annotation.points[0].price,
      options: { ...annotation.options, color: annotation.options.color + '80' }, // 半透明
    });
  }
  if (annotation.type === 'trendline') {
    // 趋势线: 保持相同的时间范围，价格不变
    targetChart.createDrawing({
      type: 'trendline',
      points: annotation.points,
      options: { ...annotation.options, color: annotation.options.color + '80' },
    });
  }
  // ... 其他类型
}
```

---

## 六、标注模板系统

### 6.1 预置模板

| 模板名称 | 用途 | 预设内容 |
|---------|------|---------|
| 学习案例-头肩顶 | 形态学习 | 自动加载典型头肩顶案例数据 + 预标注左右肩/头/颈线 |
| 学习案例-双底 | 形态学习 | 自动加载 W 底案例 + 预标注两底 + 颈线 |
| 交易入场分析 | 开仓决策 | 加载当前活跃品种 + 提示标注入场/止损/目标 |
| 交易复盘 | 回顾交易 | 加载交易时段数据 + 自动标记开平仓位置 |
| 策略信号标注 | 策略研究 | 加载回测数据 + 标注所有交易信号 |
| 多周期分析 | 综合分析 | 自动打开日线/4H/1H 三图，联动同一品种 |

### 6.2 自定义模板

用户可将当前图表的完整状态（品种、周期、指标、标注、布局）保存为模板：

```javascript
function saveAsTemplate(name) {
  const template = {
    name,
    symbol: currentSymbol,
    interval: currentInterval,
    studies: widget.getAllStudies(),        // 所有指标
    drawings: getAllAnnotations(),          // 所有标注
    layout: currentLayout,                  // 布局模式
    visibleRange: widget.chart().getVisibleRange(),
  };
  // 保存到 Logseq [[设置/图表模板/name]]
  saveToLogseqPage('设置/图表模板/' + name, template);
}
```

---

##七、与交易台的联动

### 7.1 标注 → 交易信号

在图表上完成分析标注后，点击「创建交易信号」：

```
标注: 入场 @ 242.50, 止损 @ 238.00, 目标 @ 255.00
  → 提取关键数值
  → 跳转到交易台「开仓」面板
  → 自动填入:
      - 开仓价: 242.50
      - 止损价: 238.00
      - 止盈价: 255.00
      - 关联标注: ann_entry_003
      - 预填备注: "基于图表工坊分析，详见标注 ann_entry_003"
```

### 7.2 交易记录 → 图表标注

开仓/平仓操作后，自动在关联的图表上创建标记：

```
用户开仓 TSLA @ 248.50 → 
  自动在图表工坊 TSLA 图(所有周期)上:
    → 创建入场标记(绿色箭头) @ 248.50
    → 创建止损线(红色虚线) @ 242.00
    → 创建目标线(绿色虚线) @ 260.00
    → 自动保存为 Logseq annotations
```

---

## 八、性能考量

| 场景 | 策略 |
|------|------|
| 大量标注 (> 50 个) | 视口外标注不渲染 DOM，仅保留数据 |
| 频繁标注拖拽 | 500ms 去抖，仅在拖拽结束时写入 Logseq |
| 多图同时打开 (4 个 iframe) | 非活跃图表降低刷新频率至 1fps |
| 大时间范围 K线加载 | 分页加载，首屏加载最近 200 根，滚动时加载更多 |
| 标注 JSON 过大 | 压缩存储，单个 block property > 10KB 时溢出到附件 |
| Logseq DB 写入频率 | 批量写入，积累 3 次变更或 2 秒后一次性 commit |

---

## 九、技术依赖

| 组件 | 技术 | 备注 |
|------|------|------|
| K线图表 | TradingView Advanced Chart Widget | 需要 TradingView 授权 (免费版有限制) |
| 替代方案 | KLineChart v9 | 如无法获取 TV 授权，降级为 KLineChart + 自建标注层 |
| 标注渲染 | TradingView 原生绘图 API | 通过 postMessage 与 iframe 通信 |
| 标注存储 | Logseq block properties | JSON 序列化 |
| 数据源 | 方案A: TV 内置 / 方案B: 自定义 UDF | 优先 TV 内置 |
| 数据缓存 | LocalStorage (Widget 侧) + Logseq 文件系统 | 离线可用 |
