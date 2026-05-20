"""
Provider 基类 —— 所有数据源的统一接口
参考 Vibe-Trading 的 data-routing 架构
"""

from abc import ABC, abstractmethod
from typing import Optional
from src.models import KLineItem, KLineRequest


class BaseProvider(ABC):
    """数据源基类"""

    name: str = "base"
    market: str = "unknown"

    @abstractmethod
    async def fetch_kline(self, req: KLineRequest) -> list[KLineItem]:
        """获取 K 线数据"""
        ...

    async def health(self) -> bool:
        """健康检查（默认尝试获取一条数据）"""
        try:
            test_req = KLineRequest(symbol=self._test_symbol(), period="daily", limit=1)
            data = await self.fetch_kline(test_req)
            return len(data) > 0
        except Exception as e:
            import logging
            logging.getLogger("provider").warning(f"[{self.name}] Health check failed: {e}")
            return False

    def _test_symbol(self) -> str:
        """健康检查用的测试标的"""
        return "000001.SZ"

    def __repr__(self):
        return f"<{self.name}({self.market})>"
