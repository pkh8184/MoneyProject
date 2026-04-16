# Phase 12 — 초보자 친화 카테고리 4개 추가 설계

**Date**: 2026-04-16
**Status**: Approved (concept) — awaiting plan
**Scope**: SideNav에 신규 카테고리 4개 + 용어집 + 첫 방문 가이드. 모든 데이터 localStorage.

---

## 🎯 목적

Money Screener는 검색 중심이지만, **주식을 처음 시작하는 사용자**가 매일 쉽게 쓸 수 있는 도구를 추가한다. 모든 용어·UI는 금융 지식이 없는 사람도 이해할 수 있게 설계한다.

## ✅ 범위에 포함

1. **지켜볼 종목** (`/watchlist`) — 관심 종목 즐겨찾기
2. **내가 산 주식** (`/portfolio`) — 보유 종목 손익 추적
3. **오늘 잘 나가는 분야** (`/heatmap`) — 섹터 등락 순위 리스트
4. **내 거래 일기** (`/journal`) — 매매 기록 + 단순 월별 요약
5. **용어집** (`/glossary`) — 주식 용어 30개 풀이
6. **첫 방문 가이드 모달** — 페이지별 짧은 튜토리얼
7. 공용 localStorage 훅
8. SideNav 4개 링크 + Footer 용어집 링크
9. 모든 문자열 `ko.ts` 편입
10. JSON Export/Import (기기 이동용)

## ❌ 범위에서 제외 (Phase 13 이후)

- 분할매수 자동 평단 계산
- 섹터 도넛 / 트리맵 (복잡함)
- FIFO 자동 매수·매도 페어링 통계
- 매매일지 → 포트폴리오 자동 연동
- 가격·지표 알림
- 서버 DB 마이그레이션

---

## 🧩 디자인 원칙 (초보 친화)

1. **금융 용어 금지** — "평단가" → "산 가격", "수익률" → "얼마 벌었어요"
2. **숫자에 해석** — 모든 숫자에 `+30,000원 벌었어요 🟢` 식 자연어 함께
3. **이모지·색상 우선** — 글자보다 시각 (🟢 수익 / 🔴 손실)
4. **빈 상태 안내** — 모든 빈 화면에 "어떻게 추가하는지" 안내
5. **튜토리얼 모달** — 각 페이지 첫 방문 시 2~3 스텝 가이드
6. **하단 여백 120px** (CLAUDE.md 규칙)

---

## 🧩 공통 설계

### 저장소 전략

- **localStorage** 기반 (현재 2~3명 스케일)
- 키 네임스페이스: `ws:<feature>:<userId>`
  - 예: `ws:watchlist:user1`, `ws:portfolio:anon`
- **로그인 전**: `userId = 'anon'`
- **로그인 후**: anon 데이터를 userId로 1회 마이그레이션 (덮어쓰기 안 함, 비어있을 때만)
- 저장 크기: 텍스트 기반이라 수백 KB 이내

### 공용 훅

```typescript
// src/lib/storage/useLocalStore.ts
function useLocalStore<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void]
```

- SSR-safe (초기 렌더는 `initial`, 마운트 후 localStorage 로드)
- 다른 탭 변경 감지 (`storage` 이벤트)
- 버전 필드 포함 (`{ version: 1, data: T }`) — 스키마 변경 시 마이그레이션

### 첫 방문 가이드 훅

```typescript
// src/lib/storage/useFirstVisit.ts
function useFirstVisit(pageKey: string): [boolean, () => void]
```

- 키: `ws:visited:${pageKey}` (boolean)
- true면 모달 표시 → 사용자가 "다시 보지 않기" 체크 시 false 저장
- 신규 페이지 4개에 적용

### Export/Import

- 헤더 메뉴 → JSON 다운로드/업로드
- 검증 후 덮어쓰기 확인 다이얼로그

### 디자인 일관성

- 기존 컴포넌트 재사용 (`Card`, `Button`, `Pill`)
- 다크 모드 지원
- 하단 여백 120px

### 의존성 추가

- **없음** — Recharts 등 외부 차트 라이브러리 미사용
  - 막대는 div + Tailwind width 비율로 충분
  - 트리맵·도넛 제거로 외부 의존성 0

---

## ① ⭐ 지켜볼 종목 (`/watchlist`)

### 데이터 모델

```typescript
interface WatchlistEntry {
  code: string
  addedAt: string  // ISO date
}
interface WatchlistStore {
  version: 1
  entries: WatchlistEntry[]
}
```

키: `ws:watchlist:${userId}`

### UI

- **종목 상세 페이지**: 우측 상단 `☆` / `★` 토글
- **리스트 페이지**:
  - 행 형식: `[종목명] [지금 가격] [어제보다 🟢+3.2% / 🔴-1.8%] [추가일] [🗑]`
  - 정렬: 추가순 / 많이 오른순 / 많이 내린순 / 가나다순
  - 빈 상태: "관심있는 종목을 ☆ 눌러 추가하세요. 주가 변화를 한눈에 볼 수 있어요."

### 첫 방문 가이드

```
1. 종목 상세 페이지에서 ☆를 누르면 여기에 추가돼요
2. 매일 들어와서 종목들이 어떻게 움직이는지 확인하세요
3. 더 관심 없으면 🗑로 빼면 돼요
```

---

## ② 💼 내가 산 주식 (`/portfolio`)

### 데이터 모델

```typescript
interface PortfolioEntry {
  id: string          // uuid
  code: string
  buyPrice: number    // 산 가격 (사용자 직접 입력)
  quantity: number    // 주식 수
  boughtAt: string    // 매수일
  memo?: string
}
interface PortfolioStore {
  version: 1
  entries: PortfolioEntry[]
}
```

키: `ws:portfolio:${userId}`

### UI

#### 상단 요약 카드

```
💰 지금까지 +120,000원 벌었어요 🟢
   (전체 산 가격 4,500,000원 → 지금 가치 4,620,000원)
   어제보다 +15,000원 🟢
```

손실이면:
```
😢 지금까지 -80,000원 잃었어요 🔴
```

#### 종목 카드 (리스트)

```
삼성전자
산 가격: 70,000원 × 10주 = 700,000원
지금:    73,000원 × 10주 = 730,000원
👉 +30,000원 벌었어요 (4.3% 🟢)
[수정] [삭제]
```

#### ＋ 추가 버튼 → 모달

- 종목 검색 드롭다운 (stocks.json 기반)
- 산 가격 / 주식 수 / 매수일 / 메모 (선택)
- "**한 번만 매수했을 때** 기준이에요. 여러 번 나눠 사셨다면 평균 가격을 입력하세요." 안내문

### 엣지케이스

- 상장폐지 종목: "현재 가격 정보가 없어요" 표시 + 마지막 알려진 가격
- 수수료·세금 미반영 → 카드 하단 "※ 수수료·세금 미반영 (참고용)" 안내

### 첫 방문 가이드

```
1. ＋ 버튼으로 산 주식을 기록하세요 (산 가격, 산 주식 수)
2. 자동으로 지금 가격과 비교해서 얼마 벌었는지 알려드려요
3. 실시간 주가가 아니라 어제 종가 기준이에요
```

---

## ③ 🗺 오늘 잘 나가는 분야 (`/heatmap`)

### 데이터 집계

`indicators.json` + `fundamentals.json` + `sectors.json` 조합:

1. 각 종목 당일 등락률 = `(close[-1] / close[-2] - 1) × 100`
2. 섹터별:
   - **avgRet**: 섹터 종목들의 시총 가중 평균 등락률
   - **count**: 섹터 종목 수

### UI

- **🔥 오늘 가장 잘 나가는 5 분야** — 초록 막대 (오른쪽으로 길수록 강함)
  ```
  반도체            🟢 ████████ +3.2%
  2차전지           🟢 ██████   +2.5%
  AI               🟢 █████    +2.1%
  ...
  ```
- **❄️ 오늘 힘든 5 분야** — 빨강 막대 (왼쪽으로 길수록 약함)
- 막대 = `<div>` + Tailwind `width: ${ratio}%`
- 분야 클릭 → 하단에 해당 분야 종목 리스트 (등락순 Top 20)
  - 종목명 클릭 → 종목 상세

### 엣지케이스

- 섹터 비어있는 종목: "미분류" — 통계에서 제외
- 2거래일 미만 종목: 제외

### 첫 방문 가이드

```
1. 오늘 어떤 분야가 강한지/약한지 한눈에 보여요
2. 분야를 클릭하면 그 분야 종목들이 나와요
3. 매일 흐름이 바뀌니 자주 확인하세요
```

---

## ④ 📓 내 거래 일기 (`/journal`)

### 데이터 모델

```typescript
interface JournalEntry {
  id: string          // uuid
  date: string        // ISO date
  code: string
  type: 'buy' | 'sell'
  price: number       // 거래 가격
  quantity: number
  profit?: number     // 매도 시 사용자 직접 입력 (벌었으면 +, 잃었으면 -)
  reason?: string     // 메모 (선택)
}
interface JournalStore {
  version: 1
  entries: JournalEntry[]
}
```

키: `ws:journal:${userId}`

### UI

#### 기록 리스트

- 필터: 종목 / 기간 / 매수만·매도만
- 카드 형식:
  ```
  2026-04-15 (수)
  삼성전자 매수 70,000원 × 10주 = 700,000원
  메모: "장기 투자용"
  [수정] [삭제]
  ```
- 매도 카드:
  ```
  2026-04-30 (목)
  삼성전자 매도 73,000원 × 10주 = 730,000원
  👉 +30,000원 벌었어요 🟢
  메모: "단기 차익 실현"
  [수정] [삭제]
  ```

#### ＋ 기록 추가 모달

- 날짜 / 종목 / 매수·매도 라디오 / 가격 / 주식 수 / 메모
- **매도 선택 시 추가 필드**: "**이번 거래로 얼마 벌었어요? (잃었으면 - 표시)**"
  - 선택 입력. 사용자가 직접 계산해서 적음.

#### 월별 요약 (간단)

페이지 상단:
```
📅 이번 달 (4월) 요약
   총 거래: 10번
   매수: 6번 / 매도: 4번
   수익 거래: 3번 🟢 / 손실 거래: 1번 🔴
   (수익/손실은 본인이 입력한 금액 기준)
```

### 자동 페어링 없음

매수 N번 / 매도 N번을 자동으로 짝짓지 **않음**. 통계는 단순 카운트.
사용자가 매도 시 입력한 `profit` 값만 합산.

### 첫 방문 가이드

```
1. 매수·매도할 때마다 ＋ 눌러서 기록하세요
2. 매도할 때 "얼마 벌었는지" 직접 입력하면 통계에 반영돼요
3. 메모에 "왜 샀는지" 적어두면 나중에 복기할 때 도움돼요
```

---

## ⑤ 📘 용어집 (`/glossary`)

### 콘텐츠

30개 용어 — 카테고리 4개:

**기본 용어 (10개)**
- 주식 / 주가 / 시가총액 / 거래량 / 종가
- 매수 / 매도 / 호가 / 보합 / 상한가·하한가

**수익 관련 (5개)**
- 수익률 / 손익 / 평단가 / 손절 / 익절

**시장 흐름 (5개)**
- 상승장 / 하락장 / 횡보 / 변동성 / 추세

**기술 분석 (5개)**
- 이동평균선(MA) / 골든크로스 / 데드크로스 / RSI / 볼린저밴드

**투자 주체 (5개)**
- 외국인 / 기관 / 개인 / 공매도 / 배당

각 용어:
```
### 수익률
산 가격 대비 지금 얼마 이익(또는 손실)인지 % 로 표현한 것.

예: 70,000원에 사서 73,000원이 되면 +4.3% 수익률.
계산법: (현재가 - 산 가격) ÷ 산 가격 × 100
```

### UI

- 카테고리 탭 (4개)
- 검색창 (용어명 부분 일치)
- Footer 어디서든 "📘 용어집" 링크
- 다른 페이지에서 자주 쓰는 용어에 작은 ⓘ 아이콘 → 툴팁 (Phase 13)

### 데이터

`src/lib/glossary/terms.ts` — 정적 배열. ko.ts와 별도 파일 (양이 많음).

---

## ⑥ 🎓 첫 방문 가이드 모달

### 동작

- 페이지 첫 진입 시 자동 표시
- 2~3 스텝 (Next/Skip 버튼)
- 마지막 스텝에 "**다시 보지 않기**" 체크박스 + 시작 버튼
- 체크 시 `ws:visited:${pageKey} = true`

### 디자인

```
┌──────────────────────────────┐
│  ⭐ 지켜볼 종목이란?            │
│                              │
│  관심있는 종목을 즐겨찾기처럼   │
│  모아두는 곳이에요.            │
│                              │
│  ● ○ ○                       │
│              [건너뛰기] [다음] │
└──────────────────────────────┘
```

- 다크 오버레이 + 중앙 카드
- ESC / 바깥 클릭 → 닫기 (다시 보임)
- 시작 버튼 → 닫기 + 체크 여부 따라 저장

---

## 🗂 파일 구조

```
src/
├── app/[basePath]/
│   ├── watchlist/
│   │   ├── page.tsx
│   │   └── WatchlistView.tsx
│   ├── portfolio/
│   │   ├── page.tsx
│   │   ├── PortfolioView.tsx
│   │   ├── PortfolioEntryModal.tsx
│   │   └── PortfolioSummaryCard.tsx
│   ├── heatmap/
│   │   ├── page.tsx
│   │   ├── HeatmapView.tsx
│   │   ├── SectorBar.tsx
│   │   └── SectorStockList.tsx
│   ├── journal/
│   │   ├── page.tsx
│   │   ├── JournalView.tsx
│   │   ├── JournalEntryModal.tsx
│   │   └── JournalMonthlySummary.tsx
│   └── glossary/
│       ├── page.tsx
│       └── GlossaryView.tsx
├── lib/
│   ├── storage/
│   │   ├── useLocalStore.ts
│   │   ├── useFirstVisit.ts
│   │   ├── watchlist.ts
│   │   ├── portfolio.ts
│   │   ├── journal.ts
│   │   └── __tests__/
│   ├── sectorAggregation.ts        # 섹터별 가중평균 + 테스트
│   ├── glossary/
│   │   └── terms.ts                # 용어 데이터
│   └── strings/ko.ts               # 신규 키
└── components/
    ├── stock/
    │   └── WatchlistButton.tsx     # 종목 상세에 삽입
    ├── common/
    │   └── FirstVisitGuide.tsx     # 공용 가이드 모달
    └── layout/
        ├── SideNav.tsx             # 메뉴 4개 추가
        └── Footer.tsx              # 용어집 링크 추가
```

---

## 🧪 테스트 전략

### 단위 테스트 (Vitest)

- `useLocalStore` 훅: 초기값 / 저장 / 다른 탭 / 버전 필드
- `useFirstVisit` 훅: 첫 방문 / 재방문 / 다시 보지 않기
- `watchlist.ts` / `portfolio.ts` / `journal.ts` CRUD
- `sectorAggregation.ts`: 섹터 가중 평균 / 미분류 처리 / Top 5 정렬

### 통합 테스트 (수동)

- 종목 상세 ☆ → `/watchlist` 반영
- 포트폴리오 추가 → 손익 계산 검증
- 섹터 히트맵: 막대 / 클릭 시 종목 리스트
- 매매일지: 추가/수정/삭제, 월별 요약 카운트
- 용어집 검색
- 첫 방문 모달 → "다시 보지 않기" 동작
- 모든 페이지에서 다크 모드 동작

---

## 📊 SideNav 배치

```
💡 구매 추천 일괄
🌱 입문 추천 종목
⭐ 지켜볼 종목         ← 신규
💼 내가 산 주식        ← 신규
🗺 오늘 잘 나가는 분야  ← 신규
📓 내 거래 일기        ← 신규
📊 전략 검색기
📋 전체 종목
```

Footer:
```
... 기존 링크 ... | 📘 용어집
```

---

## 🚀 구현 순서

1. 공용 `useLocalStore` + `useFirstVisit` 훅 + 테스트
2. `FirstVisitGuide` 공용 컴포넌트
3. ⭐ 지켜볼 종목 (가장 단순 → 베이스라인 검증)
4. 💼 내가 산 주식
5. 📓 내 거래 일기
6. 🗺 오늘 잘 나가는 분야 (`sectorAggregation` 로직 포함)
7. 📘 용어집 (정적 콘텐츠)
8. SideNav + Footer 반영, 문자열 ko.ts 정리
9. Export/Import UI
10. 사전 QA 시나리오 수행

세부 태스크는 writing-plans 단계에서.

---

## ❓ Open Questions

모두 확답:
- 외부 차트 라이브러리 없음 (div + Tailwind 막대) ✅
- 분할매수 단순화 (산 가격 1개) ✅
- 매매일지 사용자 직접 입력 ✅
- 용어집 + 첫 방문 가이드 포함 ✅
