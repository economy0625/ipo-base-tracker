from __future__ import annotations

import argparse
import os
from pathlib import Path

import pandas as pd

from common import PROCESSED_DIR, ensure_data_dirs, record_error, resolve_input_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="표준 처리 결과를 Supabase에 업로드합니다."
    )
    parser.add_argument(
        "--input",
        default=str(PROCESSED_DIR / "companies.csv"),
        help="기업 정보 CSV",
    )
    parser.add_argument(
        "--daily-prices",
        default=str(PROCESSED_DIR / "daily_indicators.csv"),
    )
    parser.add_argument(
        "--metrics",
        default=str(PROCESSED_DIR / "latest_metrics.csv"),
    )
    parser.add_argument(
        "--groups",
        default=str(PROCESSED_DIR / "group_scores.csv"),
    )
    return parser.parse_args()


def upload_csv(
    client,
    table: str,
    path: Path,
    columns: list[str] | None = None,
    on_conflict: str = "stock_code",
) -> int:
    if not path.exists():
        print(f"선택 파일이 없어 건너뜁니다: {path}")
        return 0
    frame = pd.read_csv(path, dtype={"stock_code": str})
    if columns:
        frame = frame[[column for column in columns if column in frame.columns]]
    records = frame.where(pd.notna(frame), None).to_dict(orient="records")
    if records:
        client.table(table).upsert(records, on_conflict=on_conflict).execute()
    print(f"업로드 완료: {table} ({len(records)}행)")
    return len(records)


def main() -> None:
    ensure_data_dirs()
    args = parse_args()
    try:
        companies_path = resolve_input_path(
            args.input,
            PROCESSED_DIR / "companies.csv",
            [PROCESSED_DIR / "02_companies.csv"],
            "python scripts/01_import_listings_csv.py",
        )
        url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv(
            "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        )
        if not url or not key:
            print(
                "Supabase 환경변수가 없습니다. .env.local을 설정한 뒤 "
                "python scripts/08_upload_to_supabase.py 를 다시 실행해 주세요."
            )
            return

        try:
            from supabase import create_client
        except ImportError:
            print("Python Supabase 패키지가 필요합니다: pip install supabase")
            return

        client = create_client(url, key)
        upload_csv(client, "companies", companies_path)
        upload_csv(
            client,
            "daily_prices",
            Path(args.daily_prices),
            [
                "stock_code",
                "trade_date",
                "open_price",
                "high_price",
                "low_price",
                "close_price",
                "volume",
            ],
            on_conflict="stock_code,trade_date",
        )
        upload_csv(client, "ipo_metrics", Path(args.metrics))
        upload_csv(client, "group_scores", Path(args.groups))
    except FileNotFoundError as exc:
        print(exc)
        record_error("08_upload_to_supabase.py", str(exc), args.input)
    except Exception as exc:
        record_error("08_upload_to_supabase.py", str(exc), args.input)
        raise


if __name__ == "__main__":
    main()
