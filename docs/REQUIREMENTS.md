# IPO Base Tracker 요구사항

## 목적

IPO Base Tracker는 2020년 이후 코스닥에 상장한 IPO 종목을 추적하고, 상장 이후 가격 패턴과 베이스 형성 상태를 기준으로 투자 관찰 그룹을 분류하는 한국어 웹 앱이다.

## 기술 요구사항

- Next.js App Router
- TypeScript
- Tailwind CSS
- 한국어 UI
- 데이터베이스 연결 전 mock data 기반 동작

## 주요 화면

- `/dashboard`: 전체 현황과 그룹별 요약
- `/stocks`: 전체 IPO 종목 목록
- `/groups/s`: S그룹 종목
- `/groups/a`: A그룹 종목
- `/groups/b`: B그룹 종목
- `/groups/c`: C그룹 종목
- `/groups/d`: D그룹 종목
- `/signals`: 오늘의 신호
- `/backtest`: 백테스트
- `/watchlist`: 관심종목
- `/admin`: 관리자
