import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ModalStatus = 'idle' | 'verifying' | 'failed' | 'success';

interface TokenSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface SaveTokenResponse {
  status: 'success' | 'error';
  message?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const TokenSettingsModal: React.FC<TokenSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [tokenValue, setTokenValue] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState<ModalStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const autoMaskTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const safeClose = useCallback(() => {
    if (status === 'verifying' && !window.confirm('验证正在进行中，确定要取消吗？')) return;
    onClose();
  }, [status, onClose]);

  /* ---- Reset state when modal opens ---- */
  useEffect(() => {
    if (isOpen) {
      mountedRef.current = true;
      setTokenValue('');
      setShowToken(false);
      setStatus('idle');
      setErrorMsg('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    return () => {
      mountedRef.current = false;
      if (autoMaskTimerRef.current) {
        clearTimeout(autoMaskTimerRef.current);
        autoMaskTimerRef.current = null;
      }
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [isOpen]);

  /* ---- Esc key to close ---- */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') safeClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, safeClose]);

  /* ---- 5-second auto-mask on blur ---- */
  const handleInputBlur = useCallback(() => {
    if (showToken) {
      autoMaskTimerRef.current = setTimeout(() => {
        setShowToken(false);
        autoMaskTimerRef.current = null;
      }, 5000);
    }
  }, [showToken]);

  const handleInputFocus = useCallback(() => {
    if (autoMaskTimerRef.current) {
      clearTimeout(autoMaskTimerRef.current);
      autoMaskTimerRef.current = null;
    }
  }, []);

  /* ---- Toggle visibility ---- */
  const toggleVisibility = () => {
    if (autoMaskTimerRef.current) {
      clearTimeout(autoMaskTimerRef.current);
      autoMaskTimerRef.current = null;
    }
    setShowToken((prev) => !prev);
    inputRef.current?.focus();
  };

  /* ---- Cancel auto-mask timer ---- */
  const cancelAutoMask = () => {
    if (autoMaskTimerRef.current) {
      clearTimeout(autoMaskTimerRef.current);
      autoMaskTimerRef.current = null;
    }
  };

  /* ---- Save & test ---- */
  const handleSave = async () => {
    if (status === 'verifying') return;
    if (!tokenValue.trim() || tokenValue.trim().length < 20) return;

    cancelAutoMask();
    setStatus('verifying');
    setErrorMsg('');

    const controller = new AbortController();
    abortRef.current = controller;

    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const resp = await fetch('http://127.0.0.1:8765/api/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenValue.trim() }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!resp.ok) {
        if (!mountedRef.current) return;
        setStatus('failed');
        setErrorMsg(`服务器错误 (${resp.status})`);
        return;
      }

      const data: SaveTokenResponse = await resp.json();

      if (!mountedRef.current) return;

      if (data.status === 'success') {
        setStatus('success');
        successTimerRef.current = setTimeout(() => {
          successTimerRef.current = null;
          if (mountedRef.current) {
            onSaved();
            onClose();
          }
        }, 600);
      } else {
        setStatus('failed');
        setErrorMsg(data.message || '校验失败：Token 无效');
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (!mountedRef.current) return;

      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatus('failed');
        setErrorMsg('网络超时，请检查本地服务状态');
      } else if (err instanceof SyntaxError) {
        setStatus('failed');
        setErrorMsg('服务器返回了异常数据，请检查本地服务日志');
      } else {
        setStatus('failed');
        setErrorMsg('无法连接本地后台服务');
      }
    } finally {
      if (mountedRef.current) {
        abortRef.current = null;
      }
    }
  };

  /* ---- Don't render when closed ---- */
  if (!isOpen) return null;

  const isVerifying = status === 'verifying';
  const isFailed = status === 'failed';
  const isSuccess = status === 'success';
  const canSubmit =
    tokenValue.trim().length >= 20 && status !== 'verifying' && status !== 'success';
  const showMinLengthHint =
    tokenValue.trim().length > 0 && tokenValue.trim().length < 20 && !isVerifying && !isSuccess;

  return (
    <div
      className={`settings-overlay${isVerifying ? ' settings-overlay--verifying' : ''}`}
      onClick={safeClose}
    >
      <div
        className="settings-form-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Tushare Token 配置"
      >
        {/* ---- Header ---- */}
        <div className="settings-header">
          <h2>🔑 Tushare Token 配置</h2>
          <button
            className="settings-close-btn"
            onClick={safeClose}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* ---- Body ---- */}
        <div className="settings-form-body">
          {/* Error message at top */}
          {isFailed && errorMsg && (
            <p className="settings-error-text">{errorMsg}</p>
          )}

          {/* Token input */}
          <div className="settings-input-group">
            <input
              ref={inputRef}
              className={`settings-input-token${isFailed ? ' settings-input-token--error' : ''}`}
              type={showToken ? 'text' : 'password'}
              value={tokenValue}
              onChange={(e) => {
                setTokenValue(e.target.value);
                if (status === 'failed') setStatus('idle');
              }}
              onBlur={handleInputBlur}
              onFocus={handleInputFocus}
              placeholder="输入您的 Tushare 56位 API Token..."
              disabled={isVerifying || isSuccess}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              className="settings-btn-mask-toggle"
              onClick={toggleVisibility}
              type="button"
              tabIndex={-1}
              aria-label={showToken ? '隐藏 Token' : '显示 Token'}
            >
              {showToken ? '🙈' : '👁'}
            </button>
          </div>

          {/* External link */}
          <a
            className="settings-link-get-token"
            href="https://tushare.pro/"
            target="_blank"
            rel="noopener noreferrer"
          >
            如何获取 Tushare Token? ↗
          </a>

          {/* Privacy info */}
          <div className="settings-privacy-box">
            <p>• Token 仅存储于本地 .env 文件</p>
            <p>• 绝不向公共云端发送任何数据</p>
          </div>
        </div>

        {/* ---- Actions ---- */}
        <div className="settings-actions">
          <button
            className="settings-btn-cancel"
            onClick={safeClose}
            disabled={isVerifying}
          >
            取消
          </button>
          <button
            className={`settings-btn-submit${
              isVerifying
                ? ' settings-btn-submit--verifying'
                : isSuccess
                  ? ' settings-btn-submit--success'
                  : ''
            }`}
            onClick={handleSave}
            disabled={!canSubmit}
          >
            {isVerifying
              ? '⏳ 校验中…'
              : isSuccess
                ? '✓ 已保存'
                : '保存并测试'}
          </button>
        </div>

        {/* Min-length hint */}
        {showMinLengthHint && (
          <p className="settings-min-length-hint">最少 20 个字符</p>
        )}
      </div>
    </div>
  );
};

export default TokenSettingsModal;
