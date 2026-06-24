from __future__ import annotations

import argparse
import re
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
REPORT_COLUMNS = ["stock_code", "company_name", "issue_type", "message"]
BIO_KEYWORDS = ["바이오", "제약", "의료", "헬스케어", "진단", "치료제", "신약"]
SPAC_PATTERN = re.compile(r"스팩|SPAC|기업인수목적", re.IGNORECASE)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Fetch KOSDAQ listing candidates with FinanceDataReader without "
            "overwriting data/raw/listings.csv."
        )
    )
    parser.add_argument(
        "--output",
        default=str(RAW_DIR / "listings_candidates.csv"),
        help="Candidate listings CSV path",
    )
    parser.add_argument(
        "--report",
        default=str(OUTPUT_DIR / "listings_fetch_report.csv"),
        help="Fetch and manual validation report CSV path",
    )
    parser.add_argument(
        "--start-date",
        default="2020-01-01",
        help="Keep listings on or after this date when listing_date is known",
    )
    return parser.parse_args()


def load_fdr():
    try:
        import FinanceDataReader as fdr
    except ImportError as exc:
        raise ImportError(
            "FinanceDataReader가 필요합니다. "
            "pip install finance-datareader 명령으로 설치하세요."
        ) from exc
    return fdr


def normalize_stock_code(value: object) -> str:
    if pd.isna(value):
        return ""
    code = re.sub(r"\.0$", "", str(value).strip())
    digits = re.sub(r"\D", "", code)
    return digits.zfill(6) if digits else ""


def first_column(df: pd.DataFrame, candidates: list[str]) -> str | None:
    return next((column for column in candidates if column in df.columns), None)


def add_report(
    reports: list[dict[str, str]],
    stock_code: str,
    company_name: str,
    issue_type: str,
    message: str,
) -> None:
    reports.append(
        {
            "stock_code": stock_code,
            "company_name": company_name,
            "issue_type": issue_type,
            "message": message,
        }
    )


def fetch_primary_listing(fdr) -> tuple[pd.DataFrame, str]:
    errors: list[str] = []
    for market in ["KOSDAQ", "KRX"]:
        try:
            frame = fdr.StockListing(market)
            if frame is not None and not frame.empty:
                return frame.copy(), market
            errors.append(f"{market}: 빈 응답")
        except Exception as exc:
            errors.append(f"{market}: {type(exc).__name__}: {exc}")
    raise RuntimeError("종목 목록 조회 실패 - " + " | ".join(errors))


def fetch_description_listing(fdr) -> tuple[pd.DataFrame | None, str]:
    errors: list[str] = []
    for market in ["KRX-DESC", "KOSDAQ-DESC"]:
        try:
            frame = fdr.StockListing(market)
            if frame is not None and not frame.empty:
                return frame.copy(), market
            errors.append(f"{market}: 빈 응답")
        except Exception as exc:
            errors.append(f"{market}: {type(exc).__name__}: {exc}")
    return None, " | ".join(errors)


def normalize_primary(frame: pd.DataFrame) -> pd.DataFrame:
    code_column = first_column(frame, ["Code", "Symbol", "종목코드", "code"])
    name_column = first_column(frame, ["Name", "종목명", "company_name"])
    market_column = first_column(
        frame, ["Market", "MarketName", "시장구분", "market"]
    )
    if code_column is None or name_column is None:
        raise ValueError(
            "FinanceDataReader 응답에서 종목코드 또는 종목명 컬럼을 찾지 못했습니다. "
            f"응답 컬럼: {', '.join(map(str, frame.columns))}"
        )

    result = pd.DataFrame(
        {
            "stock_code": frame[code_column].map(normalize_stock_code),
            "company_name": frame[name_column].fillna("").astype(str).str.strip(),
            "market": (
                frame[market_column].fillna("").astype(str).str.upper().str.strip()
                if market_column
                else "KOSDAQ"
            ),
        }
    )
    return result[
        result["stock_code"].str.fullmatch(r"\d{6}")
        & result["company_name"].ne("")
    ].drop_duplicates("stock_code", keep="first")


def normalize_descriptions(frame: pd.DataFrame) -> pd.DataFrame:
    code_column = first_column(frame, ["Code", "Symbol", "종목코드", "code"])
    date_column = first_column(
        frame, ["ListingDate", "ListingDateTime", "상장일", "listing_date"]
    )
    industry_column = first_column(
        frame, ["Industry", "Sector", "업종", "industry"]
    )
    market_column = first_column(frame, ["Market", "시장구분", "market"])
    if code_column is None:
        return pd.DataFrame(
            columns=["stock_code", "listing_date", "industry", "description_market"]
        )

    result = pd.DataFrame(
        {
            "stock_code": frame[code_column].map(normalize_stock_code),
            "listing_date": (
                pd.to_datetime(frame[date_column], errors="coerce")
                if date_column
                else pd.NaT
            ),
            "industry": (
                frame[industry_column].fillna("").astype(str).str.strip()
                if industry_column
                else ""
            ),
            "description_market": (
                frame[market_column].fillna("").astype(str).str.upper().str.strip()
                if market_column
                else ""
            ),
        }
    )
    return result.drop_duplicates("stock_code", keep="first")


def build_candidates(
    primary: pd.DataFrame,
    descriptions: pd.DataFrame | None,
    start_date: pd.Timestamp,
    reports: list[dict[str, str]],
) -> pd.DataFrame:
    listings = normalize_primary(primary)
    listings = listings[
        listings["market"].str.contains("KOSDAQ|KSQ", case=False, na=False)
    ].copy()
    listings["market"] = "KOSDAQ"

    if descriptions is not None:
        details = normalize_descriptions(descriptions)
        listings = listings.merge(details, on="stock_code", how="left")
    else:
        listings["listing_date"] = pd.NaT
        listings["industry"] = ""
        listings["description_market"] = ""

    known_dates = listings["listing_date"].notna()
    listings = listings[
        ~known_dates | (listings["listing_date"] >= start_date)
    ].copy()

    spac_mask = listings["company_name"].str.contains(SPAC_PATTERN, na=False)
    for _, row in listings.loc[spac_mask].iterrows():
        add_report(
            reports,
            row["stock_code"],
            row["company_name"],
            "excluded_spac",
            "회사명 스팩 키워드 기준으로 후보 목록에서 제외했습니다.",
        )
    listings = listings.loc[~spac_mask].copy()

    listings["listing_date"] = listings["listing_date"].dt.strftime("%Y-%m-%d")
    listings["listing_date"] = listings["listing_date"].fillna("")
    listings["industry"] = listings["industry"].fillna("")
    listings["ipo_price"] = 0
    listings["adjusted_ipo_price"] = 0
    listings["theme_tags"] = ""
    listings["is_spac"] = False
    listings["is_transfer_listing"] = False
    listings["is_spac_merger"] = False
    bio_source = (
        listings["industry"].fillna("")
        + " "
        + listings["company_name"].fillna("")
    )
    listings["is_bio"] = bio_source.map(
        lambda value: any(keyword in value for keyword in BIO_KEYWORDS)
    )
    listings["is_tech_special"] = False

    for _, row in listings.iterrows():
        code = row["stock_code"]
        name = row["company_name"]
        add_report(
            reports,
            code,
            name,
            "manual_validation",
            "이전상장 여부는 자동 판별이 어려워 false로 설정했습니다. 수동 검증 필요.",
        )
        add_report(
            reports,
            code,
            name,
            "manual_validation",
            "스팩합병 여부는 자동 판별이 어려워 false로 설정했습니다. 수동 검증 필요.",
        )
        add_report(
            reports,
            code,
            name,
            "manual_validation",
            "기술특례 여부는 false로 설정했습니다. 정확한 상장 유형 수동 검증 필요.",
        )
        add_report(
            reports,
            code,
            name,
            "manual_validation",
            "공모가와 조정공모가는 0으로 설정했습니다. 증권신고서 등으로 수동 검증 필요.",
        )
        if not row["listing_date"]:
            add_report(
                reports,
                code,
                name,
                "missing_data",
                "상장일을 자동 수집하지 못했습니다. 수동 검증 필요.",
            )
        if not row["industry"]:
            add_report(
                reports,
                code,
                name,
                "missing_data",
                "업종을 자동 수집하지 못했습니다. 수동 검증 필요.",
            )

    for column in [
        "is_spac",
        "is_transfer_listing",
        "is_spac_merger",
        "is_bio",
        "is_tech_special",
    ]:
        listings[column] = listings[column].map(
            {True: "true", False: "false"}
        )

    return listings[OUTPUT_COLUMNS].sort_values(
        ["listing_date", "stock_code"], ascending=[False, True]
    ).reset_index(drop=True)


def main() -> None:
    ensure_data_dirs()
    args = parse_args()
    output_path = Path(args.output)
    report_path = Path(args.report)
    reports: list[dict[str, str]] = []

    try:
        start_date = pd.to_datetime(args.start_date, errors="raise").normalize()
        fdr = load_fdr()
        primary, primary_source = fetch_primary_listing(fdr)
        descriptions, description_source = fetch_description_listing(fdr)

        add_report(
            reports,
            "",
            "",
            "fetch_source",
            f"기준 목록: FinanceDataReader StockListing('{primary_source}')",
        )
        if descriptions is None:
            add_report(
                reports,
                "",
                "",
                "fetch_warning",
                "상장일·업종 설명 목록 조회 실패: " + description_source,
            )
        else:
            add_report(
                reports,
                "",
                "",
                "fetch_source",
                f"상장일·업종 보강: FinanceDataReader StockListing('{description_source}')",
            )

        candidates = build_candidates(
            primary, descriptions, start_date, reports
        )
        write_csv(candidates, output_path)
        write_csv(pd.DataFrame(reports, columns=REPORT_COLUMNS), report_path)

        print(f"후보 CSV 저장: {output_path} ({len(candidates)}행)")
        print(f"수집 보고서 저장: {report_path} ({len(reports)}행)")
        print("기존 data/raw/listings.csv는 변경하지 않았습니다.")
    except Exception as exc:
        add_report(
            reports,
            "",
            "",
            "fetch_error",
            f"{type(exc).__name__}: {exc}",
        )
        write_csv(pd.DataFrame(reports, columns=REPORT_COLUMNS), report_path)
        record_error("10_fetch_listings_from_api.py", str(exc))
        raise


if __name__ == "__main__":
    main()
