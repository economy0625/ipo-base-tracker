from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from common import (
    PROCESSED_DIR,
    RAW_DIR,
    ensure_data_dirs,
    record_error,
    resolve_input_path,
    write_csv,
)


PRICE_COLUMNS = [
    "stock_code",
    "trade_date",
    "open_price",
    "high_price",
    "low_price",
    "close_price",
    "volume",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="일별 가격 지표와 종목별 최신 IPO 지표를 계산합니다."
    )
    parser.add_argument(
        "--input",
        default=str(RAW_DIR / "prices"),
        help="종목별 가격 CSV 폴더 또는 이전 통합 가격 CSV",
    )
    parser.add_argument(
        "--companies",
        default=str(PROCESSED_DIR / "companies.csv"),
        help="기업 정보 CSV",
    )
    parser.add_argument(
        "--output",
        default=str(PROCESSED_DIR / "daily_indicators.csv"),
        help="일별 지표 출력 CSV",
    )
    parser.add_argument(
        "--metrics-output",
        default=str(PROCESSED_DIR / "latest_metrics.csv"),
        help="최신 지표 출력 CSV",
    )
    return parser.parse_args()


def normalize_price_columns(df: pd.DataFrame) -> pd.DataFrame:
    aliases = {
        "open": "open_price",
        "high": "high_price",
        "low": "low_price",
        "close": "close_price",
    }
    prices = df.rename(columns=aliases).copy()
    missing = [column for column in PRICE_COLUMNS if column not in prices.columns]
    if missing:
        raise ValueError(f"필수 가격 컬럼이 없습니다: {', '.join(missing)}")
    return prices[PRICE_COLUMNS]


def load_prices(requested_path: Path) -> pd.DataFrame:
    if requested_path.is_dir():
        files = sorted(requested_path.glob("*.csv"))
        if not files:
            raise FileNotFoundError(
                f"가격 파일이 없습니다: {requested_path}\n"
                "먼저 다음 스크립트를 실행해 주세요: python scripts/03_fetch_daily_prices.py"
            )
        return pd.concat(
            [
                normalize_price_columns(
                    pd.read_csv(path, dtype={"stock_code": str})
                )
                for path in files
            ],
            ignore_index=True,
        )

    legacy_path = PROCESSED_DIR / "03_daily_prices.csv"
    resolved = resolve_input_path(
        requested_path,
        RAW_DIR / "prices",
        [legacy_path],
        "python scripts/03_fetch_daily_prices.py",
    )
    return normalize_price_columns(
        pd.read_csv(resolved, dtype={"stock_code": str})
    )


def calculate_indicators(prices: pd.DataFrame) -> pd.DataFrame:
    result = prices.copy()
    result["stock_code"] = result["stock_code"].astype(str).str.zfill(6)
    result["trade_date"] = pd.to_datetime(result["trade_date"], errors="coerce")
    numeric_columns = [
        "open_price",
        "high_price",
        "low_price",
        "close_price",
        "volume",
    ]
    result[numeric_columns] = result[numeric_columns].apply(
        pd.to_numeric, errors="coerce"
    )
    result = result.dropna(subset=["trade_date", "close_price"])
    result = result.sort_values(["stock_code", "trade_date"])

    grouped = result.groupby("stock_code", group_keys=False)
    for window in (20, 60, 120):
        result[f"ma{window}"] = grouped["close_price"].transform(
            lambda values: values.rolling(window, min_periods=1).mean()
        )
    result["volume_ma20"] = grouped["volume"].transform(
        lambda values: values.rolling(20, min_periods=1).mean()
    )
    result["volume_ratio_20d"] = (
        result["volume"] / result["volume_ma20"].replace(0, pd.NA)
    ).fillna(0)
    result["post_listing_high"] = grouped["high_price"].cummax()
    result["post_listing_low"] = grouped["low_price"].cummin()
    result["trade_date"] = result["trade_date"].dt.date.astype(str)
    return result.reset_index(drop=True)


def calculate_latest_metrics(
    indicators: pd.DataFrame, companies: pd.DataFrame
) -> pd.DataFrame:
    company_rows = companies.copy()
    company_rows["stock_code"] = (
        company_rows["stock_code"].astype(str).str.zfill(6)
    )
    company_rows["listing_date"] = pd.to_datetime(
        company_rows["listing_date"], errors="coerce"
    )
    company_rows["adjusted_ipo_price"] = pd.to_numeric(
        company_rows.get("adjusted_ipo_price", company_rows["ipo_price"]),
        errors="coerce",
    )

    latest = (
        indicators.sort_values("trade_date")
        .groupby("stock_code", as_index=False)
        .tail(1)
        .merge(
            company_rows[
                ["stock_code", "listing_date", "adjusted_ipo_price"]
            ],
            on="stock_code",
            how="left",
        )
    )
    current = latest["close_price"]
    ipo = latest["adjusted_ipo_price"]
    high = latest["post_listing_high"]
    low = latest["post_listing_low"]
    trade_dates = pd.to_datetime(latest["trade_date"])

    return pd.DataFrame(
        {
            "stock_code": latest["stock_code"],
            "current_price": current,
            "return_vs_ipo": ((current - ipo) / ipo) * 100,
            "post_listing_high": high,
            "post_listing_low": low,
            "drawdown_from_high": ((current - high) / high) * 100,
            "rebound_from_low": ((current - low) / low) * 100,
            "days_since_listing": (
                trade_dates - latest["listing_date"]
            ).dt.days,
            "ma20": latest["ma20"],
            "ma60": latest["ma60"],
            "ma120": latest["ma120"],
            "volume_ratio_20d": latest["volume_ratio_20d"],
        }
    )


def main() -> None:
    ensure_data_dirs()
    args = parse_args()
    input_path = Path(args.input)

    try:
        companies_path = resolve_input_path(
            args.companies,
            PROCESSED_DIR / "companies.csv",
            [PROCESSED_DIR / "02_companies.csv"],
            "python scripts/01_import_listings_csv.py",
        )
        prices = load_prices(input_path)
        companies = pd.read_csv(
            companies_path, dtype={"stock_code": str}
        )
        indicators = calculate_indicators(prices)
        metrics = calculate_latest_metrics(indicators, companies)
        write_csv(indicators, args.output)
        write_csv(metrics, args.metrics_output)
        print(f"저장 완료: {args.output} ({len(indicators)}행)")
        print(f"저장 완료: {args.metrics_output} ({len(metrics)}행)")
    except FileNotFoundError as exc:
        print(exc)
        record_error("04_calculate_metrics.py", str(exc), input_path)
    except Exception as exc:
        record_error("04_calculate_metrics.py", str(exc), input_path)
        raise


if __name__ == "__main__":
    main()
