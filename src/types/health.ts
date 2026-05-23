export interface HealthData {
  fastapi_ok: boolean;
  tushare_configured: boolean;
  tushare_ok: boolean;
  sqlite_ok: boolean;
  sqlite_has_data: boolean;
}
