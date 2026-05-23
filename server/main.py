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
import re
import sqlite3
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# 确保 server 在 sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

# 项目根目录 (server 的父级)
PROJECT_ROOT = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SERVER_DIR = PROJECT_ROOT / "server"
ENV_FILE = SERVER_DIR / ".env"

# Load environment variables from .env file
load_dotenv(dotenv_path=str(ENV_FILE))

from src.models import (
    KLineRequest, KLineResponse,
    SearchRequest, SearchResponse, SearchResult,
    HealthResponse, SaveTokenRequest, SaveTokenResponse, CheckCacheResponse,
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
    # 确保 .env 文件存在
    if not ENV_FILE.exists():
        ENV_FILE.write_text("# Trade Journal 配置\nTUSHARE_TOKEN=\n")
        logger.info("已创建空 .env 配置文件")
    yield


app = FastAPI(title="Trade Journal Data API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# 原有接口
# ==============================================================================

@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok",
        providers={"sina": True, "akshare": True, "yfinance": True, "ccxt": True, "tushare": True}
    )


@app.get("/kline", response_model=KLineResponse)
async def get_kline(
    symbol: str = Query(..., description="标的代码"),
    market: str = Query(None, description="市场类型"),
    period: str = Query("daily", description="周期"),
    limit: int = Query(300, ge=1, le=2000),
    adjust: str = Query("qfq"),
):
    if not router:
        raise HTTPException(503, "服务未就绪")

    req = KLineRequest(symbol=symbol.strip(), market=market, period=period, limit=limit, adjust=adjust)
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


# ==============================================================================
# Onboarding API — Scenario 03 (隐私优先本地工作区设置与健康度引导)
# ==============================================================================

def _verify_tushare_token(token: str) -> bool:
    """向 Tushare 发起 dummy 请求以校验 Token 有效性"""
    try:
        import tushare as ts
        pro = ts.pro_api(token)
        df = pro.trade_cal(exchange='SSE', start_date='20250101', end_date='20250110')
        return df is not None and not df.empty
    except Exception as e:
        logger.warning(f"Tushare Token 校验失败: {e}")
        return False


def _update_env_file(key: str, value: str) -> None:
    """更新 .env 文件中的环境变量，如果不存在则追加"""
    env_path = ENV_FILE
    if not env_path.exists():
        env_path.write_text(f"{key}={value}\n")
        return

    content = env_path.read_text()
    pattern = re.compile(rf'^{re.escape(key)}=.*$', re.MULTILINE)
    if pattern.search(content):
        content = pattern.sub(f"{key}={value}", content)
    else:
        content = content.rstrip('\n') + f"\n{key}={value}\n"
    env_path.write_text(content)


def _check_sqlite_cache() -> dict:
    """检查本地 SQLite 缓存数据库"""
    db_path = PROJECT_ROOT / "_bmad" / "db" / "trades.db"
    result = {"exists": False, "has_data": False, "message": ""}

    if not db_path.exists():
        result["message"] = f"数据库文件不存在: {db_path.relative_to(PROJECT_ROOT)}"
        return result

    result["exists"] = True
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        # 获取所有表名
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        if not tables:
            result["message"] = "数据库为空，无表结构"
            conn.close()
            return result

        # 检测任一表中是否有数据行
        total_rows = 0
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM [{table}]")
                count = cursor.fetchone()[0]
                total_rows += count
            except Exception:
                pass

        conn.close()
        result["has_data"] = total_rows > 0
        if total_rows > 0:
            result["message"] = f"发现 {len(tables)} 个表, 共 {total_rows} 条缓存记录"
        else:
            result["message"] = f"发现 {len(tables)} 个表, 但无数据记录"
    except Exception as e:
        result["message"] = f"数据库读取异常: {e}"

    return result


@app.get("/api/health")
async def api_health():
    """
    前端自检页使用的详细健康探测接口。
    返回 FastAPI 状态、Tushare Token 配置/校验状态、SQLite 缓存可用性。
    """
    fastapi_ok = True
    tushare_configured = bool(os.getenv("TUSHARE_TOKEN", "").strip())
    tushare_ok = False
    if tushare_configured:
        tushare_ok = _verify_tushare_token(os.getenv("TUSHARE_TOKEN", ""))

    cache_info = _check_sqlite_cache()

    return {
        "status": "ok",
        "fastapi_ok": fastapi_ok,
        "tushare_configured": tushare_configured,
        "tushare_ok": tushare_ok,
        "sqlite_ok": cache_info["exists"],
        "sqlite_has_data": cache_info["has_data"],
        "sqlite_message": cache_info["message"],
    }


@app.post("/api/save-token", response_model=SaveTokenResponse)
async def api_save_token(req: SaveTokenRequest):
    """
    保存并校验 Tushare Token。
    1. 格式检查 (56 位十六进制字符)
    2. Tushare dummy ping 校验
    3. 写入本地 .env 文件
    4. 热重载 DataRouter 中的 Tushare 客户端
    """
    global router

    token = req.token.strip()

    # 格式校验
    if not re.match(r'^[a-fA-F0-9]{56}$', token):
        return SaveTokenResponse(
            status="error",
            message="Token 格式无效：应为 56 位十六进制字符"
        )

    # 向 Tushare 发起 dummy 校验
    if not _verify_tushare_token(token):
        return SaveTokenResponse(
            status="error",
            message="Token 校验失败：无法连接 Tushare 服务或积分不足"
        )

    # 校验成功，写入本地 .env
    _update_env_file("TUSHARE_TOKEN", token)
    os.environ["TUSHARE_TOKEN"] = token

    # 热重载 DataRouter
    try:
        router = DataRouter(tushare_token=token)
        logger.info("Tushare Token 已更新，DataRouter 热重载完成")
    except Exception as e:
        logger.warning(f"DataRouter 热重载失败: {e}")

    return SaveTokenResponse(
        status="success",
        message="Token 校验通过并已保存至本地 .env 文件"
    )


@app.get("/api/check-cache", response_model=CheckCacheResponse)
async def api_check_cache():
    """
    检查本地 SQLite 缓存数据库（_bmad/db/trades.db）是否存在数据。
    用于离线模式降级判断。
    """
    info = _check_sqlite_cache()
    return CheckCacheResponse(**info)
