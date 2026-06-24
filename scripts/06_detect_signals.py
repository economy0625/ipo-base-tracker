from __future__ import annotations

from datetime import date

import pandas as pd

from common import PROCESSED_DIR, run_step


def process(df: pd.DataFrame) -> pd.DataFrame:
    signals: list[dict[str, object]] = []
    today = date.today().isoformat()

    for _, row in df.iterrows():
        stock_code = str(row["stock_code"]).zfill(6)
        current_price = float(row["current_price"])
        ipo_price_available = str(row.get("ipo_price_available", "")).lower() in {
            "true",
            "1",
            "yes",
        }

        if ipo_price_available:
            return_vs_ipo = pd.to_numeric(row.get("return_vs_ipo"), errors="coerce")
            if pd.notna(return_vs_ipo) and return_vs_ipo >= 0:
                signals.append(
                    {
                        "stock_code": stock_code,
                        "signal_date": today,
                        "signal_type": "공모가 회복",
                        "strength": "medium",
                        "description": "공모가 데이터가 있는 종목이 공모가를 회복했습니다.",
                    }
                )

        if current_price >= float(row["ma20"]):
            signals.append(
                {
                    "stock_code": stock_code,
                    "signal_date": today,
                    "signal_type": "20일선 회복",
                    "strength": "low",
                    "description": "현재가가 20일 이동평균선 위에 있음",
                }
            )
        if current_price >= float(row["ma60"]):
            signals.append(
                {
                    "stock_code": stock_code,
                    "signal_date": today,
                    "signal_type": "60일선 회복",
                    "strength": "medium",
                    "description": "현재가가 60일 이동평균선 위에 있음",
                }
            )
        if float(row["volume_ratio_20d"]) >= 1.5:
            signals.append(
                {
                    "stock_code": stock_code,
                    "signal_date": today,
                    "signal_type": "거래량 급증",
                    "strength": "high",
                    "description": "20일 평균 대비 거래량이 1.5배 이상 증가",
                }
            )

    return pd.DataFrame(
        signals,
        columns=[
            "stock_code",
            "signal_date",
            "signal_type",
            "strength",
            "description",
        ],
    )


if __name__ == "__main__":
    run_step(
        "06_detect_signals.py",
        "Detect daily IPO stock signals.",
        PROCESSED_DIR / "latest_metrics.csv",
        PROCESSED_DIR / "signals.csv",
        process,
        fallback_inputs=[PROCESSED_DIR / "04_ipo_metrics.csv"],
        next_script="python scripts/04_calculate_metrics.py",
    )
