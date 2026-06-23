# Python 데이터 처리 스크립트

이 폴더는 IPO Base Tracker의 데이터 처리 파이프라인을 위한 스크립트 구조입니다. 모든 스크립트는 `pandas`를 사용하고, 단독 실행할 수 있으며, `--input`, `--output` 인자를 지원합니다.

## 폴더

- `data/raw`: 원본 CSV
- `data/processed`: 중간 산출물
- `data/output`: 최종 결과와 오류 로그
- `data/output/errors.csv`: 스크립트 오류 기록

## 실행 순서

```bash
python scripts/01_import_listings_csv.py --input data/raw/listings.csv --output data/processed/01_listings.csv
python scripts/02_match_stock_codes.py --input data/processed/01_listings.csv --output data/processed/02_companies.csv
python scripts/03_fetch_daily_prices.py --input data/processed/02_companies.csv --output data/processed/03_daily_prices.csv
python scripts/04_calculate_metrics.py --input data/processed/03_daily_prices.csv --output data/processed/04_ipo_metrics.csv
python scripts/05_classify_groups.py --input data/processed/04_ipo_metrics.csv --output data/processed/05_group_scores.csv
python scripts/06_detect_signals.py --input data/processed/04_ipo_metrics.csv --output data/processed/06_signals.csv
python scripts/07_backtest_strategy.py --input data/processed/06_signals.csv --output data/output/07_backtest_results.csv
python scripts/08_upload_to_supabase.py --input data/processed/02_companies.csv --output data/processed/08_upload_result.csv
```

## 입력 파일 예시

`data/raw/listings.csv`는 최소한 다음 컬럼을 포함해야 합니다.

- `company_name`
- `listing_date`
- `market`
- `ipo_price`

종목코드가 별도 파일에 있다면 `data/raw/stock_code_map.csv`에 `company_name`, `stock_code` 컬럼을 준비합니다.

## Supabase 업로드

`08_upload_to_supabase.py`는 Python Supabase 클라이언트가 필요합니다.

```bash
pip install supabase
```

환경변수는 다음 중 하나를 사용합니다.

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
