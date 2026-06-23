from __future__ import annotations

import pandas as pd

from common import PROCESSED_DIR, RAW_DIR, run_step


def process(df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()

    if "stock_code" not in result.columns:
        code_map_path = RAW_DIR / "stock_code_map.csv"
        if not code_map_path.exists():
            raise FileNotFoundError("stock_code column not found and data/raw/stock_code_map.csv is missing.")

        code_map = pd.read_csv(code_map_path, dtype={"stock_code": str})
        result = result.merge(code_map[["company_name", "stock_code"]], on="company_name", how="left")

    result["stock_code"] = result["stock_code"].astype(str).str.zfill(6)
    missing_codes = result["stock_code"].isna() | result["stock_code"].eq("000nan")
    if missing_codes.any():
        missing_names = ", ".join(result.loc[missing_codes, "company_name"].astype(str).head(10))
        raise ValueError(f"Missing stock codes for: {missing_names}")

    return result.reset_index(drop=True)


if __name__ == "__main__":
    run_step(
        "02_match_stock_codes.py",
        "Match company names to stock codes.",
        PROCESSED_DIR / "01_listings.csv",
        PROCESSED_DIR / "02_companies.csv",
        process,
    )
