# Phase 9 — 프리셋 카테고리화 + 네비게이션 재배치 Implementation Plan

**Goal:** 13개 프리셋을 **6개 대분류 카테고리**로 묶어 사이드바를 재구성하고, 전체 네비게이션을 좌측 접이식 패널로 이동하여 검색기 공간을 넓힌다.

**Branch:** `feature/phase-9-preset-categorization`

---

## 📋 현재 문제 & 개선 방향

### 문제 1: 네비게이션 위치
- 현재: 우상단 `[전략 선택] [전체 종목]`
- 문제:
  - "전략 선택"이 혼란스러움 (실제로는 검색기 페이지로 가는 링크인데 "선택"이라는 단어 때문에 드롭다운처럼 보임)
  - 모드 토글·테마 토글·로그아웃 옆에 있어서 시각적 혼잡

### 문제 2: 13개 프리셋이 평면 리스트
- 대분류 없이 나열 → 초보자가 성격을 파악하기 어려움
- 각 프리셋의 핵심 공식(한 줄 요약)이 없음 → 이름만 봐서는 뭐 하는지 감 안 옴
- Beta·⭐ 표시가 이름 안에 섞여 있어 시인성 낮음

---

## 🎨 설계안

### ① 네비게이션 재배치

**변경 전:**
```
[로고]  [갱신시각]             [전략][종목]  [초보/전문가]  [☀/🌙]  [로그아웃]
```

**변경 후:**
```
[≡] [로고]  [갱신시각]                        [초보/전문가]  [☀/🌙]  [로그아웃]
 ↑ 햄버거 버튼 클릭 → 좌측 슬라이드 패널
```

**좌측 패널 내용 (햄버거 클릭 시 표시):**
```
┌─────────────────────┐
│ Money Screener      │
│                     │
│ 📊 전략 검색기       │ ← 현재 /screener
│ 📋 전체 종목         │ ← /stocks
│                     │
│ ─────────           │
│                     │
│ 설정                 │
│ (향후 확장 자리)     │
└─────────────────────┘
```
- 바깥 클릭 또는 ESC로 닫힘
- 현재 활성 페이지 강조

**파일 변경**:
- `HeaderNav.tsx` → `SideNav.tsx` (좌측 드로어로 재작성)
- `Header.tsx` 왼쪽 끝에 햄버거 버튼 배치

### ② 프리셋 6개 대분류

| 카테고리 | 프리셋 (현재 13개) | 요약 |
|---|---|---|
| 📈 **추세·이동평균** | 골든크로스, 정배열, 60일선 상승 전환 | MA 기반 추세 포착 |
| 🔺 **돌파·패턴** | 52주 신고가, 볼린저 하단 복귀, 🍚 밥그릇 (Beta) | 가격 패턴 기반 |
| 📊 **거래량·수급** | 거래량 급증, 외국인·기관 동반 순매수 | 자금 유입 감지 |
| 🎯 **기술 지표** | RSI 과매도 반등, MACD 골든크로스 | 오실레이터 기반 |
| 💰 **가치·펀더멘털** | PBR 저평가 | 재무 기반 |
| ⭐ **조합 전략** | 중장기 황금 조합, 저평가 반등 | 복합 조건 |

**타입 확장** (`src/lib/types/presets.ts`):
```typescript
export type PresetCategory =
  | 'trend_ma'        // 추세·이동평균
  | 'pattern'         // 돌파·패턴
  | 'volume_flow'     // 거래량·수급
  | 'indicator'       // 기술 지표
  | 'value'           // 가치·펀더멘털
  | 'combo'           // 조합

export interface PresetMeta {
  // ... 기존 필드
  category: PresetCategory
  shortFormula: string  // 한 줄 요약 (예: "MA20 > MA60 신규 돌파")
}
```

각 프리셋 파일에 `category`, `shortFormula` 추가.

### ③ 카테고리 사이드바 (PresetSidebar 재설계)

```
┌──────────────────────────────────────┐
│                                      │
│  📈 추세·이동평균                    │
│  ┌──────────────────────────────┐   │
│  │ ● 골든크로스                  │ⓘ │
│  │   MA20 > MA60 신규 돌파       │  │
│  ├──────────────────────────────┤   │
│  │ ○ 정배열 확정                 │ⓘ │
│  │   MA5 > MA20 > MA60 > MA120  │  │
│  ├──────────────────────────────┤   │
│  │ ○ 60일선 상승 전환            │ⓘ │
│  │   MA60 기울기 음→양           │  │
│  └──────────────────────────────┘   │
│                                      │
│  🔺 돌파·패턴                        │
│  ┌──────────────────────────────┐   │
│  │ ○ 52주 신고가 돌파     [param]│ⓘ │
│  │   C ≥ 52주 최고 × N%         │  │
│  ├──────────────────────────────┤   │
│  │ ○ 볼린저밴드 하단 복귀        │ⓘ │
│  │   하단 이탈 → 재진입           │  │
│  ├──────────────────────────────┤   │
│  │ ○ 🍚 밥그릇 패턴    [BETA]   │ⓘ │
│  │   MA224 저점 + 반등           │  │
│  └──────────────────────────────┘   │
│                                      │
│  📊 거래량·수급                      │
│  ...                                 │
│                                      │
│  ⭐ 조합 전략                        │
│  ...                                 │
└──────────────────────────────────────┘
```

**각 아이템에 표시할 정보**:
- 라디오 스타일 선택 표시 (● / ○)
- 이름 (Beta·⭐ 배지는 별도 span으로 분리)
- 한 줄 공식 (`shortFormula`) — 회색 작은 글씨
- `ⓘ` 정보 버튼
- 파라미터 있는 프리셋엔 `[param]` 배지 (슬라이더 있음 표시)

**접기/펼치기 (모바일 대응)**:
- 데스크톱: 모든 카테고리 펼침 (~700px 스크롤)
- 모바일(<768px): 각 카테고리 클릭 시 토글 (기본 접힘)

### ④ 카테고리 유틸 (`src/lib/presets/categories.ts`)

```typescript
import type { Preset } from './types'
import type { PresetCategory } from '@/lib/types/presets'

export const CATEGORY_META: Record<PresetCategory, { label: string; icon: string; order: number }> = {
  trend_ma:    { label: '추세·이동평균',   icon: '📈', order: 1 },
  pattern:     { label: '돌파·패턴',       icon: '🔺', order: 2 },
  volume_flow: { label: '거래량·수급',     icon: '📊', order: 3 },
  indicator:   { label: '기술 지표',       icon: '🎯', order: 4 },
  value:       { label: '가치·펀더멘털',   icon: '💰', order: 5 },
  combo:       { label: '조합 전략',       icon: '⭐', order: 6 }
}

export function groupByCategory(presets: Preset[]): Array<{ category: PresetCategory; items: Preset[] }> {
  const map = new Map<PresetCategory, Preset[]>()
  for (const p of presets) {
    const list = map.get(p.category) ?? []
    list.push(p)
    map.set(p.category, list)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => CATEGORY_META[a].order - CATEGORY_META[b].order)
    .map(([category, items]) => ({ category, items }))
}
```

---

## 📂 File Structure

### 수정
- `src/lib/types/presets.ts` — `PresetCategory`, `shortFormula` 추가
- `src/lib/presets/*.ts` (13개) — 각 preset에 `category`, `shortFormula` 추가
- `src/components/screener/PresetSidebar.tsx` — 카테고리 그룹 + 상세 아이템 표시
- `src/components/layout/Header.tsx` — 왼쪽 끝에 햄버거 버튼, HeaderNav 제거
- `src/components/layout/HeaderNav.tsx` → **삭제**

### 생성
- `src/components/layout/SideNav.tsx` — 좌측 드로어 네비게이션
- `src/lib/presets/categories.ts` — 카테고리 유틸
- `src/lib/presets/__tests__/categories.test.ts` — 그룹화 로직 TDD
- `src/components/screener/PresetItemRow.tsx` — 사이드바 개별 아이템 (재사용)

### Workprogress
- `Workprogress/Phase_9_2026-04-15.md`

---

## 🧩 Task 목록

### Task 1: PresetCategory 타입 + categories.ts 유틸 (TDD)
- `types/presets.ts` 확장
- `categories.ts` + 테스트 3개 (순서, 그룹화, 빈 입력)
- 커밋: `feat(phase-9): add PresetCategory type and grouping util`

### Task 2: 기존 13개 프리셋에 category + shortFormula 추가 + 신규 7개 프리셋 추가

**신규 7개 프리셋**:

| # | ID | 이름 | 카테고리 | 조건 요약 |
|---|---|---|---|---|
| 14 | `pullback_buy` | 눌림목 매수 | trend_ma | 정배열 + 현재가 MA20 ±2% + RSI 30~50 |
| 15 | `prev_high_break` | 전고점 돌파 | pattern | 최근 30일 최고가 돌파 + 거래량 1.2배↑ |
| 16 | `v_shape_rebound` | V자 반등 | pattern | 10일 내 5%↓ 후 3일 연속 양봉 반등 |
| 17 | `trading_value_spike` | 거래대금 급증 | volume_flow | 거래대금 ≥ 100억원 AND 전일 2배↑ |
| 18 | `macd_hist_positive` | MACD 히스토그램 양전환 | indicator | hist[t]>0 AND hist[t-1]≤0 |
| 19 | `low_per` | 저PER 성장주 | value | PER < 15 AND PER>0 AND MA60 상승 |
| 20 | `safe_large_cap` | 대형주 안전 장기 | combo | 시총≥1조 AND 정배열 AND 외국인 과반 매수 |

### Task 2-0: 기존 13개 프리셋에 category + shortFormula 추가
각 프리셋 파일에 아래 필드 추가:

| 프리셋 | category | shortFormula |
|---|---|---|
| golden_cross | trend_ma | `MA20 > MA60 신규 돌파` |
| alignment | trend_ma | `MA5 > MA20 > MA60 > MA120 신규 완성` |
| ma60_turn_up | trend_ma | `MA60 기울기 음→양 전환` |
| high_52w | pattern | `C[t] ≥ 52주 최고 × N%` |
| volume_spike | volume_flow | `V ≥ 20일 평균 × K + 양봉` |
| foreign_inst_buy | volume_flow | `외국인·기관 N일 연속 순매수` |
| rsi_rebound | indicator | `RSI 30 이하 → 재돌파 + MA60 상승` |
| macd_cross | indicator | `MACD 라인 > Signal 신규 돌파` |
| bb_lower_bounce | pattern | `밴드 하단 이탈 → 재진입` |
| low_pbr | value | `PBR < K` |
| combo_golden | combo | `골든크로스 + 거래량 급증 + RSI>50` |
| combo_value_rebound | combo | `PBR<1 + RSI 반등 + MA60 근처` |
| bowl_pattern | pattern | `MA224 부근 90일 저점 + 3% 회복` |

- 커밋: `feat(phase-9): add category and shortFormula to all presets`

### Task 3: PresetItemRow 컴포넌트
- 라디오 스타일 선택, 이름, shortFormula, Beta/⭐ 배지, param 배지, 정보 버튼
- 커밋: `feat(phase-9): add PresetItemRow component`

### Task 4: PresetSidebar 카테고리화
- `groupByCategory`로 13개 → 6개 섹션
- 각 섹션 헤더 (아이콘 + 라벨)
- 모바일 접기/펼치기
- 커밋: `feat(phase-9): group presets by category in sidebar`

### Task 5: SideNav 드로어 컴포넌트
- 좌측 슬라이드 패널
- 햄버거 버튼 (Header 왼쪽)
- `전략 검색기` / `전체 종목` 링크
- 바깥 클릭·ESC·선택 시 닫힘
- 커밋: `feat(phase-9): add left drawer SideNav replacing HeaderNav`

### Task 6: Header 개편 + HeaderNav 제거
- 왼쪽 햄버거 + 로고, 가운데 갱신시각, 오른쪽 모드/테마/로그아웃
- HeaderNav.tsx 삭제
- 커밋: `feat(phase-9): remove HeaderNav, restructure header with hamburger`

### Task 7: Workprogress + 최종 검증
- 전체 테스트 통과
- build 성공
- 커밋: `docs(phase-9): add workprogress record`

**총 소요**: 반나절~1일

---

## 🎯 기대 효과

### 시각 비교

**전:**
```
13개 프리셋이 평면으로 나열
→ "이게 뭐 하는 거지?" 추가 클릭해서 알아야 함
```

**후:**
```
📈 추세·이동평균 (3)
  ● 골든크로스        MA20 > MA60 신규 돌파      ⓘ
  ○ 정배열 확정       MA5>MA20>MA60>MA120        ⓘ
  ○ 60일선 상승 전환  MA60 기울기 음→양          ⓘ

🔺 돌파·패턴 (3)
  ○ 52주 신고가       C ≥ 52주 최고 × N%   [param] ⓘ
  ○ BB 하단 복귀      하단 이탈 → 재진입            ⓘ
  ○ 🍚 밥그릇 [BETA]  MA224 저점 + 3% 회복         ⓘ

...

⭐ 조합 전략 (2)
  ○ 중장기 황금 조합  골든크로스 + 거래량 + RSI>50 ⓘ
  ○ 저평가 반등       PBR<1 + RSI 반등 + MA60      ⓘ
```

→ 한눈에 카테고리·성격·공식·Beta/⭐ 여부 파악 가능

---

## ⚠️ 주의

### 기존 동작 보존
- 프리셋 ID·필터 로직·URL·데이터 파일 **모두 그대로** (카테고리는 UI 전용 메타)
- 기존 Vitest 84개 깨지면 안 됨 → Task 2에서 기존 프리셋 수정 시 조심

### 테마 유지
- 토스 스타일 유지. 사이드바 배경·간격만 조정

### 반응형
- 모바일에선 카테고리 기본 접힘 → 탭핑 시 펼침
- 드로어는 전체 화면 80% 너비, max 320px

---

## 🏁 완료 조건

- [ ] 7개 Task 완료
- [ ] Vitest 84개 + 카테고리 테스트 ~3개 통과
- [ ] type-check + build 정상
- [ ] 햄버거 메뉴 작동 (데스크톱·모바일)
- [ ] 6개 카테고리 모두 올바른 그룹 표시
- [ ] 사용자 확인 후 PR 머지
