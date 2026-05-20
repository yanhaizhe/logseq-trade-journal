"""
Tushare Provider —— A 股 / 期货（需 token）
"""

import re
import os
from datetime import datetime, timedelta
from src.providers.base import BaseProvider
from src.models import KLineItem, KLineRequest


class TushareProvider(BaseProvider):
    name = "tushare"
    market = "ashare"

    PERIOD_MAP = {
        "1min": "1min", "5min": "5min", "15min": "15min", "30min": "30min",
        "60min": "60min", "60": "60min",
        "daily": "D", "weekly": "W", "monthly": "M",
        "1D": "D", "1W": "W", "1M": "M",
    }

    EXCHANGE_MAP = {
        "SH": "SHFE", "SZ": "SZSE",
        "DCE": "DCE", "CFFEX": "CFFEX", "CZCE": "CZCE", "INE": "INE",
    }

    def __init__(self, token: str = None):
        self.token = token or os.getenv("TUSHARE_TOKEN")
        if not self.token:
            raise ValueError("Tushare token 未设置")

    def _ts_code(self, symbol: str) -> str:
        """转换为 Tushare ts_code 格式"""
        s = symbol.strip().upper()
        if "." in s:
            return s
        if re.match(r'^\d{6}$', s):
            if s.startswith("60"):
                return f"{s}.SH"
            elif s.startswith("00") or s.startswith("30"):
                return f"{s}.SZ"
            elif s.startswith("8") or s.startswith("4"):
                return f"{s}.BJ"
            return f"{s}.SH"
        return s

    def _is_futures(self, symbol: str) -> bool:
        return bool(re.match(r'^[A-Z]{1,3}\d{3,4}$', symbol.strip().upper()))

    async def fetch_kline(self, req: KLineRequest) -> list[KLineItem]:
        import tushare as ts

        pro = ts.pro_api(self.token)
        period = self.PERIOD_MAP.get(req.period, "D")

        if self._is_futures(req.symbol):
            return await self._futures_kline(pro, req.symbol, period)

        is_minute = period in ("1min", "5min", "15min", "30min", "60min")
        ts_code = self._ts_code(req.symbol)

        if is_minute:
            return await self._minute_kline(pro, ts_code, period)
        return await self._daily_kline(pro, ts_code, period)

    async def _daily_kline(self, pro, ts_code: str, period: str) -> list[KLineItem]:
        end = datetime.now().strftime("%Y%m%d")
        start = (datetime.now() - timedelta(days=365 * 3)).strftime("%Y%m%d")

        try:
            df = pro.daily(ts_code=ts_code, start_date=start, end_date=end)
        except Exception:
            df = pro.daily(ts_code=ts_code)

        if df is None or df.empty:
            return []

        df = df.sort_values("trade_date")
        return [KLineItem(
            timestamp=int(datetime.strptime(r["trade_date"], "%Y%m%d").timestamp() * 1000),
            open=float(r["open"]), high=float(r["high"]),
            low=float(r["low"]), close=float(r["close"]),
            volume=float(r.get("vol", 0)), turnover=float(r.get("amount", 0)),
        ) for _, r in df.tail(800).iterrows()]

    async def _minute_kline(self, pro, ts_code: str, period: str) -> list[KLineItem]:
        try:
            freq_map = {"1min": "1min", "5min": "5min", "15min": "15min", "30min": "30min", "60min": "60min"}
            freq = freq_map.get(period, "5min")
            df = pro.stk_mins(ts_code=ts_code, freq=freq)
            if df is None or df.empty:
                return []
            return [KLineItem(
                timestamp=int(datetime.strptime(r["trade_time"], "%Y-%m-%d %H:%M:%S").timestamp() * 1000) if "trade_time" in r else 0,
                open=float(r["open"]), high=float(r["high"]),
                low=float(r["low"]), close=float(r["close"]),
                volume=float(r.get("vol", 0)),
            ) for _, r in df.tail(800).iterrows()]
        except Exception:
            return []

    async def _futures_kline(self, pro, symbol: str, period: str) -> list[KLineItem]:
        try:
            df = pro.fut_daily(ts_code=symbol, start_date=(datetime.now() - timedelta(days=365)).strftime("%Y%m%d"),
                               end_date=datetime.now().strftime("%Y%m%d"))
            if df is None or df.empty:
                return []
            df = df.sort_values("trade_date")
            return [KLineItem(
                timestamp=int(datetime.strptime(r["trade_date"], "%Y%m%d").timestamp() * 1000),
                open=float(r["open"]), high=float(r["high"]),
                low=float(r["low"]), close=float(r["close"]),
                volume=float(r.get("vol", 0)), turnover=float(r.get("amount", 0)),
            ) for _, r in df.tail(800).iterrows()]
        except Exception:
            return []

    def _test_symbol(self) -> str:
        return "000001.SZ"
