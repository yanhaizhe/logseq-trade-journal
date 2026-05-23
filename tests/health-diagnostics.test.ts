import { describe, it, expect } from 'vitest';
import { getDiagnostic } from '../src/utils/healthDiagnostics';
import type { HealthData } from '../src/types/health';

describe('getDiagnostic', () => {
  it('FastAPI 不可达时返回 ECONNREFUSED 错误码和启动命令', () => {
    const health: HealthData = {
      fastapi_ok: false,
      tushare_configured: false,
      tushare_ok: false,
      sqlite_ok: false,
      sqlite_has_data: false,
    };
    const diag = getDiagnostic(health);
    expect(diag).not.toBeNull();
    expect(diag!.errorCode).toBe('ECONNREFUSED');
    expect(diag!.command).toBe('./start.sh');
  });

  it('FastAPI 可达时返回 null', () => {
    const health: HealthData = {
      fastapi_ok: true,
      tushare_configured: true,
      tushare_ok: true,
      sqlite_ok: true,
      sqlite_has_data: true,
    };
    expect(getDiagnostic(health)).toBeNull();
  });

  it('healthData 为 null 时返回 null', () => {
    expect(getDiagnostic(null)).toBeNull();
  });
});
