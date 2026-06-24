from __future__ import annotations

import argparse
import re
import shutil
from datetime import datetime
from pathlib import Path

import pandas as pd

from common import OUTPUT_DIR, RAW_DIR, ensure_data_dirs, record_error, write_csv


OUTPUT_COLUMNS = [
    "stock_code",
    "company_name",
    "market",
    "listing_date",
    "ipo_price",
    "adjusted_ipo_price",
    "industry",
    "theme_tags",
    "is_spac",
    "is_transfer_listing",
    "is_spac_merger",
    "is_bio",
    "is_tech_special",
]
REQUIRED_COLUMNS = [
    "stock_code",
    "company_name",
    "market",
    "listing_date",
    "ipo_price",
    "is_spac",
    "is_transfer_listing",
    "is_spac_merger",
    "is_tech_special",
]
REVIEW_COLUMNS = [
    "stock_code",
    "company_name",
    "review_field",
    "current_value",
    "message",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Review and promote listings_candidates.csv to listings.csv "
            "with a timestamped backup."
        )
    )
    parser.add_argument(
        "--input",
        default=str(RAW_DIR / "listings_candidates.csv"),
        help="Candidate listings CSV path",
    )
    parser.add_argument(
        "--output",
        default=str(RAW_DIR / "listings.csv"),
        help="Promoted listings CSV path",
    )
    parser.add_argument(
        "--manual-review",
        default=str(OUTPUT_DIR / "listings_manual_review.csv"),
        help="Manual review CSV path",
    )
    parser.add_argument(
        "--start-date",
        default="2020-01-01",
        help="Keep listings on or after this date",
    )
    return parser.parse_args()


def parse_bool(value: object) -> bool:
    if pd.isna(value):
        return False
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "t", "yes", "y"}


def normalize_stock_code(value: object) -> str:
    if pd.isna(value):
        return ""
    raw = re.sub(r"\.0$", "", str(value).strip())
    digits = re.sub(r"\D", "", raw)
    return digits.zfill(6) if digits else ""


def validate_columns(frame: pd.DataFrame) -> None:
    missing = [column for column in REQUIRED_COLUMNS if column not in frame.columns]
    if missing:
        raise ValueError(f"필수 컬럼 누락: {', '.join(missing)}")


def add_review(
    reviews: list[dict[str, object]],
    row: pd.Series,
    field: str,
    message: str,
) -> None:
    reviews.append(
        {
            "stock_code": row["stock_code"],
            "company_name": row["company_name"],
            "review_field": field,
            "current_value": row.get(field, ""),
            "message": message,
        }
    )


def normalize_candidates(
    frame: pd.DataFrame,
    start_date: pd.Timestamp,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    validate_columns(frame)
    working = frame.copy()

    for column in OUTPUT_COLUMNS:
        if column not in working.columns:
            if column in {
                "is_spac",
                "is_transfer_listing",
                "is_spac_merger",
                "is_bio",
                "is_tech_special",
            }:
                working[column] = False
            elif column in {"ipo_price", "adjusted_ipo_price"}:
                working[column] = 0
            else:
                working[column] = ""

    working["stock_code"] = working["stock_code"].map(normalize_stock_code)
    working["company_name"] = (
        working["company_name"].fillna("").astype(str).str.strip()
    )
    working["market"] = working["market"].fillna("").astype(str).str.upper().str.strip()
    working["listing_date_parsed"] = pd.to_datetime(
        working["listing_date"], errors="coerce"
    )
    working["ipo_price"] = pd.to_numeric(
        working["ipo_price"], errors="coerce"
    ).fillna(0)
    working["adjusted_ipo_price"] = pd.to_numeric(
        working["adjusted_ipo_price"], errors="coerce"
    ).fillna(working["ipo_price"])

    for column in [
        "is_spac",
        "is_transfer_listing",
        "is_spac_merger",
        "is_bio",
        "is_tech_special",
    ]:
        working[column] = working[column].map(parse_bool)

    valid_code = working["stock_code"].str.fullmatch(r"\d{6}")
    eligible = working[
        valid_code
        & working["company_name"].ne("")
        & working["market"].eq("KOSDAQ")
        & working["listing_date_parsed"].notna()
        & working["listing_date_parsed"].ge(start_date)
        & ~working["is_spac"]
    ].copy()

    eligible["listing_date"] = eligible["listing_date_parsed"].dt.strftime(
        "%Y-%m-%d"
    )
    eligible = eligible.drop_duplicates("stock_code", keep="first")
    eligible = eligible.sort_values(
        ["listing_date", "stock_code"], ascending=[False, True]
    ).reset_index(drop=True)

    reviews: list[dict[str, object]] = []
    for _, row in eligible.iterrows():
        if float(row["ipo_price"]) == 0:
            add_review(
                reviews,
                row,
                "ipo_price",
                "공모가가 0입니다. 증권신고서 또는 공식 공모 자료 확인이 필요합니다.",
            )
        add_review(
            reviews,
            row,
            "is_transfer_listing",
            "이전상장 여부는 자동 판별 기본값입니다. 수동 검증 필요.",
        )
        add_review(
            reviews,
            row,
            "is_spac_merger",
            "스팩합병 여부는 자동 판별 기본값입니다. 수동 검증 필요.",
        )
        add_review(
            reviews,
            row,
            "is_tech_special",
            "기술특례 여부는 자동 판별 기본값입니다. 수동 검증 필요.",
        )

    for column in [
        "is_spac",
        "is_transfer_listing",
        "is_spac_merger",
        "is_bio",
        "is_tech_special",
    ]:
        eligible[column] = eligible[column].map(
            {True: "true", False: "false"}
        )

    review_frame = pd.DataFrame(reviews, columns=REVIEW_COLUMNS)
    return eligible[OUTPUT_COLUMNS], review_frame


def backup_existing(output_path: Path) -> Path | None:
    if not output_path.exists():
        return None

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = output_path.with_name(f"listings_backup_{timestamp}.csv")
    if backup_path.exists():
        raise FileExistsError(f"백업 파일이 이미 존재합니다: {backup_path}")
    shutil.copy2(output_path, backup_path)
    return backup_path


def main() -> None:
    ensure_data_dirs()
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)
    manual_review_path = Path(args.manual_review)

    try:
        if not input_path.exists():
            raise FileNotFoundError(
                f"후보 파일이 없습니다: {input_path}\n"
                "먼저 python scripts/10_fetch_listings_from_api.py 를 실행하세요."
            )

        start_date = pd.to_datetime(args.start_date, errors="raise").normalize()
        candidates = pd.read_csv(input_path, dtype={"stock_code": str})
        promoted, manual_review = normalize_candidates(candidates, start_date)

        backup_path = backup_existing(output_path)
        write_csv(promoted, output_path)
        write_csv(manual_review, manual_review_path)

        if backup_path:
            print(f"기존 listings.csv 백업: {backup_path}")
        print(f"후보 승격 완료: {output_path} ({len(promoted)}행)")
        print(
            f"수동 검토 목록: {manual_review_path} "
            f"({len(manual_review)}행)"
        )
    except Exception as exc:
        record_error("11_promote_listings_candidates.py", str(exc), input_path)
        raise


if __name__ == "__main__":
    main()
