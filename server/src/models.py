from pydantic import BaseModel, Field
from typing import Optional, Literal, Any


class KLineItem(BaseModel):
    """单根 K 线"""
    timestamp: int = Field(..., description="Unix 毫秒时间戳")
    open: float
    high: float
    low: float
    close: float
    volume: float = 0
    turnover: float = 0


class KLineRequest(BaseModel):
    """K 线请求"""
    symbol: str = Field(..., description="标的代码，如 000001.SZ / BTC/USDT:binance")
    market: Optional[str] = Field(default=None, description="市场类型")
    period: str = Field(default="daily", description="周期: 1min/5min/15min/30min/60min/daily/weekly/monthly")
    limit: int = Field(default=300, ge=1, le=2000)
    adjust: str = Field(default="qfq", description="复权: qfq/hfq/None")


class KLineResponse(BaseModel):
    """K 线响应"""
    symbol: str
    market: str
    provider: str
    period: str
    count: int
    data: list[KLineItem] = []


class SearchRequest(BaseModel):
    """搜索请求"""
    q: str = Field(..., min_length=1)
    market: Optional[str] = None


class SearchResult(BaseModel):
    """搜索结果"""
    symbol: str
    name: str
    market: str
    exchange: str = ""


class SearchResponse(BaseModel):
    """搜索响应"""
    query: str
    results: list[SearchResult] = []


class HealthResponse(BaseModel):
    """健康检查"""
    status: Literal["ok"]
    version: str = "1.0.0"
    providers: dict[str, bool] = {}


class SaveTokenRequest(BaseModel):
    """保存 Token 请求"""
    token: str = Field(..., description="Tushare API Token")


class SaveTokenResponse(BaseModel):
    """保存 Token 响应"""
    status: str = "success"
    message: str = "Token 保存成功"


class CheckCacheResponse(BaseModel):
    """检查本地 SQLite 缓存响应"""
    exists: bool = False
    has_data: bool = False
    message: str = ""

