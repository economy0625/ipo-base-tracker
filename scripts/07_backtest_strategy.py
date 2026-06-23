from __future__ import annotations

import pandas as pd

from common import OUTPUT_DIR, PROCESSED_DIR, run_step


def process(df: pd.DataFrame) -> pd.DataFrame:
    prices = pd.read_csv(PROCESSED_DIR / "03_daily_prices.csv", dtype={"stock_code": str})
    prices["trade_date"] = pd.to_datetime(prices["trade_date"])
    prices = prices.sort_values(["stock_code", "trade_date"])

    rows: list[dict[str, object]] = []
    for _, signal in df.iterrows():
        stock_code = str(signal["stock_code"]).zfill(6)
        stock_prices = prices[prices["stock_code"].astype(str).str.zfill(6).eq(stock_code)]
        if len(stock_prices) < 20:
            continue

        entry = float(stock_prices.iloc[-20]["close"])
        exit_price = float(stock_prices.iloc[-1]["close"])
        rows.append(
            {
                "stock_code": stock_code,
                "signal_type": signal["signal_type"],
                "entry_price": entry,
                "exit_price": exit_price,
                "return_percent": ((exit_price - entry) / entry) * 100,
                "holding_days": 20,
            }
        )

    return pd.DataFrame(rows)


if __name__ == "__main__":
    run_step(
        "07_backtest_strategy.py",
        "Backtest signal-based strategy.",
        PROCESSED_DIR / "06_signals.csv",
        OUTPUT_DIR / "07_backtest_results.csv",
        process,
    )
