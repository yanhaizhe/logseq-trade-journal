"""
YFinance Provider —— 美股 / 港股
"""

from datetime import datetime
from src.providers.base import BaseProvider
from src.models import KLineItem, KLineRequest


class YFinanceProvider(BaseProvider):
    name = "yfinance"
    market = "us"

    PERIOD_MAP = {
        "1min": "1m", "5min": "5m", "15min": "15m", "30min": "30m",
        "60min": "60m",
        "daily": "1d", "weekly": "1wk", "monthly": "1mo",
        "1D": "1d", "1W": "1wk", "1M": "1mo",
    }

    async def fetch_kline(self, req: KLineRequest) -> list[KLineItem]:
        import yfinance as yf

        symbol = self._clean_symbol(req.symbol)
        interval = self.PERIOD_MAP.get(req.period, "1d")
        period = self._period_for_interval(interval)

        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, interval=interval)

        if df is None or df.empty:
            return []

        items = []
        for idx, row in df.tail(800).iterrows():
            ts = int(idx.timestamp() * 1000) if hasattr(idx, 'timestamp') else 0
            items.append(KLineItem(
                timestamp=ts,
                open=float(row["Open"]), high=float(row["High"]),
                low=float(row["Low"]), close=float(row["Close"]),
                volume=float(row["Volume"]),
            ))
        return items

    def _clean_symbol(self, symbol: str) -> str:
        """美股符号清理"""
        s = symbol.strip().upper()
        # yfinance 港股格式: 0700.HK
        if s.endswith(".HK"):
            return s
        if s.isdigit() and len(s) <= 5:
            return f"{s}.HK"
        return s

    def _period_for_interval(self, interval: str) -> str:
        if interval in ("1m", "5m", "15m", "30m"):
            return "5d"
        if interval == "60m":
            return "1mo"
        if interval == "1d":
            return "1y"
        return "max"

    def _test_symbol(self) -> str:
        return "AAPL"
