from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from common import OUTPUT_DIR, RAW_DIR, ensure_data_dirs, record_error, write_csv


OUTPUT_COLUMNS = [
    "stock_code",
    "company_name",
    "listing_date",
    "market",
    "industry",
    "ipo_price",
    "adjusted_ipo_price",
    "review_note",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Find listings with missing IPO price fields."
    )
    parser.add_argument(
        "--input",
        default=str(RAW_DIR / "listings.csv"),
        help="Input listings CSV path",
    )
    parser.add_argument(
        "--output",
        default=str(OUTPUT_DIR / "missing_ipo_prices.csv"),
        help="Output review CSV path",
    )
    return parser.parse_args()


def normalize_stock_code(value: object) -> str:
    return str(value).replace(".0", "").strip().zfill(6)


def is_missing_price(series: pd.Series) -> pd.Series:
    numeric = pd.to_numeric(series, errors="coerce")
    text_missing = series.astype(str).str.strip().str.lower().isin(
        {"", "nan", "none", "null"}
    )
    return numeric.isna() | numeric.eq(0) | text_missing


def main() -> None:
    ensure_data_dirs()
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)

    try:
        if not input_path.exists():
            raise FileNotFoundError(f"입력 파일이 없습니다: {input_path}")

        listings = pd.read_csv(input_path, dtype={"stock_code": str})
        required_columns = [
            "stock_code",
            "company_name",
            "listing_date",
            "market",
            "industry",
            "ipo_price",
            "adjusted_ipo_price",
        ]
        missing_columns = [
            column for column in required_columns if column not in listings.columns
        ]
        if missing_columns:
            raise ValueError(f"필수 컬럼 누락: {', '.join(missing_columns)}")

        review_mask = is_missing_price(listings["ipo_price"]) | is_missing_price(
            listings["adjusted_ipo_price"]
        )
        review = listings.loc[review_mask, required_columns].copy()
        review["stock_code"] = review["stock_code"].map(normalize_stock_code)
        review["review_note"] = "공모가 수동 확인 필요"

        write_csv(review[OUTPUT_COLUMNS], output_path)
        print(f"공모가 누락 검토 대상: {len(review)}개")
        print(f"저장 완료: {output_path}")
    except Exception as exc:
        record_error("12_review_missing_ipo_prices.py", str(exc), input_path)
        raise


if __name__ == "__main__":
    main()
