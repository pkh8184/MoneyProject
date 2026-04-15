# Money Screener

국내 주식 중장기 스윙 포착 검색기 (Next.js 14 + Python pykrx).

- 매일 장 마감 후 자동으로 2,800개 종목 수집·지표 계산
- 12개 검증된 프리셋 (단일 10개 + 조합 2개) + 파라미터 조정
- 초보/전문가 모드 토글 + 라이트/다크 테마
- TradingView 차트 기반 종목 분석 페이지
- Vercel Hobby 플랜 완전 무료 운영 (사용량 95% 초과 시 자동 차단)

## 아키텍처

```
GitHub Actions (KST 18:00 평일)
  → Python pykrx로 수집·계산
  → data 브랜치에 orphan commit force push
  → Vercel Deploy Hook 트리거
  → Vercel 재빌드 (build-with-data.sh가 data 브랜치에서 JSON pull)
  → 프로덕션 배포
```

## Setup (개발)

### 1. Node 의존성
```
npm install
```

### 2. Python 가상환경 (데이터 수집용)
```
cd scripts
python -m venv venv
source venv/Scripts/activate   # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
```

### 3. 환경변수 (`.env.local`)
```
JWT_SECRET=<32자 이상 랜덤>
SECRET_BASE_PATH=dev
USER_KYUNGWON_ID=kyungwon
USER_KYUNGWON_HASH=<npm run hash-password -- "yourpw" 출력>
SITE_ENABLED=true
```

### 4. 개발 서버
```
npm run dev
# http://localhost:3000/dev/login 접속
```

### 5. 로컬 파이프라인 테스트 (옵션, ~30분)
```
cd scripts
source venv/Scripts/activate
python check_trading_day.py
python fetch_stocks.py           # ~15분
python calculate_indicators.py   # ~1분
python fetch_fundamentals.py     # ~10분
```

## 배포

`DEPLOYMENT.md` 참조.

## 디렉터리

```
src/
  app/[basePath]/{login,screener,stock/[code]}
  app/api/auth/{login,logout}
  components/{layout,providers,screener,stock}
  lib/{auth,presets,types,strings}
  middleware.ts
  store/useAppStore.ts

scripts/
  fetch_stocks.py, calculate_indicators.py, fetch_fundamentals.py
  check_trading_day.py, holiday_exit_guard.py
  check-vercel-usage.mjs, check-actions-usage.mjs, update-vercel-env.mjs
  thresholds.mjs, hash-password.ts, build-with-data.sh
  tests/ (pytest)
  __tests__/ (vitest)

.github/workflows/
  daily-update.yml, usage-check.yml, monthly-reset.yml

docs/superpowers/
  specs/2026-04-14-money-screener-design.md
  plans/2026-04-14-phase-*.md
Workprogress/Phase_*.md
```

## 법적 고지

본 프로젝트는 투자 참고 정보만 제공하며 특정 종목의 매수·매도를 추천하지 않습니다. 투자 판단과 손익은 전적으로 투자자 본인의 책임입니다.

## License

Personal use only.
