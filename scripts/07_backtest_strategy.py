from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from common import (
    OUTPUT_DIR,
    PROCESSED_DIR,
    ensure_data_dirs,
    record_error,
    resolve_input_path,
    write_csv,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="신호 기반 전략을 백테스트합니다.")
    parser.add_argument(
        "--input",
        default=str(PROCESSED_DIR / "signals.csv"),
        help="신호 CSV",
    )
    parser.add_argument(
        "--prices",
        default=str(PROCESSED_DIR / "daily_indicators.csv"),
        help="일별 지표 CSV",
    )
    parser.add_argument(
        "--output",
        default=str(OUTPUT_DIR / "trade_log.csv"),
        help="거래 내역 CSV",
    )
    parser.add_argument(
        "--stock-returns-output",
        default=str(OUTPUT_DIR / "stock_returns.csv"),
    )
    parser.add_argument(
        "--summary-output",
        default=str(OUTPUT_DIR / "strategy_summary.csv"),
    )
    parser.add_argument(
        "--yearly-output",
        default=str(OUTPUT_DIR / "yearly_returns.csv"),
    )
    return parser.parse_args()


def build_trade_log(signals: pd.DataFrame, prices: pd.DataFrame) -> pd.DataFrame:
    close_column = "close_price" if "close_price" in prices.columns else "close"
    prices["stock_code"] = prices["stock_code"].astype(str).str.zfill(6)
    prices["trade_date"] = pd.to_datetime(prices["trade_date"])
    prices = prices.sort_values(["stock_code", "trade_date"])
    rows: list[dict[str, object]] = []

    for _, signal in signals.iterrows():
        if signal.get("signal_type") == "공모가 회복":
            ipo_available = str(signal.get("ipo_price_available", "true")).lower()
            if ipo_available in {"false", "0", "no"}:
                continue
        stock_code = str(signal["stock_code"]).zfill(6)
        signal_date = pd.to_datetime(signal["signal_date"])
        future = prices[
            prices["stock_code"].eq(stock_code)
            & prices["trade_date"].ge(signal_date)
        ].head(21)
        if len(future) < 2:
            continue
        entry = future.iloc[0]
        exit_row = future.iloc[-1]
        entry_price = float(entry[close_column])
        exit_price = float(exit_row[close_column])
        rows.append(
            {
                "stock_code": stock_code,
                "signal_type": signal["signal_type"],
                "entry_date": entry["trade_date"].date().isoformat(),
                "exit_date": exit_row["trade_date"].date().isoformat(),
                "entry_price": entry_price,
                "exit_price": exit_price,
                "return_percent": (
                    (exit_price - entry_price) / entry_price
                ) * 100,
                "holding_days": len(future) - 1,
            }
        )
    return pd.DataFrame(
        rows,
        columns=[
            "stock_code",
            "signal_type",
            "entry_date",
            "exit_date",
            "entry_price",
            "exit_price",
            "return_percent",
            "holding_days",
        ],
    )


def summarize(trades: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    if trades.empty:
        stock_returns = pd.DataFrame(
            columns=["stock_code", "trade_count", "average_return", "total_return"]
        )
        summary = pd.DataFrame(
            [
                {
                    "trade_count": 0,
                    "win_rate": 0.0,
                    "average_return": 0.0,
                    "total_return": 0.0,
                }
            ]
        )
        yearly = pd.DataFrame(
            columns=["year", "trade_count", "average_return", "total_return"]
        )
        return stock_returns, summary, yearly

    stock_returns = (
        trades.groupby("stock_code")["return_percent"]
        .agg(trade_count="count", average_return="mean", total_return="sum")
        .reset_index()
    )
    summary = pd.DataFrame(
        [
            {
                "trade_count": len(trades),
                "win_rate": (trades["return_percent"] > 0).mean() * 100,
                "average_return": trades["return_percent"].mean(),
                "total_return": trades["return_percent"].sum(),
            }
        ]
    )
    yearly_source = trades.assign(
        year=pd.to_datetime(trades["exit_date"]).dt.year
    )
    yearly = (
        yearly_source.groupby("year")["return_percent"]
        .agg(trade_count="count", average_return="mean", total_return="sum")
        .reset_index()
    )
    return stock_returns, summary, yearly


def main() -> None:
    ensure_data_dirs()
    args = parse_args()
    try:
        signals_path = resolve_input_path(
            args.input,
            PROCESSED_DIR / "signals.csv",
            [PROCESSED_DIR / "06_signals.csv"],
            "python scripts/06_detect_signals.py",
        )
        prices_path = resolve_input_path(
            args.prices,
            PROCESSED_DIR / "daily_indicators.csv",
            [PROCESSED_DIR / "03_daily_prices.csv"],
            "python scripts/04_calculate_metrics.py",
        )
        signals = pd.read_csv(signals_path, dtype={"stock_code": str})
        prices = pd.read_csv(prices_path, dtype={"stock_code": str})
        trades = build_trade_log(signals, prices)
        stock_returns, summary, yearly = summarize(trades)
        write_csv(trades, args.output)
        write_csv(stock_returns, args.stock_returns_output)
        write_csv(summary, args.summary_output)
        write_csv(yearly, args.yearly_output)
        print(f"저장 완료: {args.output} ({len(trades)}행)")
        print(f"저장 완료: {args.stock_returns_output}")
        print(f"저장 완료: {args.summary_output}")
        print(f"저장 완료: {args.yearly_output}")
    except FileNotFoundError as exc:
        print(exc)
        record_error("07_backtest_strategy.py", str(exc), args.input)
    except Exception as exc:
        record_error("07_backtest_strategy.py", str(exc), args.input)
        raise


if __name__ == "__main__":
    main()
