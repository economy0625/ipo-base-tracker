# IPO Base Tracker - Agent Instructions

## Product
IPO Base Tracker is a Korean web app for monitoring KOSDAQ IPO stocks listed since 2020.

The app classifies IPO stocks into S/A/B/C/D groups based on post-IPO price patterns, cup-and-handle structure, volume, moving averages, business quality, and financial metrics.

## Language
All user-facing UI text must be Korean.

## Core strategy
B에서 모으고, A에서 늘리고, S에서 관리한다.

## Group definitions
- S: 컵앤핸들 완성 후 전고점 또는 핵심 저항 돌파 종목
- A: 컵 우측 상승 또는 돌파 임박 종목
- B: 장기 조정 후 베이스 형성 종목
- C: 저평가 가능성은 있으나 모멘텀 미확인 종목
- D: 바이오·기술특례·이벤트 의존 장기검증 종목

## Tech stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- Python scripts for data processing and backtesting

## Important pages
- /dashboard
- /stocks
- /stocks/[code]
- /groups/s
- /groups/a
- /groups/b
- /groups/c
- /groups/d
- /signals
- /backtest
- /watchlist
- /admin

## Coding rules
- Use strict TypeScript.
- Keep business logic out of React components.
- Put calculations in /lib/calculations.ts.
- Put group classification rules in /lib/groups.ts.
- Put mock data in /lib/mock-data.ts.
- Use Korean labels.
- Add loading, empty, and error states.
- Use mock data fallback when Supabase is not configured.