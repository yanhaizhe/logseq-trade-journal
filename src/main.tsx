/**
 * Logseq Trade Journal 插件入口
 * 使用 @logseq/libs SDK 注册工具栏按钮、Slash Command 和主面板
 */

import '@logseq/libs';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LogseqDBService } from './core/LogseqDBService';
import { TradeManager } from './core/TradeManager';
import { DataService } from './core/DataService';
import { todayStr } from './utils/format';
import './app.css';

const PLUGIN_ID = '_yanhaizhe-trade-journal';
const dataService = new DataService();

// 全局服务实例（在 App.tsx 中使用）
let tradeManager: TradeManager;

// ===== CSS 样式注入 =====
const css = (strings: TemplateStringsArray, ...values: unknown[]) =>
  String.raw({ raw: strings }, ...values);

// ===== 主入口 =====
function main() {
  console.info(`[${PLUGIN_ID}] initializing...`);

  // 注入工具栏图标样式
  logseq.provideStyle(css`
    .${PLUGIN_ID}-toolbar-icon {
      font-size: 20px;
      margin-top: 4px;
      margin-left: 8px;
      margin-right: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
    }
    .${PLUGIN_ID}-toolbar-icon:hover {
      opacity: 0.8;
    }
    #${PLUGIN_ID}_iframe {
      pointer-events: auto;
    }
  `);

  // 注册 Model（用于主 UI 显示/隐藏）
  logseq.provideModel({
    show() {
      logseq.showMainUI();
    },
  });

  logseq.setMainUIInlineStyle({
    zIndex: 9999,
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  });

  // 注册工具栏按钮
  logseq.App.registerUIItem('toolbar', {
    key: `${PLUGIN_ID}-toolbar`,
    template: `
      <a data-on-click="show" title="Trade Journal - K线学习与交易复盘">
        <div class="${PLUGIN_ID}-toolbar-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" style="width:20px;height:20px">
            <rect x="5" y="10" width="10" height="60" rx="2" fill="#ef4444"/>
            <rect x="20" y="25" width="10" height="45" rx="2" fill="#22c55e"/>
            <rect x="35" y="15" width="10" height="55" rx="2" fill="#22c55e"/>
            <rect x="50" y="5" width="10" height="65" rx="2" fill="#ef4444"/>
            <rect x="65" y="20" width="10" height="50" rx="2" fill="#22c55e"/>
            <rect x="80" y="30" width="10" height="40" rx="2" fill="#ef4444"/>
            <line x1="10" y1="10" x2="10" y2="80" stroke="#ef4444" stroke-width="2"/>
            <line x1="25" y1="25" x2="25" y2="80" stroke="#22c55e" stroke-width="2"/>
            <line x1="40" y1="15" x2="40" y2="80" stroke="#22c55e" stroke-width="2"/>
            <line x1="55" y1="5" x2="55" y2="80" stroke="#ef4444" stroke-width="2"/>
            <line x1="70" y1="20" x2="70" y2="80" stroke="#22c55e" stroke-width="2"/>
            <line x1="85" y1="30" x2="85" y2="80" stroke="#ef4444" stroke-width="2"/>
          </svg>
        </div>
      </a>
    `,
  });

  // 注册 Slash Commands
  registerSlashCommands();

  // 初始化数据库服务
  const dbService = new LogseqDBService();
  tradeManager = new TradeManager(dbService);


  // 暴露 tradeManager 给 App 组件
  if (typeof window !== 'undefined') {
    (window as any).__tradeManager = tradeManager;
  }

  // 渲染主 UI（App 组件）
  renderApp();

  logseq.on('ui:visible:changed', ({ visible }) => {
    postToApp({ type: 'visibility-changed', visible });
  });

  // 启动时默认保持隐藏，由用户点击工具栏或快捷命令触发显示
  // logseq.showMainUI();
  console.info(`[${PLUGIN_ID}] initialized`);
}

// ===== Slash Commands =====
function registerSlashCommands() {
  // /K线图 - 打开 K线图面板
  logseq.Editor.registerSlashCommand('K线图', async (_e) => {
    logseq.showMainUI();
    postToApp({ type: 'switch-mode', mode: 'kline' });
  });

  // /记交易 - 打开交易记录面板
  logseq.Editor.registerSlashCommand('记交易', async (_e) => {
    logseq.showMainUI();
    postToApp({ type: 'switch-mode', mode: 'trade' });
  });

  // /日复盘 - 日复盘
  logseq.Editor.registerSlashCommand('日复盘', async (_e) => {
    const date = todayStr();

    try {
      if (tradeManager) {
        await tradeManager.doDailyReview(date);
        logseq.UI.showMsg('已生成日复盘模板 ✅', 'success');
      }
    } catch (err) {
      logseq.UI.showMsg(`复盘生成失败: ${(err as Error).message}`, 'error');
    }
  });
}

// ===== 渲染 React App =====
function renderApp() {
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    console.error('[TradeJournal] #root element not found');
    return;
  }

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

// ===== 通信辅助 =====
function postToApp(msg: Record<string, unknown>) {
  window.postMessage(msg, '*');
}

// ===== 监听来自 App 的消息 =====
window.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg?.type) return;

  switch (msg.type) {
    case 'trade-saved':
      logseq.UI.showMsg('交易记录已保存 ✅', 'success');
      break;
    case 'logseq-ready':
      // Logseq 宿主就绪
      break;
  }
});

// ===== 启动 =====
logseq.ready(main).catch(console.error);
