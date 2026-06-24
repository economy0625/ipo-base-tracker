# Python 데이터 처리 스크립트

모든 스크립트는 `pandas`를 사용하며 단독 실행할 수 있습니다. 기본 경로 대신
다른 파일을 사용하려면 각 스크립트의 `--help`에서 지원 인자를 확인하세요.

## 표준 실행 순서

```bash
python scripts/01_import_listings_csv.py
python scripts/03_fetch_daily_prices.py
python scripts/04_calculate_metrics.py
python scripts/05_classify_groups.py
python scripts/06_detect_signals.py
python scripts/07_backtest_strategy.py
python scripts/08_upload_to_supabase.py
```

표준 입출력 파일과 이전 파일명 호환 규칙은
`docs/DATA_PIPELINE.md`에 정리되어 있습니다.

## 시작 파일

`data/raw/listings.csv`에는 다음 필수 컬럼이 있어야 합니다.

- `stock_code`
- `company_name`
- `market`
- `listing_date`
- `ipo_price`

## 오류 기록

공통 실행 오류는 `data/output/errors.csv`에 기록됩니다. 목록 검증 오류와 가격
수집 오류는 각각 `listing_errors.csv`, `price_fetch_errors.csv`에도 기록됩니다.

## Supabase 업로드

```bash
pip install supabase
```

업로드 전 다음 환경변수 조합 중 하나를 설정합니다.

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
