# IPO Base Tracker 데이터 파이프라인

Python 데이터 처리의 표준 입출력 파일은 아래 흐름으로 고정합니다.

| 순서 | 파일 | 생성 스크립트 |
| --- | --- | --- |
| 1 | `data/raw/listings.csv` | 외부에서 준비하는 신규상장 원본 |
| 2 | `data/processed/companies.csv` | `01_import_listings_csv.py` |
| 3 | `data/raw/prices/*.csv` | `03_fetch_daily_prices.py` |
| 4 | `data/processed/daily_indicators.csv` | `04_calculate_metrics.py` |
| 5 | `data/processed/latest_metrics.csv` | `04_calculate_metrics.py` |
| 6 | `data/processed/group_scores.csv` | `05_classify_groups.py` |
| 7 | `data/processed/signals.csv` | `06_detect_signals.py` |
| 8 | `data/output/trade_log.csv` | `07_backtest_strategy.py` |
| 9 | `data/output/stock_returns.csv` | `07_backtest_strategy.py` |
| 10 | `data/output/strategy_summary.csv` | `07_backtest_strategy.py` |
| 11 | `data/output/yearly_returns.csv` | `07_backtest_strategy.py` |

## 실행 순서

각 스크립트는 인자 없이 실행하면 위 표준 경로를 사용합니다.

```bash
python scripts/01_import_listings_csv.py
python scripts/03_fetch_daily_prices.py
python scripts/04_calculate_metrics.py
python scripts/05_classify_groups.py
python scripts/06_detect_signals.py
python scripts/07_backtest_strategy.py
python scripts/08_upload_to_supabase.py
```

`08_upload_to_supabase.py`는 표준 처리 파일 중 존재하는 데이터를 Supabase에
업로드합니다. 실행 전 Supabase URL과 키 환경변수를 설정해야 합니다.

## 이전 파일명 호환

표준 파일이 없을 때에만 다음 이전 파일명을 입력 fallback으로 읽습니다.

- `data/processed/02_companies.csv`
- `data/processed/03_daily_prices.csv`
- `data/processed/04_ipo_metrics.csv`
- `data/processed/06_signals.csv`

새 출력은 항상 표준 파일명으로 생성합니다. 입력 파일이 없으면 각 스크립트가
먼저 실행해야 할 이전 단계를 안내합니다.
