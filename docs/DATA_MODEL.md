# 데이터 모델

## IpoStock

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| code | string | 종목 코드 |
| name | string | 종목명 |
| market | "KOSDAQ" | 시장 구분 |
| listedAt | string | 상장일 |
| group | "S" \| "A" \| "B" \| "C" \| "D" | 분류 그룹 |
| currentPrice | number | 현재가 |
| ipoPrice | number | 공모가 |
| changeRate | number | 공모가 대비 수익률 |
| baseStatus | string | 베이스 형성 상태 |
| volumeSignal | "강함" \| "보통" \| "약함" | 거래량 신호 |
| movingAverageStatus | string | 이동평균선 상태 |
| businessSummary | string | 사업 요약 |

## DashboardMetric

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| label | string | 지표 이름 |
| value | string | 표시 값 |
| description | string | 보조 설명 |
