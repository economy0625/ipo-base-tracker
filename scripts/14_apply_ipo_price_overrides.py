from __future__ import annotations

import argparse
import shutil
from datetime import datetime
from pathlib import Path

import pandas as pd

from common import OUTPUT_DIR, RAW_DIR, ROOT_DIR, ensure_data_dirs, record_error, write_csv


INPUT_DIR = ROOT_DIR / "data" / "input"
OVERRIDE_REQUIRED_COLUMNS = [
    "stock_code",
    "ipo_price",
    "adjusted_ipo_price",
    "review_status",
]
ERROR_COLUMNS = [
    "stock_code",
    "company_name",
    "ipo_price",
    "adjusted_ipo_price",
    "source_url",
    "review_status",
    "note",
    "error_reason",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Apply confirmed IPO price overrides to data/raw/listings.csv."
    )
    parser.add_argument(
        "--overrides",
        default=str(INPUT_DIR / "ipo_price_overrides.csv"),
        help="Input IPO price overrides CSV path",
    )
    parser.add_argument(
        "--listings",
        default=str(RAW_DIR / "listings.csv"),
        help="Target listings CSV path",
    )
    parser.add_argument(
        "--errors",
        default=str(OUTPUT_DIR / "ipo_price_override_errors.csv"),
        help="Output non-applied override rows CSV path",
    )
    return parser.parse_args()


def normalize_stock_code(value: object) -> str:
    return str(value).replace(".0", "").strip().zfill(6)


def normalize_review_status(value: object) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip().lower()


def add_error(
    errors: list[dict[str, object]],
    row: pd.Series,
    reason: str,
) -> None:
    errors.append(
        {
            "stock_code": row.get("stock_code", ""),
            "company_name": row.get("company_name", ""),
            "ipo_price": row.get("ipo_price", ""),
            "adjusted_ipo_price": row.get("adjusted_ipo_price", ""),
            "source_url": row.get("source_url", ""),
            "review_status": row.get("review_status", ""),
            "note": row.get("note", ""),
            "error_reason": reason,
        }
    )


def validate_columns(frame: pd.DataFrame, required_columns: list[str], file_label: str) -> None:
    missing_columns = [
        column for column in required_columns if column not in frame.columns
    ]
    if missing_columns:
        raise ValueError(
            f"{file_label} 필수 컬럼 누락: {', '.join(missing_columns)}"
        )


def build_backup_path(listings_path: Path) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return listings_path.with_name(f"listings_backup_{timestamp}.csv")


def main() -> None:
    ensure_data_dirs()
    INPUT_DIR.mkdir(parents=True, exist_ok=True)

    args = parse_args()
    overrides_path = Path(args.overrides)
    listings_path = Path(args.listings)
    errors_path = Path(args.errors)

    try:
        if not overrides_path.exists():
            raise FileNotFoundError(f"override 파일이 없습니다: {overrides_path}")
        if not listings_path.exists():
            raise FileNotFoundError(f"listings 파일이 없습니다: {listings_path}")

        overrides = pd.read_csv(overrides_path, dtype={"stock_code": str})
        listings = pd.read_csv(listings_path, dtype={"stock_code": str})

        validate_columns(overrides, OVERRIDE_REQUIRED_COLUMNS, "override")
        validate_columns(
            listings,
            ["stock_code", "ipo_price", "adjusted_ipo_price"],
            "listings",
        )

        overrides = overrides.copy()
        listings = listings.copy()
        overrides["stock_code"] = overrides["stock_code"].map(normalize_stock_code)
        listings["stock_code"] = listings["stock_code"].map(normalize_stock_code)
        overrides["review_status"] = overrides["review_status"].map(
            normalize_review_status
        )

        listings_index = listings.set_index("stock_code", drop=False)
        errors: list[dict[str, object]] = []
        applied_codes: set[str] = set()

        for _, row in overrides.iterrows():
            stock_code = str(row.get("stock_code", "")).strip()
            if not stock_code or stock_code == "000nan":
                add_error(errors, row, "stock_code 누락")
                continue

            if row.get("review_status") != "confirmed":
                continue

            ipo_price = pd.to_numeric(row.get("ipo_price"), errors="coerce")
            adjusted_ipo_price = pd.to_numeric(
                row.get("adjusted_ipo_price"), errors="coerce"
            )
            if pd.isna(ipo_price) or pd.isna(adjusted_ipo_price):
                add_error(errors, row, "공모가 숫자 변환 실패")
                continue
            if ipo_price < 0 or adjusted_ipo_price < 0:
                add_error(errors, row, "공모가는 0 이상이어야 함")
                continue
            if stock_code not in listings_index.index:
                add_error(errors, row, "listings.csv에 없는 stock_code")
                continue

            listings_index.loc[stock_code, "ipo_price"] = ipo_price
            listings_index.loc[stock_code, "adjusted_ipo_price"] = adjusted_ipo_price
            applied_codes.add(stock_code)

        if applied_codes:
            backup_path = build_backup_path(listings_path)
            shutil.copy2(listings_path, backup_path)
            write_csv(listings_index.reset_index(drop=True), listings_path)
            print(f"백업 생성: {backup_path}")
        else:
            print("반영된 종목이 없어 listings.csv를 변경하지 않았습니다.")

        error_frame = pd.DataFrame(errors, columns=ERROR_COLUMNS)
        write_csv(error_frame, errors_path)

        print(f"공모가 override 반영 종목 수: {len(applied_codes)}개")
        print(f"미반영 내역 저장: {errors_path} ({len(error_frame)}행)")
    except Exception as exc:
        record_error("14_apply_ipo_price_overrides.py", str(exc), overrides_path)
        raise


if __name__ == "__main__":
    main()
