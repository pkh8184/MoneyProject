# Phase 13 — 환경 팩터(매크로) 가산 시스템 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 현재 시장 환경(전쟁·금리 인상기·유가 급등 등 30개 팩터)을 on/off하면 종목 추천 점수에 ±가산이 반영되는 시스템을 구축한다.

**Architecture:** `src/lib/macro/` 하위에 팩터 데이터·매칭·스코어링 로직을 모듈화. 30개 정적 팩터 데이터는 `factors.ts`에 하드코딩. 사용자 선택은 localStorage(Phase 12 `useLocalStore` 재사용)로 저장. 프리셋 결과 정렬 시 각 종목에 `macroBonus`를 합산한 `finalScore`로 재정렬.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Vitest + @testing-library/react, localStorage.

**Design Spec:** [`docs/superpowers/specs/2026-04-17-phase-13-macro-factors-design.md`](../specs/2026-04-17-phase-13-macro-factors-design.md)

---

## 사전 준비

- 작업 브랜치: **Phase 12 PR 머지 후** `feature/phase-13-macro-factors` 신규 생성 (off main)
- 프로젝트 루트 (git + 모든 명령): `/c/Users/rk454/Desktop/Project/Money/MoneyProject`
- Phase 12에서 완성된 인프라 재사용:
  - `useLocalStore<T>` (저장)
  - `useFirstVisit` (가이드 모달)
  - `FirstVisitGuide` (튜토리얼)
  - SideNav 패턴
  - ko.ts 문자열 중앙화

---

## Phase A — Foundation (Tasks 1-5)

### Task 1: 타입 정의

**Files:**
- Create: `src/lib/macro/types.ts`

- [ ] **Step 1: 구현**

```typescript
// src/lib/macro/types.ts

export type FactorCategory =
  | 'geopolitics'
  | 'rates'
  | 'commodity'
  | 'domestic'
  | 'theme'
  | 'sentiment'

export type FactorLevel = 'danger' | 'caution' | 'opportunity'

export interface FactorMatch {
  themes?: string[]
  nameKeywords?: string[]
}

export interface MacroFactor {
  id: string
  category: FactorCategory
  level: FactorLevel
  emoji: string
  name: string
  desc: string
  beneficiaries: FactorMatch
  losers: FactorMatch
  defaultActive: boolean
}

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
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`
Expected: 에러 없음

---

### Task 2: 30개 팩터 정적 데이터

**Files:**
- Create: `src/lib/macro/factors.ts`

- [ ] **Step 1: 구현**

```typescript
// src/lib/macro/factors.ts
import type { MacroFactor } from './types'

export const macroFactors: MacroFactor[] = [
  // ========== A. 지정학 (7) ==========
  {
    id: 'war_ongoing',
    category: 'geopolitics',
    level: 'danger',
    emoji: '🔴',
    name: '전쟁·분쟁 지속',
    desc: '전세계에서 전쟁이 이어지는 시기',
    beneficiaries: {
      themes: ['방산', '정유·에너지'],
      nameKeywords: ['고려아연', '풍산']
    },
    losers: {
      themes: ['항공·여행']
    },
    defaultActive: false
  },
  {
    id: 'nk_provocation',
    category: 'geopolitics',
    level: 'caution',
    emoji: '🟡',
    name: '북한 도발',
    desc: '북한이 미사일을 쏘거나 군사 활동이 많은 시기',
    beneficiaries: {
      themes: ['방산'],
      nameKeywords: ['빅텍', '스페코']
    },
    losers: {
      nameKeywords: ['현대엘리베이터', '아난티']
    },
    defaultActive: false
  },
  {
    id: 'middle_east',
    category: 'geopolitics',
    level: 'danger',
    emoji: '🔴',
    name: '중동 긴장',
    desc: '이스라엘·이란 등 중동 지역 긴장이 높은 시기',
    beneficiaries: {
      themes: ['정유·에너지'],
      nameKeywords: ['S-Oil', '현대중공업']
    },
    losers: {
      themes: ['항공·여행']
    },
    defaultActive: false
  },
  {
    id: 'us_china',
    category: 'geopolitics',
    level: 'danger',
    emoji: '🔴',
    name: '미·중 무역분쟁',
    desc: '미국과 중국 간 무역 갈등이 심한 시기',
    beneficiaries: {
      themes: ['반도체']
    },
    losers: {
      nameKeywords: ['LG생활건강', '아모레퍼시픽', '코스맥스']
    },
    defaultActive: false
  },
  {
    id: 'trade_boom',
    category: 'geopolitics',
    level: 'opportunity',
    emoji: '🟢',
    name: '글로벌 무역 확대',
    desc: '세계 교역량이 늘어나는 시기',
    beneficiaries: {
      themes: ['해운·물류']
    },
    losers: {},
    defaultActive: false
  },
  {
    id: 'taiwan_tension',
    category: 'geopolitics',
    level: 'danger',
    emoji: '🔴',
    name: '대만 긴장',
    desc: '중국-대만 긴장이 고조된 시기',
    beneficiaries: {
      themes: ['반도체'],
      nameKeywords: ['한미반도체', '이수페타시스']
    },
    losers: {},
    defaultActive: false
  },
  {
    id: 'korea_peace',
    category: 'geopolitics',
    level: 'opportunity',
    emoji: '🟢',
    name: '한반도 평화 무드',
    desc: '남북 관계 개선이 기대되는 시기',
    beneficiaries: {
      themes: ['건설'],
      nameKeywords: ['현대엘리베이터', '아난티', '현대건설']
    },
    losers: {},
    defaultActive: false
  },

  // ========== B. 금리·환율 (5) ==========
  {
    id: 'rate_hike',
    category: 'rates',
    level: 'danger',
    emoji: '🔴',
    name: '금리 인상기',
    desc: '중앙은행이 기준금리를 올리는 시기',
    beneficiaries: {
      themes: ['금융']
    },
    losers: {
      themes: ['AI', '바이오', '건설']
    },
    defaultActive: false
  },
  {
    id: 'rate_cut',
    category: 'rates',
    level: 'opportunity',
    emoji: '🟢',
    name: '금리 인하기',
    desc: '중앙은행이 기준금리를 내리는 시기',
    beneficiaries: {
      themes: ['AI', '바이오', '건설']
    },
    losers: {
      themes: ['금융']
    },
    defaultActive: false
  },
  {
    id: 'krw_weak',
    category: 'rates',
    level: 'danger',
    emoji: '🔴',
    name: '원화 약세 (환율↑)',
    desc: '달러당 원화 가치가 떨어지는 시기',
    beneficiaries: {
      themes: ['반도체', '전기차', '2차전지'],
      nameKeywords: ['현대차', '기아', '현대중공업']
    },
    losers: {
      themes: ['항공·여행', '유통']
    },
    defaultActive: false
  },
  {
    id: 'krw_strong',
    category: 'rates',
    level: 'opportunity',
    emoji: '🟢',
    name: '원화 강세 (환율↓)',
    desc: '달러당 원화 가치가 오르는 시기',
    beneficiaries: {
      themes: ['항공·여행', '유통']
    },
    losers: {
      themes: ['반도체'],
      nameKeywords: ['현대차', '기아']
    },
    defaultActive: false
  },
  {
    id: 'inflation',
    category: 'rates',
    level: 'danger',
    emoji: '🔴',
    name: '인플레이션 고조',
    desc: '물가가 빠르게 오르는 시기',
    beneficiaries: {
      themes: ['정유·에너지', '식품·음료', '철강·비철금속']
    },
    losers: {
      themes: ['AI', '바이오']
    },
    defaultActive: false
  },

  // ========== C. 원자재·에너지 (5) ==========
  {
    id: 'oil_up',
    category: 'commodity',
    level: 'danger',
    emoji: '🔴',
    name: '유가 급등',
    desc: '국제유가가 급격히 오르는 시기',
    beneficiaries: {
      themes: ['정유·에너지'],
      nameKeywords: ['S-Oil', 'GS', 'SK이노베이션']
    },
    losers: {
      themes: ['항공·여행', '해운·물류']
    },
    defaultActive: false
  },
  {
    id: 'oil_down',
    category: 'commodity',
    level: 'opportunity',
    emoji: '🟢',
    name: '유가 급락',
    desc: '국제유가가 급격히 내리는 시기',
    beneficiaries: {
      themes: ['항공·여행', '해운·물류']
    },
    losers: {
      themes: ['정유·에너지']
    },
    defaultActive: false
  },
  {
    id: 'gold_up',
    category: 'commodity',
    level: 'danger',
    emoji: '🔴',
    name: '금 가격 급등',
    desc: '안전자산 선호로 금 가격이 급등하는 시기',
    beneficiaries: {
      themes: ['철강·비철금속'],
      nameKeywords: ['고려아연', '풍산']
    },
    losers: {},
    defaultActive: false
  },
  {
    id: 'lithium_copper',
    category: 'commodity',
    level: 'opportunity',
    emoji: '🟢',
    name: '리튬·구리 상승',
    desc: '전기차 원자재 가격이 오르는 시기',
    beneficiaries: {
      themes: ['2차전지', '철강·비철금속'],
      nameKeywords: ['LG화학', '포스코퓨처엠', '고려아연']
    },
    losers: {},
    defaultActive: false
  },
  {
    id: 'grain_up',
    category: 'commodity',
    level: 'danger',
    emoji: '🔴',
    name: '곡물가 상승',
    desc: '밀·옥수수 등 국제 곡물 가격이 오르는 시기',
    beneficiaries: {
      themes: ['식품·음료'],
      nameKeywords: ['농심', '대한제분', 'CJ제일제당', '동원F&B']
    },
    losers: {
      nameKeywords: ['하림', '마니커']
    },
    defaultActive: false
  },

  // ========== D. 국내 경제 (5) ==========
  {
    id: 'realestate_tight',
    category: 'domestic',
    level: 'danger',
    emoji: '🔴',
    name: '부동산 규제 강화',
    desc: '정부가 부동산 규제를 강화하는 시기',
    beneficiaries: {},
    losers: {
      themes: ['건설', '시멘트·건자재']
    },
    defaultActive: false
  },
  {
    id: 'realestate_boost',
    category: 'domestic',
    level: 'opportunity',
    emoji: '🟢',
    name: '부동산 부양',
    desc: '정부가 부동산 시장을 부양하는 시기',
    beneficiaries: {
      themes: ['건설', '시멘트·건자재'],
      nameKeywords: ['삼표시멘트', '한일시멘트', '아시아시멘트']
    },
    losers: {},
    defaultActive: false
  },
  {
    id: 'domestic_down',
    category: 'domestic',
    level: 'danger',
    emoji: '🔴',
    name: '내수 침체',
    desc: '국내 소비가 둔화되는 시기',
    beneficiaries: {},
    losers: {
      themes: ['유통', '식품·음료']
    },
    defaultActive: false
  },
  {
    id: 'domestic_up',
    category: 'domestic',
    level: 'opportunity',
    emoji: '🟢',
    name: '소비 회복',
    desc: '국내 소비가 회복되는 시기',
    beneficiaries: {
      themes: ['유통', '식품·음료', '화장품'],
      nameKeywords: ['호텔신라', 'CJ ENM']
    },
    losers: {},
    defaultActive: false
  },
  {
    id: 'export_boom',
    category: 'domestic',
    level: 'opportunity',
    emoji: '🟢',
    name: '수출 호조',
    desc: '한국 수출이 잘 되는 시기',
    beneficiaries: {
      themes: ['반도체', '2차전지', '전기차'],
      nameKeywords: ['현대차', '기아']
    },
    losers: {},
    defaultActive: false
  },

  // ========== E. 산업 테마 (5) ==========
  {
    id: 'ai_boom',
    category: 'theme',
    level: 'opportunity',
    emoji: '🟢',
    name: 'AI 붐',
    desc: 'AI 산업이 활황인 시기',
    beneficiaries: {
      themes: ['AI', '반도체'],
      nameKeywords: ['SK하이닉스', '한미반도체']
    },
    losers: {},
    defaultActive: true
  },
  {
    id: 'ev_boom',
    category: 'theme',
    level: 'opportunity',
    emoji: '🟢',
    name: '전기차·자율주행 붐',
    desc: '전기차 수요가 늘어나는 시기',
    beneficiaries: {
      themes: ['전기차', '2차전지']
    },
    losers: {},
    defaultActive: false
  },
  {
    id: 'bio_boom',
    category: 'theme',
    level: 'opportunity',
    emoji: '🟢',
    name: '바이오 호조',
    desc: '제약·바이오 업종이 활황인 시기',
    beneficiaries: {
      themes: ['바이오']
    },
    losers: {},
    defaultActive: false
  },
  {
    id: 'kcontent_boom',
    category: 'theme',
    level: 'opportunity',
    emoji: '🟢',
    name: 'K-컨텐츠 호조',
    desc: 'K-pop·K-드라마 등 한국 컨텐츠 인기 시기',
    beneficiaries: {
      themes: ['게임', '엔터·미디어'],
      nameKeywords: ['CJ ENM', '하이브', '스튜디오드래곤']
    },
    losers: {},
    defaultActive: false
  },
  {
    id: 'defense_boom',
    category: 'theme',
    level: 'opportunity',
    emoji: '🟢',
    name: '방산 수주 확대',
    desc: '한국 방산 수출이 활발한 시기',
    beneficiaries: {
      themes: ['방산']
    },
    losers: {},
    defaultActive: false
  },

  // ========== F. 시장 심리 (3) ==========
  {
    id: 'foreign_sell',
    category: 'sentiment',
    level: 'danger',
    emoji: '🔴',
    name: '외국인 매도 지속',
    desc: '외국인이 한국 주식을 많이 파는 시기',
    beneficiaries: {
      themes: ['전력·가스', '통신', '담배'],
      nameKeywords: ['KT&G', 'KT', 'SK텔레콤', '한국전력']
    },
    losers: {
      nameKeywords: ['삼성전자', 'SK하이닉스', '현대차', 'LG에너지솔루션', '카카오', '네이버']
    },
    defaultActive: false
  },
  {
    id: 'foreign_buy',
    category: 'sentiment',
    level: 'opportunity',
    emoji: '🟢',
    name: '외국인 매수 지속',
    desc: '외국인이 한국 주식을 많이 사는 시기',
    beneficiaries: {
      themes: ['반도체', 'AI'],
      nameKeywords: ['삼성전자', 'SK하이닉스']
    },
    losers: {},
    defaultActive: false
  },
  {
    id: 'kospi_crash',
    category: 'sentiment',
    level: 'danger',
    emoji: '🔴',
    name: '코스피 급락',
    desc: '전체 시장이 급격히 하락하는 시기',
    beneficiaries: {
      themes: ['전력·가스', '통신', '담배'],
      nameKeywords: ['KT&G']
    },
    losers: {
      themes: ['AI', '바이오']
    },
    defaultActive: false
  }
]
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`
Expected: 에러 없음

---

### Task 3: 팩터 데이터 유효성 테스트

**Files:**
- Create: `src/lib/macro/__tests__/factors.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// src/lib/macro/__tests__/factors.test.ts
import { describe, it, expect } from 'vitest'
import { macroFactors } from '../factors'

describe('macroFactors data', () => {
  it('has exactly 30 factors', () => {
    expect(macroFactors).toHaveLength(30)
  })

  it('all factor ids are unique', () => {
    const ids = macroFactors.map((f) => f.id)
    expect(new Set(ids).size).toBe(30)
  })

  it('all factors have valid category', () => {
    const valid = ['geopolitics', 'rates', 'commodity', 'domestic', 'theme', 'sentiment']
    for (const f of macroFactors) {
      expect(valid).toContain(f.category)
    }
  })

  it('all factors have valid level', () => {
    const valid = ['danger', 'caution', 'opportunity']
    for (const f of macroFactors) {
      expect(valid).toContain(f.level)
    }
  })

  it('each factor has at least one matching rule (benefit or loser)', () => {
    for (const f of macroFactors) {
      const benefitHas =
        (f.beneficiaries.themes?.length ?? 0) > 0 ||
        (f.beneficiaries.nameKeywords?.length ?? 0) > 0
      const loserHas =
        (f.losers.themes?.length ?? 0) > 0 ||
        (f.losers.nameKeywords?.length ?? 0) > 0
      expect(benefitHas || loserHas).toBe(true)
    }
  })

  it('category distribution matches spec (7+5+5+5+5+3)', () => {
    const count = (cat: string) => macroFactors.filter((f) => f.category === cat).length
    expect(count('geopolitics')).toBe(7)
    expect(count('rates')).toBe(5)
    expect(count('commodity')).toBe(5)
    expect(count('domestic')).toBe(5)
    expect(count('theme')).toBe(5)
    expect(count('sentiment')).toBe(3)
  })
})
```

- [ ] **Step 2: 테스트 실행**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx vitest run src/lib/macro/__tests__/factors.test.ts`
Expected: PASS (6 tests)

---

### Task 4: `matchesFactor()` 매칭 함수 + 테스트

**Files:**
- Create: `src/lib/macro/matching.ts`
- Create: `src/lib/macro/__tests__/matching.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// src/lib/macro/__tests__/matching.test.ts
import { describe, it, expect } from 'vitest'
import { matchesFactor } from '../matching'

describe('matchesFactor', () => {
  it('matches by theme when stock has the theme', () => {
    const result = matchesFactor('삼성전자', ['반도체'], { themes: ['반도체'] })
    expect(result).toBe(true)
  })

  it('does not match by theme when stock lacks the theme', () => {
    const result = matchesFactor('호텔신라', ['유통'], { themes: ['반도체'] })
    expect(result).toBe(false)
  })

  it('matches by nameKeyword partial', () => {
    const result = matchesFactor('삼성전자', [], { nameKeywords: ['삼성전자'] })
    expect(result).toBe(true)
  })

  it('does not match when neither themes nor nameKeywords match', () => {
    const result = matchesFactor('알 수 없는 종목', ['기타'], {
      themes: ['반도체'],
      nameKeywords: ['삼성']
    })
    expect(result).toBe(false)
  })

  it('matches with OR relation: theme hit is enough', () => {
    const result = matchesFactor('아무이름', ['방산'], {
      themes: ['방산'],
      nameKeywords: ['삼성']
    })
    expect(result).toBe(true)
  })

  it('returns false when factor has no matching rules', () => {
    const result = matchesFactor('삼성전자', ['반도체'], {})
    expect(result).toBe(false)
  })

  it('handles undefined themes array', () => {
    const result = matchesFactor('삼성전자', undefined, { nameKeywords: ['삼성'] })
    expect(result).toBe(true)
  })

  it('handles empty themes array', () => {
    const result = matchesFactor('삼성전자', [], { themes: ['반도체'] })
    expect(result).toBe(false)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx vitest run src/lib/macro/__tests__/matching.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 구현**

```typescript
// src/lib/macro/matching.ts
import type { FactorMatch } from './types'

export function matchesFactor(
  stockName: string,
  themes: string[] | undefined,
  m: FactorMatch
): boolean {
  if (m.themes && themes && themes.length > 0) {
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

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx vitest run src/lib/macro/__tests__/matching.test.ts`
Expected: PASS (8 tests)

---

### Task 5: `computeMacroBonus()` 스코어링 함수 + 테스트

**Files:**
- Create: `src/lib/macro/scoring.ts`
- Create: `src/lib/macro/__tests__/scoring.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// src/lib/macro/__tests__/scoring.test.ts
import { describe, it, expect } from 'vitest'
import { computeMacroBonus } from '../scoring'
import type { MacroFactor } from '../types'

function mkFactor(id: string, benefThemes: string[] = [], lossThemes: string[] = []): MacroFactor {
  return {
    id,
    category: 'theme',
    level: 'opportunity',
    emoji: '🟢',
    name: id,
    desc: '',
    beneficiaries: { themes: benefThemes },
    losers: { themes: lossThemes },
    defaultActive: false
  }
}

describe('computeMacroBonus', () => {
  it('returns 0 when no active factors', () => {
    const result = computeMacroBonus('삼성전자', ['반도체'], [])
    expect(result.total).toBe(0)
    expect(result.detail).toHaveLength(0)
  })

  it('adds +5 for benefit match', () => {
    const f = mkFactor('ai_boom', ['반도체'])
    const result = computeMacroBonus('삼성전자', ['반도체'], [f])
    expect(result.total).toBe(5)
    expect(result.detail).toHaveLength(1)
    expect(result.detail[0].role).toBe('benefit')
    expect(result.detail[0].delta).toBe(5)
  })

  it('subtracts 5 for loser match', () => {
    const f = mkFactor('domestic_down', [], ['유통'])
    const result = computeMacroBonus('호텔신라', ['유통'], [f])
    expect(result.total).toBe(-5)
    expect(result.detail[0].role).toBe('loss')
    expect(result.detail[0].delta).toBe(-5)
  })

  it('offsets to 0 when stock matches both benefit and loser of same factor', () => {
    const f = mkFactor('mixed', ['반도체'], ['반도체'])
    const result = computeMacroBonus('삼성전자', ['반도체'], [f])
    expect(result.total).toBe(0)
    expect(result.detail).toHaveLength(0) // delta 0 is not included
  })

  it('accumulates across multiple factors', () => {
    const f1 = mkFactor('ai', ['AI'])
    const f2 = mkFactor('semi', ['반도체'])
    const result = computeMacroBonus('삼성전자', ['AI', '반도체'], [f1, f2])
    expect(result.total).toBe(10)
    expect(result.detail).toHaveLength(2)
  })

  it('mixes benefit and loss from different factors', () => {
    const f1 = mkFactor('benefit', ['AI'])
    const f2 = mkFactor('loss', [], ['AI'])
    const result = computeMacroBonus('삼성전자', ['AI'], [f1, f2])
    expect(result.total).toBe(0)
    expect(result.detail).toHaveLength(2)
  })

  it('ignores factor when no match (benefit nor loss)', () => {
    const f = mkFactor('unrelated', ['방산'])
    const result = computeMacroBonus('삼성전자', ['반도체'], [f])
    expect(result.total).toBe(0)
    expect(result.detail).toHaveLength(0)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx vitest run src/lib/macro/__tests__/scoring.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 구현**

```typescript
// src/lib/macro/scoring.ts
import type { MacroFactor, MacroBonus, MacroBonusDetail } from './types'
import { matchesFactor } from './matching'

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
    if (matchesFactor(stockName, themes, f.beneficiaries)) {
      delta += BENEFIT_WEIGHT
    }
    if (matchesFactor(stockName, themes, f.losers)) {
      delta -= LOSS_WEIGHT
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

- [ ] **Step 4: 테스트 통과**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx vitest run src/lib/macro/__tests__/scoring.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Phase A 일괄 커밋**

```bash
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject add src/lib/macro/
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject commit -m "feat(macro): foundation — types, 30 factors, matching + scoring"
```

---

## Phase B — 환경 설정 페이지 (Tasks 6-10)

### Task 6: `useMacroFactors` 훅

**Files:**
- Create: `src/lib/macro/useMacroFactors.ts`

- [ ] **Step 1: 구현**

```typescript
// src/lib/macro/useMacroFactors.ts
'use client'
import { useCallback, useMemo } from 'react'
import { useLocalStore } from '@/lib/storage/useLocalStore'
import { macroFactors } from './factors'
import type { MacroFactor } from './types'

interface Store {
  activeIds: string[]
}

function initialStore(): Store {
  return {
    activeIds: macroFactors.filter((f) => f.defaultActive).map((f) => f.id)
  }
}

export function useMacroFactors(userId: string = 'anon'): {
  all: MacroFactor[]
  activeIds: string[]
  activeFactors: MacroFactor[]
  toggle: (id: string) => void
  clearAll: () => void
  isActive: (id: string) => boolean
} {
  const [store, setStore] = useLocalStore<Store>(
    `ws:macroFactors:${userId}`,
    initialStore()
  )

  const activeFactors = useMemo(
    () => macroFactors.filter((f) => store.activeIds.includes(f.id)),
    [store.activeIds]
  )

  const toggle = useCallback(
    (id: string) => {
      setStore((prev) => {
        const isActive = prev.activeIds.includes(id)
        return {
          activeIds: isActive
            ? prev.activeIds.filter((x) => x !== id)
            : [...prev.activeIds, id]
        }
      })
    },
    [setStore]
  )

  const clearAll = useCallback(() => {
    setStore({ activeIds: [] })
  }, [setStore])

  const isActive = useCallback(
    (id: string) => store.activeIds.includes(id),
    [store.activeIds]
  )

  return {
    all: macroFactors,
    activeIds: store.activeIds,
    activeFactors,
    toggle,
    clearAll,
    isActive
  }
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`
Expected: 에러 없음

---

### Task 7: ko.ts 문자열 추가

**Files:**
- Modify: `src/lib/strings/ko.ts` — `environment`, `macro` 섹션 추가

- [ ] **Step 1: 추가**

`ko.ts`의 `dataIO` 섹션 아래에 다음을 추가:

```typescript
  environment: {
    pageTitle: '🌍 시장 환경',
    linkLabel: '시장 환경',
    subtitle: '현재 상황에 맞는 팩터를 켜두면 추천 점수에 반영돼요',
    activeCount: (n: number, total: number) => `현재 활성: ${n} / ${total}개`,
    clearAll: '모두 끄기',
    presetSoon: '추천 세팅 (준비 중)',
    categoryTitle: {
      geopolitics: 'A. 지정학',
      rates: 'B. 금리·환율',
      commodity: 'C. 원자재·에너지',
      domestic: 'D. 국내 경제',
      theme: 'E. 산업 테마',
      sentiment: 'F. 시장 심리'
    },
    categoryCount: (active: number, total: number) => `(${active} / ${total})`,
    beneficiaryLabel: '👍 수혜',
    loserLabel: '👎 피해',
    guideStep1Title: '🌍 시장 환경이란?',
    guideStep1Body: '"지금 세계에서 벌어지는 일"에 따라 유리한 종목이 달라져요.',
    guideStep2Title: '사용 방법',
    guideStep2Body: '현재 상황에 맞는 팩터를 켜두면 추천 점수에 반영돼요.',
    guideStep3Title: '팁',
    guideStep3Body: '너무 많이 켜면 효과가 흐려져요. 정말 중요한 것 3~5개만 켜두세요.'
  },
  macro: {
    badgeLabel: (total: number) => `🌍 환경 ${total > 0 ? '+' : ''}${total}`,
    noActive: '활성 팩터가 없어요',
    detailTitle: '🌍 현재 환경에서의 위치',
    matchSummary: (matched: number, total: number) =>
      `활성 팩터 ${total}개 중 ${matched}개 매칭`,
    roleBenefit: '(수혜)',
    roleLoss: '(피해)',
    totalLine: '합계',
    goToSettings: '🌍 시장 환경 설정 바로가기 →'
  },
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`
Expected: 에러 없음

---

### Task 8: `FactorCard` 컴포넌트

**Files:**
- Create: `src/app/[basePath]/environment/FactorCard.tsx`

- [ ] **Step 1: 구현**

```typescript
// src/app/[basePath]/environment/FactorCard.tsx
'use client'
import { strings } from '@/lib/strings/ko'
import type { MacroFactor } from '@/lib/macro/types'

interface Props {
  factor: MacroFactor
  active: boolean
  onToggle: () => void
}

function formatMatch(m: { themes?: string[]; nameKeywords?: string[] }): string {
  const parts: string[] = []
  if (m.themes && m.themes.length > 0) parts.push(...m.themes)
  if (m.nameKeywords && m.nameKeywords.length > 0) parts.push(...m.nameKeywords)
  return parts.join(', ')
}

export default function FactorCard({ factor, active, onToggle }: Props) {
  const benefits = formatMatch(factor.beneficiaries)
  const losers = formatMatch(factor.losers)

  return (
    <label
      className={`block p-4 rounded-2xl cursor-pointer ${
        active
          ? 'bg-accent-light/10 dark:bg-accent-dark/20 ring-2 ring-accent-light dark:ring-accent-dark'
          : 'bg-bg-secondary-light dark:bg-bg-secondary-dark'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={active}
          onChange={onToggle}
          className="mt-1"
        />
        <div className="flex-1">
          <div className="font-bold mb-1">
            {factor.emoji} {factor.name}
          </div>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-2">
            {factor.desc}
          </p>
          {benefits && (
            <p className="text-sm">
              <span className="text-emerald-600">{strings.environment.beneficiaryLabel}</span>:{' '}
              {benefits}
            </p>
          )}
          {losers && (
            <p className="text-sm">
              <span className="text-red-600">{strings.environment.loserLabel}</span>:{' '}
              {losers}
            </p>
          )}
        </div>
      </div>
    </label>
  )
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`
Expected: 에러 없음

---

### Task 9: `EnvironmentView` 메인 뷰

**Files:**
- Create: `src/app/[basePath]/environment/EnvironmentView.tsx`

- [ ] **Step 1: 구현**

```typescript
// src/app/[basePath]/environment/EnvironmentView.tsx
'use client'
import { useEffect, useState } from 'react'
import { useMacroFactors } from '@/lib/macro/useMacroFactors'
import { useFirstVisit } from '@/lib/storage/useFirstVisit'
import FirstVisitGuide from '@/components/common/FirstVisitGuide'
import FactorCard from './FactorCard'
import { strings } from '@/lib/strings/ko'
import type { FactorCategory, MacroFactor } from '@/lib/macro/types'

const CATEGORY_ORDER: FactorCategory[] = [
  'geopolitics',
  'rates',
  'commodity',
  'domestic',
  'theme',
  'sentiment'
]

export default function EnvironmentView() {
  const { all, activeIds, toggle, clearAll, isActive } = useMacroFactors()
  const [firstVisit, markVisited] = useFirstVisit('environment')
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    if (firstVisit) setShowGuide(true)
  }, [firstVisit])

  function factorsByCategory(cat: FactorCategory): MacroFactor[] {
    return all.filter((f) => f.category === cat)
  }

  return (
    <>
      <h1 className="text-xl font-bold mb-2">{strings.environment.pageTitle}</h1>
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
        {strings.environment.subtitle}
      </p>

      <div className="mb-6 p-4 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark flex items-center justify-between flex-wrap gap-2">
        <span className="font-bold">
          {strings.environment.activeCount(activeIds.length, all.length)}
        </span>
        <button
          type="button"
          onClick={clearAll}
          className="px-3 py-1 rounded-full bg-bg-primary-light dark:bg-bg-primary-dark text-sm"
        >
          {strings.environment.clearAll}
        </button>
      </div>

      {CATEGORY_ORDER.map((cat) => {
        const list = factorsByCategory(cat)
        const activeN = list.filter((f) => isActive(f.id)).length
        return (
          <section key={cat} className="mb-8">
            <h2 className="font-bold mb-3 text-lg">
              {strings.environment.categoryTitle[cat]}{' '}
              <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                {strings.environment.categoryCount(activeN, list.length)}
              </span>
            </h2>
            <div className="space-y-2">
              {list.map((f) => (
                <FactorCard
                  key={f.id}
                  factor={f}
                  active={isActive(f.id)}
                  onToggle={() => toggle(f.id)}
                />
              ))}
            </div>
          </section>
        )
      })}

      {showGuide && (
        <FirstVisitGuide
          steps={[
            {
              title: strings.environment.guideStep1Title,
              body: strings.environment.guideStep1Body
            },
            {
              title: strings.environment.guideStep2Title,
              body: strings.environment.guideStep2Body
            },
            {
              title: strings.environment.guideStep3Title,
              body: strings.environment.guideStep3Body
            }
          ]}
          onDismiss={(persist) => {
            setShowGuide(false)
            if (persist) markVisited()
          }}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`
Expected: 에러 없음

---

### Task 10: page.tsx + SideNav 링크

**Files:**
- Create: `src/app/[basePath]/environment/page.tsx`
- Modify: `src/components/layout/SideNav.tsx` — 🌍 링크 추가

- [ ] **Step 1: page.tsx 생성**

```typescript
// src/app/[basePath]/environment/page.tsx
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import EnvironmentView from './EnvironmentView'

export default function EnvironmentPage() {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[60vh]">
        <EnvironmentView />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: SideNav에 🌍 링크 추가**

`src/components/layout/SideNav.tsx`에서 `💡 구매 추천 일괄` 아래, `🌱 입문 추천 종목` 위에 삽입 — **아니, 실제 위치는** `🌱 입문 추천 종목` 아래, `⭐ 관심 종목` 위에 배치:

```tsx
<Link href={`/${basePath}/beginner`} onClick={() => setOpen(false)} className={linkClass(!!isActive('/beginner'))}>
  🌱 <span>{strings.beginner.linkLabel}</span>
</Link>
<Link href={`/${basePath}/environment`} onClick={() => setOpen(false)} className={linkClass(!!isActive('/environment'))}>
  🌍 <span>{strings.environment.linkLabel}</span>
</Link>
<Link href={`/${basePath}/watchlist`} onClick={() => setOpen(false)} className={linkClass(!!isActive('/watchlist'))}>
  ⭐ <span>{strings.watchlist.linkLabel}</span>
</Link>
```

- [ ] **Step 3: 빌드 + 수동 검증**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`
Expected: 에러 없음

수동: `npm run dev` → `/<basePath>/environment` 접속 → 30개 팩터 표시 / 토글 동작 / 첫 방문 가이드.

- [ ] **Step 4: Phase B 일괄 커밋**

```bash
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject add src/lib/macro/useMacroFactors.ts src/lib/strings/ko.ts src/app/\[basePath\]/environment/ src/components/layout/SideNav.tsx
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject commit -m "feat(macro): environment page with 30 factors toggle + sidenav"
```

---

## Phase C — 결과 통합 (Tasks 11-15)

### Task 11: `MacroBadge` 컴포넌트

**Files:**
- Create: `src/components/macro/MacroBadge.tsx`

- [ ] **Step 1: 구현**

```typescript
// src/components/macro/MacroBadge.tsx
'use client'
import { strings } from '@/lib/strings/ko'
import type { MacroBonus } from '@/lib/macro/types'

interface Props {
  bonus: MacroBonus
  showZero?: boolean
}

export default function MacroBadge({ bonus, showZero = false }: Props) {
  if (bonus.total === 0 && !showZero) return null

  const color =
    bonus.total > 0
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
      : bonus.total < 0
      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
      : 'bg-bg-secondary-light dark:bg-bg-secondary-dark text-text-secondary-light dark:text-text-secondary-dark'

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${color}`}>
      {strings.macro.badgeLabel(bonus.total)}
    </span>
  )
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`
Expected: 에러 없음

---

### Task 12: `MacroDetailPanel` 컴포넌트 (종목 상세)

**Files:**
- Create: `src/components/macro/MacroDetailPanel.tsx`

- [ ] **Step 1: 구현**

```typescript
// src/components/macro/MacroDetailPanel.tsx
'use client'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import { useMacroFactors } from '@/lib/macro/useMacroFactors'
import { computeMacroBonus } from '@/lib/macro/scoring'
import { strings } from '@/lib/strings/ko'

interface Props {
  stockName: string
  themes: string[] | undefined
  basePath: string
}

export default function MacroDetailPanel({ stockName, themes, basePath }: Props) {
  const { activeFactors } = useMacroFactors()

  if (activeFactors.length === 0) return null

  const bonus = computeMacroBonus(stockName, themes, activeFactors)

  return (
    <Card padding="lg" className="mt-6">
      <h3 className="font-bold text-xl mb-3">{strings.macro.detailTitle}</h3>
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
        {strings.macro.matchSummary(bonus.detail.length, activeFactors.length)}
      </p>

      {bonus.detail.length > 0 ? (
        <div className="space-y-2">
          {bonus.detail.map((d) => (
            <div
              key={d.factorId}
              className="flex items-center justify-between p-2 rounded-lg bg-bg-secondary-light dark:bg-bg-secondary-dark"
            >
              <span className="text-sm">
                {d.role === 'benefit' ? '🟢' : '🔴'} {d.factorName}
              </span>
              <span className={`font-bold ${d.delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {d.delta > 0 ? '+' : ''}
                {d.delta} {d.role === 'benefit' ? strings.macro.roleBenefit : strings.macro.roleLoss}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-light dark:border-border-dark">
            <span className="font-bold">{strings.macro.totalLine}</span>
            <span
              className={`font-bold text-lg ${
                bonus.total > 0 ? 'text-emerald-600' : bonus.total < 0 ? 'text-red-600' : ''
              }`}
            >
              {bonus.total > 0 ? '+' : ''}
              {bonus.total}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          매칭된 팩터가 없어요
        </p>
      )}

      <Link
        href={`/${basePath}/environment`}
        className="inline-block mt-4 text-sm underline"
      >
        {strings.macro.goToSettings}
      </Link>
    </Card>
  )
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`
Expected: 에러 없음

---

### Task 13: StockDetail에 MacroDetailPanel 통합

**Files:**
- Modify: `src/app/[basePath]/stock/[code]/StockDetail.tsx`

- [ ] **Step 1: import 추가**

기존 imports 블록에 추가:
```typescript
import MacroDetailPanel from '@/components/macro/MacroDetailPanel'
import { loadSectors } from '@/lib/dataLoader'
import type { SectorsJson } from '@/lib/types/indicators'
```

- [ ] **Step 2: sectors 로드 state 추가**

기존 state 선언부에 추가:
```typescript
const [sectors, setSectors] = useState<SectorsJson | null>(null)
```

기존 `useEffect` (데이터 로드) 안의 Promise.all에 `loadSectors(u.trade_date)` 추가:
예를 들어 기존:
```typescript
const [ind, fund, ...] = await Promise.all([
  loadIndicators(u.trade_date),
  loadFundamentals(u.trade_date),
  // ... 기존 호출
])
```
이 뒤에 `loadSectors(u.trade_date)` 추가하여 `setSectors` 호출.

- [ ] **Step 3: 렌더에 패널 삽입**

기존 `<BowlVolumePanel ... />` 아래에 추가:
```tsx
<MacroDetailPanel
  stockName={stock.name}
  themes={sectors?.[code]?.themes}
  basePath={basePath}
/>
```

- [ ] **Step 4: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`
Expected: 에러 없음

---

### Task 14: `filter.ts`에 매크로 주입

**Files:**
- Modify: `src/lib/filter.ts`

- [ ] **Step 1: FilterResult 확장 + enrichWithMacro 추가**

기존 `FilterResult`에 `macroBonus?: MacroBonus` `finalScore?: number` 추가.

전체 교체:
```typescript
// src/lib/filter.ts
import type { Preset, PresetParams } from './presets/types'
import type { IndicatorsJson, FundamentalsJson, SectorsJson, StockIndicators } from '@/lib/types/indicators'
import type { MacroFactor, MacroBonus } from './macro/types'
import { computeMacroBonus } from './macro/scoring'

export interface FilterResult {
  code: string
  name: string
  market: string
  price: number | null
  volume: number | null
  rsi: number | null
  score: number
  macroBonus?: MacroBonus
  finalScore?: number
}

const MAX_RESULTS = 100

export function runPreset(
  preset: Preset,
  indicators: IndicatorsJson | null | undefined,
  fundamentals: FundamentalsJson | null | undefined,
  params: PresetParams
): FilterResult[] {
  if (!indicators || typeof indicators !== 'object') return []
  const fundMap = fundamentals && typeof fundamentals === 'object' ? fundamentals : {}
  const results: FilterResult[] = []

  for (const [code, value] of Object.entries(indicators)) {
    if (code === 'meta') continue
    const stock = value as StockIndicators
    if (!stock || typeof stock !== 'object' || !Array.isArray(stock.close)) continue
    const fundamental = fundMap[code]
    try {
      if (!preset.filter({ stock, fundamental, params })) continue
      const score = preset.sortScore
        ? preset.sortScore({ stock, fundamental, params })
        : 0
      results.push({
        code,
        name: stock.name,
        market: stock.market,
        price: stock.close.at(-1) ?? null,
        volume: stock.volume.at(-1) ?? null,
        rsi: stock.rsi14.at(-1) ?? null,
        score
      })
    } catch {
      // skip
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, MAX_RESULTS)
}

export function enrichWithMacro(
  results: FilterResult[],
  sectors: SectorsJson | null | undefined,
  activeFactors: MacroFactor[]
): FilterResult[] {
  if (activeFactors.length === 0) return results
  const enriched = results.map((r) => {
    const themes = sectors?.[r.code]?.themes
    const bonus = computeMacroBonus(r.name, themes, activeFactors)
    return {
      ...r,
      macroBonus: bonus,
      finalScore: r.score + bonus.total
    }
  })
  enriched.sort((a, b) => (b.finalScore ?? b.score) - (a.finalScore ?? a.score))
  return enriched
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`
Expected: 에러 없음 (기존 호출처들은 영향 없음 — 새 함수는 opt-in)

---

### Task 15: Recommendations / Screener에 MacroBadge 통합

**Files:**
- Modify: `src/app/[basePath]/recommendations/RecommendationsList.tsx`
- Modify: `src/app/[basePath]/screener/ExpertScreener.tsx`
- Modify: `src/components/screener/ResultTable.tsx`
- Modify: `src/components/screener/StockCardWithPrediction.tsx` (있다면)

#### Part A: RecommendationsList

- [ ] **Step 1: imports 추가**

```typescript
import { useMacroFactors } from '@/lib/macro/useMacroFactors'
import { enrichWithMacro } from '@/lib/filter'
import { loadSectors } from '@/lib/dataLoader'
import MacroBadge from '@/components/macro/MacroBadge'
import type { SectorsJson } from '@/lib/types/indicators'
```

- [ ] **Step 2: sectors state + load + enrich**

기존 state에 `const [sectors, setSectors] = useState<SectorsJson | null>(null)` 추가.

기존 data load useEffect의 Promise.all에 `loadSectors(u.trade_date)` 추가 후 setSectors 호출.

`activeFactors`를 훅으로 가져옴:
```typescript
const { activeFactors } = useMacroFactors()
```

`runPreset` 결과를 `enrichWithMacro(results, sectors, activeFactors)`로 감싸서 저장.

- [ ] **Step 3: 렌더에 MacroBadge 추가**

종목 행 표시부에 (기존 가격·등락률 옆):
```tsx
{item.macroBonus && <MacroBadge bonus={item.macroBonus} />}
```

#### Part B: ExpertScreener + ResultTable

- [ ] **Step 4: ExpertScreener도 동일 적용**

ExpertScreener.tsx의 데이터 로드·결과 가공 부분에 Part A와 같은 패턴 적용.

ResultTable이 FilterResult를 받아 렌더한다면 컬럼 하나 추가해 MacroBadge 렌더.

- [ ] **Step 5: 빌드 + 수동 검증**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`
Expected: 에러 없음

수동: `/environment` 몇 개 켜기 → 추천 일괄 / 검색기 → 🌍 뱃지 표시 + 정렬 반영.

- [ ] **Step 6: Phase C 일괄 커밋**

```bash
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject add src/components/macro/ src/app/\[basePath\]/stock/\[code\]/StockDetail.tsx src/lib/filter.ts src/app/\[basePath\]/recommendations/RecommendationsList.tsx src/app/\[basePath\]/screener/ExpertScreener.tsx src/components/screener/ResultTable.tsx
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject commit -m "feat(macro): integrate macro badge & detail panel into recommendations/screener/stock detail"
```

---

## Phase D — 데이터 파이프라인 확장 (Task 16)

### Task 16: `fetch_sectors.py` 테마 14개 확장

**Files:**
- Modify: `scripts/fetch_sectors.py`

- [ ] **Step 1: THEME_KEYWORDS 확장**

`THEME_KEYWORDS` 딕셔너리에 다음 14개 추가:

```python
THEME_KEYWORDS = {
    '반도체': ['반도체', '메모리', '파운드리', '하이닉스', '삼성전자', 'DB하이텍', '디스플레이'],
    '2차전지': ['배터리', '2차전지', '양극재', '음극재', '에코프로', 'LG에너지', 'SK이노베이션', '포스코퓨처엠', 'LG화학', 'SK온'],
    'AI': ['AI', '인공지능', '클라우드', 'NAVER', '카카오', '소프트웨어', '플랫폼'],
    '전기차': ['전기차', '자동차', 'EV', '현대차', '기아', '모비스'],
    '보안': ['보안', '안랩', '시큐', '사이버'],
    '바이오': ['바이오', '제약', '셀트리온', '삼성바이오', '유한양행'],
    '게임': ['게임', '엔씨', '넥슨', '크래프톤', '네오위즈', '펄어비스'],
    '금융': ['금융', '은행', '증권', '카드', '보험'],
    # === Phase 13 신규 ===
    '방산': ['방산', '한화에어로스페이스', 'LIG넥스원', '한국항공우주', '현대로템', '풍산', '빅텍', '스페코'],
    '건설': ['건설', '삼성물산', '현대건설', '대우건설', 'GS건설', 'DL이앤씨', 'HDC현대산업'],
    '정유·에너지': ['S-Oil', 'SK이노베이션', 'GS', '한국가스공사', '한국전력', 'E1', '정유', '석유'],
    '항공·여행': ['대한항공', '아시아나', '제주항공', '티웨이', '진에어', '하나투어', '노랑풍선', '모두투어', '호텔신라'],
    '해운·물류': ['HMM', '팬오션', 'CJ대한통운', '한진', '세방', '현대글로비스'],
    '유통': ['이마트', '롯데쇼핑', 'BGF리테일', 'GS리테일', '현대백화점', '신세계', '편의점'],
    '시멘트·건자재': ['삼표시멘트', '한일시멘트', '아시아시멘트', 'KCC', '쌍용양회', '동양'],
    '식품·음료': ['농심', '롯데칠성', 'CJ제일제당', '오뚜기', '대한제분', '동원F&B', '삼양', '오리온', '하림', '마니커'],
    '통신': ['SK텔레콤', 'KT', 'LG유플러스', 'LG헬로비전'],
    '전력·가스': ['한국전력', '한국가스공사', '삼천리', '경동도시가스', '지역난방공사'],
    '엔터·미디어': ['CJ ENM', '하이브', '스튜디오드래곤', 'JYP', 'SM', 'YG', '에스엠', '빅히트', '와이지'],
    '화장품': ['LG생활건강', '아모레퍼시픽', '코스맥스', '클리오', '한국콜마', '토니모리'],
    '담배': ['KT&G'],
    '철강·비철금속': ['POSCO', '현대제철', '고려아연', '풍산', '세아', '동국제강']
}
```

- [ ] **Step 2: 로컬 문법 체크**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && python -c "import ast; ast.parse(open('scripts/fetch_sectors.py', encoding='utf-8').read()); print('OK')"`
Expected: `OK` 출력

- [ ] **Step 3: 커밋**

```bash
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject add scripts/fetch_sectors.py
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject commit -m "feat(macro): expand THEME_KEYWORDS with 14 new sectors for macro factors"
```

---

## Phase E — 검증 & PR (Tasks 17-18)

### Task 17: 전체 E2E 검증

**Files:** (변경 없음, QA만)

- [ ] **Step 1: 전체 테스트 실행**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx vitest run`
Expected: 기존 128 + 신규 매크로 (~21) = ~149개 모두 PASS

- [ ] **Step 2: 빌드**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npm run build`
Expected: 성공 + `/environment` 라우트 생성됨

- [ ] **Step 3: 수동 QA 체크리스트**

- [ ] `/environment` 페이지 접속 → 30개 팩터 6개 카테고리로 표시
- [ ] 각 팩터 토글 → 상단 카운트 반영 + localStorage 저장
- [ ] "모두 끄기" 동작
- [ ] 새로고침 후 토글 상태 유지
- [ ] 첫 방문 가이드 3스텝 → "다시 보지 않기" 동작
- [ ] SideNav에 🌍 링크 표시·이동
- [ ] 팩터 몇 개 켠 뒤 `/recommendations` → 🌍 뱃지 표시 + 정렬 변화
- [ ] 검색기 결과 동일 동작
- [ ] 종목 상세 → MacroDetailPanel → 매칭 상세 정확
- [ ] 활성 팩터 0개 → 뱃지·패널 숨김
- [ ] 다크 모드
- [ ] 모바일 (375px) 레이아웃

- [ ] **Step 4: 발견된 이슈 수정 (있으면 별도 commit)**

---

### Task 18: PR 생성

**Files:** (변경 없음)

- [ ] **Step 1: 푸시**

```bash
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject push -u origin feature/phase-13-macro-factors
```

- [ ] **Step 2: PR 생성 (gh 없으면 웹에서)**

`gh` CLI 없으면 다음 URL 열어서 수동 생성:
`https://github.com/pkh8184/MoneyProject/pull/new/feature/phase-13-macro-factors`

**PR 제목**: `Phase 13: 환경 팩터(매크로) 가산 시스템 — 30 factors`

**본문**:
```markdown
## Summary

30개 매크로 환경 팩터(전쟁·금리·유가·환율 등) 기반 종목 점수 ±가산 시스템.

### 신규
- `/environment` 페이지 — 30개 팩터 on/off (6개 카테고리)
- `MacroBadge` — 추천·검색기 결과에 🌍 뱃지
- `MacroDetailPanel` — 종목 상세에 매칭 내역 표시
- `fetch_sectors.py` THEME_KEYWORDS 8 → 22개 확장

### 가중치
- 수혜 +5 / 피해 -5
- 활성 팩터 5개 모두 매칭 시 최대 ±25점

### 머지 후 필수 작업
- **Daily Stock Data Update 워크플로 수동 실행** (신규 테마 태그 계산)

## Test plan

- [x] ~21 신규 vitest 통과
- [x] 전체 ~149 tests 통과
- [x] tsc clean
- [x] production build 성공
- [ ] 수동 QA (/environment / 뱃지 / 상세 패널)
```

---

## Self-Review Checklist (작성자 확인)

**Spec coverage**:
- ✅ 30개 팩터 → Task 2
- ✅ 데이터 모델 (types) → Task 1
- ✅ 매칭 → Task 4
- ✅ 스코어링 → Task 5
- ✅ useMacroFactors 훅 → Task 6
- ✅ 환경 페이지 UI → Tasks 8-10
- ✅ ko.ts 문자열 → Task 7
- ✅ SideNav 🌍 링크 → Task 10
- ✅ MacroBadge / MacroDetailPanel → Tasks 11-12
- ✅ StockDetail 통합 → Task 13
- ✅ filter.ts 매크로 주입 → Task 14
- ✅ Recommendations·Screener 통합 → Task 15
- ✅ 테마 확장 → Task 16
- ✅ QA + PR → Tasks 17-18

**Placeholder scan**: 없음. 모든 코드 블록 완전.

**Type consistency**:
- `MacroFactor`, `FactorMatch`, `MacroBonus`, `MacroBonusDetail` 시그니처 일관성 OK
- `useMacroFactors` 리턴 타입에 `activeFactors`가 있어서 Task 12·13·14 통합 시 재사용
- `FilterResult`에 `macroBonus?`, `finalScore?` 옵셔널 추가 → 기존 호출처 영향 없음

**알려진 의존**:
- Task 15의 `StockCardWithPrediction.tsx`는 프로젝트 구조에 따라 존재 여부 다를 수 있음 — 실제 import 체인 파악 후 적절히 적용 (필요 시 스킵)
