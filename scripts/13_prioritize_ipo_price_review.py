from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from common import OUTPUT_DIR, PROCESSED_DIR, ensure_data_dirs, record_error, write_csv


OUTPUT_COLUMNS = [
    "stock_code",
    "company_name",
    "listing_date",
    "current_group",
    "signal_count",
    "volume_ratio_20d",
    "ipo_price",
    "adjusted_ipo_price",
    "priority_score",
    "priority_level",
    "review_note",
]
GROUP_POINTS = {"S": 50, "A": 40, "B": 30, "C": 10, "D": 0}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prioritize manual review for missing IPO prices."
    )
    parser.add_argument(
        "--missing",
        default=str(OUTPUT_DIR / "missing_ipo_prices.csv"),
        help="Missing IPO price review CSV path",
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
        "--metrics",
        default=str(PROCESSED_DIR / "latest_metrics.csv"),
        help="Latest metrics CSV path",
    )
    parser.add_argument(
        "--output",
        default=str(OUTPUT_DIR / "ipo_price_review_priority.csv"),
        help="Output priority CSV path",
    )
    return parser.parse_args()


def normalize_stock_code(value: object) -> str:
    return str(value).replace(".0", "").strip().zfill(6)


def read_csv_or_empty(path: Path, columns: list[str]) -> pd.DataFrame:
    if not path.exists():
        print(f"파일이 없어 빈 데이터로 처리합니다: {path}")
        return pd.DataFrame(columns=columns)
    return pd.read_csv(path, dtype={"stock_code": str})


def normalize_codes(frame: pd.DataFrame) -> pd.DataFrame:
    result = frame.copy()
    if "stock_code" in result.columns:
        result["stock_code"] = result["stock_code"].map(normalize_stock_code)
    return result


def calculate_recency_points(listing_dates: pd.Series) -> pd.Series:
    parsed = pd.to_datetime(listing_dates, errors="coerce")
    if parsed.notna().sum() == 0:
        return pd.Series(0, index=listing_dates.index, dtype="float64")

    oldest = parsed.min()
    newest = parsed.max()
    span_days = max((newest - oldest).days, 1)
    return ((parsed - oldest).dt.days / span_days * 15).fillna(0)


def priority_level(score: float) -> str:
    if score >= 70:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"


def main() -> None:
    ensure_data_dirs()
    args = parse_args()
    missing_path = Path(args.missing)
    groups_path = Path(args.groups)
    signals_path = Path(args.signals)
    metrics_path = Path(args.metrics)
    output_path = Path(args.output)

    try:
        if not missing_path.exists():
            raise FileNotFoundError(
                f"입력 파일이 없습니다: {missing_path}\n"
                "먼저 python scripts/12_review_missing_ipo_prices.py 를 실행하세요."
            )

        missing = normalize_codes(pd.read_csv(missing_path, dtype={"stock_code": str}))
        groups = normalize_codes(
            read_csv_or_empty(
                groups_path,
                ["stock_code", "current_group", "total_score"],
            )
        )
        signals = normalize_codes(
            read_csv_or_empty(signals_path, ["stock_code", "signal_type"])
        )
        metrics = normalize_codes(
            read_csv_or_empty(metrics_path, ["stock_code", "volume_ratio_20d"])
        )

        signal_counts = (
            signals.groupby("stock_code")
            .size()
            .rename("signal_count")
            .reset_index()
            if not signals.empty
            else pd.DataFrame(columns=["stock_code", "signal_count"])
        )
        group_columns = [
            column
            for column in ["stock_code", "current_group", "total_score"]
            if column in groups.columns
        ]
        metric_columns = [
            column
            for column in ["stock_code", "volume_ratio_20d"]
            if column in metrics.columns
        ]

        result = (
            missing.merge(groups[group_columns], on="stock_code", how="left")
            .merge(signal_counts, on="stock_code", how="left")
            .merge(metrics[metric_columns], on="stock_code", how="left")
        )
        result["current_group"] = result["current_group"].fillna("미분류")
        result["signal_count"] = pd.to_numeric(
            result["signal_count"], errors="coerce"
        ).fillna(0).astype(int)
        result["volume_ratio_20d"] = pd.to_numeric(
            result["volume_ratio_20d"], errors="coerce"
        ).fillna(0)

        group_points = result["current_group"].map(GROUP_POINTS).fillna(0)
        signal_points = (result["signal_count"].clip(upper=5) * 5).astype(float)
        volume_points = (result["volume_ratio_20d"].clip(upper=3) / 3) * 20
        recency_points = calculate_recency_points(result["listing_date"])

        result["priority_score"] = (
            group_points + signal_points + volume_points + recency_points
        ).round(1)
        result["priority_level"] = result["priority_score"].map(priority_level)

        result = result.sort_values(
            ["priority_score", "signal_count", "volume_ratio_20d", "listing_date"],
            ascending=[False, False, False, False],
        ).reset_index(drop=True)

        write_csv(result[OUTPUT_COLUMNS], output_path)

        level_counts = result["priority_level"].value_counts().to_dict()
        print(f"우선순위 파일 저장: {output_path} ({len(result)}행)")
        print(
            "우선순위 분포: "
            + ", ".join(
                f"{level} {level_counts.get(level, 0)}개"
                for level in ["High", "Medium", "Low"]
            )
        )
    except Exception as exc:
        record_error("13_prioritize_ipo_price_review.py", str(exc), missing_path)
        raise


if __name__ == "__main__":
    main()
