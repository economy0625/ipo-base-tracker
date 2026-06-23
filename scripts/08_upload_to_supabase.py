from __future__ import annotations

import os

import pandas as pd

from common import PROCESSED_DIR, run_step


def process(df: pd.DataFrame) -> pd.DataFrame:
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not url or not key:
        raise ValueError("Supabase environment variables are missing.")

    try:
        from supabase import create_client
    except ImportError as exc:
        raise ImportError("Install the Python client with: pip install supabase") from exc

    client = create_client(url, key)
    records = df.where(pd.notna(df), None).to_dict(orient="records")
    if records:
        client.table("companies").upsert(records, on_conflict="stock_code").execute()

    return pd.DataFrame(
        [
            {
                "table": "companies",
                "uploaded_rows": len(records),
                "status": "uploaded",
            }
        ]
    )


if __name__ == "__main__":
    run_step(
        "08_upload_to_supabase.py",
        "Upload processed company rows to Supabase.",
        PROCESSED_DIR / "02_companies.csv",
        PROCESSED_DIR / "08_upload_result.csv",
        process,
    )
