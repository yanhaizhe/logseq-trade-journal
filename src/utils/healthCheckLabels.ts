import type { HealthData } from '@/types/health';

export interface HealthLabels {
  fastApiLabel: string;
  tushareLabel: string;
  sqliteLabel: string;
}

export function deriveOfflineBypass(
  healthData: HealthData | null,
): boolean {
  if (!healthData) return false;
  return (
    healthData.fastapi_ok &&
    !healthData.tushare_ok &&
    healthData.sqlite_ok &&
    healthData.sqlite_has_data
  );
}

export function deriveHealthLabels(
  healthData: HealthData | null,
  isChecking: boolean,
): HealthLabels {
  if (isChecking) {
    return {
      fastApiLabel: '检测中…',
      tushareLabel: '检测中…',
      sqliteLabel: '检测中…',
    };
  }

  if (!healthData) {
    return {
      fastApiLabel: '待检测',
      tushareLabel: '待检测',
      sqliteLabel: '待检测',
    };
  }

  const offlineBypass = deriveOfflineBypass(healthData);

  return {
    fastApiLabel: healthData.fastapi_ok
      ? '运行中'
      : '未连接 (127.0.0.1:8765)',
    tushareLabel: healthData.tushare_ok
      ? '已验证'
      : offlineBypass
        ? '离线可用'
        : healthData.tushare_configured
          ? '无效'
          : '未配置',
    sqliteLabel: healthData.sqlite_ok ? '正常' : '异常',
  };
}

export function deriveEnterLocked(healthData: HealthData | null): boolean {
  if (!healthData) return true;
  return !healthData.fastapi_ok;
}
