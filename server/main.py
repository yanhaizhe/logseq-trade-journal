"""
Trade Journal 数据服务 —— FastAPI HTTP API

支持多市场 K 线数据:
  A 股/期货: AKShare → Tushare
  美股/港股:   YFinance
  加密货币:   CCXT

启动: uvicorn main:app --host 127.0.0.1 --port 8765
"""

import sys
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# 确保 server 在 sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from src.models import (
    KLineRequest, KLineResponse,
    SearchRequest, SearchResponse, SearchResult,
    HealthResponse,
)
from src.router import DataRouter

logging.basicConfig(level=logging.INFO, format="[%(name)s] %(message)s")
logger = logging.getLogger("server")

# 全局路由实例
router: DataRouter = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global router
    token = os.getenv("TUSHARE_TOKEN")
    router = DataRouter(tushare_token=token)
    logger.info("DataRouter 初始化完成")
    if token:
        logger.info("Tushare token 已配置")
    yield


app = FastAPI(title="Trade Journal Data API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health():
    providers = await router.health() if router else {}
    return HealthResponse(status="ok", providers=providers)


@app.get("/kline", response_model=KLineResponse)
async def get_kline(
    symbol: str = Query(..., description="标的代码"),
    period: str = Query("daily", description="周期"),
    limit: int = Query(300, ge=1, le=2000),
    adjust: str = Query("qfq"),
):
    if not router:
        raise HTTPException(503, "服务未就绪")

    req = KLineRequest(symbol=symbol.strip(), period=period, limit=limit, adjust=adjust)
    try:
        return await router.fetch_kline(req)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except RuntimeError as e:
        raise HTTPException(502, str(e))
    except Exception as e:
        logger.exception(f"K线获取异常: {symbol}")
        raise HTTPException(500, str(e))


@app.get("/info")
async def get_info(
    symbol: str = Query(..., description="标的代码"),
):
    if not router:
        raise HTTPException(503, "服务未就绪")
    try:
        return await router.get_symbol_info(symbol)
    except Exception as e:
        logger.exception(f"获取标的信息异常: {symbol}")
        raise HTTPException(500, str(e))


@app.get("/search", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, description="搜索关键词"),
    market: str = Query(None),
):
    if not router:
        raise HTTPException(503, "服务未就绪")
    try:
        results = await router.search_symbols(q, market)
        formatted = [SearchResult(**item) for item in results]
        return SearchResponse(query=q, results=formatted)
    except Exception as e:
        logger.exception(f"搜索失败: {q}")
        raise HTTPException(500, str(e))



@app.post("/shutdown")
async def shutdown():
    logger.info("收到关闭请求")
    import threading
    threading.Timer(0.5, lambda: os._exit(0)).start()
    return {"status": "shutting_down"}
