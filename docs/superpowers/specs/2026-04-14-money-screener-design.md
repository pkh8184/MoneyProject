# Money Screener — 주식 중장기 스윙 포착 검색기 설계 문서

**작성일**: 2026-04-14  
**프로젝트명**: MoneyProject (Money Screener)  
**작성자**: 경원 (with Claude Code)  
**상태**: 설계 확정

---

## 1. 프로젝트 개요

### 1.1 목적
국내 상장 약 2,800개 종목 중 **중장기 스윙 포착**에 적합한 종목을 자동 필터링하는 웹 기반 검색기·분석 사이트 구축.

### 1.2 대상 사용자
- 경원 (개발자 겸 사용자)
- 오 (투자 연구 파트너)
- 총 2명의 인증된 사용자만 접근

### 1.3 핵심 요구사항
1. 기술적 지표 기반 중장기 스윙 종목 자동 포착
2. 초보자용 / 전문가용 두 모드 제공
3. PC·모바일 반응형
4. Git 기반 자동 배포
5. 무료 운영 (비용 발생 시 자동 중단)
6. 비밀 URL + ID/PW 인증

---

## 2. 확정 결정 사항 (요약)

| # | 항목 | 결정 |
|---|---|---|
| 1 | 데이터 소스 | GitHub Actions 일일 자동 수집 + Git Storage |
| 2 | 사용 방식 | 프리셋 + 파라미터 조정 + 개별 분석 페이지 |
| 3 | 프리셋 | 10개 단일 + 2개 조합 (총 12개) |
| 4 | UI 모드 | 초보/전문가 모드 토글 |
| 5 | 기술 스택 | Next.js 14 SSR + TypeScript + Tailwind + TradingView Charts |
| 6 | 디자인 | 토스 스타일 (Clean Fintech) + 라이트/다크 테마 |
| 7 | 접근 제어 | 비밀 URL + ID/PW 로그인 (bcrypt + JWT httpOnly 쿠키) |
| 8 | 아키텍처 | 하이브리드 (Python 지표 사전 계산 → 브라우저 필터링) |
| 9 | 리포 가시성 | Public |
| 10 | 배포 | Vercel Hobby (무료, $0 spending limit) |
| 11 | 비용 차단 | 사용량 95% 자동 Kill Switch + 월초 자동 복구 |

---

## 3. 전체 아키텍처

### 3.1 시스템 구성도

```
┌──────────────────────────────────────────────────────────────────┐
│                  GitHub Repository (Public)                       │
│                                                                   │
│   main 브랜치:    코드 (Next.js, Python 스크립트, Workflow)       │
│   data 브랜치:    일일 갱신 JSON (orphan commit, force push)       │
└────────────────────────────┬─────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
  ┌──────────┐         ┌──────────┐         ┌──────────┐
  │ GitHub   │         │  Vercel  │         │   User   │
  │ Actions  │         │  (SSR)   │         │ Browser  │
  │          │         │          │         │          │
  │ 매일 18시│──커밋──▶│ 자동배포 │◀──요청──│ /x7kq2z/ │
  │ KST 실행 │         │ JWT 인증 │         │  login   │
  │ pykrx로  │         │ JSON 서빙│         │          │
  │ 데이터   │         │          │         │ ID/PW    │
  │ 수집     │         │          │         │ 입력     │
  └──────────┘         └──────────┘         └──────────┘
```

### 3.2 데이터 흐름

1. **일일 수집** (자동): 매일 KST 18:00 GitHub Actions가 pykrx로 2,800종목 데이터 수집 → 지표 계산 → data 브랜치에 커밋
2. **자동 배포** (자동): data 브랜치 변경 감지 → Vercel Deploy Hook → 자동 재배포
3. **사용자 접속** (수동):
   - 비밀 URL `/x7kq2z/login` 접속 → ID/PW 입력
   - 서버에서 bcrypt 검증 → JWT httpOnly 쿠키 발급
   - `/x7kq2z/screener` 접근 → JSON fetch → 브라우저 필터링 → 결과 표시

### 3.3 폴더 구조

```
MoneyProject/
├── .github/workflows/
│   ├── daily-update.yml         # 일일 데이터 수집 (cron)
│   ├── usage-check.yml          # 비용 모니터링 (cron)
│   └── monthly-reset.yml        # 월초 자동 복구 (cron)
├── scripts/                     # Python + Node 스크립트
│   ├── fetch_stocks.py
│   ├── calculate_indicators.py
│   ├── fetch_fundamentals.py
│   ├── check_trading_day.py
│   ├── hash-password.ts
│   ├── check-vercel-usage.js
│   ├── check-actions-usage.js
│   └── requirements.txt
├── public/
│   ├── robots.txt
│   ├── favicon.ico
│   └── data/                    # data 브랜치에서 주입
│       ├── stocks.json
│       ├── ohlcv.json
│       ├── indicators.json
│       ├── fundamentals.json
│       └── updated_at.json
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx             # 루트 404 (비밀 URL 은폐)
│   │   ├── api/auth/
│   │   │   ├── login/route.ts
│   │   │   └── logout/route.ts
│   │   └── [basePath]/          # 환경변수 기반 동적 경로
│   │       ├── layout.tsx
│   │       ├── login/page.tsx
│   │       ├── screener/page.tsx
│   │       └── stock/[code]/page.tsx
│   ├── components/
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── rateLimit.ts
│   │   ├── dataLoader.ts
│   │   ├── filter.ts
│   │   ├── presets/             # 12개 프리셋 각 파일
│   │   └── strings/ko.ts        # 모든 텍스트 (하드코딩 금지)
│   ├── store/useAppStore.ts     # Zustand
│   └── middleware.ts
├── docs/superpowers/specs/      # 설계 문서
├── Workprogress/                # Phase 기록
├── .env.local.example
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 4. 데이터 수집 파이프라인

### 4.1 수집 대상

| 데이터 | 소스 | 갱신 | 용량 |
|---|---|---|---|
| 종목 리스트 (KOSPI+KOSDAQ) | pykrx | 1일 | ~200KB |
| 일봉 OHLCV (250거래일, 조정종가) | pykrx | 1일 | ~40MB |
| 외국인·기관 수급 | pykrx | 1일 | ~5MB |
| 펀더멘털 (PBR/PER/시총) | pykrx | 1일 | ~2MB |

### 4.2 제외 종목

- 관리종목
- 거래정지 종목
- 우선주 (종목명 끝에 '우', '우B')
- SPAC (스팩)
- ETF/ETN
- 상장 후 120거래일 미만 (MA120 계산 불가 종목은 해당 지표만 null)

### 4.3 실행 시각 (cron)

- **매일 KST 18:00 (UTC 09:00)** 평일만
- 장 마감(15:30) 후 2.5시간 안전 마진
- 휴장일은 스크립트가 감지 후 스킵

### 4.4 데이터 저장 전략 (리포 비대화 방지)

```
data 전용 브랜치 + orphan commit + force push
→ 히스토리 없이 최신 상태만 유지
→ 리포 용량 10MB 수준 유지
```

Vercel 빌드 시 data 브랜치에서 `public/data/`를 주입.

### 4.5 `public/data/*.json` 스키마

**indicators.json** (예시)
```json
{
  "meta": {
    "updated_at": "2026-04-14T18:00:00+09:00",
    "trade_date": "2026-04-14",
    "stock_count": 2784,
    "days": 30
  },
  "005930": {
    "name": "삼성전자",
    "market": "KOSPI",
    "dates": ["2026-03-15", ..., "2026-04-14"],
    "close":     [71500, ..., 72500],
    "volume":    [15234567, ..., 18500000],
    "ma5":       [71200.0, ..., 72100.5],
    "ma20":      [70800.2, ..., 71850.3],
    "ma60":      [69500.1, ..., 70500.8],
    "ma120":     [68200.5, ..., 69200.4],
    "rsi14":     [48.2, ..., 55.8],
    "macd_line": [120.5, ..., 310.2],
    "macd_signal":[85.3, ..., 280.1],
    "macd_hist": [35.2, ..., 30.1],
    "bb_upper":  [73200, ..., 74500],
    "bb_middle": [70800, ..., 71850],
    "bb_lower":  [68400, ..., 69200],
    "high52w":   78000,
    "has_52w":   true,
    "vol_avg20": 14500000
  }
}
```

**updated_at.json**
```json
{ "updated_at": "2026-04-14T18:00:00+09:00", "trade_date": "2026-04-14" }
```

### 4.6 파일 크기 (gzip 후)

| 파일 | Raw | Gzip |
|---|---|---|
| stocks.json | 200KB | 60KB |
| ohlcv.json | 40MB | 6MB |
| indicators.json | 20MB | 3MB |
| fundamentals.json | 2MB | 400KB |
| **합계** | **~62MB** | **~10MB** |

---

## 5. 지표 계산 규격

### 5.1 기본 지표 공식

**이동평균선 (MA)**
```python
df['ma5']   = df['close'].rolling(5, min_periods=5).mean()
df['ma20']  = df['close'].rolling(20, min_periods=20).mean()
df['ma60']  = df['close'].rolling(60, min_periods=60).mean()
df['ma120'] = df['close'].rolling(120, min_periods=120).mean()
```

**RSI (14일, Wilder's smoothing)**
```python
delta = df['close'].diff()
gain  = delta.clip(lower=0)
loss  = -delta.clip(upper=0)
avg_gain = gain.ewm(alpha=1/14, min_periods=14, adjust=False).mean()
avg_loss = loss.ewm(alpha=1/14, min_periods=14, adjust=False).mean()
rs = avg_gain / avg_loss
df['rsi14'] = 100 - (100 / (1 + rs))
```

**MACD (12, 26, 9)**
```python
ema12 = df['close'].ewm(span=12, adjust=False).mean()
ema26 = df['close'].ewm(span=26, adjust=False).mean()
df['macd_line']   = ema12 - ema26
df['macd_signal'] = df['macd_line'].ewm(span=9, adjust=False).mean()
df['macd_hist']   = df['macd_line'] - df['macd_signal']
```

**볼린저밴드 (20, 2σ)**
```python
df['bb_middle'] = df['close'].rolling(20, min_periods=20).mean()
std             = df['close'].rolling(20, min_periods=20).std(ddof=0)
df['bb_upper']  = df['bb_middle'] + 2 * std
df['bb_lower']  = df['bb_middle'] - 2 * std
```

**거래량 20일 평균 (전일 기준)**
```python
df['vol_avg20'] = df['volume'].shift(1).rolling(20, min_periods=20).mean()
```

**52주 신고가**
```python
df['high52w'] = df['close'].rolling(250, min_periods=1).max()
```

### 5.2 12개 프리셋 조건식

| # | ID | 이름 | 조건 | 파라미터 | 모드 |
|---|---|---|---|---|---|
| 1 | `golden_cross` | 골든크로스 (MA20↑MA60) | `MA20[t] > MA60[t] AND MA20[t-1] <= MA60[t-1]` | 없음 | 전문가 |
| 2 | `alignment` | 정배열 확정 | `MA5>MA20>MA60>MA120` (오늘 처음) | 없음 | 전문가 |
| 3 | `ma60_turn_up` | 60일선 상승 전환 | `MA60[t]>MA60[t-5] AND MA60[t-5]<=MA60[t-10]` | 없음 | 전문가 |
| 4 | `high_52w` | 52주 신고가 돌파 | `C[t] >= high52w × ratio` | ratio (80~100%) | 전문가 |
| 5 | `volume_spike` | 거래량 급증 | `V[t] >= vol_avg20 × K AND C[t]>O[t]` | K (1.2~3.0) | 전문가 |
| 6 | `foreign_inst_buy` | 외국인·기관 동반 순매수 | 최근 N일 모두 양쪽 순매수 | N (2~10일) | 전문가 |
| 7 | `rsi_rebound` | RSI 과매도 반등 | `RSI[t]>30 AND min(RSI[t-5:t-1])<=30 AND MA60 상승 추세` | 없음 | 전문가 |
| 8 | `macd_cross` | MACD 골든크로스 | `MACD_Line[t]>Signal[t] AND MACD_Line[t-1]<=Signal[t-1]` | above_zero (bool) | 전문가 |
| 9 | `bb_lower_bounce` | 볼린저밴드 하단 복귀 | `C[t]>=BB_Lower[t] AND C[t-1]<BB_Lower[t-1]` | 없음 | 전문가 |
| 10 | `low_pbr` | PBR<1 저평가 | `PBR[t] < K AND PBR[t] > 0` | K (0.5~1.5) | 전문가 |
| 11 | `combo_golden` | ⭐ 중장기 황금 조합 | 골든크로스 + 거래량 급증(K=1.5) + RSI>50 | 없음 | **초보+전문가** |
| 12 | `combo_value_rebound` | ⭐ 저평가 반등 | PBR<1 + RSI 과매도 반등 + MA60 지지 | 없음 | **초보+전문가** |

**초보 모드**: 11, 12만 노출  
**전문가 모드**: 1~12 전체 노출

### 5.3 null 처리 규칙

| 상황 | 처리 |
|---|---|
| 상장 120일 미만 → MA120 null | JSON `null`, 해당 프리셋 자동 제외 |
| 상장 250일 미만 → 52주 부정확 | `has_52w: false` 플래그 |
| 거래정지 gap | 보간하지 않음, 원본 유지 |
| pykrx 조회 실패 | 해당 종목 스킵 + 로그 출력 |

### 5.4 프리셋 부가 정보 (UI 표시용)

각 프리셋은 다음 필드를 포함:

```typescript
interface Preset {
  id: string
  name: string
  mode: ('beginner' | 'expert')[]
  filter: (stock, params, fundamentals) => boolean
  params: ParamDef[]
  description: { beginner: string, expert: string }
  buyTiming: string        // 매수 추천 시기
  holdingPeriod: string    // 보유 기간 가이드
  stopLoss: string         // 손절 기준
  traps: string            // 주의사항
}
```

**예: 골든크로스**
- 매수 타이밍: 돌파 당일 종가 또는 다음 날 시초가
- 보유 기간: 2주~3개월
- 손절 기준: MA20 재하향 이탈 시
- 함정: 횡보장에서 가짜 신호 발생 → 거래량 조건 결합 권장

### 5.5 결과 정렬 (기본값)

| 프리셋 | 기본 정렬 |
|---|---|
| golden_cross | 거래량 내림차순 |
| alignment | 시가총액 내림차순 |
| volume_spike | 거래량/평균 비율 내림차순 |
| rsi_rebound | RSI 돌파 강도 (RSI-30) 내림차순 |
| high_52w | 신고가 근접도 내림차순 |
| low_pbr | PBR 오름차순 |
| combo_golden | 거래량×RSI 복합 점수 |
| combo_value_rebound | PBR × 이격도 복합 점수 |

테이블 헤더 클릭으로 재정렬 가능. 결과는 **상위 100종목** 제한.

---

## 6. 프런트엔드 구조

### 6.1 라우팅 (Next.js App Router)

```
/                              → 404 (비밀 URL 은폐)
/api/auth/login                → POST: 로그인
/api/auth/logout               → POST: 로그아웃
/x7kq2z/login                  → 로그인 페이지
/x7kq2z/screener               → 검색기 메인
/x7kq2z/stock/[code]           → 개별 종목 분석
```

`/x7kq2z/` 부분은 `SECRET_BASE_PATH` 환경변수로 관리 (코드에 하드코딩 금지).

### 6.2 페이지별 UI

#### 6.2.1 검색기 — 초보 모드
- 상단 헤더: 로고 / 모드 토글 / 테마 토글 / 갱신 배너 / 로그아웃
- 본문: "오늘의 추천 종목" 카드 리스트 (조합 프리셋 결과 통합)
- 각 카드: 종목명·현재가·등락·전략 라벨 (예: 🟢 중장기 상승 초입)
- 카드 클릭 시 `/stock/[code]` 이동

#### 6.2.2 검색기 — 전문가 모드
- 좌측 사이드바: 12개 프리셋 목록 (라디오 버튼)
- 각 프리셋 클릭 시 우측에 파라미터 슬라이더 + 결과 테이블
- 테이블 컬럼: 코드 / 종목명 / 현재가 / 거래량 / RSI / 매칭 프리셋
- 테이블 행 클릭 시 `/stock/[code]` 이동

#### 6.2.3 개별 종목 페이지 — 초보 모드
- 종목명·현재가·등락
- 간단 캔들 차트 (MA20만 표시)
- "지금 사기 좋은 이유" (자연어 요약)
- 매수 가이드: 타이밍·보유 기간·손절 기준
- 법적 고지

#### 6.2.4 개별 종목 페이지 — 전문가 모드
- 종목명·현재가·등락·시총·섹터
- 풀 차트: 캔들 + MA5/20/60/120 + BB + 거래량 + MACD + RSI
- 주요 지표 수치 테이블
- 펀더멘털 (PBR/PER)
- 수급 (외국인/기관 최근 5일)
- 매칭된 프리셋 리스트

### 6.3 반응형 규칙

| 뷰포트 | 초보 모드 | 전문가 모드 |
|---|---|---|
| ≥1024px | 카드 3열 | 사이드바 + 테이블 |
| 768~1023px | 카드 2열 | 상단 드롭다운 + 테이블 |
| <768px | 카드 1열 | 상단 드롭다운 + 카드 리스트 |

### 6.4 상태 관리 (Zustand)

```typescript
interface AppState {
  mode: 'beginner' | 'expert'          // localStorage 동기화
  theme: 'light' | 'dark'              // localStorage 동기화
  indicators: IndicatorsData | null    // 메모리 캐시
  fundamentals: FundamentalsData | null
  loadedAt: number | null
  activePresetId: string | null
  presetParams: Record<string, any>    // localStorage 저장
  results: Record<string, FilterResult[]>
  runPreset: (id: string) => Promise<void>
}
```

### 6.5 데이터 페칭 & 캐싱

```
① 페이지 로드 시 IndexedDB에서 캐시 확인
② 캐시가 당일(trade_date) 데이터면 즉시 사용
③ 아니면 /data/*.json fetch → IndexedDB 저장
④ 파라미터 변경 시 브라우저에서 즉시 재필터링 (재fetch 없음)
```

### 6.6 디자인 시스템

**디자인 톤**: 토스 스타일 (Clean Fintech)

**테마 색상**

| 토큰 | Light | Dark |
|---|---|---|
| bg_primary | #FFFFFF | #141414 |
| bg_secondary | #F5F7FA | #1F1F1F |
| text_primary | #111111 | #F5F5F5 |
| text_secondary | #666666 | #AAAAAA |
| accent | #0064FF | #3D8BFF |
| positive (상승) | #E53935 | #FF5252 (한국 관례: 빨강) |
| negative (하락) | #3DB351 | #66BB6A (한국 관례: 녹색) |
| border | #E4E4E4 | #333333 |

테마 전환은 우상단 토글, localStorage로 선택 유지.

### 6.7 공통 규칙 (CLAUDE.md 준수)

- **하단 UI 여백 120px**: 모든 메인 페이지 `<main className="pb-[120px]">`
- **String 하드코딩 금지**: `src/lib/strings/ko.ts`에 모든 텍스트 중앙 관리
- **TypeScript strict**: 엄격 모드 고정

---

## 7. 인증 & 보안

### 7.1 비밀 URL

```env
SECRET_BASE_PATH=x7kq2z
```

- 루트 `/` 접속 시 404
- 잘못된 비밀 경로 접속 시 404
- 정상 경로 + 쿠키 없음 → `/x7kq2z/login` 리다이렉트

### 7.2 사용자 등록 (Vercel 환경변수)

```env
USER_KYUNGWON_ID=kyungwon
USER_KYUNGWON_HASH=$2b$12$xxxxx...
USER_OH_ID=oh
USER_OH_HASH=$2b$12$xxxxx...
JWT_SECRET=<32바이트 랜덤 hex>
SITE_ENABLED=true
```

### 7.3 비밀번호 해시 규칙

- bcrypt cost factor 12
- 평문 비번은 어디에도 저장 금지
- 해시 생성 스크립트: `scripts/hash-password.ts`

### 7.4 로그인 플로우

```
1. /x7kq2z/login 진입
2. ID + PW 입력 → POST /api/auth/login
3. 서버: bcrypt.compare(pw, env_hash) + Rate Limit 체크
4. 성공 → JWT 발급 → httpOnly 쿠키 Set-Cookie
5. 실패 → 401 + "아이디 또는 비밀번호가 일치하지 않습니다"
6. 리다이렉트 → /x7kq2z/screener
```

### 7.5 JWT & 쿠키

```json
{ "uid": "kyungwon", "iat": 1744640000, "exp": 1745244800 }
서명: HS256, 유효기간 7일
```

쿠키 속성:
```typescript
{
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7,
  path: '/'
}
```

### 7.6 미들웨어 검증 흐름

```
1. SITE_ENABLED === 'true' 확인 → 아니면 503 유지보수 페이지
2. 루트(/) 또는 비밀 경로 외 접근 → 404
3. /x7kq2z/login, /api/auth → 검증 없이 통과
4. 그 외 /x7kq2z/* → JWT 쿠키 검증 → 없거나 만료 시 로그인 리다이렉트
```

### 7.7 Rate Limiting

- IP당 로그인 시도 5회 / 15분
- Vercel KV(무료) 사용, 미설정 시 in-memory Map 폴백

### 7.8 SEO·크롤러 차단

```
public/robots.txt: Disallow: /
<meta name="robots" content="noindex, nofollow, noarchive">
X-Robots-Tag: noindex, nofollow
X-Frame-Options: DENY
Referrer-Policy: no-referrer
```

### 7.9 법적 고지 (필수)

**푸터 고정 문구**:
> 본 사이트는 투자 참고 정보만 제공하며, 특정 종목의 매수·매도를 추천하지 않습니다. 투자 판단과 그에 따른 손익은 전적으로 투자자 본인의 책임입니다. 데이터 오류·지연에 대해 책임지지 않습니다.

**로그인 페이지**: 위 내용 동의 체크박스(필수)

### 7.10 보안 체크리스트 (구현 시 검증)

- [ ] 모든 비번은 bcrypt cost 12로 해싱, 평문 저장 금지
- [ ] JWT_SECRET은 최소 32바이트 랜덤, Vercel env로만 관리
- [ ] 쿠키 속성: httpOnly, secure, sameSite=lax 적용
- [ ] 로그인 Rate Limit: IP당 5회/15분
- [ ] 로그인 실패 메시지에 구체적 사유 노출 금지
- [ ] robots.txt 및 noindex 적용
- [ ] HTTPS 강제 (Vercel 기본)
- [ ] CSP 헤더 설정
- [ ] 법적 고지 체크박스 미체크 시 로그인 불가

---

## 8. 비용 차단 시스템 (Cost Guard)

### 8.1 원칙

> 의도하지 않은 단 1원의 과금도 발생하지 않는다.

- 결제 수단 미등록 (Vercel / GitHub)
- Spending Limit $0 설정
- 사용량 임계치 도달 시 자동 중단

### 8.2 5층 방어선

1. **결제 한도 $0**: Vercel·GitHub 양쪽 설정, 결제 불가 상태 유지
2. **일일 사용량 모니터**: `usage-check.yml` 매일 06:00 KST 실행
3. **80% 경고 배너**: 프런트엔드 상단 표시
4. **95% 자동 Kill Switch**: `SITE_ENABLED=false` 자동 설정 → 503 반환
5. **수동 비상 차단**: 경원이 언제든 Vercel env 또는 프로젝트 일시 정지

### 8.3 모니터링 대상

| 리소스 | 무료 한도 | 80% 경고 | 95% 차단 |
|---|---|---|---|
| Vercel 대역폭 | 100GB/월 | 80GB | 95GB |
| Vercel Serverless Hours | 100GB-hrs/월 | 80GB-hrs | 95GB-hrs |
| Vercel Edge Middleware | 1M 호출/월 | 800K | 950K |
| Vercel Build 시간 | 6,000min/월 | - | 5,700min |
| GitHub Actions 분 | 무제한 (Public) | - | - |
| Git 리포 용량 | 1GB soft | 800MB | 950MB |

### 8.4 503 서비스 중단 페이지

```
제목: 🛠️ 서비스 일시 중단 중입니다
내용:
  이번 달 무료 사용 한도에 근접하여 서비스가 일시 중단되었습니다.
  재개 예정: YYYY-MM-01 00:00 KST
  남은 시간: N일 N시간
  긴급 문의: [경원 연락처]
```

### 8.5 월초 자동 복구

- `.github/workflows/monthly-reset.yml` 매월 1일 00:00 KST
- `SITE_ENABLED=true` 복원 → 재배포 → 서비스 재개
- 경원 이메일로 "서비스 재개" 알림

### 8.6 리포 용량 초과 대응

- 950MB 도달 시 data 브랜치 완전 삭제 후 orphan commit으로 재생성
- 히스토리 포기 (최신 데이터만 필요)

---

## 9. 배포 & CI/CD

### 9.1 리포 전략

- **리포**: `pkh8184/MoneyProject` (Public)
- **main**: 코드 전용 (Vercel production 트리거)
- **data**: 데이터 전용 (매일 force push, orphan commit)
- **feature/\***: 기능 개발 → PR → main 머지

### 9.2 Vercel 프로젝트

```
Framework: Next.js
Build Command: npm run build
Install Command: npm install
Node: 20.x
Spending Limit: $0
결제 수단: 미등록
Plan: Hobby (고정)
```

### 9.3 Vercel 환경변수

```
USER_KYUNGWON_ID, USER_KYUNGWON_HASH
USER_OH_ID, USER_OH_HASH
JWT_SECRET
SECRET_BASE_PATH
SITE_ENABLED
DATA_BRANCH=data
```

### 9.4 GitHub Actions 워크플로우

| 파일 | 실행 | 역할 |
|---|---|---|
| `daily-update.yml` | 평일 UTC 09:00 (KST 18:00) | 데이터 수집 + data 브랜치 force push + Vercel 재배포 |
| `usage-check.yml` | 매일 UTC 21:00 (KST 06:00) | 사용량 체크 + 95% 초과 시 차단 |
| `monthly-reset.yml` | 매월 1일 UTC 15:00 (전월 말일) | SITE_ENABLED 복원 + 재배포 |

### 9.5 GitHub Secrets

```
VERCEL_TOKEN
VERCEL_DEPLOY_HOOK
VERCEL_PROJECT_ID
VERCEL_TEAM_ID
GH_TOKEN
```

### 9.6 Preview 환경

- PR 생성 시 자동으로 Vercel Preview 배포
- Preview는 `SECRET_BASE_PATH=dev`로 덮어쓰기
- 실제 비번 해시 대신 더미 값 사용
- 데이터는 샘플 JSON만 사용

### 9.7 초기 셋업 순서

1. GitHub 리포 Public 설정 + 브랜치 보호 (main)
2. Vercel 프로젝트 생성, GitHub 연결, 결제 한도 $0
3. Vercel 환경변수 입력
4. 비번 해시 생성: `npx tsx scripts/hash-password.ts "비번"` → env 저장
5. Vercel Deploy Hook 생성 → GitHub Secret에 저장
6. 첫 데이터 수동 실행: workflow_dispatch로 daily-update 1회
7. 로컬 dev 테스트: `npm run dev` → `localhost:3000/dev/login`
8. Production 배포: main push → Vercel 자동 배포
9. `/x7kq2z/login` 접속 → 동작 확인

---

## 10. 시스템 규칙 & 제약 (Audit)

### 10.1 시간대 일관성

- 모든 날짜·시간은 **KST 기준** 저장·표시
- GitHub Actions 내부에서 `pytz.timezone('Asia/Seoul')` 강제
- 저장 형식: ISO 8601 `2026-04-14T18:00:00+09:00`
- 브라우저 표시: `Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul' })`

### 10.2 조정종가 사용

- `pykrx.get_market_ohlcv_by_date(adjusted=True)` 사용 필수
- 분할·유상증자·배당락으로 인한 가짜 신호 방지
- 거래량은 조정되지 않음 → 분할 당일 거래량 급증 프리셋 오탐 가능성 (2차 개선)

### 10.3 신규·폐지 종목

- 상장 120일 미만: MA120 null, 해당 프리셋 자동 제외
- 상장 250일 미만: `has_52w: false`
- 관리·상폐 예정: pykrx 필터 + 수동 차단 리스트

### 10.4 데이터 최신성 표시

```
배너 상태:
  🟢 정상: "최근 업데이트: YYYY-MM-DD HH:MM KST (N시간 전)"
  ⚠️ 24h 초과: "데이터가 오래되었습니다. 업데이트 실패 가능"
  🔴 48h 초과: "데이터 갱신 중단. 관리자에게 문의"
```

### 10.5 브라우저 성능 가드

- 필터링 결과 상위 100종목 제한
- IndexedDB 캐싱 (재방문 빠른 로드)
- 개별 종목 차트만 전체 지표 로드
- 모바일 환경 고려

### 10.6 오류 모니터링

- GitHub Actions 실패 → 이메일 자동 발송
- Vercel 배포 실패 → 대시보드 알림
- 프런트 런타임 에러 → Vercel Analytics (무료)

---

## 11. MVP 범위 & 후속 버전

### 11.1 MVP 포함

- ✅ 12개 프리셋 (10 단일 + 2 조합)
- ✅ 초보/전문가 모드 토글
- ✅ 라이트/다크 테마
- ✅ 비밀 URL + ID/PW 인증
- ✅ 일일 자동 데이터 갱신
- ✅ TradingView 차트 (개별 종목 페이지)
- ✅ 비용 차단 시스템
- ✅ 법적 고지

### 11.2 2차 버전 후보

- 수박지표 (공식 확정 후)
- 일목균형표
- 사용자 커스텀 프리셋 빌더
- 알림 기능 (신호 발생 시 이메일)
- Web Worker 기반 필터링 (UI 멈춤 방지)
- 백테스팅 기능
- 다중 사용자 관리 UI

### 11.3 제외 (YAGNI)

- 실시간(장중) 데이터
- 분봉 차트
- 주문 연동 (증권사 API)
- 모바일 네이티브 앱

---

## 12. 주요 리스크 & 완화

| 리스크 | 완화책 |
|---|---|
| pykrx 크롤링 실패 (Naver/KRX 변경) | FinanceDataReader로 폴백, 3회 재시도 |
| Vercel 사용량 급증 | 5층 방어선, 95% 자동 차단 |
| 법적 리스크 (유사투자자문업) | 법적 고지, 비밀 URL, 2인 제한, 추천 아닌 정보 제공 |
| 리포 용량 초과 | data 브랜치 orphan commit, 자동 리셋 |
| 분할·유상증자 오탐 | 조정종가 사용, 2차에서 이벤트 감지 |

---

## 13. 부록

### 13.1 용어 정리

- **MA (Moving Average)**: 이동평균선. MA20 = 최근 20일 종가 평균
- **RSI**: Relative Strength Index. 0~100, 70↑ 과매수, 30↓ 과매도
- **MACD**: Moving Average Convergence Divergence. 추세 전환 지표
- **BB (Bollinger Band)**: 볼린저밴드. 중심선±2σ 변동성 밴드
- **PBR**: 주가순자산비율. 1 이하 = 저평가 가능성
- **골든크로스**: 단기선이 장기선을 상향 돌파
- **정배열**: MA 단기>중기>장기 순 배치 (상승 추세)

### 13.2 참고 자료

- pykrx: https://github.com/sharebook-kr/pykrx
- TradingView Lightweight Charts: https://www.tradingview.com/lightweight-charts/
- Next.js App Router: https://nextjs.org/docs/app
- Vercel Hobby Plan: https://vercel.com/docs/limits/overview

---

**문서 버전**: 1.0  
**다음 단계**: `writing-plans` 스킬로 구현 계획 수립
