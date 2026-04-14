# Phase 1 — 프로젝트 초기화 & 데이터 수집 파이프라인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js 14 프로젝트 스켈레톤 + Python 데이터 수집 파이프라인을 구축하여 2,800개 국내 주식 종목의 일봉·지표·펀더멘털 데이터를 JSON으로 생성한다.

**Architecture:** pykrx로 KOSPI+KOSDAQ 전 종목 데이터를 가져와 pandas/numpy로 지표 사전 계산 후 JSON 파일로 저장한다. 프런트는 아직 빈 셸만 구성한다. 모든 Python 로직은 pytest로 TDD.

**Tech Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS / Python 3.11 + pykrx + pandas + numpy + pytest

**Branch:** `feature/phase-1-init-data-pipeline` (작업 시작 시 생성)

---

## 📁 File Structure

### 생성 파일

**프로젝트 루트 설정**
- `package.json` — Next.js 14 + TypeScript + Tailwind 의존성
- `tsconfig.json` — strict 모드
- `next.config.mjs` — 기본 설정
- `tailwind.config.ts` — 테마 색상 토큰
- `postcss.config.mjs`
- `.gitignore` — node_modules, .env.local, .next, __pycache__ 등
- `.env.local.example` — 환경변수 템플릿
- `README.md` — 초기 셋업 가이드

**Python 파이프라인**
- `scripts/requirements.txt` — pykrx, pandas, numpy, pytz, pytest
- `scripts/check_trading_day.py` — 휴장일 감지
- `scripts/fetch_stocks.py` — 종목 메타 + OHLCV 수집
- `scripts/calculate_indicators.py` — MA/RSI/MACD/BB/52주 계산
- `scripts/fetch_fundamentals.py` — PBR/PER/수급 수집
- `scripts/tests/__init__.py`
- `scripts/tests/conftest.py` — pytest 공통 설정
- `scripts/tests/fixtures.py` — 샘플 OHLCV 데이터
- `scripts/tests/test_check_trading_day.py`
- `scripts/tests/test_stock_filter.py`
- `scripts/tests/test_indicators_ma.py`
- `scripts/tests/test_indicators_rsi.py`
- `scripts/tests/test_indicators_macd.py`
- `scripts/tests/test_indicators_bb.py`
- `scripts/tests/test_indicators_52w_volavg.py`
- `scripts/tests/test_fundamentals.py`

**Next.js 빈 셸**
- `src/app/layout.tsx`
- `src/app/page.tsx` — 404 플레이스홀더
- `src/app/globals.css`
- `src/lib/types/indicators.ts` — TypeScript 데이터 타입
- `src/lib/types/presets.ts` — Preset 인터페이스 스텁
- `src/lib/strings/ko.ts` — 한글 텍스트

**데이터 디렉토리**
- `public/data/.gitkeep`
- `public/robots.txt` — Disallow all

**Workprogress**
- `Workprogress/Phase_1_2026-04-14.md`

---

## Task 1: 브랜치 생성 & Next.js 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `.gitignore`, `.env.local.example`, `README.md`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `public/robots.txt`, `public/data/.gitkeep`

- [ ] **Step 1: feature 브랜치 생성**

```bash
cd c:/Users/rk454/Desktop/Project/Money/MoneyProject
git checkout -b feature/phase-1-init-data-pipeline
```

- [ ] **Step 2: package.json 작성**

```json
{
  "name": "money-screener",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "14.2.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.15",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.5.3"
  }
}
```

- [ ] **Step 3: tsconfig.json 작성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "scripts"]
}
```

- [ ] **Step 4: next.config.mjs 작성**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
}

export default nextConfig
```

- [ ] **Step 5: tailwind.config.ts 작성**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: { light: '#FFFFFF', dark: '#141414' },
          secondary: { light: '#F5F7FA', dark: '#1F1F1F' }
        },
        text: {
          primary: { light: '#111111', dark: '#F5F5F5' },
          secondary: { light: '#666666', dark: '#AAAAAA' }
        },
        accent: { light: '#0064FF', dark: '#3D8BFF' },
        positive: { light: '#E53935', dark: '#FF5252' },
        negative: { light: '#3DB351', dark: '#66BB6A' }
      }
    }
  },
  plugins: []
}

export default config
```

- [ ] **Step 6: postcss.config.mjs 작성**

```javascript
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} }
}
```

- [ ] **Step 7: .gitignore 작성**

```
node_modules/
.next/
out/
.env.local
.env*.local
*.log
.DS_Store
Thumbs.db
__pycache__/
*.pyc
.pytest_cache/
.vercel
.superpowers/
```

- [ ] **Step 8: .env.local.example 작성**

```
# User authentication (bcrypt hash 값은 scripts/hash-password.ts로 생성)
USER_KYUNGWON_ID=
USER_KYUNGWON_HASH=
USER_OH_ID=
USER_OH_HASH=

# JWT
JWT_SECRET=

# Secret URL base path
SECRET_BASE_PATH=

# Site enabled flag (true/false)
SITE_ENABLED=true

# Data branch name
DATA_BRANCH=data
```

- [ ] **Step 9: README.md 작성**

```markdown
# Money Screener

국내 주식 중장기 스윙 포착 검색기.

## Setup

### Node
\`\`\`
npm install
npm run dev
\`\`\`

### Python (data pipeline)
\`\`\`
cd scripts
pip install -r requirements.txt
pytest tests/
\`\`\`

## Docs
- 설계 문서: `docs/superpowers/specs/2026-04-14-money-screener-design.md`
- Phase 계획: `docs/superpowers/plans/`
- 작업 기록: `Workprogress/`

## License
Personal use only.
```

- [ ] **Step 10: src/app/globals.css 작성**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body { @apply bg-bg-primary-light text-text-primary-light; }
.dark html, .dark body { @apply bg-bg-primary-dark text-text-primary-dark; }
```

- [ ] **Step 11: src/app/layout.tsx 작성**

```tsx
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Money Screener',
  description: '',
  robots: { index: false, follow: false, nocache: true }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 12: src/app/page.tsx 작성 (루트는 404로 은폐)**

```tsx
import { notFound } from 'next/navigation'

export default function RootPage() {
  notFound()
}
```

- [ ] **Step 13: public/robots.txt 작성**

```
User-agent: *
Disallow: /
```

- [ ] **Step 14: public/data/.gitkeep 생성 (빈 파일)**

- [ ] **Step 15: 설치 및 빌드 확인**

```bash
npm install
npm run type-check
npm run build
```

Expected: 에러 없이 빌드 성공 (루트 `/` 접속은 404). 빌드 산출물 `.next/` 생성.

- [ ] **Step 16: 커밋**

```bash
git add package.json tsconfig.json next.config.mjs tailwind.config.ts postcss.config.mjs .gitignore .env.local.example README.md src/app public/robots.txt public/data/.gitkeep
git commit -m "feat(phase-1): scaffold Next.js 14 project with Tailwind"
```

---

## Task 2: Python 환경 셋업

**Files:**
- Create: `scripts/requirements.txt`, `scripts/tests/__init__.py`, `scripts/tests/conftest.py`

- [ ] **Step 1: scripts/requirements.txt 작성**

```
pykrx==1.0.45
pandas==2.2.2
numpy==1.26.4
pytz==2024.1
pytest==8.2.2
```

- [ ] **Step 2: 가상환경 생성 및 설치**

```bash
cd scripts
python -m venv venv
# Windows:
venv/Scripts/activate
# 또는 bash:
source venv/Scripts/activate
pip install -r requirements.txt
```

Expected: 에러 없이 설치 완료.

- [ ] **Step 3: scripts/tests/__init__.py 생성 (빈 파일)**

- [ ] **Step 4: scripts/tests/conftest.py 작성**

```python
import sys
from pathlib import Path

# 스크립트 루트를 sys.path에 추가 (import 편의)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
```

- [ ] **Step 5: pytest 설치 확인**

```bash
pytest --version
```

Expected: `pytest 8.2.2` 출력.

- [ ] **Step 6: 커밋**

```bash
git add scripts/requirements.txt scripts/tests/__init__.py scripts/tests/conftest.py
git commit -m "feat(phase-1): add Python environment setup"
```

---

## Task 3: 휴장일 감지 스크립트 (TDD)

**Files:**
- Create: `scripts/check_trading_day.py`, `scripts/tests/test_check_trading_day.py`

- [ ] **Step 1: 실패 테스트 작성 — `scripts/tests/test_check_trading_day.py`**

```python
import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / 'check_trading_day.py'


def _run(date_str: str) -> int:
    result = subprocess.run(
        [sys.executable, str(SCRIPT), '--date', date_str],
        capture_output=True, text=True
    )
    return result.returncode


def test_weekday_trading_day_returns_0():
    # 2024-03-15 (금) 정상 거래일
    assert _run('2024-03-15') == 0


def test_saturday_returns_1():
    # 2024-03-16 (토) 휴장
    assert _run('2024-03-16') == 1


def test_new_year_day_returns_1():
    # 2024-01-01 (월) 신정 휴장
    assert _run('2024-01-01') == 1


def test_childrens_day_returns_1():
    # 2024-05-06 (월) 어린이날 대체휴일
    assert _run('2024-05-06') == 1
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd scripts
pytest tests/test_check_trading_day.py -v
```

Expected: FAIL — `check_trading_day.py` 존재하지 않음.

- [ ] **Step 3: scripts/check_trading_day.py 구현**

```python
"""
휴장일 감지 스크립트.
사용: python check_trading_day.py [--date YYYY-MM-DD]
반환: 거래일이면 exit 0, 휴장일이면 exit 1
"""
import argparse
import sys
from datetime import datetime
import pytz
from pykrx import stock


def is_trading_day(date_str: str) -> bool:
    """해당 날짜가 KRX 거래일인지 확인."""
    dt = datetime.strptime(date_str, '%Y-%m-%d')
    # 주말 제외
    if dt.weekday() >= 5:
        return False
    # pykrx로 해당 날짜의 거래 이력 확인 (빈 결과면 휴장일)
    ymd = dt.strftime('%Y%m%d')
    df = stock.get_market_ohlcv_by_date(ymd, ymd, '005930')  # 삼성전자로 테스트
    return not df.empty


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--date', type=str, default=None,
                        help='YYYY-MM-DD (기본: 오늘 KST)')
    args = parser.parse_args()

    if args.date is None:
        kst = pytz.timezone('Asia/Seoul')
        args.date = datetime.now(kst).strftime('%Y-%m-%d')

    if is_trading_day(args.date):
        print(f'{args.date}: trading day')
        sys.exit(0)
    else:
        print(f'{args.date}: holiday')
        sys.exit(1)


if __name__ == '__main__':
    main()
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
pytest tests/test_check_trading_day.py -v
```

Expected: 4개 테스트 모두 PASS.

**주의**: 이 테스트는 pykrx가 Naver/KRX API에 실시간 조회를 수행하므로 **네트워크 연결 필요**. CI에서는 느릴 수 있음.

- [ ] **Step 5: 커밋**

```bash
git add scripts/check_trading_day.py scripts/tests/test_check_trading_day.py
git commit -m "feat(phase-1): add trading day detection script"
```

---

## Task 4: 종목 필터링 로직 (TDD)

**Files:**
- Create: `scripts/fetch_stocks.py`, `scripts/tests/test_stock_filter.py`

- [ ] **Step 1: 실패 테스트 작성 — `scripts/tests/test_stock_filter.py`**

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fetch_stocks import filter_valid_tickers


def test_excludes_preferred_stock_names():
    """우선주(우/우B 접미사) 제외"""
    candidates = [
        ('005930', '삼성전자'),
        ('005935', '삼성전자우'),
        ('051910', 'LG화학'),
        ('051915', 'LG화학우B'),
    ]
    result = filter_valid_tickers(candidates)
    codes = [c for c, _ in result]
    assert '005930' in codes
    assert '005935' not in codes
    assert '051910' in codes
    assert '051915' not in codes


def test_excludes_spac():
    """SPAC 제외"""
    candidates = [
        ('005930', '삼성전자'),
        ('123456', '에이치엘비제15호스팩'),
        ('789012', 'NH스팩20호'),
    ]
    result = filter_valid_tickers(candidates)
    codes = [c for c, _ in result]
    assert '005930' in codes
    assert '123456' not in codes
    assert '789012' not in codes


def test_keeps_normal_stocks():
    """정상 종목은 유지"""
    candidates = [
        ('005930', '삼성전자'),
        ('000660', 'SK하이닉스'),
        ('035420', 'NAVER'),
    ]
    result = filter_valid_tickers(candidates)
    assert len(result) == 3


def test_empty_input_returns_empty():
    assert filter_valid_tickers([]) == []
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
pytest tests/test_stock_filter.py -v
```

Expected: FAIL — `fetch_stocks.py` 존재하지 않음.

- [ ] **Step 3: scripts/fetch_stocks.py 초기 구현 (필터링 함수만)**

```python
"""
종목 메타 + 일봉 수집 스크립트.
출력: public/data/stocks.json, public/data/ohlcv.json
"""
import json
import re
import sys
from pathlib import Path
from datetime import datetime
import pytz
from pykrx import stock

DATA_DIR = Path(__file__).resolve().parent.parent / 'public' / 'data'
PREFERRED_SUFFIX_RE = re.compile(r'우\d*[A-Z]?$')
SPAC_RE = re.compile(r'스팩|SPAC', re.IGNORECASE)


def filter_valid_tickers(candidates: list[tuple[str, str]]) -> list[tuple[str, str]]:
    """
    우선주·SPAC 제외.
    candidates: [(code, name), ...]
    """
    result = []
    for code, name in candidates:
        if PREFERRED_SUFFIX_RE.search(name):
            continue
        if SPAC_RE.search(name):
            continue
        result.append((code, name))
    return result


if __name__ == '__main__':
    # 메인 로직은 Task 6에서 구현
    pass
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
pytest tests/test_stock_filter.py -v
```

Expected: 4개 테스트 모두 PASS.

- [ ] **Step 5: 커밋**

```bash
git add scripts/fetch_stocks.py scripts/tests/test_stock_filter.py
git commit -m "feat(phase-1): add stock ticker filter (exclude preferred/SPAC)"
```

---

## Task 5: 이동평균선 (MA) 계산 (TDD)

**Files:**
- Create: `scripts/calculate_indicators.py`, `scripts/tests/fixtures.py`, `scripts/tests/test_indicators_ma.py`

- [ ] **Step 1: fixtures.py 작성 — `scripts/tests/fixtures.py`**

```python
"""테스트용 샘플 OHLCV 데이터."""
import pandas as pd


def sample_ohlcv_30days() -> pd.DataFrame:
    """30거래일 분량의 가짜 OHLCV (단순 선형 상승)."""
    dates = pd.date_range('2024-01-02', periods=30, freq='B')
    closes = [1000 + i * 10 for i in range(30)]  # 1000, 1010, 1020, ...
    opens  = [c - 5 for c in closes]
    highs  = [c + 5 for c in closes]
    lows   = [c - 10 for c in closes]
    volumes = [1000000 + i * 10000 for i in range(30)]
    return pd.DataFrame({
        'open': opens, 'high': highs, 'low': lows,
        'close': closes, 'volume': volumes
    }, index=dates)
```

- [ ] **Step 2: 실패 테스트 작성 — `scripts/tests/test_indicators_ma.py`**

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
from fixtures import sample_ohlcv_30days
from calculate_indicators import compute_ma


def test_ma5_matches_rolling_mean():
    df = sample_ohlcv_30days()
    result = compute_ma(df, window=5)
    expected_last = df['close'].tail(5).mean()
    assert result.iloc[-1] == expected_last


def test_ma20_first_19_are_nan():
    df = sample_ohlcv_30days()
    result = compute_ma(df, window=20)
    assert result.iloc[:19].isna().all()
    assert not pd.isna(result.iloc[19])


def test_ma_insufficient_data_returns_all_nan():
    df = sample_ohlcv_30days().head(10)
    result = compute_ma(df, window=20)
    assert result.isna().all()
```

- [ ] **Step 3: 테스트 실행 → 실패 확인**

```bash
pytest tests/test_indicators_ma.py -v
```

Expected: FAIL — `calculate_indicators.py` 또는 `compute_ma` 없음.

- [ ] **Step 4: scripts/calculate_indicators.py 초기 구현**

```python
"""
지표 사전 계산 스크립트.
입력: public/data/ohlcv.json
출력: public/data/indicators.json
"""
import pandas as pd


def compute_ma(df: pd.DataFrame, window: int) -> pd.Series:
    """단순이동평균 (Simple Moving Average)."""
    return df['close'].rolling(window=window, min_periods=window).mean()


if __name__ == '__main__':
    # 메인 로직은 Task 12에서 구현
    pass
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

```bash
pytest tests/test_indicators_ma.py -v
```

Expected: 3개 테스트 모두 PASS.

- [ ] **Step 6: 커밋**

```bash
git add scripts/calculate_indicators.py scripts/tests/fixtures.py scripts/tests/test_indicators_ma.py
git commit -m "feat(phase-1): add MA (Simple Moving Average) calculation"
```

---

## Task 6: RSI 계산 (TDD)

**Files:**
- Modify: `scripts/calculate_indicators.py`
- Create: `scripts/tests/test_indicators_rsi.py`

- [ ] **Step 1: 실패 테스트 작성 — `scripts/tests/test_indicators_rsi.py`**

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
import numpy as np
from calculate_indicators import compute_rsi


def _sample_prices():
    """RSI 테스트용: 위키피디아 Wilder's 예시 유사 데이터."""
    closes = [
        44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42,
        45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00,
        46.03, 46.41, 46.22, 45.64
    ]
    return pd.DataFrame({'close': closes})


def test_rsi_within_0_to_100():
    df = _sample_prices()
    rsi = compute_rsi(df, period=14)
    valid = rsi.dropna()
    assert (valid >= 0).all() and (valid <= 100).all()


def test_rsi_insufficient_data_is_nan():
    df = pd.DataFrame({'close': [100, 101, 102]})  # 3개만
    rsi = compute_rsi(df, period=14)
    assert rsi.isna().all()


def test_rsi_uptrend_above_50():
    """순상승 종가에서 RSI가 50 이상."""
    df = pd.DataFrame({'close': list(range(100, 130))})  # 100→129
    rsi = compute_rsi(df, period=14)
    assert rsi.iloc[-1] > 50


def test_rsi_downtrend_below_50():
    df = pd.DataFrame({'close': list(range(130, 100, -1))})
    rsi = compute_rsi(df, period=14)
    assert rsi.iloc[-1] < 50
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
pytest tests/test_indicators_rsi.py -v
```

Expected: FAIL — `compute_rsi` 없음.

- [ ] **Step 3: calculate_indicators.py에 compute_rsi 추가**

```python
def compute_rsi(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """RSI (Wilder's smoothing)."""
    delta = df['close'].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
pytest tests/test_indicators_rsi.py -v
```

Expected: 4개 테스트 모두 PASS.

- [ ] **Step 5: 커밋**

```bash
git add scripts/calculate_indicators.py scripts/tests/test_indicators_rsi.py
git commit -m "feat(phase-1): add RSI (Wilder's smoothing) calculation"
```

---

## Task 7: MACD 계산 (TDD)

**Files:**
- Modify: `scripts/calculate_indicators.py`
- Create: `scripts/tests/test_indicators_macd.py`

- [ ] **Step 1: 실패 테스트 작성 — `scripts/tests/test_indicators_macd.py`**

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
from calculate_indicators import compute_macd


def test_macd_returns_three_series():
    closes = list(range(100, 160))  # 60 포인트
    df = pd.DataFrame({'close': closes})
    line, signal, hist = compute_macd(df)
    assert len(line) == len(df)
    assert len(signal) == len(df)
    assert len(hist) == len(df)


def test_macd_hist_equals_line_minus_signal():
    closes = list(range(100, 160))
    df = pd.DataFrame({'close': closes})
    line, signal, hist = compute_macd(df)
    import numpy as np
    # 후반부에서만 검증 (초기 NaN 제외)
    tail_line = line.tail(10).values
    tail_signal = signal.tail(10).values
    tail_hist = hist.tail(10).values
    assert np.allclose(tail_hist, tail_line - tail_signal, equal_nan=True)


def test_macd_uptrend_line_above_signal():
    """지속 상승 구간에서 MACD Line > Signal."""
    closes = list(range(100, 200))
    df = pd.DataFrame({'close': closes})
    line, signal, _ = compute_macd(df)
    assert line.iloc[-1] > signal.iloc[-1]
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
pytest tests/test_indicators_macd.py -v
```

Expected: FAIL — `compute_macd` 없음.

- [ ] **Step 3: calculate_indicators.py에 compute_macd 추가**

```python
def compute_macd(
    df: pd.DataFrame,
    fast: int = 12,
    slow: int = 26,
    signal_period: int = 9
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """MACD (Line, Signal, Histogram)."""
    ema_fast = df['close'].ewm(span=fast, adjust=False).mean()
    ema_slow = df['close'].ewm(span=slow, adjust=False).mean()
    line = ema_fast - ema_slow
    signal = line.ewm(span=signal_period, adjust=False).mean()
    hist = line - signal
    return line, signal, hist
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
pytest tests/test_indicators_macd.py -v
```

Expected: 3개 테스트 모두 PASS.

- [ ] **Step 5: 커밋**

```bash
git add scripts/calculate_indicators.py scripts/tests/test_indicators_macd.py
git commit -m "feat(phase-1): add MACD calculation"
```

---

## Task 8: 볼린저밴드 계산 (TDD)

**Files:**
- Modify: `scripts/calculate_indicators.py`
- Create: `scripts/tests/test_indicators_bb.py`

- [ ] **Step 1: 실패 테스트 작성 — `scripts/tests/test_indicators_bb.py`**

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
import numpy as np
from calculate_indicators import compute_bollinger


def test_bb_middle_equals_ma20():
    df = pd.DataFrame({'close': list(range(100, 150))})
    upper, middle, lower = compute_bollinger(df, window=20, std_mult=2)
    expected_middle = df['close'].rolling(20, min_periods=20).mean()
    pd.testing.assert_series_equal(middle, expected_middle, check_names=False)


def test_bb_upper_gt_middle_gt_lower():
    df = pd.DataFrame({'close': [100 + np.sin(i/3)*10 for i in range(50)]})
    upper, middle, lower = compute_bollinger(df, window=20, std_mult=2)
    valid = upper.dropna().index
    for idx in valid:
        assert upper[idx] > middle[idx] > lower[idx]


def test_bb_insufficient_data_is_nan():
    df = pd.DataFrame({'close': list(range(100, 110))})
    upper, middle, lower = compute_bollinger(df, window=20, std_mult=2)
    assert upper.isna().all()
    assert middle.isna().all()
    assert lower.isna().all()
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
pytest tests/test_indicators_bb.py -v
```

Expected: FAIL.

- [ ] **Step 3: compute_bollinger 추가**

```python
def compute_bollinger(
    df: pd.DataFrame,
    window: int = 20,
    std_mult: float = 2.0
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """볼린저밴드 (Upper, Middle, Lower)."""
    middle = df['close'].rolling(window=window, min_periods=window).mean()
    std = df['close'].rolling(window=window, min_periods=window).std(ddof=0)
    upper = middle + std_mult * std
    lower = middle - std_mult * std
    return upper, middle, lower
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pytest tests/test_indicators_bb.py -v
```

Expected: 3개 PASS.

- [ ] **Step 5: 커밋**

```bash
git add scripts/calculate_indicators.py scripts/tests/test_indicators_bb.py
git commit -m "feat(phase-1): add Bollinger Band calculation"
```

---

## Task 9: 52주 신고가 & 거래량 평균 (TDD)

**Files:**
- Modify: `scripts/calculate_indicators.py`
- Create: `scripts/tests/test_indicators_52w_volavg.py`

- [ ] **Step 1: 실패 테스트 작성**

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
from calculate_indicators import compute_high52w, compute_vol_avg20


def test_high52w_returns_running_max():
    df = pd.DataFrame({'close': [100, 105, 98, 110, 107, 120, 115]})
    result = compute_high52w(df)
    assert result.iloc[-1] == 120


def test_high52w_window_limit():
    """250일 초과시 윈도우 밖 값은 제외."""
    closes = [200] + [100] * 250 + [150]  # 처음 값이 최고
    df = pd.DataFrame({'close': closes})
    result = compute_high52w(df)
    assert result.iloc[-1] == 150  # 200은 251일 전이라 제외


def test_vol_avg20_excludes_today():
    """오늘 거래량은 평균 계산에서 제외."""
    volumes = [100] * 20 + [9999]  # 20일 평균은 100, 오늘은 9999
    df = pd.DataFrame({'volume': volumes})
    result = compute_vol_avg20(df)
    assert result.iloc[-1] == 100
    assert result.iloc[-1] != 9999


def test_vol_avg20_insufficient_data_is_nan():
    df = pd.DataFrame({'volume': [100, 200, 300]})
    result = compute_vol_avg20(df)
    assert result.isna().all()
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
pytest tests/test_indicators_52w_volavg.py -v
```

Expected: FAIL.

- [ ] **Step 3: 함수 추가**

```python
def compute_high52w(df: pd.DataFrame, window: int = 250) -> pd.Series:
    """52주(250거래일) 신고가 (종가 기준)."""
    return df['close'].rolling(window=window, min_periods=1).max()


def compute_vol_avg20(df: pd.DataFrame, window: int = 20) -> pd.Series:
    """거래량 20일 평균 (전일 기준, 당일 제외)."""
    return df['volume'].shift(1).rolling(window=window, min_periods=window).mean()
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pytest tests/test_indicators_52w_volavg.py -v
```

Expected: 4개 PASS.

- [ ] **Step 5: 커밋**

```bash
git add scripts/calculate_indicators.py scripts/tests/test_indicators_52w_volavg.py
git commit -m "feat(phase-1): add 52-week high and volume average"
```

---

## Task 10: 종목 메타 + OHLCV 수집 메인 로직 (통합 테스트)

**Files:**
- Modify: `scripts/fetch_stocks.py`

- [ ] **Step 1: fetch_stocks.py 메인 로직 구현**

`scripts/fetch_stocks.py`에 다음 추가:

```python
import time
from datetime import timedelta


def get_all_candidates(date_str: str) -> list[tuple[str, str]]:
    """KOSPI + KOSDAQ 전 종목 조회."""
    ymd = date_str.replace('-', '')
    codes_kospi = stock.get_market_ticker_list(ymd, market='KOSPI')
    codes_kosdaq = stock.get_market_ticker_list(ymd, market='KOSDAQ')
    all_codes = codes_kospi + codes_kosdaq
    candidates = [(c, stock.get_market_ticker_name(c)) for c in all_codes]
    return candidates


def fetch_ohlcv(code: str, start_ymd: str, end_ymd: str, retries: int = 3) -> dict | None:
    """단일 종목 조정종가 OHLCV 조회. 실패 시 None."""
    for attempt in range(retries):
        try:
            df = stock.get_market_ohlcv_by_date(
                start_ymd, end_ymd, code, adjusted=True
            )
            if df.empty:
                return None
            df.index = df.index.strftime('%Y-%m-%d')
            return {
                'dates':  df.index.tolist(),
                'open':   df['시가'].astype(int).tolist(),
                'high':   df['고가'].astype(int).tolist(),
                'low':    df['저가'].astype(int).tolist(),
                'close':  df['종가'].astype(int).tolist(),
                'volume': df['거래량'].astype(int).tolist()
            }
        except Exception as e:
            if attempt == retries - 1:
                print(f'[WARN] {code} fetch failed after {retries} retries: {e}',
                      file=sys.stderr)
                return None
            time.sleep(1.0)
    return None


def main():
    kst = pytz.timezone('Asia/Seoul')
    today = datetime.now(kst).strftime('%Y-%m-%d')
    ymd = today.replace('-', '')
    
    # 250거래일 전 계산 (여유있게 365일 전부터)
    start_dt = datetime.strptime(today, '%Y-%m-%d') - timedelta(days=365)
    start_ymd = start_dt.strftime('%Y%m%d')

    print(f'[INFO] Fetching tickers for {today}...')
    candidates = get_all_candidates(today)
    print(f'[INFO] Total candidates: {len(candidates)}')

    valid = filter_valid_tickers(candidates)
    print(f'[INFO] After filter: {len(valid)}')

    # 시장 구분 조회
    market_map = {}
    for code in stock.get_market_ticker_list(ymd, market='KOSPI'):
        market_map[code] = 'KOSPI'
    for code in stock.get_market_ticker_list(ymd, market='KOSDAQ'):
        market_map[code] = 'KOSDAQ'

    # 메타 저장
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    stocks_json = {
        'updated_at': datetime.now(kst).isoformat(),
        'trade_date': today,
        'count': len(valid),
        'stocks': [
            {'code': c, 'name': n, 'market': market_map.get(c, 'UNKNOWN')}
            for c, n in valid
        ]
    }
    (DATA_DIR / 'stocks.json').write_text(
        json.dumps(stocks_json, ensure_ascii=False),
        encoding='utf-8'
    )
    print(f'[INFO] stocks.json saved ({len(valid)} stocks)')

    # OHLCV 수집
    print(f'[INFO] Fetching OHLCV from {start_ymd} to {ymd}...')
    ohlcv = {}
    fail_count = 0
    for i, (code, _name) in enumerate(valid):
        data = fetch_ohlcv(code, start_ymd, ymd)
        if data is None:
            fail_count += 1
            continue
        ohlcv[code] = data
        if (i + 1) % 100 == 0:
            print(f'[INFO] {i+1}/{len(valid)} fetched (fails: {fail_count})')

    (DATA_DIR / 'ohlcv.json').write_text(
        json.dumps(ohlcv, ensure_ascii=False),
        encoding='utf-8'
    )
    print(f'[INFO] ohlcv.json saved ({len(ohlcv)} stocks, {fail_count} failed)')


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: 로컬에서 소규모 수동 검증 (전체 실행은 10분 이상 소요)**

데이터량이 많으므로 테스트 중엔 샘플 10종목만 실행하는 별도 디버그 함수를 임시 추가하거나, 그냥 전체 실행 1회.

```bash
cd scripts
python fetch_stocks.py
```

Expected: 
- `[INFO] Total candidates: 2700+`
- `[INFO] After filter: 2000~2500` (우선주·SPAC 제외)
- `[INFO] stocks.json saved`
- `[INFO] ohlcv.json saved`

**public/data/stocks.json, public/data/ohlcv.json 생성 확인.**

- [ ] **Step 3: JSON 스키마 수동 검증**

```bash
# stocks.json 구조 확인
cat public/data/stocks.json | python -c "import json,sys; d=json.load(sys.stdin); print('count:', d['count']); print('first:', d['stocks'][0])"

# ohlcv.json 크기 확인 (~40MB 예상)
ls -lh public/data/ohlcv.json
```

Expected:
- count가 2000~2800 사이
- 첫 종목이 `{"code": "...", "name": "...", "market": "KOSPI"}` 형식
- ohlcv.json 크기 30~60MB

- [ ] **Step 4: 기존 단위 테스트 재실행 (기존 테스트 깨지지 않음 확인)**

```bash
pytest tests/ -v
```

Expected: 전 테스트 PASS.

- [ ] **Step 5: 커밋 (데이터 JSON은 커밋 안 함 — data 브랜치 용)**

```bash
git add scripts/fetch_stocks.py
git commit -m "feat(phase-1): implement stock ticker and OHLCV fetch main logic"
```

**주의**: `public/data/ohlcv.json`은 크기 때문에 main 브랜치 커밋 금지. `.gitignore`에 이미 `public/data/*.json` 넣어둘지 여부는 Phase 7에서 data 브랜치 설계 시 재결정.

---

## Task 11: 지표 계산 메인 로직 (통합)

**Files:**
- Modify: `scripts/calculate_indicators.py`

- [ ] **Step 1: calculate_indicators.py 메인 로직 추가**

기존 compute_* 함수들 아래에 추가:

```python
import json
import sys
from pathlib import Path
from datetime import datetime
import pytz

DATA_DIR = Path(__file__).resolve().parent.parent / 'public' / 'data'


def _to_rounded_list(series, decimals: int = 2) -> list:
    """시리즈를 float 리스트로 변환, NaN은 None으로, 소수점 제한."""
    return [
        None if pd.isna(v) else round(float(v), decimals)
        for v in series.tolist()
    ]


def process_single_stock(
    code: str,
    name: str,
    market: str,
    ohlcv: dict,
    recent_days: int = 30
) -> dict | None:
    """단일 종목 지표 계산 후 최근 N일치 반환."""
    if len(ohlcv['close']) < 20:  # 최소 데이터 요구
        return None
    
    df = pd.DataFrame({
        'close':  ohlcv['close'],
        'volume': ohlcv['volume']
    }, index=pd.to_datetime(ohlcv['dates']))
    
    ma5   = compute_ma(df, 5)
    ma20  = compute_ma(df, 20)
    ma60  = compute_ma(df, 60)
    ma120 = compute_ma(df, 120)
    rsi14 = compute_rsi(df, 14)
    macd_line, macd_signal, macd_hist = compute_macd(df)
    bb_upper, bb_middle, bb_lower = compute_bollinger(df)
    vol_avg20 = compute_vol_avg20(df)
    high52w = compute_high52w(df)
    
    has_52w = len(df) >= 250
    
    # 최근 N일만 추출
    tail_slice = slice(-recent_days, None)
    
    return {
        'name': name,
        'market': market,
        'dates':       ohlcv['dates'][tail_slice],
        'close':       ohlcv['close'][tail_slice],
        'volume':      ohlcv['volume'][tail_slice],
        'ma5':         _to_rounded_list(ma5.iloc[tail_slice]),
        'ma20':        _to_rounded_list(ma20.iloc[tail_slice]),
        'ma60':        _to_rounded_list(ma60.iloc[tail_slice]),
        'ma120':       _to_rounded_list(ma120.iloc[tail_slice]),
        'rsi14':       _to_rounded_list(rsi14.iloc[tail_slice]),
        'macd_line':   _to_rounded_list(macd_line.iloc[tail_slice]),
        'macd_signal': _to_rounded_list(macd_signal.iloc[tail_slice]),
        'macd_hist':   _to_rounded_list(macd_hist.iloc[tail_slice]),
        'bb_upper':    _to_rounded_list(bb_upper.iloc[tail_slice]),
        'bb_middle':   _to_rounded_list(bb_middle.iloc[tail_slice]),
        'bb_lower':    _to_rounded_list(bb_lower.iloc[tail_slice]),
        'high52w':     None if pd.isna(high52w.iloc[-1]) else int(high52w.iloc[-1]),
        'has_52w':     has_52w,
        'vol_avg20':   None if pd.isna(vol_avg20.iloc[-1]) else int(vol_avg20.iloc[-1])
    }


def main():
    stocks_path = DATA_DIR / 'stocks.json'
    ohlcv_path = DATA_DIR / 'ohlcv.json'
    
    if not stocks_path.exists() or not ohlcv_path.exists():
        print('[ERROR] stocks.json or ohlcv.json missing. Run fetch_stocks.py first.',
              file=sys.stderr)
        sys.exit(1)
    
    stocks = json.loads(stocks_path.read_text(encoding='utf-8'))
    ohlcv_all = json.loads(ohlcv_path.read_text(encoding='utf-8'))
    
    kst = pytz.timezone('Asia/Seoul')
    result = {
        'meta': {
            'updated_at': datetime.now(kst).isoformat(),
            'trade_date': stocks['trade_date'],
            'stock_count': 0,
            'days': 30
        }
    }
    
    processed = 0
    for s in stocks['stocks']:
        code = s['code']
        if code not in ohlcv_all:
            continue
        indicators = process_single_stock(
            code, s['name'], s['market'], ohlcv_all[code]
        )
        if indicators is not None:
            result[code] = indicators
            processed += 1
    
    result['meta']['stock_count'] = processed
    
    (DATA_DIR / 'indicators.json').write_text(
        json.dumps(result, ensure_ascii=False),
        encoding='utf-8'
    )
    print(f'[INFO] indicators.json saved ({processed} stocks)')


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: 실행 및 수동 검증**

```bash
cd scripts
python calculate_indicators.py
```

Expected:
- `[INFO] indicators.json saved (N stocks)` (N은 2000~2800)
- `public/data/indicators.json` 생성

- [ ] **Step 3: indicators.json 구조 검증**

```bash
cat public/data/indicators.json | python -c "
import json, sys
d = json.load(sys.stdin)
print('meta:', d['meta'])
first_code = [k for k in d if k != 'meta'][0]
print('first code:', first_code)
print('keys:', list(d[first_code].keys())[:5])
print('dates len:', len(d[first_code]['dates']))
"
```

Expected: `meta` 필드 + 각 종목 30일치 지표 배열.

- [ ] **Step 4: 기존 테스트 재실행**

```bash
pytest tests/ -v
```

Expected: 전 테스트 PASS.

- [ ] **Step 5: 커밋**

```bash
git add scripts/calculate_indicators.py
git commit -m "feat(phase-1): implement indicators main processing"
```

---

## Task 12: 펀더멘털 & 수급 데이터 수집 (TDD)

**Files:**
- Create: `scripts/fetch_fundamentals.py`, `scripts/tests/test_fundamentals.py`

- [ ] **Step 1: 실패 테스트 작성 — `scripts/tests/test_fundamentals.py`**

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fetch_fundamentals import (
    normalize_fundamental_row,
    build_net_purchase_history
)


def test_normalize_fundamental_row_valid():
    row = {'BPS': 50000, 'PER': 12.5, 'PBR': 1.24, 'EPS': 5000, 'DIV': 2.0, 'DPS': 1000}
    result = normalize_fundamental_row(row, market_cap=450_000_000_000_000)
    assert result['pbr'] == 1.24
    assert result['per'] == 12.5
    assert result['market_cap'] == 450_000_000_000_000


def test_normalize_fundamental_row_missing_pbr_is_none():
    row = {'BPS': 0, 'PER': 12.5, 'PBR': 0, 'EPS': 5000}
    result = normalize_fundamental_row(row, market_cap=100)
    # PBR == 0은 데이터 없음으로 간주 → None
    assert result['pbr'] is None


def test_build_net_purchase_history_takes_last_n():
    rows = [
        {'date': '2026-04-01', 'foreign': 100, 'institution': 50},
        {'date': '2026-04-02', 'foreign': 200, 'institution': 80},
        {'date': '2026-04-03', 'foreign': -30, 'institution': 10},
    ]
    foreign, inst = build_net_purchase_history(rows, n=2)
    assert foreign == [200, -30]
    assert inst == [80, 10]


def test_build_net_purchase_history_empty():
    foreign, inst = build_net_purchase_history([], n=5)
    assert foreign == []
    assert inst == []
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
pytest tests/test_fundamentals.py -v
```

Expected: FAIL — `fetch_fundamentals.py` 없음.

- [ ] **Step 3: scripts/fetch_fundamentals.py 구현**

```python
"""
펀더멘털 + 수급 수집.
출력: public/data/fundamentals.json, public/data/updated_at.json
"""
import json
import sys
from pathlib import Path
from datetime import datetime, timedelta
import pytz
from pykrx import stock

DATA_DIR = Path(__file__).resolve().parent.parent / 'public' / 'data'


def normalize_fundamental_row(row: dict, market_cap: int) -> dict:
    """단일 종목의 PBR/PER/시총 정규화. 0은 None."""
    pbr = row.get('PBR', 0)
    per = row.get('PER', 0)
    return {
        'pbr': float(pbr) if pbr and pbr > 0 else None,
        'per': float(per) if per and per > 0 else None,
        'market_cap': int(market_cap) if market_cap else 0
    }


def build_net_purchase_history(rows: list[dict], n: int = 10) -> tuple[list[int], list[int]]:
    """[{date, foreign, institution}] → (foreign[], inst[]) 최근 n일."""
    if not rows:
        return [], []
    tail = rows[-n:]
    return (
        [int(r['foreign']) for r in tail],
        [int(r['institution']) for r in tail]
    )


def main():
    kst = pytz.timezone('Asia/Seoul')
    today = datetime.now(kst).strftime('%Y-%m-%d')
    ymd = today.replace('-', '')

    # 종목 리스트 로드
    stocks_path = DATA_DIR / 'stocks.json'
    if not stocks_path.exists():
        print('[ERROR] stocks.json missing.', file=sys.stderr)
        sys.exit(1)
    stocks = json.loads(stocks_path.read_text(encoding='utf-8'))

    # 1. 펀더멘털 전체 조회
    print('[INFO] Fetching fundamentals...')
    df_fund = stock.get_market_fundamental(ymd)  # DataFrame indexed by ticker
    df_cap = stock.get_market_cap(ymd)

    # 2. 수급 최근 10거래일
    print('[INFO] Fetching net purchases (last 10 trading days)...')
    start_dt = datetime.strptime(today, '%Y-%m-%d') - timedelta(days=20)
    start_ymd = start_dt.strftime('%Y%m%d')

    result = {}
    for s in stocks['stocks']:
        code = s['code']
        fund_row = df_fund.loc[code].to_dict() if code in df_fund.index else {}
        cap = int(df_cap.loc[code, '시가총액']) if code in df_cap.index else 0
        fund = normalize_fundamental_row(fund_row, cap)

        try:
            net_df = stock.get_market_net_purchases_of_equities(
                start_ymd, ymd, code, '개별'
            )
            # pykrx 반환 구조에 맞춰 외국인·기관 컬럼 찾기
            rows = []
            if not net_df.empty:
                for idx, row in net_df.iterrows():
                    rows.append({
                        'date': idx.strftime('%Y-%m-%d'),
                        'foreign': int(row.get('외국인', 0)),
                        'institution': int(row.get('기관합계', 0))
                    })
            foreign, inst = build_net_purchase_history(rows, n=10)
        except Exception:
            foreign, inst = [], []

        result[code] = {
            **fund,
            'foreign_net': foreign,
            'institution_net': inst
        }

    (DATA_DIR / 'fundamentals.json').write_text(
        json.dumps(result, ensure_ascii=False),
        encoding='utf-8'
    )
    print(f'[INFO] fundamentals.json saved ({len(result)} stocks)')

    # updated_at.json
    updated = {
        'updated_at': datetime.now(kst).isoformat(),
        'trade_date': stocks['trade_date']
    }
    (DATA_DIR / 'updated_at.json').write_text(
        json.dumps(updated, ensure_ascii=False),
        encoding='utf-8'
    )
    print(f'[INFO] updated_at.json saved')


if __name__ == '__main__':
    main()
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pytest tests/test_fundamentals.py -v
```

Expected: 4개 PASS.

- [ ] **Step 5: 실제 실행 (수동 검증)**

```bash
python fetch_fundamentals.py
```

Expected: `[INFO] fundamentals.json saved (N stocks)` + `updated_at.json saved`

- [ ] **Step 6: 커밋**

```bash
git add scripts/fetch_fundamentals.py scripts/tests/test_fundamentals.py
git commit -m "feat(phase-1): add fundamentals and net purchase fetch"
```

---

## Task 13: TypeScript 데이터 타입 정의

**Files:**
- Create: `src/lib/types/indicators.ts`, `src/lib/types/presets.ts`

- [ ] **Step 1: src/lib/types/indicators.ts 작성**

```typescript
export interface StockMeta {
  code: string
  name: string
  market: 'KOSPI' | 'KOSDAQ' | 'UNKNOWN'
}

export interface StocksJson {
  updated_at: string
  trade_date: string
  count: number
  stocks: StockMeta[]
}

export interface StockIndicators {
  name: string
  market: 'KOSPI' | 'KOSDAQ' | 'UNKNOWN'
  dates: string[]
  close: number[]
  volume: number[]
  ma5: (number | null)[]
  ma20: (number | null)[]
  ma60: (number | null)[]
  ma120: (number | null)[]
  rsi14: (number | null)[]
  macd_line: (number | null)[]
  macd_signal: (number | null)[]
  macd_hist: (number | null)[]
  bb_upper: (number | null)[]
  bb_middle: (number | null)[]
  bb_lower: (number | null)[]
  high52w: number | null
  has_52w: boolean
  vol_avg20: number | null
}

export interface IndicatorsJson {
  meta: {
    updated_at: string
    trade_date: string
    stock_count: number
    days: number
  }
  [code: string]: StockIndicators | IndicatorsJson['meta']
}

export interface Fundamental {
  pbr: number | null
  per: number | null
  market_cap: number
  foreign_net: number[]
  institution_net: number[]
}

export interface FundamentalsJson {
  [code: string]: Fundamental
}

export interface UpdatedAtJson {
  updated_at: string
  trade_date: string
}
```

- [ ] **Step 2: src/lib/types/presets.ts 스텁 작성**

```typescript
export type ModeKey = 'beginner' | 'expert'

export interface ParamDef {
  key: string
  label: string
  type: 'slider' | 'toggle'
  min?: number
  max?: number
  step?: number
  default: number | boolean
}

export interface PresetDescription {
  beginner: string
  expert: string
}

export interface PresetMeta {
  id: string
  name: string
  mode: ModeKey[]
  params: ParamDef[]
  description: PresetDescription
  buyTiming: string
  holdingPeriod: string
  stopLoss: string
  traps: string
}
```

- [ ] **Step 3: TypeScript 컴파일 검증**

```bash
npm run type-check
```

Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/lib/types/indicators.ts src/lib/types/presets.ts
git commit -m "feat(phase-1): add TypeScript types for data schemas"
```

---

## Task 14: 한글 문자열 리소스 (하드코딩 금지 규칙)

**Files:**
- Create: `src/lib/strings/ko.ts`

- [ ] **Step 1: src/lib/strings/ko.ts 작성**

```typescript
export const strings = {
  app: {
    title: 'Money Screener',
    description: '국내 주식 중장기 스윙 포착 검색기'
  },
  common: {
    login: '로그인',
    logout: '로그아웃',
    loading: '불러오는 중...',
    error: '오류가 발생했습니다',
    retry: '다시 시도',
    confirm: '확인',
    cancel: '취소',
    close: '닫기'
  },
  mode: {
    beginner: '초보',
    expert: '전문가',
    toggle_aria: '모드 전환'
  },
  theme: {
    light: '라이트',
    dark: '다크',
    toggle_aria: '테마 전환'
  },
  dataStatus: {
    updatedAt: (time: string) => `최근 업데이트: ${time}`,
    stale24h: '⚠️ 데이터가 오래되었습니다. 업데이트 실패 가능',
    stale48h: '🔴 데이터 갱신 중단. 관리자에게 문의하세요',
    loading: '데이터를 불러오는 중입니다...'
  },
  auth: {
    loginTitle: '로그인',
    idLabel: '아이디',
    pwLabel: '비밀번호',
    loginButton: '로그인',
    agreementLabel: '위 내용을 확인했으며, 본 사이트 이용에 동의합니다.',
    loginFail: '아이디 또는 비밀번호가 일치하지 않습니다',
    rateLimit: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.',
    agreementRequired: '약관에 동의해주세요'
  },
  legal: {
    disclaimer: '본 사이트는 투자 참고 정보만 제공하며, 특정 종목의 매수·매도를 추천하지 않습니다. 투자 판단과 그에 따른 손익은 전적으로 투자자 본인의 책임입니다. 데이터 오류·지연에 대해 책임지지 않습니다.'
  },
  screener: {
    beginnerTitle: '오늘의 추천 종목',
    expertTitle: '전략 선택',
    empty: '조건에 맞는 종목이 없습니다',
    resultCount: (n: number) => `${n}개 종목`
  },
  maintenance: {
    title: '🛠️ 서비스 일시 중단 중입니다',
    description: '이번 달 무료 사용 한도에 근접하여 서비스가 일시 중단되었습니다.',
    resumeLabel: '재개 예정',
    contactLabel: '긴급 문의'
  }
} as const

export type Strings = typeof strings
```

- [ ] **Step 2: 컴파일 검증**

```bash
npm run type-check
```

Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/strings/ko.ts
git commit -m "feat(phase-1): add Korean string resources (no hardcoding rule)"
```

---

## Task 15: Python 전체 테스트 실행 + 데이터 파이프라인 E2E 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: Python 전체 테스트 실행**

```bash
cd scripts
pytest tests/ -v
```

Expected: 모든 테스트 PASS. 약 25~30개 테스트 케이스.

- [ ] **Step 2: 데이터 파이프라인 순서대로 실행**

```bash
python check_trading_day.py         # (거래일 아니면 스킵 가능)
python fetch_stocks.py              # ~15분
python calculate_indicators.py      # ~1분
python fetch_fundamentals.py        # ~10분
```

Expected: 모든 실행 성공, `public/data/` 아래 5개 JSON 생성:
- `stocks.json`
- `ohlcv.json`
- `indicators.json`
- `fundamentals.json`
- `updated_at.json`

- [ ] **Step 3: 생성된 JSON 크기 및 구조 확인**

```bash
ls -lh public/data/
```

Expected:
- stocks.json: ~200KB
- ohlcv.json: 30~60MB
- indicators.json: 15~25MB
- fundamentals.json: 1~3MB
- updated_at.json: <1KB

- [ ] **Step 4: stocks.json, indicators.json 샘플 검증**

삼성전자(005930)가 포함돼 있고 필드가 올바른지 확인:

```bash
python -c "
import json
s = json.load(open('public/data/stocks.json', encoding='utf-8'))
i = json.load(open('public/data/indicators.json', encoding='utf-8'))
print('samsung in stocks:', any(x['code']=='005930' for x in s['stocks']))
print('samsung in indicators:', '005930' in i)
print('samsung recent close:', i['005930']['close'][-1])
print('samsung ma20[-1]:', i['005930']['ma20'][-1])
print('samsung rsi14[-1]:', i['005930']['rsi14'][-1])
"
```

Expected: 모두 True + 삼성전자 지표 값들이 합리적(수만원 주가, RSI 0~100).

---

## Task 16: Phase 1 Workprogress 기록 & 마무리

**Files:**
- Create: `Workprogress/Phase_1_2026-04-14.md`

- [ ] **Step 1: Workprogress/Phase_1_2026-04-14.md 작성**

```markdown
# Phase 1 — 프로젝트 초기화 & 데이터 수집 파이프라인

Phase: 1
Status: 완료
LastUpdate: 2026-04-14
Branch: feature/phase-1-init-data-pipeline

RecentWork:
  - Next.js 14 + TypeScript + Tailwind 프로젝트 스캐폴딩
  - Python 파이프라인 (pykrx + pandas) 구축
  - 지표 계산 (MA/RSI/MACD/BB/52주/거래량평균) TDD로 구현
  - 펀더멘털·수급 수집 구현
  - 로컬에서 2,800종목 데이터 → JSON 생성 검증 완료

MainWork:
  - (Phase 2로 이관) 인증 시스템

ResolvedWork:
  - 프로젝트 스캐폴딩
  - Python 환경 셋업
  - 휴장일 감지
  - 종목 필터링
  - MA/RSI/MACD/BB/52주/거래량평균 계산
  - 종목·OHLCV 수집 메인
  - 지표 계산 메인
  - 펀더멘털·수급 수집
  - TypeScript 타입 정의
  - 한글 문자열 리소스

MainIssues:
  - 없음

ResolvedIssues:
  - 없음

RelatedPhases:
  - Phase 2 (인증)
  - Phase 7 (GitHub Actions 자동화)
```

- [ ] **Step 2: 커밋**

```bash
git add Workprogress/Phase_1_2026-04-14.md
git commit -m "docs(phase-1): add Phase 1 workprogress record"
```

- [ ] **Step 3: 브랜치 푸시 (사용자 확인 후)**

**⚠️ CLAUDE.md 규칙: 푸시 전 사용자 확인 필수.**

사용자에게 확인 후:
```bash
git push -u origin feature/phase-1-init-data-pipeline
```

- [ ] **Step 4: PR 생성 (사용자 확인 후)**

GitHub에서 PR 생성 또는 `gh pr create`로 자동 생성.

- [ ] **Step 5: /requesting-code-review 실행 (CLAUDE.md 규칙)**

- [ ] **Step 6: /verification-before-completion 실행**

---

## 📊 Self-Review (작성자 자체 검토)

### Spec Coverage (설계 문서 대비 누락 확인)

| 스펙 항목 | Phase 1 반영 |
|---|---|
| 2.1 데이터 소스 | ✅ fetch_stocks.py, fetch_fundamentals.py |
| 4. 데이터 수집 파이프라인 | ✅ Task 3~12 전체 |
| 5. 지표 계산 규격 | ✅ Task 5~9 TDD 전체 |
| 4.5 JSON 스키마 | ✅ Task 10~12 |
| 6.7 하드코딩 금지 | ✅ Task 14 strings/ko.ts |
| 3.3 폴더 구조 | ✅ Task 1 scaffolding |
| **2. 확정 결정사항** 5번 기술 스택 | ✅ Next.js 14 + TS + Tailwind |

**이월 사항 (후속 Phase 담당):**
- Phase 2: 인증 (auth, middleware, JWT, bcrypt)
- Phase 3: 프런트엔드 레이아웃 (ModeToggle, ThemeToggle)
- Phase 4: 프리셋 필터 (12개 구현)
- Phase 5: 개별 종목 페이지 (TradingView)
- Phase 6: 비용 차단 시스템
- Phase 7: GitHub Actions 자동화 + 배포

### Placeholder 스캔
- "TBD"/"TODO"/"implement later" 없음 ✅
- 모든 테스트 코드 구체적 ✅
- 모든 구현 코드 완전 ✅

### Type Consistency
- `compute_ma`, `compute_rsi`, `compute_macd`, `compute_bollinger`, `compute_high52w`, `compute_vol_avg20` — 일관된 네이밍 ✅
- `StockIndicators` 필드명 = `process_single_stock` 반환 키 ✅
- `IndicatorsJson.meta.stock_count` — TypeScript/Python 일관 ✅

---

## 🏁 Phase 1 완료 조건

- [ ] 총 16개 Task 모두 체크 완료
- [ ] Python 전체 테스트 PASS (약 25~30 케이스)
- [ ] 로컬에서 전체 파이프라인 정상 동작 (5개 JSON 생성)
- [ ] TypeScript 컴파일 에러 없음
- [ ] Next.js 빌드 성공
- [ ] `feature/phase-1-init-data-pipeline` 브랜치에 커밋 완료
- [ ] Workprogress 기록 완료
- [ ] 사용자 확인 후 푸시 + PR 생성
- [ ] /requesting-code-review 통과
