"""
数据中心调度层 —— 参考 Vibe-Trading data-routing
决策树：市场识别 → 优先级链 → 自动回退

A 股/期货:  Sina → AKShare → Tushare
美股/港股:  YFinance
加密货币:  CCXT (Binance)
"""

import re
import logging
from typing import Optional

from src.models import KLineItem, KLineRequest, KLineResponse, SearchResult
from src.providers.sina import SinaProvider
from src.providers.akshare import AKShareProvider
from src.providers.tushare import TushareProvider
from src.providers.yfinance import YFinanceProvider
from src.providers.ccxt_provider import CCXTProvider

logger = logging.getLogger(__name__)


class DataRouter:
    """优先级链：稳定性最高的排前面"""

    def __init__(self, tushare_token: Optional[str] = None):
        # A 股链: Sina → AKShare → Tushare
        self.sina = SinaProvider()
        self.akshare = AKShareProvider()
        self.tushare = TushareProvider(tushare_token) if tushare_token else None
        # 其他市场
        self.yfinance = YFinanceProvider()
        self.ccxt_binance = CCXTProvider("binance")

    def detect_market(self, symbol: str) -> str:
        s = symbol.strip().upper()
        if re.match(r'^[A-Z]{1,3}\d{3,4}$', s):
            return "futures"
        base = s.replace(".SZ", "").replace(".SH", "").replace(".BJ", "")
        if re.match(r'^\d{6}$', base):
            return "ashare"
        base = s.replace(".HK", "")
        if re.match(r'^\d{1,5}$', base):
            return "hk"
        if "/" in s or s.endswith("USDT") or s.endswith("USD"):
            return "crypto"
        if re.match(r'^[A-Z]{1,5}$', s):
            return "us"
        return "unknown"

    async def fetch_kline(self, req: KLineRequest) -> KLineResponse:
        market = self.detect_market(req.symbol)
        if market == "ashare":
            return await self._ashare_chain(req)
        elif market == "futures":
            return await self._futures_chain(req)
        elif market in ("us", "hk"):
            return await self._us_hk_chain(req)
        elif market == "crypto":
            return await self._crypto_chain(req)
        else:
            raise ValueError(f"无法识别市场: {req.symbol}")

    # ========== A 股: Sina → AKShare → Tushare ==========

    async def _ashare_chain(self, req: KLineRequest) -> KLineResponse:
        # 1) Sina（实时行情，稳定性最高）
        logger.info(f"[route] A股 {req.symbol} → Sina")
        try:
            data = await self.sina.fetch_kline(req)
            if data:
                return KLineResponse(symbol=req.symbol, market="ashare", provider="sina",
                                     period=req.period, count=len(data), data=data)
        except Exception as e:
            logger.warning(f"[route] Sina 失败: {e}")

        # 2) AKShare
        logger.info(f"[route] A股 {req.symbol} → AKShare")
        try:
            data = await self.akshare.fetch_kline(req)
            if data:
                return KLineResponse(symbol=req.symbol, market="ashare", provider="akshare",
                                     period=req.period, count=len(data), data=data)
        except Exception as e:
            logger.warning(f"[route] AKShare 失败: {e}")

        # 3) Tushare
        if self.tushare:
            logger.info(f"[route] A股 {req.symbol} → Tushare")
            try:
                data = await self.tushare.fetch_kline(req)
                if data:
                    return KLineResponse(symbol=req.symbol, market="ashare", provider="tushare",
                                         period=req.period, count=len(data), data=data)
            except Exception as e:
                logger.warning(f"[route] Tushare 失败: {e}")

        raise RuntimeError(f"A股全部数据源失败: {req.symbol}")

    # ========== 期货: Sina → AKShare → Tushare ==========

    async def _futures_chain(self, req: KLineRequest) -> KLineResponse:
        # 期货 Sina 先试
        try:
            data = await self.sina.fetch_kline(req)
            if data:
                return KLineResponse(symbol=req.symbol, market="futures", provider="sina",
                                     period=req.period, count=len(data), data=data)
        except Exception:
            pass

        try:
            data = await self.akshare.fetch_kline(req)
            if data:
                return KLineResponse(symbol=req.symbol, market="futures", provider="akshare",
                                     period=req.period, count=len(data), data=data)
        except Exception as e:
            logger.warning(f"[route] AKShare 期货失败: {e}")

        if self.tushare:
            try:
                data = await self.tushare.fetch_kline(req)
                if data:
                    return KLineResponse(symbol=req.symbol, market="futures", provider="tushare",
                                         period=req.period, count=len(data), data=data)
            except Exception as e:
                logger.warning(f"[route] Tushare 期货失败: {e}")

        raise RuntimeError(f"期货全部数据源失败: {req.symbol}")

    # ========== 美股/港股: YFinance ==========

    async def _us_hk_chain(self, req: KLineRequest) -> KLineResponse:
        market = self.detect_market(req.symbol)
        logger.info(f"[route] {market} {req.symbol} → YFinance")
        data = await self.yfinance.fetch_kline(req)
        if data:
            return KLineResponse(symbol=req.symbol, market=market, provider="yfinance",
                                 period=req.period, count=len(data), data=data)
        raise RuntimeError(f"YFinance 返回空数据: {req.symbol}")

    # ========== 加密货币: CCXT ==========

    async def _crypto_chain(self, req: KLineRequest) -> KLineResponse:
        logger.info(f"[route] Crypto {req.symbol} → CCXT")
        data = await self.ccxt_binance.fetch_kline(req)
        if data:
            return KLineResponse(symbol=req.symbol, market="crypto", provider="ccxt",
                                 period=req.period, count=len(data), data=data)
        raise RuntimeError(f"CCXT 返回空数据: {req.symbol}")

    async def health(self) -> dict[str, bool]:
        results = {}
        for name, prov in [("sina", self.sina), ("akshare", self.akshare),
                           ("yfinance", self.yfinance), ("ccxt", self.ccxt_binance)]:
            try:
                results[name] = await prov.health()
            except Exception as e:
                logger.warning(f"[health] {name} 异常: {e}")
                results[name] = False
        if self.tushare:
            try:
                results["tushare"] = await self.tushare.health()
            except Exception as e:
                logger.warning(f"[health] tushare 异常: {e}")
                results["tushare"] = False
        return results

    async def get_symbol_info(self, symbol: str) -> dict:
        symbol = symbol.strip().upper()
        market = self.detect_market(symbol)
        name = symbol
        
        if market == "ashare":
            code = re.sub(r"[^0-9]", "", symbol)
            if code and len(code) == 6:
                prefix = "sh" if code.startswith("60") or code.startswith("68") else "sz"
                import httpx
                try:
                    async with httpx.AsyncClient(timeout=3.0) as client:
                        resp = await client.get(
                            f"https://hq.sinajs.cn/list={prefix}{code}",
                            headers={"Referer": "https://finance.sina.com.cn"}
                        )
                        if resp.status_code == 200:
                            match = re.search(r'="([^,"]+)', resp.text)
                            if match:
                                name = match.group(1)
                except Exception as e:
                    logger.warning(f"获取 A股 名称失败 {symbol}: {e}")
        elif market in ("us", "hk"):
            try:
                import yfinance as yf
                ticker = yf.Ticker(symbol)
                name = ticker.info.get("longName") or ticker.info.get("shortName") or symbol
            except Exception as e:
                logger.warning(f"获取 美股/港股 名称失败 {symbol}: {e}")
                
        return {"symbol": symbol, "name": name, "market": market}
