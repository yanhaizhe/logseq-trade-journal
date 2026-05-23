import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { HealthData } from '@/types/health'
import {
  deriveHealthLabels,
  deriveEnterLocked,
  deriveOfflineBypass,
} from '@/utils/healthCheckLabels'
import { getDiagnostic } from '@/utils/healthDiagnostics'
import type { DiagnosticInfo } from '@/utils/healthDiagnostics'

interface WelcomeScreenProps {
  onEnterWorkspace: (offlineMode: boolean) => void;
  onOpenSettings: () => void;
}

interface DiagCopyState {
  text: string;
  icon: 'idle' | 'copied' | 'failed';
}

const DiagnosticPopover: React.FC<{
  diagnostic: DiagnosticInfo;
  copyState: DiagCopyState;
  onCopy: (text: string) => void;
}> = ({ diagnostic, copyState, onCopy }) => {
  return (
    <div className="welcome-diagnostic-popover">
      <div className="welcome-diag-header">诊断信息</div>
      <div className="welcome-diag-section">
        <span className="welcome-diag-label">错误码</span>
        <span className="welcome-diag-error-code">{diagnostic.errorCode}</span>
      </div>
      <div className="welcome-diag-section">
        <span className="welcome-diag-label">排查命令</span>
        <div className="welcome-diag-command" onClick={() => onCopy(diagnostic.command)}>
          <span className="welcome-diag-prompt">$</span>
          <code className="welcome-diag-cmd-text">{diagnostic.command}</code>
          <span className={`welcome-diag-copy-btn${copyState.icon === 'copied' ? ' welcome-diag-copy-btn--copied' : copyState.icon === 'failed' ? ' welcome-diag-copy-btn--failed' : ''}`}>
            {copyState.icon === 'copied' ? '指令已复制' : copyState.icon === 'failed' ? '失败' : '复制'}
          </span>
        </div>
      </div>
      <div className="welcome-diag-hint">{diagnostic.hint}</div>
    </div>
  );
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onEnterWorkspace,
  onOpenSettings,
}) => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<null | string>(null);
  const [diagCopy, setDiagCopy] = useState<DiagCopyState>({ text: '', icon: 'idle' });
  const mountedRef = useRef(true);
  const checkingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const diagCopyTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleDiagEnter = () => {
    clearTimeout(leaveTimerRef.current);
    setHoveredRow('fastapi');
  };

  const handleDiagLeave = () => {
    leaveTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setHoveredRow(null);
    }, 200);
  };

  function isHealthData(data: unknown): data is HealthData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return typeof d.fastapi_ok === 'boolean';
  }

  const runHealthCheck = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    const startTime = performance.now();
    setIsChecking(true);
    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const timeout = setTimeout(() => controller.abort(), 1500);
      const resp = await fetch('http://127.0.0.1:8765/api/health', {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const data: unknown = await resp.json();
      if (!isHealthData(data)) {
        throw new Error('Invalid response shape');
      }
      if (mountedRef.current) {
        setHealthData(data);
      }
      const elapsed = performance.now() - startTime;
      if (elapsed > 200) {
        console.warn(`[HealthCheck] 自检耗时 ${elapsed.toFixed(0)}ms，超过 200ms 阈值`);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        /* timeout */
      } else if (err instanceof SyntaxError) {
        console.warn('[HealthCheck] JSON parse failed');
      } else if (err instanceof Error) {
        console.warn(`[HealthCheck] ${err.message}`);
      }
      if (mountedRef.current) {
        setHealthData({
          fastapi_ok: false,
          tushare_configured: false,
          tushare_ok: false,
          sqlite_ok: false,
          sqlite_has_data: false,
        });
      }
    } finally {
      checkingRef.current = false;
      if (mountedRef.current) {
        setIsChecking(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    runHealthCheck();
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      clearTimeout(diagCopyTimerRef.current);
      clearTimeout(leaveTimerRef.current);
    };
  }, [runHealthCheck]);

  const fastapiOk = healthData?.fastapi_ok ?? false;
  const tushareOk = healthData?.tushare_ok ?? false;
  const sqliteOk = healthData?.sqlite_ok ?? false;

  const offlineBypass = deriveOfflineBypass(healthData);
  const enterLocked = deriveEnterLocked(healthData);
  const labels = deriveHealthLabels(healthData, isChecking);

  const fastapiDiag = healthData && !fastapiOk ? getDiagnostic(healthData) : null;

  const dotClass = (ok: boolean): string => {
    if (isChecking) return 'status-dot status-dot--checking';
    if (!healthData) return 'status-dot';
    return ok ? 'status-dot status-dot--green' : 'status-dot status-dot--red';
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText('chmod +x start.sh && ./start.sh');
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 1800);
    }
  };

  const handleCopyCommand = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (mountedRef.current) {
        clearTimeout(diagCopyTimerRef.current);
        setDiagCopy({ text, icon: 'copied' });
        diagCopyTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setDiagCopy({ text: '', icon: 'idle' });
        }, 1800);
      }
    } catch {
      if (mountedRef.current) {
        clearTimeout(diagCopyTimerRef.current);
        setDiagCopy({ text, icon: 'failed' });
        diagCopyTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setDiagCopy({ text: '', icon: 'idle' });
        }, 1800);
      }
    }
  };

  const handleEnter = () => {
    if (enterLocked) return;
    onEnterWorkspace?.(offlineBypass);
  };

  return (
    <div className="onboarding-welcome">
      <div className="welcome-main-card">
        <div className="welcome-header-group">
          <h1>📊 Logseq Trade Journal</h1>
          <p>本地优先的多账户交易记账与 K 线联动复盘系统</p>
        </div>

        <div className="welcome-status-card">
          <div className="welcome-status-card-header">
            <span>系统自检</span>
            <button
              className={`welcome-btn-retest${isChecking ? ' welcome-btn-retest--spinning' : ''}`}
              onClick={runHealthCheck}
              disabled={isChecking}
              title="重新自检"
            >
              🔄 重新自检
            </button>
          </div>

          <div className="welcome-status-row">
            <span className={dotClass(fastapiOk)} />
            <span className="welcome-status-label">FastAPI 后端服务</span>
            <span className="welcome-status-value">{labels.fastApiLabel}</span>
            {fastapiDiag && (
              <span
                className="welcome-help-icon"
                title="查看诊断"
                onMouseEnter={handleDiagEnter}
                onMouseLeave={handleDiagLeave}
              >ℹ</span>
            )}
            {hoveredRow === 'fastapi' && fastapiDiag && (
              <div onMouseEnter={handleDiagEnter} onMouseLeave={handleDiagLeave}>
                <DiagnosticPopover
                  diagnostic={fastapiDiag}
                  copyState={diagCopy}
                  onCopy={handleCopyCommand}
                />
              </div>
            )}
          </div>

          <div className="welcome-status-row">
            <span
              className={
                isChecking
                  ? 'status-dot status-dot--checking'
                  : !healthData
                    ? 'status-dot'
                    : tushareOk
                      ? 'status-dot status-dot--green'
                      : offlineBypass
                        ? 'status-dot status-dot--yellow'
                        : 'status-dot status-dot--red'
              }
            />
            <span className="welcome-status-label">Tushare 数据源</span>
            <span className="welcome-status-value">{labels.tushareLabel}</span>
          </div>

          <div className="welcome-status-row">
            <span className={dotClass(sqliteOk)} />
            <span className="welcome-status-label">SQLite 本地数据库</span>
            <span className="welcome-status-value">{labels.sqliteLabel}</span>
          </div>
        </div>

        {healthData && !fastapiOk && (
          <div className="welcome-cli-helper">
            <p className="welcome-cli-title">▸ 启动本地后端服务</p>
            <div className="welcome-cli-row">
              <code>chmod +x start.sh &amp;&amp; ./start.sh</code>
              <button
                className={`cli-copy-btn${copied ? ' cli-copy-btn--copied' : copyFailed ? ' cli-copy-btn--failed' : ''}`}
                onClick={handleCopy}
              >
                {copied ? '已复制' : copyFailed ? '复制失败' : '复制'}
              </button>
            </div>
          </div>
        )}

        {offlineBypass && (
          <div className="welcome-warning-box">
            ⚠ Tushare 未连接，但本地已有缓存数据，可以离线模式进入工作区。
          </div>
        )}

        <div className="welcome-actions-group">
          <button className="welcome-btn-settings" onClick={onOpenSettings}>
            ⚙ 配置密钥
          </button>
          <button
            className={`welcome-btn-enter${
              enterLocked
                ? ' welcome-btn-enter--locked'
                : offlineBypass
                  ? ' welcome-btn-enter--warning'
                  : ''
            }`}
            onClick={handleEnter}
            disabled={enterLocked}
          >
            {enterLocked ? '🔒 进入工作区' : '→ 进入工作区'}
          </button>
        </div>
        {enterLocked && (
          <p className="welcome-locked-hint">请先修复服务连接问题</p>
        )}
      </div>
    </div>
  );
};

export default WelcomeScreen;
