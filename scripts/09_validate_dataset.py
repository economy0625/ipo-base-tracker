from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Iterable

import pandas as pd

from common import OUTPUT_DIR, PROCESSED_DIR, RAW_DIR, ensure_data_dirs, record_error, write_csv


VALID_GROUPS = {"S", "A", "B", "C", "D"}
EXCLUSION_COLUMNS = ["is_spac", "is_transfer_listing", "is_spac_merger"]
REPORT_COLUMNS = [
    "category",
    "check_name",
    "status",
    "file",
    "stock_code",
    "value",
    "details",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate IPO Base Tracker CSV datasets."
    )
    parser.add_argument(
        "--listings",
        default=str(RAW_DIR / "listings.csv"),
        help="Raw listings CSV path",
    )
    parser.add_argument(
        "--companies",
        default=str(PROCESSED_DIR / "companies.csv"),
        help="Processed companies CSV path",
    )
    parser.add_argument(
        "--metrics",
        default=str(PROCESSED_DIR / "latest_metrics.csv"),
        help="Latest metrics CSV path",
    )
    parser.add_argument(
        "--groups",
        default=str(PROCESSED_DIR / "group_scores.csv"),
        help="Group scores CSV path",
    )
    parser.add_argument(
        "--signals",
        default=str(PROCESSED_DIR / "signals.csv"),
        help="Signals CSV path",
    )
    parser.add_argument(
        "--output",
        default=str(OUTPUT_DIR / "dataset_validation_report.csv"),
        help="Validation report CSV path",
    )
    return parser.parse_args()


def add_report(
    reports: list[dict[str, object]],
    category: str,
    check_name: str,
    status: str,
    file: Path,
    details: str,
    stock_code: object = "",
    value: object = "",
) -> None:
    reports.append(
        {
            "category": category,
            "check_name": check_name,
            "status": status,
            "file": str(file),
            "stock_code": stock_code,
            "value": value,
            "details": details,
        }
    )


def normalize_stock_code(value: object) -> str:
    if pd.isna(value):
        return ""
    return re.sub(r"\.0$", "", str(value).strip()).zfill(6)


def parse_bool(value: object) -> bool:
    if pd.isna(value):
        return False
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "t", "yes", "y"}


def read_dataset(
    path: Path,
    reports: list[dict[str, object]],
) -> pd.DataFrame | None:
    if not path.exists():
        add_report(
            reports,
            "file",
            "file_exists",
            "FAIL",
            path,
            "파일이 없습니다. 이전 파이프라인 스크립트를 먼저 실행하세요.",
        )
        print(f"[실패] 파일 없음: {path}")
        return None

    try:
        df = pd.read_csv(path, dtype={"stock_code": str})
    except Exception as exc:
        add_report(
            reports,
            "file",
            "file_readable",
            "FAIL",
            path,
            f"CSV 읽기 실패: {exc}",
        )
        print(f"[실패] CSV 읽기 실패: {path}")
        return None

    add_report(
        reports,
        "file",
        "file_readable",
        "PASS",
        path,
        f"{len(df)}행을 읽었습니다.",
        value=len(df),
    )
    return df


def validate_stock_codes(
    df: pd.DataFrame,
    path: Path,
    reports: list[dict[str, object]],
) -> set[str]:
    if "stock_code" not in df.columns:
        add_report(
            reports,
            "schema",
            "stock_code_column",
            "FAIL",
            path,
            "stock_code 컬럼이 없습니다.",
        )
        return set()

    raw_codes = df["stock_code"].fillna("").astype(str).str.strip()
    valid_mask = raw_codes.str.fullmatch(r"\d{6}")
    invalid_rows = df.loc[~valid_mask, ["stock_code"]]

    if invalid_rows.empty:
        add_report(
            reports,
            "format",
            "stock_code_six_digits",
            "PASS",
            path,
            "모든 stock_code가 6자리 숫자 문자열입니다.",
            value=len(df),
        )
    else:
        add_report(
            reports,
            "format",
            "stock_code_six_digits",
            "FAIL",
            path,
            f"6자리 형식이 아닌 stock_code가 {len(invalid_rows)}개 있습니다.",
            value=len(invalid_rows),
        )
        for value in invalid_rows["stock_code"].tolist():
            add_report(
                reports,
                "row",
                "invalid_stock_code",
                "FAIL",
                path,
                "stock_code는 6자리 숫자 문자열이어야 합니다.",
                stock_code=value,
                value=value,
            )

    normalized = raw_codes.map(normalize_stock_code)
    duplicates = normalized[normalized.ne("") & normalized.duplicated(keep=False)]
    if duplicates.empty:
        add_report(
            reports,
            "integrity",
            "stock_code_unique",
            "PASS",
            path,
            "중복 stock_code가 없습니다.",
        )
    else:
        duplicate_codes = sorted(set(duplicates.tolist()))
        add_report(
            reports,
            "integrity",
            "stock_code_unique",
            "FAIL",
            path,
            f"중복 stock_code: {', '.join(duplicate_codes)}",
            value=len(duplicate_codes),
        )

    return set(normalized[normalized.ne("")].tolist())


def validate_listing_dates(
    df: pd.DataFrame,
    path: Path,
    reports: list[dict[str, object]],
) -> None:
    if "listing_date" not in df.columns:
        add_report(
            reports,
            "schema",
            "listing_date_column",
            "FAIL",
            path,
            "listing_date 컬럼이 없습니다.",
        )
        return

    parsed = pd.to_datetime(df["listing_date"], errors="coerce", format="%Y-%m-%d")
    invalid = df.loc[parsed.isna(), ["stock_code", "listing_date"]]
    if invalid.empty:
        add_report(
            reports,
            "format",
            "listing_date_format",
            "PASS",
            path,
            "모든 listing_date가 YYYY-MM-DD 날짜 형식입니다.",
            value=len(df),
        )
        return

    add_report(
        reports,
        "format",
        "listing_date_format",
        "FAIL",
        path,
        f"날짜 형식 오류가 {len(invalid)}개 있습니다.",
        value=len(invalid),
    )
    for _, row in invalid.iterrows():
        add_report(
            reports,
            "row",
            "invalid_listing_date",
            "FAIL",
            path,
            "listing_date를 YYYY-MM-DD 형식으로 입력하세요.",
            stock_code=normalize_stock_code(row.get("stock_code")),
            value=row["listing_date"],
        )


def validate_exclusions(
    df: pd.DataFrame,
    path: Path,
    reports: list[dict[str, object]],
) -> None:
    missing = [column for column in EXCLUSION_COLUMNS if column not in df.columns]
    if missing:
        add_report(
            reports,
            "schema",
            "exclusion_columns",
            "FAIL",
            path,
            f"제외 플래그 컬럼 누락: {', '.join(missing)}",
        )
        return

    excluded_mask = pd.Series(False, index=df.index)
    for column in EXCLUSION_COLUMNS:
        excluded_mask |= df[column].map(parse_bool)
    excluded = df.loc[excluded_mask]

    if excluded.empty:
        add_report(
            reports,
            "eligibility",
            "excluded_listing_flags",
            "PASS",
            path,
            "스팩, 스팩합병, 이전상장 제외 대상이 없습니다.",
        )
        return

    add_report(
        reports,
        "eligibility",
        "excluded_listing_flags",
        "FAIL",
        path,
        f"제외 대상 종목이 {len(excluded)}개 포함되어 있습니다.",
        value=len(excluded),
    )
    for _, row in excluded.iterrows():
        flags = [
            column for column in EXCLUSION_COLUMNS if parse_bool(row[column])
        ]
        add_report(
            reports,
            "row",
            "excluded_listing",
            "FAIL",
            path,
            f"제외 대상 플래그: {', '.join(flags)}",
            stock_code=normalize_stock_code(row.get("stock_code")),
            value="|".join(flags),
        )


def compare_code_sets(
    base_codes: set[str],
    target_codes: set[str],
    base_path: Path,
    target_path: Path,
    check_name: str,
    reports: list[dict[str, object]],
) -> None:
    missing = sorted(base_codes - target_codes)
    extra = sorted(target_codes - base_codes)
    status = "PASS" if not missing and not extra else "FAIL"
    details = (
        f"companies={len(base_codes)}, target={len(target_codes)}, "
        f"누락={len(missing)}, 추가={len(extra)}"
    )
    add_report(
        reports,
        "relation",
        check_name,
        status,
        target_path,
        details,
        value=f"{len(base_codes)}:{len(target_codes)}",
    )

    for code in missing:
        add_report(
            reports,
            "row",
            f"{check_name}_missing",
            "FAIL",
            target_path,
            f"{base_path.name}에는 있지만 {target_path.name}에는 없습니다.",
            stock_code=code,
        )
    for code in extra:
        add_report(
            reports,
            "row",
            f"{check_name}_extra",
            "FAIL",
            target_path,
            f"{target_path.name}에만 존재하는 stock_code입니다.",
            stock_code=code,
        )


def validate_groups(
    df: pd.DataFrame,
    path: Path,
    reports: list[dict[str, object]],
) -> None:
    if "current_group" not in df.columns:
        add_report(
            reports,
            "schema",
            "current_group_column",
            "FAIL",
            path,
            "current_group 컬럼이 없습니다.",
        )
        return

    groups = df["current_group"].fillna("").astype(str).str.strip().str.upper()
    invalid = df.loc[~groups.isin(VALID_GROUPS)]
    if invalid.empty:
        add_report(
            reports,
            "value",
            "current_group_values",
            "PASS",
            path,
            "모든 current_group 값이 S/A/B/C/D 중 하나입니다.",
        )
    else:
        add_report(
            reports,
            "value",
            "current_group_values",
            "FAIL",
            path,
            f"유효하지 않은 그룹 값이 {len(invalid)}개 있습니다.",
            value=len(invalid),
        )

    counts = groups.value_counts()
    print("\n[current_group별 종목 수]")
    for group in ["S", "A", "B", "C", "D"]:
        count = int(counts.get(group, 0))
        print(f"{group}: {count}")
        add_report(
            reports,
            "summary",
            "current_group_count",
            "INFO",
            path,
            f"{group}그룹 종목 수",
            value=count,
            stock_code=group,
        )


def first_existing_column(
    columns: Iterable[str],
    candidates: Iterable[str],
) -> str | None:
    available = set(columns)
    return next((candidate for candidate in candidates if candidate in available), None)


def validate_metric_values(
    df: pd.DataFrame,
    path: Path,
    reports: list[dict[str, object]],
) -> None:
    requested_columns = {
        "close_price": ["close_price", "current_price"],
        "drawdown_from_high": ["drawdown_from_high"],
        "return_from_ipo": ["return_from_ipo", "return_vs_ipo"],
    }

    print("\n[latest_metrics 필수 지표 누락 종목]")
    printed_any = False
    for requested, aliases in requested_columns.items():
        actual = first_existing_column(df.columns, aliases)
        if actual is None:
            add_report(
                reports,
                "schema",
                f"{requested}_column",
                "FAIL",
                path,
                f"{requested} 컬럼과 지원 별칭({', '.join(aliases)})이 없습니다.",
            )
            print(f"{requested}: 컬럼 없음")
            continue

        missing_mask = df[actual].isna() | df[actual].astype(str).str.strip().isin(
            {"", "nan", "None", "null"}
        )
        missing = df.loc[missing_mask]
        add_report(
            reports,
            "completeness",
            f"{requested}_not_empty",
            "PASS" if missing.empty else "FAIL",
            path,
            (
                f"{actual} 컬럼으로 검사했습니다. 누락 {len(missing)}개."
                if actual != requested
                else f"누락 {len(missing)}개."
            ),
            value=len(missing),
        )
        if not missing.empty:
            printed_any = True
            codes = [
                normalize_stock_code(value)
                for value in missing["stock_code"].tolist()
            ]
            print(f"{requested} ({actual}): {', '.join(codes)}")
            for code in codes:
                add_report(
                    reports,
                    "row",
                    f"missing_{requested}",
                    "FAIL",
                    path,
                    f"{actual} 값이 비어 있습니다.",
                    stock_code=code,
                )

    if not printed_any:
        print("누락 종목 없음")


def summarize_signals(
    df: pd.DataFrame,
    path: Path,
    reports: list[dict[str, object]],
) -> None:
    if "signal_type" not in df.columns:
        add_report(
            reports,
            "schema",
            "signal_type_column",
            "FAIL",
            path,
            "signal_type 컬럼이 없습니다.",
        )
        return

    counts = (
        df["signal_type"]
        .fillna("(빈 값)")
        .astype(str)
        .value_counts()
        .sort_index()
    )
    print("\n[signal_type별 개수]")
    if counts.empty:
        print("신호 데이터 없음")
    for signal_type, count in counts.items():
        print(f"{signal_type}: {int(count)}")
        add_report(
            reports,
            "summary",
            "signal_type_count",
            "INFO",
            path,
            "signal_type별 개수",
            stock_code=signal_type,
            value=int(count),
        )


def main() -> None:
    ensure_data_dirs()
    args = parse_args()
    paths = {
        "listings": Path(args.listings),
        "companies": Path(args.companies),
        "metrics": Path(args.metrics),
        "groups": Path(args.groups),
        "signals": Path(args.signals),
    }
    reports: list[dict[str, object]] = []

    try:
        datasets = {
            name: read_dataset(path, reports) for name, path in paths.items()
        }
        code_sets: dict[str, set[str]] = {}

        for name, df in datasets.items():
            if df is not None:
                code_sets[name] = validate_stock_codes(
                    df, paths[name], reports
                )

        for name in ["listings", "companies"]:
            df = datasets[name]
            if df is not None:
                validate_listing_dates(df, paths[name], reports)
                validate_exclusions(df, paths[name], reports)

        if "companies" in code_sets and "metrics" in code_sets:
            compare_code_sets(
                code_sets["companies"],
                code_sets["metrics"],
                paths["companies"],
                paths["metrics"],
                "companies_vs_latest_metrics",
                reports,
            )

        if "companies" in code_sets and "groups" in code_sets:
            compare_code_sets(
                code_sets["companies"],
                code_sets["groups"],
                paths["companies"],
                paths["groups"],
                "companies_vs_group_scores",
                reports,
            )

        if datasets["groups"] is not None:
            validate_groups(datasets["groups"], paths["groups"], reports)
        if datasets["metrics"] is not None:
            validate_metric_values(datasets["metrics"], paths["metrics"], reports)
        if datasets["signals"] is not None:
            summarize_signals(datasets["signals"], paths["signals"], reports)

        report_df = pd.DataFrame(reports, columns=REPORT_COLUMNS)
        write_csv(report_df, args.output)

        failed = int((report_df["status"] == "FAIL").sum())
        passed = int((report_df["status"] == "PASS").sum())
        print(f"\n검증 완료: PASS {passed}, FAIL {failed}")
        print(f"보고서 저장: {args.output}")
    except Exception as exc:
        record_error("09_validate_dataset.py", str(exc))
        raise


if __name__ == "__main__":
    main()
