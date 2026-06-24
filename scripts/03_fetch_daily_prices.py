from __future__ import annotations

import argparse
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

from common import (
    OUTPUT_DIR,
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
        description="Fetch daily OHLCV data with FinanceDataReader."
    )
    parser.add_argument(
        "--input",
        default=str(PROCESSED_DIR / "companies.csv"),
        help="Input companies CSV path",
    )
    parser.add_argument(
        "--output-dir",
        default=str(RAW_DIR / "prices"),
        help="Directory where per-stock price CSV files are saved",
    )
    parser.add_argument(
        "--errors",
        default=str(OUTPUT_DIR / "price_fetch_errors.csv"),
        help="Output failed stock errors CSV path",
    )
    parser.add_argument(
        "--end-date",
        default=date.today().isoformat(),
        help="Fetch end date in YYYY-MM-DD format",
    )
    return parser.parse_args()


def load_fdr():
    try:
        import FinanceDataReader as fdr
    except ImportError as exc:
        raise ImportError(
            "FinanceDataReader is required. Install it with: pip install finance-datareader"
        ) from exc
    return fdr


def normalize_stock_code(value: object) -> str:
    return str(value).replace(".0", "").strip().zfill(6)


def get_fetch_start_date(company: pd.Series, existing_path: Path) -> date:
    listing_date = pd.to_datetime(company["listing_date"], errors="coerce")
    if pd.isna(listing_date):
        raise ValueError("listing_date is invalid")

    start_date = listing_date.date()
    if not existing_path.exists():
        return start_date

    existing = pd.read_csv(existing_path)
    if existing.empty or "trade_date" not in existing.columns:
        return start_date

    latest_date = pd.to_datetime(existing["trade_date"], errors="coerce").max()
    if pd.isna(latest_date):
        return start_date

    return latest_date.date() + timedelta(days=1)


def fetch_price_frame(stock_code: str, start_date: date, end_date: date) -> pd.DataFrame:
    if start_date > end_date:
        return pd.DataFrame(columns=PRICE_COLUMNS)

    fdr = load_fdr()
    raw = fdr.DataReader(stock_code, start_date.isoformat(), end_date.isoformat())
    if raw is None or raw.empty:
        return pd.DataFrame(columns=PRICE_COLUMNS)

    result = raw.reset_index()
    date_column = "Date" if "Date" in result.columns else result.columns[0]
    result = result.rename(
        columns={
            date_column: "trade_date",
            "Open": "open_price",
            "High": "high_price",
            "Low": "low_price",
            "Close": "close_price",
            "Volume": "volume",
        }
    )

    result["stock_code"] = stock_code
    result["trade_date"] = pd.to_datetime(result["trade_date"]).dt.date.astype(str)
    return result[PRICE_COLUMNS]


def merge_existing_prices(existing_path: Path, new_prices: pd.DataFrame) -> pd.DataFrame:
    if existing_path.exists():
        existing = pd.read_csv(existing_path, dtype={"stock_code": str})
    else:
        existing = pd.DataFrame(columns=PRICE_COLUMNS)

    combined = pd.concat([existing, new_prices], ignore_index=True)
    if combined.empty:
        return combined[PRICE_COLUMNS]

    combined["stock_code"] = combined["stock_code"].map(normalize_stock_code)
    combined["trade_date"] = pd.to_datetime(combined["trade_date"], errors="coerce").dt.date.astype(str)
    combined = combined.dropna(subset=["trade_date"])
    combined = combined.drop_duplicates(subset=["stock_code", "trade_date"], keep="last")
    combined = combined.sort_values(["stock_code", "trade_date"])
    return combined[PRICE_COLUMNS].reset_index(drop=True)


def add_error(errors: list[dict[str, object]], stock_code: str, company_name: object, message: str) -> None:
    errors.append(
        {
            "stock_code": stock_code,
            "company_name": "" if pd.isna(company_name) else company_name,
            "error": message,
        }
    )


def main() -> None:
    ensure_data_dirs()
    args = parse_args()
    input_path = Path(args.input)
    output_dir = Path(args.output_dir)
    errors_path = Path(args.errors)
    end_date = pd.to_datetime(args.end_date).date()
    output_dir.mkdir(parents=True, exist_ok=True)

    errors: list[dict[str, object]] = []

    try:
        input_path = resolve_input_path(
            input_path,
            PROCESSED_DIR / "companies.csv",
            [PROCESSED_DIR / "02_companies.csv"],
            "python scripts/01_import_listings_csv.py",
        )
        companies = pd.read_csv(input_path, dtype={"stock_code": str})
        required_columns = ["stock_code", "company_name", "listing_date"]
        missing = [column for column in required_columns if column not in companies.columns]
        if missing:
            raise ValueError(f"Missing required columns: {', '.join(missing)}")

        saved_count = 0
        for _, company in companies.iterrows():
            stock_code = normalize_stock_code(company["stock_code"])
            output_path = output_dir / f"{stock_code}.csv"

            try:
                start_date = get_fetch_start_date(company, output_path)
                new_prices = fetch_price_frame(stock_code, start_date, end_date)
                merged = merge_existing_prices(output_path, new_prices)
                write_csv(merged, output_path)
                saved_count += 1
                print(f"{stock_code}: saved {len(merged)} rows")
            except Exception as exc:
                add_error(errors, stock_code, company.get("company_name"), str(exc))

        if errors:
            write_csv(pd.DataFrame(errors), errors_path)
            print(f"Saved {len(errors)} errors to {errors_path}")
        else:
            write_csv(pd.DataFrame(columns=["stock_code", "company_name", "error"]), errors_path)
            print(f"No price fetch errors. Saved empty error file to {errors_path}")

        print(f"Completed {saved_count} stock price files in {output_dir}")
    except FileNotFoundError as exc:
        print(exc)
        record_error("03_fetch_daily_prices.py", str(exc), input_path)
    except Exception as exc:
        record_error("03_fetch_daily_prices.py", str(exc), input_path)
        raise


if __name__ == "__main__":
    main()
