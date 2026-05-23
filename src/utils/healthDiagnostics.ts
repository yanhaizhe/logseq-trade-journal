import type { HealthData } from '@/types/health';

export interface DiagnosticInfo {
  errorCode: string;
  command: string;
  hint: string;
}

export function getDiagnostic(
  healthData: HealthData | null,
): DiagnosticInfo | null {
  if (!healthData) return null;
  if (healthData.fastapi_ok) return null;

  return {
    errorCode: 'ECONNREFUSED',
    command: './start.sh',
    hint: '在终端执行上述命令启动本地后端服务',
  };
}
