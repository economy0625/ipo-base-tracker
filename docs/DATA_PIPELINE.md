# IPO Base Tracker 데이터 파이프라인

Python 데이터 처리의 표준 입출력 파일은 아래 흐름으로 고정합니다.

| 순서 | 파일 | 생성 스크립트 |
| --- | --- | --- |
| 1 | `data/raw/listings.csv` | 수동으로 준비하는 신규상장 원본 |
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

전체 파이프라인은 아래 명령으로 한 번에 실행할 수 있습니다.

```bash
python scripts/run_full_pipeline.py
```

상황에 따라 일부 단계를 건너뛸 수 있습니다.

```bash
python scripts/run_full_pipeline.py --skip-fetch
python scripts/run_full_pipeline.py --skip-upload
python scripts/run_full_pipeline.py --skip-backtest
```

실행 결과 요약은 `data/output/pipeline_run_report.txt`에 저장됩니다. 한 단계가
실패하면 이후 단계는 실행하지 않고 실패한 스크립트명과 오류 코드를 출력합니다.

개별 단계는 아래 순서로 실행됩니다.

```bash
python scripts/10_fetch_listings_from_api.py
python scripts/11_promote_listings_candidates.py
python scripts/01_import_listings_csv.py
python scripts/03_fetch_daily_prices.py
python scripts/04_calculate_metrics.py
python scripts/05_classify_groups.py
python scripts/06_detect_signals.py
python scripts/07_backtest_strategy.py
python scripts/08_upload_to_supabase.py
python scripts/09_validate_dataset.py
```

`08_upload_to_supabase.py`는 표준 처리 파일 중 존재하는 데이터를 Supabase에
업로드합니다. 실행 전에 프로젝트 루트의 `.env.local`에 Supabase URL과
service role key를 설정해야 합니다.

## 신규상장 샘플 데이터

`data/raw/listings.csv`는 UI와 데이터 파이프라인 테스트를 위한 코스닥
신규상장 일반기업 샘플 50개를 포함합니다. `stock_code`는 항상 6자리
문자열로 관리하고 스팩, 스팩합병, 이전상장 종목은 포함하지 않습니다.

### 수동 검증 필요

현재 샘플은 개발 테스트용 초안입니다. 실제 분석이나 운영 데이터 업로드
전에 아래 항목을 거래소 공시, 증권신고서 또는 공식 기업 자료와 대조해야
합니다.

- 종목코드, 상장일, 공모가
- 상장 당시 회사명과 이후 사명 변경 여부
- 스팩, 스팩합병, 이전상장 제외 여부
- 바이오 기업 및 기술특례 상장 여부
- 산업과 테마 태그 분류
- 무상증자, 액면분할 등에 따른 조정공모가

조정 이력이 수동 검증되지 않은 종목은 `adjusted_ipo_price`를
`ipo_price`와 동일하게 두었습니다. 공모가가 확인되지 않는 종목을 추가할
때는 빈 값 대신 `0`을 입력합니다.

### 공모가 수동 보완

공모가가 누락된 종목은 `data/input/ipo_price_overrides.csv`에 아래 형식으로
추가합니다.

```csv
stock_code,company_name,ipo_price,adjusted_ipo_price,source_url,review_status,note
373170,엠아이큐브솔루션,12000,4000,,confirmed,무상증자 조정 반영
```

`review_status`가 `confirmed`인 행만 `data/raw/listings.csv`에 반영됩니다.
반영 전 기존 파일은 `data/raw/listings_backup_YYYYMMDD_HHMMSS.csv`로
백업됩니다.

```bash
python scripts/14_apply_ipo_price_overrides.py
python scripts/01_import_listings_csv.py
```

`listings.csv`에 없는 종목코드나 숫자로 변환할 수 없는 공모가는
`data/output/ipo_price_override_errors.csv`에 저장됩니다.

## 이전 파일명 호환

표준 파일이 없을 때만 아래 이전 파일명을 입력 fallback으로 사용합니다.

- `data/processed/02_companies.csv`
- `data/processed/03_daily_prices.csv`
- `data/processed/04_ipo_metrics.csv`
- `data/processed/06_signals.csv`

새 출력 파일은 항상 표준 파일명으로 생성합니다. 입력 파일이 없으면 각
스크립트가 먼저 실행해야 할 이전 단계를 안내합니다.
