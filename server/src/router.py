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


def to_yf_crypto(symbol: str) -> str:
    s = symbol.strip().upper().replace("/", "")
    for quote in ["USDT", "USD", "BUSD", "USDC"]:
        if s.endswith(quote) and len(s) > len(quote):
            base = s[:-len(quote)]
            return f"{base}-USD"
    return f"{s}-USD"


def generate_mock_crypto_kline(symbol: str, period: str, limit: int = 300) -> list[KLineItem]:
    import random
    import time
    
    s = symbol.strip().upper().replace("/", "")
    if "BTC" in s:
        base_price = 68000.0
    elif "ETH" in s:
        base_price = 3500.0
    elif "SOL" in s:
        base_price = 150.0
    else:
        base_price = 10.0
        
    items = []
    curr_time = int(time.time() * 1000)
    step_ms = 86400 * 1000  # daily
    p = period.lower()
    if "1min" in p or "1m" in p:
        step_ms = 60 * 1000
    elif "5min" in p or "5m" in p:
        step_ms = 5 * 60 * 1000
    elif "15min" in p or "15m" in p:
        step_ms = 15 * 60 * 1000
    elif "30min" in p or "30m" in p:
        step_ms = 30 * 60 * 1000
    elif "60min" in p or "60m" in p:
        step_ms = 60 * 60 * 1000
        
    price = base_price
    for i in range(limit):
        change = price * random.uniform(-0.012, 0.012)
        o = price
        c = price + change
        h = max(o, c) + (price * random.uniform(0, 0.004))
        l = min(o, c) - (price * random.uniform(0, 0.004))
        v = random.uniform(100, 10000)
        
        items.append(KLineItem(
            timestamp=curr_time - (limit - i) * step_ms,
            open=round(o, 4),
            high=round(h, 4),
            low=round(l, 4),
            close=round(c, 4),
            volume=round(v, 2)
        ))
        price = c
        
    return items


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

        # Fallback to mock
        logger.info(f"[route] A股 {req.symbol} → Mock Fallback")
        data = generate_mock_crypto_kline(req.symbol, req.period, int(req.limit or 300))
        return KLineResponse(symbol=req.symbol, market="ashare", provider="mock",
                             period=req.period, count=len(data), data=data)

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

        # Fallback to mock
        logger.info(f"[route] 期货 {req.symbol} → Mock Fallback")
        data = generate_mock_crypto_kline(req.symbol, req.period, int(req.limit or 300))
        return KLineResponse(symbol=req.symbol, market="futures", provider="mock",
                             period=req.period, count=len(data), data=data)

    # ========== 美股/港股: YFinance ==========

    async def _us_hk_chain(self, req: KLineRequest) -> KLineResponse:
        market = self.detect_market(req.symbol)
        logger.info(f"[route] {market} {req.symbol} → YFinance")
        try:
            data = await self.yfinance.fetch_kline(req)
            if data:
                return KLineResponse(symbol=req.symbol, market=market, provider="yfinance",
                                     period=req.period, count=len(data), data=data)
        except Exception as e:
            logger.warning(f"[route] YFinance 失败: {e}")
            
        # Fallback to mock
        logger.info(f"[route] {market} {req.symbol} → Mock Fallback")
        data = generate_mock_crypto_kline(req.symbol, req.period, int(req.limit or 300))
        return KLineResponse(symbol=req.symbol, market=market, provider="mock",
                             period=req.period, count=len(data), data=data)

    # ========== 加密货币: CCXT ==========

    async def _crypto_chain(self, req: KLineRequest) -> KLineResponse:
        logger.info(f"[route] Crypto {req.symbol} → CCXT")
        try:
            data = await self.ccxt_binance.fetch_kline(req)
            if data:
                return KLineResponse(symbol=req.symbol, market="crypto", provider="ccxt",
                                     period=req.period, count=len(data), data=data)
        except Exception as e:
            logger.warning(f"[route] CCXT 失败: {e}")

        # 2) Fallback to YFinance
        yf_symbol = to_yf_crypto(req.symbol)
        logger.info(f"[route] Crypto {req.symbol} → YFinance ({yf_symbol})")
        try:
            yf_req = KLineRequest(symbol=yf_symbol, period=req.period, limit=req.limit, adjust=req.adjust)
            data = await self.yfinance.fetch_kline(yf_req)
            if data:
                return KLineResponse(symbol=req.symbol, market="crypto", provider="yfinance",
                                     period=req.period, count=len(data), data=data)
        except Exception as e:
            logger.warning(f"[route] YFinance crypto 失败: {e}")

        # 3) Fallback to Mock
        logger.info(f"[route] Crypto {req.symbol} → Mock Fallback")
        data = generate_mock_crypto_kline(req.symbol, req.period, int(req.limit or 300))
        return KLineResponse(symbol=req.symbol, market="crypto", provider="mock",
                             period=req.period, count=len(data), data=data)

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

    async def search_symbols(self, q: str, market: Optional[str] = None) -> list[dict]:
        q = q.strip().upper()
        if not q:
            return []
            
        results = []
        
        # 1) Search in local static hot symbols list first
        hot_list = [
            # A股
            {"symbol": "600519", "name": "贵州茅台", "market": "ashare", "exchange": "SH"},
            {"symbol": "600036", "name": "招商银行", "market": "ashare", "exchange": "SH"},
            {"symbol": "601318", "name": "中国平安", "market": "ashare", "exchange": "SH"},
            {"symbol": "600900", "name": "长江电力", "market": "ashare", "exchange": "SH"},
            {"symbol": "601899", "name": "紫金矿业", "market": "ashare", "exchange": "SH"},
            # 美股
            {"symbol": "AAPL", "name": "Apple Inc.", "market": "us", "exchange": "NASDAQ"},
            {"symbol": "TSLA", "name": "Tesla Inc.", "market": "us", "exchange": "NASDAQ"},
            {"symbol": "NVDA", "name": "NVIDIA Corp.", "market": "us", "exchange": "NASDAQ"},
            {"symbol": "MSFT", "name": "Microsoft Corp.", "market": "us", "exchange": "NASDAQ"},
            {"symbol": "AMZN", "name": "Amazon.com Inc.", "market": "us", "exchange": "NASDAQ"},
            # H股
            {"symbol": "00700.HK", "name": "腾讯控股", "market": "hk", "exchange": "HKEX"},
            {"symbol": "03690.HK", "name": "美团-W", "market": "hk", "exchange": "HKEX"},
            {"symbol": "09988.HK", "name": "阿里巴巴-W", "market": "hk", "exchange": "HKEX"},
            {"symbol": "01810.HK", "name": "小米集团-W", "market": "hk", "exchange": "HKEX"},
            {"symbol": "09618.HK", "name": "京东集团-SW", "market": "hk", "exchange": "HKEX"},
            # Crypto
            {"symbol": "BTC/USDT", "name": "Bitcoin", "market": "crypto", "exchange": "Binance"},
            {"symbol": "ETH/USDT", "name": "Ethereum", "market": "crypto", "exchange": "Binance"},
            {"symbol": "SOL/USDT", "name": "Solana", "market": "crypto", "exchange": "Binance"},
            {"symbol": "BNB/USDT", "name": "BNB", "market": "crypto", "exchange": "Binance"},
            {"symbol": "DOGE/USDT", "name": "Dogecoin", "market": "crypto", "exchange": "Binance"},
            # Forex
            {"symbol": "EUR/USD", "name": "欧元/美元", "market": "forex", "exchange": "FX"},
            {"symbol": "USD/JPY", "name": "美元/日元", "market": "forex", "exchange": "FX"},
            {"symbol": "GBP/USD", "name": "英镑/美元", "market": "forex", "exchange": "FX"},
            {"symbol": "AUD/USD", "name": "澳元/美元", "market": "forex", "exchange": "FX"},
            {"symbol": "USD/CAD", "name": "美元/加元", "market": "forex", "exchange": "FX"},
        ]
        
        # Check exact symbol match or partial match in static list
        seen = set()
        for item in hot_list:
            if q in item["symbol"].upper() or q in item["name"].upper():
                if market and item["market"] != market:
                    continue
                results.append(item)
                seen.add(item["symbol"])
                
        # 2) Live search via Sina suggestion for A-shares
        if not market or market == "ashare":
            import httpx
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    resp = await client.get(
                        f"https://suggest3.sinajs.cn/suggest/key={q}",
                        headers={"Referer": "https://finance.sina.com.cn"}
                    )
                    if resp.status_code == 200:
                        text = resp.text
                        for chunk in text.split(";"):
                            if not chunk or "=" not in chunk:
                                continue
                            parts = chunk.split("=")
                            if len(parts) < 2:
                                continue
                            content = parts[1].strip('"')
                            # Multiple items in suggest data are separated by comma?
                            # Wait, sinajs suggests: var suggestdata="name,type,symbol,full_symbol,..."
                            # Let's inspect typical sinajs suggest data format:
                            # var suggestdata="贵州茅台,11,600519,sh600519,贵州茅台,,贵州茅台,99;招商银行,11,600036,sh600036,招商银行,,招商银行,99;"
                            # Ah, the items are separated by semicolon, and inside each item they are comma-separated!
                            # Let's parse appropriately:
                            fields = content.split(",")
                            if len(fields) >= 4:
                                name = fields[0]
                                symbol = fields[2]
                                full_symbol = fields[3]
                                type_code = fields[1]
                                if type_code in ("11", "12"): # A-share stock
                                    market_type = "ashare"
                                    exchange = "SH" if full_symbol.startswith("sh") else "SZ"
                                    if symbol not in seen:
                                        results.append({
                                            "symbol": symbol,
                                            "name": name,
                                            "market": market_type,
                                            "exchange": exchange
                                        })
                                        seen.add(symbol)
            except Exception as e:
                logger.warning(f"Sina search suggest error: {e}")
                 
        # 3) Live search via Yahoo Finance for US/HK stocks
        if not market or market in ("us", "hk", "crypto"):
            import httpx
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    resp = await client.get(
                        f"https://query1.finance.yahoo.com/v1/finance/search?q={q}"
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        for quote in data.get("quotes", []):
                            symbol = quote.get("symbol", "")
                            name = quote.get("longname") or quote.get("shortname") or symbol
                            quote_type = quote.get("quoteType", "").upper()
                             
                            # Determine market
                            if symbol.endswith(".HK") or (quote.get("exchDisp") == "HKSE"):
                                item_market = "hk"
                                exchange = "HKEX"
                            elif quote_type == "CRYPTOCURRENCY":
                                item_market = "crypto"
                                display_sym = symbol
                                if "-" in display_sym:
                                    base = display_sym.split("-")[0]
                                    display_sym = f"{base}/USDT"
                                symbol = display_sym
                                exchange = "Binance"
                            else:
                                item_market = "us"
                                exchange = quote.get("exchange", "US")
                                 
                            if market and item_market != market:
                                continue
                                 
                            if symbol not in seen:
                                results.append({
                                    "symbol": symbol,
                                    "name": name,
                                    "market": item_market,
                                    "exchange": exchange
                                })
                                seen.add(symbol)
            except Exception as e:
                logger.warning(f"YFinance search suggest error: {e}")
                 
        # If results are still empty and query looks like a symbol, try fallback info
        if not results and len(q) >= 3:
            try:
                info = await self.get_symbol_info(q)
                if info and info.get("name") != q:
                    results.append({
                        "symbol": info["symbol"],
                        "name": info["name"],
                        "market": info["market"],
                        "exchange": ""
                    })
            except Exception:
                pass
                 
        return results

