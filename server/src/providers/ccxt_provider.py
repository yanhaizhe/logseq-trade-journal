"""
CCXT Provider —— 加密货币（多交易所统一接口）
"""

from datetime import datetime, timedelta
from src.providers.base import BaseProvider
from src.models import KLineItem, KLineRequest


class CCXTProvider(BaseProvider):
    name = "ccxt"
    market = "crypto"

    TIMEFRAME_MAP = {
        "1min": "1m", "5min": "5m", "15min": "15m", "30min": "30m",
        "60min": "1h", "4H": "4h",
        "daily": "1d", "weekly": "1w", "monthly": "1M",
        "1D": "1d", "1W": "1w", "1M": "1M",
    }

    def __init__(self, exchange_id: str = "binance"):
        self.exchange_id = exchange_id

    async def fetch_kline(self, req: KLineRequest) -> list[KLineItem]:
        import ccxt.async_support as ccxt_async

        symbol, exchange_id = self._parse_symbol(req.symbol)
        tf = self.TIMEFRAME_MAP.get(req.period, "1d")
        since = int((datetime.now() - timedelta(days=365)).timestamp() * 1000)

        exchange_class = getattr(ccxt_async, exchange_id, None)
        if not exchange_class:
            raise ValueError(f"不支持的交易所: {exchange_id}")

        exchange = exchange_class({"enableRateLimit": True})
        try:
            ohlcv = await exchange.fetch_ohlcv(symbol, tf, since=since, limit=min(req.limit, 1000))
            return [KLineItem(
                timestamp=int(c[0]),
                open=float(c[1]), high=float(c[2]), low=float(c[3]), close=float(c[4]),
                volume=float(c[5]),
            ) for c in ohlcv]
        finally:
            await exchange.close()

    def _parse_symbol(self, symbol: str) -> tuple[str, str]:
        """解析 BTC/USDT:binance → (BTC/USDT, binance)"""
        s = symbol.strip().upper()
        if ":" in s:
            sym, ex = s.rsplit(":", 1)
            return sym, ex.lower()
        return s, self.exchange_id

    def _test_symbol(self) -> str:
        return "BTC/USDT:binance"
