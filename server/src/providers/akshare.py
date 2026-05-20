"""
AKShare Provider —— 实时行情（健壮防护版）

数据获取:
  日/周/月线: stock_zh_a_spot_em → 全市场快照 → 按代码筛选
  分钟线:    stock_zh_a_hist_min_em（仅此接口提供分钟数据）
  期货:      stock_zh_a_spot_em 不支持期货，用 futures_main_sina 兜底

特点:
  - stock_zh_a_spot_em 是轻量级全市场快照，比逐股拉取更稳定
  - 多层 try/except 防护，单个 API 失败不影响整体
  - 空 DataFrame / 字段缺失 / 类型异常 全部安全处理
"""

import re
import asyncio
import logging
from datetime import datetime
from typing import Optional

from src.providers.base import BaseProvider
from src.models import KLineItem, KLineRequest

logger = logging.getLogger(__name__)


class AKShareProvider(BaseProvider):
    name = "akshare"
    market = "ashare"

    # 缓存：避免高频重复拉取全市场快照（有效期 30s）
    _spot_cache: Optional["pd.DataFrame"] = None
    _spot_cache_ts: float = 0

    def _clean_code(self, symbol: str) -> str:
        return re.sub(r"[^0-9]", "", symbol.strip().upper())

    def _is_futures(self, symbol: str) -> bool:
        return bool(re.match(r'^[A-Z]{1,3}\d{3,4}$', symbol.strip().upper()))

    # ========== 主入口 ==========

    async def fetch_kline(self, req: KLineRequest) -> list[KLineItem]:
        symbol = req.symbol.strip().upper()
        code = self._clean_code(symbol)
        period = req.period

        # 期货专用通道
        if self._is_futures(symbol):
            return await self._futures_safe(symbol)

        # 分钟线
        if period in ("1min", "5min", "15min", "30min", "60min", "1m", "5m", "15m", "30m", "1H"):
            return await self._minute_safe(code, period)

        # 日/周/月线 → stock_zh_a_spot_em 快照
        return await self._spot_safe(code, symbol)

    # ========== 日/周/月线 → spot 快照 ==========

    async def _spot_safe(self, code: str, symbol: str) -> list[KLineItem]:
        """stock_zh_a_spot_em → 全市场快照 → 筛选目标标的"""
        import akshare as ak

        # 带超时的异步封装
        try:
            df = await asyncio.wait_for(
                asyncio.to_thread(self._get_spot_cached, ak),
                timeout=25.0,
            )
        except asyncio.TimeoutError:
            logger.warning(f"[AKShare] spot 超时")
            return []
        except Exception as e:
            logger.warning(f"[AKShare] spot 异常: {e}")
            return []

        if df is None or df.empty:
            logger.warning(f"[AKShare] spot 返回空")
            return []

        return self._spot_to_kline(df, code)

    def _get_spot_cached(self, ak):
        """缓存 30s，避免重复拉取"""
        import time
        now = time.time()
        if self._spot_cache is not None and (now - self._spot_cache_ts) < 30:
            return self._spot_cache

        df = ak.stock_zh_a_spot_em()
        self._spot_cache = df
        self._spot_cache_ts = now
        return df

    def _spot_to_kline(self, df, code: str) -> list[KLineItem]:
        """从 spot DataFrame 中筛选目标代码并构造 KLineItem"""
        # 列名适配（兼容不同版本）
        col_map = self._detect_columns(df)
        if not col_map:
            return []

        # 按代码筛选
        code_col = col_map.get("code")
        if code_col:
            row_df = df[df[code_col].astype(str).str.strip() == code]
        else:
            return []

        if row_df.empty:
            logger.warning(f"[AKShare] spot 未找到代码: {code}")
            return []

        row = row_df.iloc[0]

        try:
            last_close = self._safe_float(row, col_map, "pre_close") or 0
            open_p = self._safe_float(row, col_map, "open") or last_close
            high = self._safe_float(row, col_map, "high") or open_p
            low = self._safe_float(row, col_map, "low") or open_p
            close = self._safe_float(row, col_map, "price") or last_close
            volume = self._safe_float(row, col_map, "volume") or 0
            amount = self._safe_float(row, col_map, "amount") or 0
            ts = int(datetime.now().timestamp() * 1000)

            return [KLineItem(
                timestamp=ts, open=open_p, high=high, low=low,
                close=close, volume=volume, turnover=amount,
            )]
        except Exception as e:
            logger.warning(f"[AKShare] spot 字段解析失败: {e}")
            return []

    def _detect_columns(self, df) -> dict[str, str]:
        """自适应列名检测（兼容不同版本的 AKShare）"""
        candidates = {
            "code":      ["代码", "code", "symbol", "ts_code"],
            "name":      ["名称", "name"],
            "price":     ["最新价", "price", "close", "trade"],
            "open":      ["今开", "open"],
            "high":      ["最高", "high"],
            "low":       ["最低", "low"],
            "pre_close": ["昨收", "pre_close", "preclose", "settlement"],
            "volume":    ["成交量", "volume", "vol"],
            "amount":    ["成交额", "amount", "turnover"],
            "change":    ["涨跌幅", "pct_change", "change"],
        }
        result = {}
        cols = {c.lower(): c for c in df.columns}
        for key, names in candidates.items():
            for name in names:
                if name in df.columns:
                    result[key] = name
                    break
                if name.lower() in cols:
                    result[key] = cols[name.lower()]
                    break
        return result

    @staticmethod
    def _safe_float(row, col_map: dict, key: str, default: float = 0) -> float:
        col = col_map.get(key)
        if not col:
            return default
        try:
            val = row[col]
            if val is None or (isinstance(val, float) and val != val):  # NaN
                return default
            return float(val)
        except (ValueError, TypeError, KeyError):
            return default

    # ========== 分钟线 ==========

    async def _minute_safe(self, code: str, period: str) -> list[KLineItem]:
        """分钟线（保留 hist_min_em，spot 不支持分钟）"""
        import akshare as ak

        freq_map = {"1min": "1", "1m": "1", "5min": "5", "5m": "5",
                     "15min": "15", "15m": "15",
                     "30min": "30", "30m": "30",
                     "60min": "60", "1H": "60", "60": "60"}
        freq = freq_map.get(period, "5")

        try:
            df = await asyncio.wait_for(
                asyncio.to_thread(ak.stock_zh_a_hist_min_em, symbol=code, period=freq, adjust="qfq"),
                timeout=20.0,
            )
            if df is None or df.empty:
                return []
            return self._minute_df_to_items(df)
        except asyncio.TimeoutError:
            logger.warning(f"[AKShare] minute 超时: {code}")
        except Exception as e:
            logger.warning(f"[AKShare] minute 异常: {code} {e}")
        return []

    def _minute_df_to_items(self, df) -> list[KLineItem]:
        items = []
        for _, row in df.tail(800).iterrows():
            try:
                ts = 0
                for col_name in ("时间", "datetime", "trade_time"):
                    if col_name in row:
                        val = row[col_name]
                        if hasattr(val, 'timestamp'):
                            ts = int(val.timestamp() * 1000)
                        elif isinstance(val, str) and len(val) >= 19:
                            ts = int(datetime.strptime(val[:19], "%Y-%m-%d %H:%M:%S").timestamp() * 1000)
                        break

                items.append(KLineItem(
                    timestamp=ts,
                    open=self._safe_row_float(row, "开盘", "open"),
                    high=self._safe_row_float(row, "最高", "high"),
                    low=self._safe_row_float(row, "最低", "low"),
                    close=self._safe_row_float(row, "收盘", "close"),
                    volume=self._safe_row_float(row, "成交量", "volume"),
                    turnover=self._safe_row_float(row, "成交额", "amount"),
                ))
            except Exception:
                continue
        return items

    # ========== 期货 ==========

    async def _futures_safe(self, symbol: str) -> list[KLineItem]:
        """期货数据（spot 不支持期货，用 futures_main_sina 兜底）"""
        import akshare as ak

        try:
            df = await asyncio.wait_for(
                asyncio.to_thread(ak.futures_main_sina, symbol=symbol),
                timeout=15.0,
            )
            if df is None or df.empty:
                return []
            items = []
            for _, row in df.tail(800).iterrows():
                try:
                    date_val = row.get("日期") or row.get("date")
                    ts = 0
                    if hasattr(date_val, 'timestamp'):
                        ts = int(date_val.timestamp() * 1000)
                    elif isinstance(date_val, str) and len(date_val) >= 10:
                        ts = int(datetime.strptime(date_val[:10], "%Y-%m-%d").timestamp() * 1000)

                    items.append(KLineItem(
                        timestamp=ts,
                        open=self._safe_row_float(row, "开盘价", "open"),
                        high=self._safe_row_float(row, "最高价", "high"),
                        low=self._safe_row_float(row, "最低价", "low"),
                        close=self._safe_row_float(row, "收盘价", "close"),
                        volume=self._safe_row_float(row, "成交量", "volume"),
                        turnover=self._safe_row_float(row, "成交额", "amount"),
                    ))
                except Exception:
                    continue
            return items
        except asyncio.TimeoutError:
            logger.warning(f"[AKShare] futures 超时: {symbol}")
        except Exception as e:
            logger.warning(f"[AKShare] futures 异常: {symbol} {e}")
        return []

    # ========== 工具 ==========

    @staticmethod
    def _safe_row_float(row, *names, default=0.0):
        for n in names:
            if n in row:
                try:
                    v = row[n]
                    return float(v) if v is not None else default
                except (ValueError, TypeError):
                    continue
        return default

    def _test_symbol(self) -> str:
        return "000001"
