from __future__ import annotations

import pandas as pd

from common import PROCESSED_DIR, run_step


def classify(row: pd.Series) -> tuple[str, str]:
    current_price = float(row["current_price"])
    return_vs_ipo = float(row["return_vs_ipo"])
    drawdown = float(row["drawdown_from_high"])
    volume_ratio = float(row["volume_ratio_20d"])
    ma20 = float(row["ma20"])
    ma60 = float(row["ma60"])

    if drawdown >= -10 and volume_ratio >= 1.5 and current_price >= ma20:
        return "S", "전고점 근접 또는 돌파와 거래량 증가가 확인됨"
    if drawdown >= -25 and current_price >= ma20 and volume_ratio >= 1.1:
        return "A", "컵 우측 상승 또는 돌파 임박 조건을 충족"
    if current_price >= ma60 or return_vs_ipo > 0:
        return "B", "장기 조정 후 베이스 형성 가능성이 있음"
    if drawdown > -60:
        return "C", "모멘텀 확인 전 관찰이 필요함"
    return "D", "장기 검증이 필요한 약세 구간"


def process(df: pd.DataFrame) -> pd.DataFrame:
    rows: list[dict[str, object]] = []
    for _, row in df.iterrows():
        group, reason = classify(row)
        score_map = {"S": 92, "A": 78, "B": 62, "C": 45, "D": 28}
        total_score = score_map[group]
        rows.append(
            {
                "stock_code": str(row["stock_code"]).zfill(6),
                "current_group": group,
                "total_score": total_score,
                "chart_score": max(0, total_score - 4),
                "volume_score": max(0, total_score - 12),
                "financial_score": max(0, total_score - 18),
                "business_score": max(0, total_score - 8),
                "risk_score": max(0, 100 - total_score),
                "group_reason": reason,
                "is_manual": False,
            }
        )
    return pd.DataFrame(rows)


if __name__ == "__main__":
    run_step(
        "05_classify_groups.py",
        "Classify stocks into S/A/B/C/D groups.",
        PROCESSED_DIR / "04_ipo_metrics.csv",
        PROCESSED_DIR / "05_group_scores.csv",
        process,
    )
