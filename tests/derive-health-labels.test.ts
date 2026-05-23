import { describe, it, expect } from 'vitest';
import {
  deriveHealthLabels,
  deriveEnterLocked,
  deriveOfflineBypass,
} from '../src/utils/healthCheckLabels';
import type { HealthData } from '../src/types/health';

function makeHealth(overrides: Partial<HealthData> = {}): HealthData {
  return {
    fastapi_ok: true,
    tushare_configured: true,
    tushare_ok: true,
    sqlite_ok: true,
    sqlite_has_data: true,
    ...overrides,
  };
}

describe('deriveHealthLabels', () => {
  describe('检测中状态', () => {
    it('isChecking 时所有标签为「检测中…」', () => {
      const labels = deriveHealthLabels(makeHealth(), true);
      expect(labels.fastApiLabel).toBe('检测中…');
      expect(labels.tushareLabel).toBe('检测中…');
      expect(labels.sqliteLabel).toBe('检测中…');
    });
  });

  describe('待检测状态', () => {
    it('healthData 为 null 时所有标签为「待检测」', () => {
      const labels = deriveHealthLabels(null, false);
      expect(labels.fastApiLabel).toBe('待检测');
      expect(labels.tushareLabel).toBe('待检测');
      expect(labels.sqliteLabel).toBe('待检测');
    });
  });

  describe('FastAPI', () => {
    it('FastAPI 可达时显示「运行中」', () => {
      const labels = deriveHealthLabels(makeHealth({ fastapi_ok: true }), false);
      expect(labels.fastApiLabel).toBe('运行中');
    });

    it('FastAPI 不可达时显示「未连接 (127.0.0.1:8765)」', () => {
      const labels = deriveHealthLabels(makeHealth({ fastapi_ok: false }), false);
      expect(labels.fastApiLabel).toBe('未连接 (127.0.0.1:8765)');
    });
  });

  describe('Tushare', () => {
    it('Token 有效时显示「已验证」', () => {
      const labels = deriveHealthLabels(
        makeHealth({ tushare_ok: true }),
        false,
      );
      expect(labels.tushareLabel).toBe('已验证');
    });

    it('未配置时显示「未配置」', () => {
      const labels = deriveHealthLabels(
        makeHealth({
          tushare_configured: false,
          tushare_ok: false,
          sqlite_ok: false,
          sqlite_has_data: false,
        }),
        false,
      );
      expect(labels.tushareLabel).toBe('未配置');
    });

    it('已配置但 Token 无效且无离线缓存时显示「无效」', () => {
      const labels = deriveHealthLabels(
        makeHealth({
          tushare_configured: true,
          tushare_ok: false,
          sqlite_ok: false,
          sqlite_has_data: false,
        }),
        false,
      );
      expect(labels.tushareLabel).toBe('无效');
    });

    it('Token 无效但有离线缓存时显示「离线可用」', () => {
      const labels = deriveHealthLabels(
        makeHealth({
          fastapi_ok: true,
          tushare_ok: false,
          sqlite_ok: true,
          sqlite_has_data: true,
        }),
        false,
      );
      expect(labels.tushareLabel).toBe('离线可用');
    });
  });

  describe('SQLite', () => {
    it('正常时显示「正常」', () => {
      const labels = deriveHealthLabels(makeHealth({ sqlite_ok: true }), false);
      expect(labels.sqliteLabel).toBe('正常');
    });

    it('异常时显示「异常」', () => {
      const labels = deriveHealthLabels(makeHealth({ sqlite_ok: false }), false);
      expect(labels.sqliteLabel).toBe('异常');
    });
  });

  describe('全部绿灯场景', () => {
    it('三服务全部正常时返回对应标签', () => {
      const labels = deriveHealthLabels(
        makeHealth({
          fastapi_ok: true,
          tushare_ok: true,
          sqlite_ok: true,
        }),
        false,
      );
      expect(labels.fastApiLabel).toBe('运行中');
      expect(labels.tushareLabel).toBe('已验证');
      expect(labels.sqliteLabel).toBe('正常');
    });
  });
});

describe('deriveEnterLocked', () => {
  it('healthData 为 null 时锁定', () => {
    expect(deriveEnterLocked(null)).toBe(true);
  });

  it('FastAPI 不可达时锁定', () => {
    expect(deriveEnterLocked(makeHealth({ fastapi_ok: false }))).toBe(true);
  });

  it('FastAPI 可达时解锁', () => {
    expect(deriveEnterLocked(makeHealth({ fastapi_ok: true }))).toBe(false);
  });
});

describe('deriveOfflineBypass', () => {
  it('healthData 为 null 时返回 false', () => {
    expect(deriveOfflineBypass(null)).toBe(false);
  });

  it('FastAPI 可用、Tushare 不可用、SQLite 有缓存时返回 true', () => {
    expect(
      deriveOfflineBypass(
        makeHealth({
          fastapi_ok: true,
          tushare_ok: false,
          sqlite_ok: true,
          sqlite_has_data: true,
        }),
      ),
    ).toBe(true);
  });

  it('FastAPI 不可用时返回 false', () => {
    expect(
      deriveOfflineBypass(
        makeHealth({
          fastapi_ok: false,
          tushare_ok: false,
          sqlite_ok: true,
          sqlite_has_data: true,
        }),
      ),
    ).toBe(false);
  });

  it('Tushare 正常时返回 false', () => {
    expect(
      deriveOfflineBypass(
        makeHealth({
          fastapi_ok: true,
          tushare_ok: true,
          sqlite_ok: true,
          sqlite_has_data: true,
        }),
      ),
    ).toBe(false);
  });

  it('SQLite 无数据时返回 false', () => {
    expect(
      deriveOfflineBypass(
        makeHealth({
          fastapi_ok: true,
          tushare_ok: false,
          sqlite_ok: true,
          sqlite_has_data: false,
        }),
      ),
    ).toBe(false);
  });

  it('SQLite 不可用时返回 false', () => {
    expect(
      deriveOfflineBypass(
        makeHealth({
          fastapi_ok: true,
          tushare_ok: false,
          sqlite_ok: false,
          sqlite_has_data: true,
        }),
      ),
    ).toBe(false);
  });
});
