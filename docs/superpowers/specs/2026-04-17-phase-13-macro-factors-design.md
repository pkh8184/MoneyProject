# Phase 13 — 환경 팩터(매크로) 가산 시스템 설계

**Date**: 2026-04-17
**Status**: Draft (awaiting review)
**Scope**: 사용자가 현재 시장 환경을 선택하면 종목 추천 점수에 ±가산이 반영되는 시스템. 30개 팩터.

---

## 🎯 목적

현재 프리셋은 **차트·거래량 기반**이라 "오늘 세계에서 벌어지는 일"을 반영하지 못한다.
사용자가 **현재 매크로 환경**(전쟁·금리 인상기·유가 급등 등)을 선택하면, 그에 수혜/피해받는 종목의 점수를 가산/감산해 "환경 맞춤 추천"을 제공한다.

---

## ✅ 범위

1. 30개 환경 팩터 데이터 + 수혜/피해 매칭
2. 사용자 팩터 on/off UI (`/environment`)
3. 스코어 가산 로직 + 프리셋 결과 통합
4. 종목 상세에 적용 팩터 표시
5. `fetch_sectors.py` 테마 확장 (8개 → 22개)
6. 모든 문자열 `ko.ts` 편입

## ❌ 범위 제외 (Phase 14+)

- 환율·유가·코스피 **자동 탐지**로 팩터 자동 활성화
- 사용자 커스텀 팩터 추가
- 팩터별 가중치 개별 조정
- DART·뉴스 연동

---

## 🔍 데이터 현황 검증 결과

**`sectors.json` 실제 상태** (data branch 기준):
- 총 2,770 종목
- `sector`, `industry` 필드 **전부 빈 문자열** (FDR StockListing이 해당 컬럼 미제공)
- `themes` 배열만 유효: 8개 테마, 전체의 10%(266종목)에만 태그
- 테마 분포: 바이오 137, 금융 55, AI 19, 게임 17, 반도체 16, 2차전지 10, 전기차 8, 보안 7

**→ 이 제약으로 아래 2가지가 필수**:
1. `FactorMatch`에서 `industry`, `sector` 필드 **제거** — 항상 빈 값
2. `fetch_sectors.py` THEME_KEYWORDS를 **8개 → 22개로 확장**

### 추가 테마 목록 (14개 추가)

| 테마 | 매칭 키워드 (예시) |
|---|---|
| 방산 | 한화에어로스페이스, LIG넥스원, 한국항공우주, 현대로템, 풍산, 빅텍, 스페코 |
| 건설 | 건설, 삼성물산, 현대건설, 대우건설, GS건설, DL이앤씨 |
| 정유·에너지 | S-Oil, GS, SK이노베이션, 한국가스공사, 한국전력, E1 |
| 항공·여행 | 대한항공, 아시아나, 제주항공, 티웨이, 하나투어, 노랑풍선, 호텔신라 |
| 해운·물류 | HMM, 팬오션, CJ대한통운, 한진, 세방 |
| 유통 | 이마트, 롯데쇼핑, BGF리테일, GS리테일, 현대백화점, 신세계 |
| 시멘트·건자재 | 삼표시멘트, 한일시멘트, 아시아시멘트, KCC, 쌍용양회 |
| 식품·음료 | 농심, 롯데칠성, CJ제일제당, 오뚜기, 대한제분, 동원F&B |
| 통신 | SK텔레콤, KT, LG유플러스, LG헬로비전 |
| 전력·가스 | 한국전력, 한국가스공사, 삼천리, 경동도시가스 |
| 엔터·미디어 | CJ ENM, 하이브, 스튜디오드래곤, JYP, SM, YG, 에스엠, 빅히트 |
| 화장품 | LG생활건강, 아모레퍼시픽, 코스맥스, 클리오, 한국콜마 |
| 담배 | KT&G |
| 철강·비철금속 | POSCO, 현대제철, 고려아연, 풍산, 세아 |

`fetch_sectors.py`의 `THEME_KEYWORDS` 딕셔너리에 위 14개 추가. 데이터 재수집 시 전체 종목 재분류.

---

## 🧩 데이터 모델

```typescript
// src/lib/macro/types.ts

export type FactorCategory =
  | 'geopolitics'  // 지정학
  | 'rates'        // 금리·환율
  | 'commodity'    // 원자재·에너지
  | 'domestic'     // 국내 경제
  | 'theme'        // 산업 테마
  | 'sentiment'    // 시장 심리

export type FactorLevel = 'danger' | 'caution' | 'opportunity'  // 🔴🟡🟢

/**
 * 팩터가 어떤 종목에 영향을 주는지 매칭 기준.
 * 여러 필드가 OR 관계로 결합됨.
 * 종목 name, sectors.json의 themes만 사용 (industry/sector는 현재 빈 필드).
 */
export interface FactorMatch {
  themes?: string[]        // sectors.json themes 배열에 포함되면 매칭
  nameKeywords?: string[]  // 종목명 부분 일치 (한글 기준)
}

export interface MacroFactor {
  id: string
  category: FactorCategory
  level: FactorLevel
  emoji: string            // 🔴🟡🟢
  name: string             // 예: "전쟁·분쟁 지속"
  desc: string             // 초보용 한 줄 설명
  beneficiaries: FactorMatch
  losers: FactorMatch
  defaultActive: boolean
}
```

---

## 📋 30개 팩터 정의 (검증 반영)

> 수혜(B+), 피해(L-) 점수 계산용. 매칭은 `themes` 또는 `nameKeywords` OR.
> 대형주 매칭은 모두 `nameKeywords` 하드코딩.

### A. 지정학 (7)

| ID | 팩터 | 수혜 매칭 | 피해 매칭 |
|---|---|---|---|
| `war_ongoing` | 🔴 전쟁·분쟁 지속 | themes: 방산, 정유·에너지 / names: 고려아연, 풍산 | themes: 항공·여행 |
| `nk_provocation` | 🟡 북한 도발 | themes: 방산 / names: 빅텍, 스페코 | names: 현대엘리베이터, 아난티 |
| `middle_east` | 🔴 중동 긴장 | themes: 정유·에너지 / names: S-Oil, 현대중공업 | themes: 항공·여행 |
| `us_china` | 🔴 미·중 무역분쟁 | themes: 반도체 | names: LG생활건강, 아모레퍼시픽, 코스맥스 |
| `trade_boom` | 🟢 글로벌 무역 확대 | themes: 해운·물류 | — |
| `taiwan_tension` | 🔴 대만 긴장 | themes: 반도체 / names: 한미반도체, 이수페타시스 | — |
| `korea_peace` | 🟢 한반도 평화 무드 | themes: 건설 / names: 현대엘리베이터, 아난티, 현대건설 | — |

### B. 금리·환율 (5)

| ID | 팩터 | 수혜 매칭 | 피해 매칭 |
|---|---|---|---|
| `rate_hike` | 🔴 금리 인상기 | themes: 금융 | themes: AI, 바이오, 건설 |
| `rate_cut` | 🟢 금리 인하기 | themes: AI, 바이오, 건설 | themes: 금융 |
| `krw_weak` | 🔴 원화 약세 (환율↑) | themes: 반도체, 전기차, 2차전지 / names: 현대차, 기아, 현대중공업 | themes: 항공·여행, 유통 |
| `krw_strong` | 🟢 원화 강세 (환율↓) | themes: 항공·여행, 유통 | themes: 반도체 / names: 현대차, 기아 |
| `inflation` | 🔴 인플레이션 고조 | themes: 정유·에너지, 식품·음료, 철강·비철금속 | themes: AI, 바이오 |

### C. 원자재·에너지 (5)

| ID | 팩터 | 수혜 매칭 | 피해 매칭 |
|---|---|---|---|
| `oil_up` | 🔴 유가 급등 | themes: 정유·에너지 / names: S-Oil, GS, SK이노베이션 | themes: 항공·여행, 해운·물류 |
| `oil_down` | 🟢 유가 급락 | themes: 항공·여행, 해운·물류 | themes: 정유·에너지 |
| `gold_up` | 🔴 금 가격 급등 | themes: 철강·비철금속 / names: 고려아연, 풍산 | — |
| `lithium_copper` | 🟢 리튬·구리 상승 | themes: 2차전지, 철강·비철금속 / names: LG화학, 포스코퓨처엠, 고려아연 | — |
| `grain_up` | 🔴 곡물가 상승 | themes: 식품·음료 / names: 농심, 대한제분, CJ제일제당, 동원F&B | names: 하림, 마니커 |

### D. 국내 경제 (5)

| ID | 팩터 | 수혜 매칭 | 피해 매칭 |
|---|---|---|---|
| `realestate_tight` | 🔴 부동산 규제 강화 | — | themes: 건설, 시멘트·건자재 |
| `realestate_boost` | 🟢 부동산 부양 | themes: 건설, 시멘트·건자재 / names: 삼표시멘트, 한일시멘트, 아시아시멘트 | — |
| `domestic_down` | 🔴 내수 침체 | — | themes: 유통, 식품·음료 |
| `domestic_up` | 🟢 소비 회복 | themes: 유통, 식품·음료, 화장품 / names: 호텔신라, CJ ENM | — |
| `export_boom` | 🟢 수출 호조 | themes: 반도체, 2차전지, 전기차 / names: 현대차, 기아 | — |

### E. 산업 테마 (5)

| ID | 팩터 | 수혜 매칭 | 피해 매칭 |
|---|---|---|---|
| `ai_boom` | 🟢 AI 붐 | themes: AI, 반도체 / names: SK하이닉스, 한미반도체 | — |
| `ev_boom` | 🟢 전기차·자율주행 붐 | themes: 전기차, 2차전지 | — |
| `bio_boom` | 🟢 바이오 호조 | themes: 바이오 | — |
| `kcontent_boom` | 🟢 K-컨텐츠 호조 | themes: 게임, 엔터·미디어 / names: CJ ENM, 하이브, 스튜디오드래곤 | — |
| `defense_boom` | 🟢 방산 수주 확대 | themes: 방산 | — |

### F. 시장 심리 (3)

| ID | 팩터 | 수혜 매칭 | 피해 매칭 |
|---|---|---|---|
| `foreign_sell` | 🔴 외국인 매도 지속 | themes: 전력·가스, 통신, 담배 / names: KT&G, KT, SK텔레콤, 한국전력 | names: 삼성전자, SK하이닉스, 현대차, LG에너지솔루션, 카카오, 네이버 |
| `foreign_buy` | 🟢 외국인 매수 지속 | themes: 반도체, AI / names: 삼성전자, SK하이닉스 | — |
| `kospi_crash` | 🔴 코스피 급락 | themes: 전력·가스, 통신, 담배 / names: KT&G | themes: AI, 바이오 |

---

## 🧮 스코어 알고리즘

### 가중치 (수정)

- **BENEFIT_WEIGHT = 5** (기존 10 → 5로 낮춤)
- **LOSS_WEIGHT = 5**
- 활성 팩터 5개 모두 수혜 시 최대 +25점 (프리셋 60~80점의 30~40%)
- 충분히 영향은 주되 차트 시그널을 무력화하지 않음

### 매칭 함수

```typescript
// src/lib/macro/matching.ts
export function matchesFactor(
  stockName: string,
  themes: string[] | undefined,
  m: FactorMatch
): boolean {
  if (m.themes && themes) {
    for (const t of m.themes) {
      if (themes.includes(t)) return true
    }
  }
  if (m.nameKeywords) {
    for (const kw of m.nameKeywords) {
      if (stockName.includes(kw)) return true
    }
  }
  return false
}
```

### 스코어 계산

```typescript
// src/lib/macro/scoring.ts
export interface MacroBonusDetail {
  factorId: string
  factorName: string
  delta: number
  role: 'benefit' | 'loss'
}

export interface MacroBonus {
  total: number
  detail: MacroBonusDetail[]
}

const BENEFIT_WEIGHT = 5
const LOSS_WEIGHT = 5

export function computeMacroBonus(
  stockName: string,
  themes: string[] | undefined,
  activeFactors: MacroFactor[]
): MacroBonus {
  const detail: MacroBonusDetail[] = []
  for (const f of activeFactors) {
    let delta = 0
    let role: 'benefit' | 'loss' | null = null
    if (matchesFactor(stockName, themes, f.beneficiaries)) {
      delta += BENEFIT_WEIGHT
      role = 'benefit'
    }
    if (matchesFactor(stockName, themes, f.losers)) {
      delta -= LOSS_WEIGHT
      // 수혜+피해 둘 다 매칭되면 상쇄 (delta=0), role은 benefit 유지
    }
    if (delta !== 0) {
      detail.push({
        factorId: f.id,
        factorName: f.name,
        delta,
        role: delta > 0 ? 'benefit' : 'loss'
      })
    }
  }
  return {
    total: detail.reduce((s, d) => s + d.delta, 0),
    detail
  }
}
```

### 프리셋 통합

`src/lib/filter.ts` 기존 결과 리스트에 매크로 보너스 주입:

```typescript
// 기존 sortScore + macroBonus 합산
function enrichWithMacro(
  results: ScreenerResult[],
  sectorsMap: SectorsJson | null,
  activeFactors: MacroFactor[]
): ScreenerResult[] {
  return results.map(r => {
    const themes = sectorsMap?.[r.stock.code]?.themes
    const bonus = computeMacroBonus(r.stock.name, themes, activeFactors)
    return { ...r, macroBonus: bonus, finalScore: r.score + bonus.total }
  }).sort((a, b) => b.finalScore - a.finalScore)
}
```

---

## 🎨 UI 상세

### 1. `/environment` 페이지

**SideNav에 🌍 시장 환경 추가** (관심 종목 위에 배치):
```
💡 구매 추천 일괄
🌱 입문 추천 종목
🌍 시장 환경           ← 신규
⭐ 관심 종목
💼 보유한 주식
🗺 오늘 잘 나가는 분야
📓 매매일지
📊 전략 검색기
📋 전체 종목
```

**페이지 레이아웃**:
```
🌍 시장 환경
─────────────────────────────
[현재 상황에 맞는 팩터를 켜두면 추천 점수에 반영돼요]
현재 활성: 5 / 30개       [모두 끄기] [추천 세팅]

━━━━━━━━━━━━━━━━━━━━━━━━━━━
A. 지정학 (1 / 7)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
☑ 🔴 전쟁·분쟁 지속
   전세계에서 전쟁이 이어지는 시기
   👍 수혜: 방산, 정유, 금
   👎 피해: 항공, 여행

☐ 🟡 북한 도발
   북한이 미사일을 쏘거나 군사 활동이 많은 시기
   👍 수혜: 방산
   👎 피해: 남북경협 관련
   ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━
B. 금리·환율 (2 / 5)
...
```

**탭 방식 대신 아코디언 혹은 섹션 헤더** — 모바일에서 스크롤 용이.

**상단 추천 세팅 버튼** (Phase 14 예고만, Phase 13에서는 버튼 비활성):
- 현재는 수동만. 버튼 있지만 "준비 중" 표시.

### 2. 추천·검색기 결과 뱃지

`MatchedPresets`, `ResultTable`, `RecommendCard`에 매크로 뱃지 추가:

```
삼성전자  ₩65,200  +2.3%
🟢 매칭: 골든크로스, 볼륨 스파이크
🌍 환경 +15  ← 누르면 상세 팝업
```

**뱃지 색상**:
- `total > 0`: 초록
- `total < 0`: 빨강
- `total == 0`: 숨김 (또는 회색 "중립")

### 3. 종목 상세 — `MacroDetailPanel`

```
🌍 현재 환경에서의 위치
─────────────────
활성 팩터 5개 중 3개 매칭

  🟢 AI 붐           +5   (수혜)
  🟢 전기차 붐       +5   (수혜)
  🔴 금리 인상기     -5   (피해)
  ─────────────────
  합계                +5

[🌍 시장 환경 설정 바로가기 →]
```

활성 팩터가 0개일 때는 패널 전체 숨김 or "아직 환경을 설정하지 않았어요" 안내.

### 4. 첫 방문 가이드

`/environment` 첫 방문 시:
```
1. 🌍 시장 환경이란?
   "지금 세계에서 벌어지는 일"에 따라 유리한 종목이 달라져요.
2. 사용 방법
   현재 상황에 맞는 팩터를 켜두면 추천 점수에 반영돼요.
3. 팁
   너무 많이 켜면 효과가 흐려져요. 정말 중요한 것 3~5개만 켜두세요.
```

---

## 🗂 파일 구조

```
src/
├── lib/
│   ├── macro/
│   │   ├── types.ts                    # FactorCategory, MacroFactor, FactorMatch, MacroBonus
│   │   ├── factors.ts                  # 30개 정적 데이터
│   │   ├── matching.ts                 # matchesFactor()
│   │   ├── scoring.ts                  # computeMacroBonus()
│   │   ├── useMacroFactors.ts          # localStorage 훅 래퍼
│   │   └── __tests__/
│   │       ├── matching.test.ts
│   │       ├── scoring.test.ts
│   │       └── factors.test.ts         # ID 유일성, 매칭 필드 존재
│   ├── filter.ts                       # enrichWithMacro() 추가
│   └── strings/ko.ts                   # macroFactors, environment 섹션
├── app/[basePath]/environment/
│   ├── page.tsx
│   ├── EnvironmentView.tsx
│   └── FactorCard.tsx                  # 토글 1개 카드
├── components/
│   ├── macro/
│   │   ├── MacroBadge.tsx              # 추천 리스트·카드에 사용
│   │   └── MacroDetailPanel.tsx        # 종목 상세
│   └── layout/SideNav.tsx              # 🌍 링크 추가
└── scripts/
    └── fetch_sectors.py                # THEME_KEYWORDS 확장 (+14 테마)
```

---

## 🧪 테스트 전략

### 단위 테스트 (Vitest)

**`factors.test.ts`**:
- 30개 팩터의 id 유일성
- 각 팩터의 category가 유효 enum
- 각 팩터의 beneficiaries 또는 losers 중 최소 하나에 매칭 조건 존재
- 각 팩터의 nameKeywords 길이 > 0 또는 themes 길이 > 0

**`matching.test.ts`**:
- themes 매칭 (포함/미포함)
- nameKeywords 매칭 (부분 일치/미일치)
- themes + nameKeywords OR 관계
- 매칭 필드 없는 경우 false

**`scoring.test.ts`**:
- 활성 팩터 0개 → total 0
- 수혜만 → +5
- 수혜+피해 같은 팩터 → 상쇄 (0)
- 복수 팩터 누적 (+5 + 5 = +10)
- delta=0인 팩터는 detail에 포함 안 함

### 통합 테스트 (수동)

- /environment 토글 → 새로고침 유지 (localStorage)
- "모두 끄기" 동작
- 추천 페이지 매크로 뱃지 표시 + 팝업 상세
- 종목 상세 `MacroDetailPanel` 매칭 내역 정확성
- 비활성 상태에서 뱃지·패널 숨김
- 다크 모드
- 모바일 레이아웃

---

## 🚀 구현 순서 (태스크 분해)

| # | Task | 파일 | 시간 |
|---|---|---|---|
| 1 | Types | `macro/types.ts` | 30m |
| 2 | 30 factors 정적 데이터 | `macro/factors.ts` | 3h |
| 3 | Factor 유효성 테스트 | `factors.test.ts` | 30m |
| 4 | `matchesFactor()` + 테스트 | `matching.ts` + test | 1h |
| 5 | `computeMacroBonus()` + 테스트 | `scoring.ts` + test | 1h |
| 6 | `useMacroFactors()` 훅 (useLocalStore 재사용) | `useMacroFactors.ts` | 30m |
| 7 | ko.ts `macroFactors` + `environment` 섹션 | `ko.ts` | 1h |
| 8 | `FactorCard` 컴포넌트 | `FactorCard.tsx` | 1h |
| 9 | `EnvironmentView` 페이지 | `EnvironmentView.tsx` | 2h |
| 10 | page.tsx + 첫 방문 가이드 | `page.tsx` | 30m |
| 11 | SideNav 🌍 링크 추가 | `SideNav.tsx` | 15m |
| 12 | `MacroBadge` 컴포넌트 | `MacroBadge.tsx` | 30m |
| 13 | `MacroDetailPanel` | `MacroDetailPanel.tsx` | 1h |
| 14 | StockDetail 통합 | `StockDetail.tsx` | 15m |
| 15 | `filter.ts` `enrichWithMacro()` 추가 | `filter.ts` | 1h |
| 16 | 추천·검색기 결과에 뱃지 통합 | `Recommendations`, `Screener` | 1.5h |
| 17 | `fetch_sectors.py` 테마 14개 확장 | `fetch_sectors.py` | 1h |
| 18 | 빌드 + E2E QA + PR 생성 | — | 2h |

**총 예상**: **18시간 ≈ 2.5일**

---

## ⚠️ 엣지 케이스

| 상황 | 처리 |
|---|---|
| 활성 팩터 0개 | `total = 0`, 뱃지/패널 숨김 |
| 종목이 수혜·피해 모두 매칭 | 상쇄 (`delta = 0`), detail에서 제외 |
| sectors.json에 해당 종목 없음 | `themes = []` 취급, nameKeywords만 매칭 시도 |
| 테마 확장 전 (구 데이터) | 신규 테마 매칭 시 0건 정상 동작, 워크플로 재실행 시 자동 반영 |
| 사용자 팩터 토글 변경 | localStorage 저장, 현재 페이지 자동 리렌더 |
| 정렬 옵션 | 기본: `finalScore` 내림차순. 사용자가 `presetScore`로 바꾸는 옵션 추후 검토 |
| 매크로 보너스 vs 필터 통과 | **필터 통과 여부는 변경 없음**. 정렬·표시만 영향. |

---

## 🔜 Phase 14 확장 (추후)

1. **자동 탐지**
   - 환율: 네이버 금융 크롤링 또는 한국은행 API
   - 유가: Yahoo Finance / FDR
   - 코스피: 기존 데이터로 직접 계산
   - 임계값 넘으면 해당 팩터 자동 ON
2. **사용자 커스텀 팩터 추가**: 유저 정의 팩터 생성
3. **팩터별 가중치 조정**: 각 팩터에 weight 슬라이더
4. **"추천 세팅"** 원클릭 프리셋: "전쟁 모드", "금리 인상기 모드" 등
5. **뉴스 연동**: DART 공시·네이버 뉴스로 팩터 감지

---

## 📌 머지 후 필수 작업

1. `fetch_sectors.py` 수정이 포함되므로 **Daily Stock Data Update 워크플로 수동 실행** 필요
2. 신규 테마(방산·건설·정유 등)가 실제 종목에 태그되어야 매칭 효과 발현
3. 사용자 안내: "테마 확장 반영까지 하루 정도 걸릴 수 있어요"

---

## ❓ Open Questions (사용자 확인 필요)

모두 직전 대화에서 확답:
- 가중치 ±5점 (±10에서 조정) ✅ (본 문서에서 적용)
- 대형주 매칭: nameKeywords 하드코딩 ✅
- 테마 확장: 8 → 22개 (fetch_sectors.py 수정) ✅
- 자동 탐지: Phase 14로 미룸 ✅

---

## 🎯 시작 조건

1. Phase 12 PR 머지 완료
2. 현재 `feature/phase-12-trader-categories` 브랜치 머지 후 새 브랜치 `feature/phase-13-macro-factors` 생성
3. 본 spec 승인 → plan 작성 → subagent 주도 구현 (Phase 12 방식 그대로)
