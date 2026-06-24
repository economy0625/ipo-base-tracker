from __future__ import annotations

import argparse
import base64
import json
import os
from pathlib import Path
from typing import Any

import pandas as pd
from dotenv import load_dotenv

from common import PROCESSED_DIR, ensure_data_dirs, record_error


ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env.local")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="표준 처리 결과를 Supabase에 업로드합니다."
    )
    parser.add_argument(
        "--companies",
        default=str(PROCESSED_DIR / "companies.csv"),
        help="companies 테이블에 업로드할 CSV",
    )
    parser.add_argument(
        "--metrics",
        default=str(PROCESSED_DIR / "latest_metrics.csv"),
        help="ipo_metrics 테이블에 업로드할 CSV",
    )
    parser.add_argument(
        "--groups",
        default=str(PROCESSED_DIR / "group_scores.csv"),
        help="group_scores 테이블에 업로드할 CSV",
    )
    parser.add_argument(
        "--signals",
        default=str(PROCESSED_DIR / "signals.csv"),
        help="signals 테이블에 업로드할 CSV",
    )
    return parser.parse_args()


def get_supabase_credentials() -> tuple[str | None, str | None]:
    return (
        os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
    )


def get_service_key_role(service_key: str) -> str | None:
    if service_key.startswith("sb_secret_"):
        return "service_role"
    if service_key.count(".") != 2:
        return None

    try:
        payload = service_key.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        decoded = base64.urlsafe_b64decode(payload)
        claims = json.loads(decoded)
        role = claims.get("role")
        return str(role) if role else None
    except (ValueError, json.JSONDecodeError):
        return None


def normalize_stock_code(value: object) -> str:
    return str(value).replace(".0", "").strip().zfill(6)


def parse_theme_tags(value: object) -> list[str]:
    if pd.isna(value) or str(value).strip() == "":
        return []

    raw = str(value).strip()
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(tag).strip() for tag in parsed if str(tag).strip()]
    except json.JSONDecodeError:
        pass

    return [
        tag.strip()
        for tag in raw.replace("|", ",").replace(";", ",").split(",")
        if tag.strip()
    ]


def prepare_records(frame: pd.DataFrame, table: str) -> list[dict[str, Any]]:
    prepared = frame.copy()

    if "stock_code" in prepared.columns:
        prepared["stock_code"] = prepared["stock_code"].map(
            normalize_stock_code
        )
    if table == "companies" and "theme_tags" in prepared.columns:
        prepared["theme_tags"] = prepared["theme_tags"].map(parse_theme_tags)
    if table == "companies" and "business_summary" in prepared.columns:
        prepared["business_summary"] = prepared["business_summary"].fillna("")
    prepared = prepared.replace([float("inf"), float("-inf")], 0)
    if table == "ipo_metrics":
        if "ipo_price_available" in prepared.columns:
            prepared = prepared.drop(columns=["ipo_price_available"])
        metric_columns = [
            "current_price",
            "return_vs_ipo",
            "post_listing_high",
            "post_listing_low",
            "drawdown_from_high",
            "rebound_from_low",
            "ma20",
            "ma60",
            "ma120",
            "volume_ratio_20d",
        ]
        for column in metric_columns:
            if column in prepared.columns:
                prepared[column] = pd.to_numeric(
                    prepared[column],
                    errors="coerce",
                ).fillna(0)
    if table == "ipo_metrics" and "days_since_listing" in prepared.columns:
        prepared["days_since_listing"] = pd.Series(
            [
                0 if pd.isna(value) else int(float(value))
                for value in prepared["days_since_listing"]
            ],
            dtype=object,
        )
    if table == "signals" and "volume" in prepared.columns:
        prepared["volume"] = pd.Series(
            [
                None if pd.isna(value) else int(float(value))
                for value in prepared["volume"]
            ],
            dtype=object,
        )
    prepared = prepared.astype(object).where(pd.notna(prepared), None)
    return prepared.to_dict(orient="records")


def upload_csv(
    client: Any,
    table: str,
    file_path: Path,
    on_conflict: str | None,
) -> int:
    if not file_path.exists():
        print(f"파일이 없어 건너뜁니다: {file_path}")
        return 0

    frame = pd.read_csv(file_path, dtype={"stock_code": str})
    records = prepare_records(frame, table)
    print(f"{table}: {len(records)}행 업로드를 시작합니다. ({file_path.name})")

    if records:
        client.table(table).upsert(
            records,
            on_conflict=on_conflict,
        ).execute()

    print(f"{table}: 업로드 완료 ({len(records)}행)")
    return len(records)


def main() -> None:
    ensure_data_dirs()
    args = parse_args()
    url, service_key = get_supabase_credentials()

    missing_values: list[str] = []
    if not url:
        missing_values.append("NEXT_PUBLIC_SUPABASE_URL")
    if not service_key:
        missing_values.append("SUPABASE_SERVICE_ROLE_KEY")

    if missing_values:
        print("Supabase 업로드에 필요한 환경변수가 없습니다:")
        for value in missing_values:
            print(f"- {value}")
        if not service_key:
            print(
                "NEXT_PUBLIC_SUPABASE_ANON_KEY는 업로드에 사용하지 않습니다. "
                "service role key를 설정해 주세요."
            )
        print(f"확인한 환경 파일: {ROOT_DIR / '.env.local'}")
        raise SystemExit(1)

    service_key_role = get_service_key_role(service_key)
    if service_key_role != "service_role":
        print(
            "SUPABASE_SERVICE_ROLE_KEY가 service role 키가 아니므로 "
            "업로드를 중단합니다."
        )
        if service_key_role:
            print(f"감지된 역할: {service_key_role}")
        else:
            print("키 역할을 확인할 수 없습니다.")
        print("키 값 자체는 출력하지 않습니다.")
        raise SystemExit(1)

    try:
        from supabase import create_client
    except ImportError as exc:
        print("Python 패키지가 필요합니다: pip install supabase python-dotenv")
        raise SystemExit(1) from exc

    targets = [
        ("companies", Path(args.companies), "stock_code"),
        ("ipo_metrics", Path(args.metrics), "stock_code"),
        ("group_scores", Path(args.groups), "stock_code"),
        (
            "signals",
            Path(args.signals),
            "stock_code,signal_date,signal_type",
        ),
    ]

    try:
        client = create_client(url, service_key)
        failed_tables: list[str] = []
        for table, file_path, on_conflict in targets:
            try:
                upload_csv(client, table, file_path, on_conflict)
            except Exception as exc:
                failed_tables.append(table)
                record_error(
                    "08_upload_to_supabase.py",
                    f"{table} 업로드 실패: {exc}",
                    file_path,
                )
                print(f"{table}: 업로드 실패 - {exc}")

        if failed_tables:
            print(f"업로드 실패 테이블: {', '.join(failed_tables)}")
            raise SystemExit(1)
    except SystemExit:
        raise
    except Exception as exc:
        record_error("08_upload_to_supabase.py", str(exc))
        raise


if __name__ == "__main__":
    main()
