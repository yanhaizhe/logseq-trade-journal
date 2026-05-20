"""
Sina Provider —— 新浪财经实时行情（稳定性最高）
作为 A 股/期货数据获取的第一优先级

新浪 HTTP API:
  日线: money.finance.sina.com.cn/.../getKLineData (JSON)
  实时: hq.sinajs.cn/list=sz000001 (JS var)
"""

import re
import json
from datetime import datetime

import httpx

from src.providers.base import BaseProvider
from src.models import KLineItem, KLineRequest


class SinaProvider(BaseProvider):
    name = "sina"
    market = "ashare"

    SCALE_MAP = {
        "1min": 5, "5min": 5, "15min": 15, "30min": 30,
        "60min": 60, "60": 60,
        "daily": 240, "weekly": 1200, "monthly": 7200,
        "1D": 240, "1W": 1200, "1M": 7200,
    }

    KLINE_URL = "https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData"

    async def fetch_kline(self, req: KLineRequest) -> list[KLineItem]:
        symbol = req.symbol.strip().upper()
        code = self._clean_code(symbol)
        scale = self.SCALE_MAP.get(req.period, 240)
        
        if "SH" in symbol or "SS" in symbol:
            prefix = "sh"
        elif "SZ" in symbol:
            prefix = "sz"
        else:
            if code == "000001":
                prefix = "sh"
            else:
                prefix = "sh" if (code.startswith("60") or code.startswith("688") or code.startswith("900") or code.startswith("5")) else "sz"

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                self.KLINE_URL,
                params={"symbol": f"{prefix}{code}", "scale": scale, "ma": "no", "datalen": min(req.limit, 1023)},
            )
            resp.raise_for_status()
            text = resp.text.strip()

            if not text or text == "null":
                return []

            # Sina 返回格式：( data ) 或 data
            text = text.strip("() ")
            try:
                raw = json.loads(text)
            except json.JSONDecodeError:
                return []

            if not isinstance(raw, list) or len(raw) == 0:
                return []

            return [KLineItem(
                timestamp=int(datetime.strptime(item["day"], "%Y-%m-%d").timestamp() * 1000),
                open=float(item["open"]),
                high=float(item["high"]),
                low=float(item["low"]),
                close=float(item["close"]),
                volume=float(item["volume"]),
            ) for item in raw if "open" in item]

    def _clean_code(self, symbol: str) -> str:
        return re.sub(r"[^0-9]", "", symbol.strip().upper().replace(".SZ", "").replace(".SH", "").replace(".BJ", ""))

    def _test_symbol(self) -> str:
        return "000001.SZ"
