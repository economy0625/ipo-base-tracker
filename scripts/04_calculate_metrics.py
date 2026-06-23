from __future__ import annotations

import pandas as pd

from common import PROCESSED_DIR, run_step


def process(df: pd.DataFrame) -> pd.DataFrame:
    required_columns = ["stock_code", "trade_date", "close", "volume"]
    missing = [column for column in required_columns if column not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}")

    company_path = PROCESSED_DIR / "02_companies.csv"
    companies = pd.read_csv(company_path, dtype={"stock_code": str})
    prices = df.copy()
    prices["stock_code"] = prices["stock_code"].astype(str).str.zfill(6)
    prices["trade_date"] = pd.to_datetime(prices["trade_date"])
    prices = prices.sort_values(["stock_code", "trade_date"])

    metric_rows: list[dict[str, object]] = []
    for stock_code, group in prices.groupby("stock_code"):
        company = companies[companies["stock_code"].astype(str).str.zfill(6).eq(stock_code)].iloc[0]
        latest = group.iloc[-1]
        current_price = float(latest["close"])
        adjusted_ipo_price = float(company["adjusted_ipo_price"])
        post_listing_high = float(group["close"].max())
        post_listing_low = float(group["close"].min())
        ma20 = float(group["close"].tail(20).mean())
        ma60 = float(group["close"].tail(60).mean())
        ma120 = float(group["close"].tail(120).mean())
        volume_ratio_20d = float(latest["volume"] / group["volume"].tail(20).mean())

        metric_rows.append(
            {
                "stock_code": stock_code,
                "current_price": current_price,
                "return_vs_ipo": ((current_price - adjusted_ipo_price) / adjusted_ipo_price) * 100,
                "post_listing_high": post_listing_high,
                "post_listing_low": post_listing_low,
                "drawdown_from_high": ((current_price - post_listing_high) / post_listing_high) * 100,
                "rebound_from_low": ((current_price - post_listing_low) / post_listing_low) * 100,
                "days_since_listing": int((latest["trade_date"] - pd.to_datetime(company["listing_date"])).days),
                "ma20": ma20,
                "ma60": ma60,
                "ma120": ma120,
                "volume_ratio_20d": volume_ratio_20d,
            }
        )

    return pd.DataFrame(metric_rows)


if __name__ == "__main__":
    run_step(
        "04_calculate_metrics.py",
        "Calculate IPO metrics from daily prices.",
        PROCESSED_DIR / "03_daily_prices.csv",
        PROCESSED_DIR / "04_ipo_metrics.csv",
        process,
    )
