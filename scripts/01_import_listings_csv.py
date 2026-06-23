from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

from common import OUTPUT_DIR, PROCESSED_DIR, RAW_DIR, ensure_data_dirs, record_error, write_csv


REQUIRED_COLUMNS = ["stock_code", "company_name", "market", "listing_date", "ipo_price"]
BOOLEAN_FILTER_COLUMNS = ["is_spac", "is_spac_merger", "is_transfer_listing"]
OUTPUT_COLUMNS = [
    "stock_code",
    "company_name",
    "market",
    "listing_date",
    "ipo_price",
    "adjusted_ipo_price",
    "industry",
    "theme_tags",
    "business_summary",
    "is_spac",
    "is_transfer_listing",
    "is_spac_merger",
    "is_tech_special",
    "is_bio",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import listings CSV and create normalized companies.csv."
    )
    parser.add_argument(
        "--input",
        default=str(RAW_DIR / "listings.csv"),
        help="Input listings CSV path",
    )
    parser.add_argument(
        "--output",
        default=str(PROCESSED_DIR / "companies.csv"),
        help="Output companies CSV path",
    )
    parser.add_argument(
        "--errors",
        default=str(OUTPUT_DIR / "listing_errors.csv"),
        help="Output row-level errors CSV path",
    )
    return parser.parse_args()


def parse_bool(value: object) -> bool:
    if pd.isna(value):
        return False
    if isinstance(value, bool):
        return value
    normalized = str(value).strip().lower()
    return normalized in {"1", "true", "t", "yes", "y", "스팩", "해당"}


def parse_theme_tags(value: object) -> str:
    if pd.isna(value) or str(value).strip() == "":
        return "[]"

    raw = str(value).strip()
    if raw.startswith("[") and raw.endswith("]"):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return json.dumps([str(item).strip() for item in parsed if str(item).strip()], ensure_ascii=False)
        except json.JSONDecodeError:
            pass

    separators = ["|", ";", ","]
    tags = [raw]
    for separator in separators:
        if separator in raw:
            tags = raw.split(separator)
            break

    return json.dumps([tag.strip() for tag in tags if tag.strip()], ensure_ascii=False)


def add_error(errors: list[dict[str, object]], row_number: int | str, stock_code: object, company_name: object, reason: str) -> None:
    errors.append(
        {
            "row_number": row_number,
            "stock_code": "" if pd.isna(stock_code) else stock_code,
            "company_name": "" if pd.isna(company_name) else company_name,
            "reason": reason,
        }
    )


def validate_required_columns(df: pd.DataFrame, errors_path: Path) -> None:
    missing_columns = [column for column in REQUIRED_COLUMNS if column not in df.columns]
    if not missing_columns:
        return

    errors = [
        {
            "row_number": "file",
            "stock_code": "",
            "company_name": "",
            "reason": f"필수 컬럼 누락: {', '.join(missing_columns)}",
        }
    ]
    write_csv(pd.DataFrame(errors), errors_path)
    raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")


def normalize_listings(df: pd.DataFrame, errors_path: Path) -> pd.DataFrame:
    validate_required_columns(df, errors_path)

    working = df.copy()
    errors: list[dict[str, object]] = []

    for column in BOOLEAN_FILTER_COLUMNS + ["is_tech_special", "is_bio"]:
        if column not in working.columns:
            working[column] = False
        working[column] = working[column].map(parse_bool)

    if "adjusted_ipo_price" not in working.columns:
        working["adjusted_ipo_price"] = working["ipo_price"]
    if "industry" not in working.columns:
        working["industry"] = ""
    if "theme_tags" not in working.columns:
        working["theme_tags"] = ""
    if "business_summary" not in working.columns:
        working["business_summary"] = ""

    working["stock_code"] = working["stock_code"].astype(str).str.replace(r"\.0$", "", regex=True).str.zfill(6)
    working["company_name"] = working["company_name"].astype(str).str.strip()
    working["market"] = working["market"].astype(str).str.strip().str.upper()
    working["listing_date"] = pd.to_datetime(working["listing_date"], errors="coerce").dt.date
    working["ipo_price"] = pd.to_numeric(working["ipo_price"], errors="coerce")
    working["adjusted_ipo_price"] = pd.to_numeric(working["adjusted_ipo_price"], errors="coerce")
    working["theme_tags"] = working["theme_tags"].map(parse_theme_tags)

    valid_rows: list[pd.Series] = []
    for index, row in working.iterrows():
        row_number = index + 2
        missing_values = [
            column
            for column in REQUIRED_COLUMNS
            if pd.isna(row[column])
            or str(row[column]).strip().lower() in {"", "nan", "nat", "none", "000nan"}
        ]
        if missing_values:
            add_error(
                errors,
                row_number,
                row.get("stock_code"),
                row.get("company_name"),
                f"필수 값 누락: {', '.join(missing_values)}",
            )
            continue

        if row["market"] != "KOSDAQ":
            add_error(errors, row_number, row["stock_code"], row["company_name"], "KOSDAQ 종목 아님")
            continue

        excluded_flags = [column for column in BOOLEAN_FILTER_COLUMNS if bool(row[column])]
        if excluded_flags:
            add_error(
                errors,
                row_number,
                row["stock_code"],
                row["company_name"],
                f"제외 대상: {', '.join(excluded_flags)}",
            )
            continue

        if pd.isna(row["ipo_price"]) or pd.isna(row["adjusted_ipo_price"]):
            add_error(errors, row_number, row["stock_code"], row["company_name"], "공모가 숫자 변환 실패")
            continue

        valid_rows.append(row)

    if errors:
        write_csv(pd.DataFrame(errors), errors_path)
    else:
        write_csv(pd.DataFrame(columns=["row_number", "stock_code", "company_name", "reason"]), errors_path)

    if not valid_rows:
        return pd.DataFrame(columns=OUTPUT_COLUMNS)

    result = pd.DataFrame(valid_rows)
    return result[OUTPUT_COLUMNS].reset_index(drop=True)


def main() -> None:
    ensure_data_dirs()
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)
    errors_path = Path(args.errors)

    try:
        df = pd.read_csv(input_path, dtype={"stock_code": str})
        result = normalize_listings(df, errors_path)
        write_csv(result, output_path)
        print(f"Saved {len(result)} rows to {output_path}")
        print(f"Saved listing errors to {errors_path}")
    except Exception as exc:
        record_error("01_import_listings_csv.py", str(exc), input_path)
        raise


if __name__ == "__main__":
    main()
