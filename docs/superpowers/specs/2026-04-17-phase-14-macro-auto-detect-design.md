# Phase 14 — 매크로 자동 탐지 + 팩터별 차등 가중치 설계

**Date**: 2026-04-17
**Status**: Draft (awaiting review)
**Scope**: Phase 13의 수동 토글 기반 매크로 팩터 시스템을 (1) 환율·유가·코스피 자동 탐지로 보조하고, (2) 팩터별 차등 가중치를 적용해 정확도를 끌어올린다.

---

## 🎯 목적

Phase 13 한계:
- 사용자가 **일일이 수동으로** 팩터를 켜야 함 → 오래되거나 틀린 상태 방치 위험
- **모든 팩터 동일 가중치(±5)** → 실제 영향 크기 차이 무시 (war_ongoing vs grain_up 같은 레벨)

Phase 14 개선:
1. **A. 7개 팩터 자동 탐지**: 매일 수집되는 환율·유가·코스피·외국인 수급 데이터로 현재 상황 자동 추정 → 사용자에게 **추천**
2. **B. 30개 팩터 차등 가중치**: 팩터별로 weight 3~10 부여 → 스코어 가산이 실제 영향 크기 반영

---

## ✅ 범위

1. Python 스크립트 `fetch_macro_indicators.py` 신규
2. 출력 JSON `macro_indicators.json`
3. GitHub Actions daily-update.yml에 단계 추가
4. 프론트엔드 `loadMacroIndicators()` 로더
5. `useMacroAutoDetect()` 훅 — 현재 자동 감지된 팩터 ID 계산
6. `/environment` 페이지 상단 "자동 감지" 카드 UI
7. 각 `FactorCard`에 "💡 자동 감지됨" 뱃지
8. `MacroFactor` 타입에 `weight: number` 추가
9. 30개 팩터 weight 배분
10. `scoring.ts` 가중치 적용
11. `MacroBadge`·`MacroDetailPanel` 가중 반영 값 표시
12. 테스트·QA·PR

## ❌ 범위 제외 (Phase 15+)

- 사용자 맞춤 가중치 슬라이더 (UI로 조정)
- 자동 감지 강제 적용 (모드 전환)
- 뉴스/DART 공시 연동 (지정학 팩터 자동화)
- 백테스트 기반 가중치 최적화

---

## 📊 A. 자동 탐지 설계

### A-1. 데이터 소스

| 데이터 | 주 소스 | 폴백 | 비고 |
|---|---|---|---|
| USD/KRW | `fdr.DataReader('USD/KRW', start)` | 네이버 금융 파싱 | FDR이 Yahoo/투자닷컴 집계 |
| WTI 유가 | `fdr.DataReader('CL=F', start)` | Brent `BZ=F` | 장중 가격 최근 90일 |
| KOSPI 지수 | `pykrx.stock.get_index_ohlcv_by_date(..., '1001')` | `fdr.DataReader('KS11')` | 종가 기준 |
| 외국인 수급 | **기존 `fundamentals.json`** 재활용 | — | 신규 수집 불필요 |

**FDR 라이브러리는 이미 프로젝트 requirements에 있음** → 별도 설치 불필요

### A-2. `fetch_macro_indicators.py` 스크립트

**입출력**:
- 입력: 없음 (외부 API 호출)
- 출력: `public/data/macro_indicators.json`

**핵심 로직**:
```python
import FinanceDataReader as fdr
from pykrx import stock
from datetime import datetime, timedelta
import json, pytz

KST = pytz.timezone('Asia/Seoul')

def fetch_indicator(symbol: str, days: int = 90) -> dict:
    """Returns {current, change_20d_pct, change_5d_pct, series_len}."""
    start = (datetime.now() - timedelta(days=days + 30)).strftime('%Y-%m-%d')
    df = fdr.DataReader(symbol, start)
    if df is None or df.empty or len(df) < 20:
        return None
    closes = df['Close'].dropna()
    current = float(closes.iloc[-1])
    ref_20 = float(closes.iloc[-21]) if len(closes) >= 21 else None
    ref_5 = float(closes.iloc[-6]) if len(closes) >= 6 else None
    ma20 = float(closes.iloc[-20:].mean()) if len(closes) >= 20 else None
    return {
        'current': round(current, 2),
        'change_20d_pct': round(((current - ref_20) / ref_20) * 100, 2) if ref_20 else None,
        'change_5d_pct': round(((current - ref_5) / ref_5) * 100, 2) if ref_5 else None,
        'vs_ma20_pct': round(((current - ma20) / ma20) * 100, 2) if ma20 else None
    }

def fetch_kospi() -> dict:
    # pykrx 우선, FDR 폴백
    end = datetime.now().strftime('%Y%m%d')
    start = (datetime.now() - timedelta(days=90)).strftime('%Y%m%d')
    try:
        df = stock.get_index_ohlcv_by_date(start, end, '1001')
        closes = df['종가']
    except Exception:
        df = fdr.DataReader('KS11', start.replace('', '-'))
        if df is None or df.empty:
            return None
        closes = df['Close']
    # (이후 로직 동일)
    ...

def main():
    result = {
        'updated_at': datetime.now(KST).isoformat(),
        'forex_usd_krw': fetch_indicator('USD/KRW'),
        'oil_wti': fetch_indicator('CL=F'),
        'kospi': fetch_kospi()
    }
    # 출력
    path = Path('public/data/macro_indicators.json')
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
```

**엣지케이스**:
- 각 소스 실패 시 해당 필드만 `null`, 스크립트 전체는 계속 실행
- 휴일·주말: 최신 영업일 기준 (FDR이 자동 처리)
- 데이터 < 20일: 변동률 계산 생략, `null` 표시
- 네트워크 타임아웃: 3회 재시도 후 포기

### A-3. JSON 스키마

```json
{
  "updated_at": "2026-04-17T18:00:00+09:00",
  "forex_usd_krw": {
    "current": 1380.50,
    "change_20d_pct": 3.42,
    "change_5d_pct": 0.81,
    "vs_ma20_pct": 2.15
  },
  "oil_wti": {
    "current": 82.35,
    "change_20d_pct": 12.10,
    "change_5d_pct": 3.20,
    "vs_ma20_pct": 8.50
  },
  "kospi": {
    "current": 2580.32,
    "change_20d_pct": -1.85,
    "change_5d_pct": -3.20,
    "vs_ma20_pct": -2.55
  }
}
```

필드가 `null`인 경우: 해당 팩터 자동 탐지 불가 → 수동 유지

### A-4. GitHub Actions 통합

`.github/workflows/daily-update.yml`에 단계 추가 (기존 `fetch_sectors.py` 다음):

```yaml
- name: Fetch macro indicators
  run: python scripts/fetch_macro_indicators.py
```

`split_ohlcv.py` 실행 전에 배치. 실패해도 전체 워크플로 중단하지 않도록 `continue-on-error: true` 권장.

### A-5. 7개 자동 탐지 팩터 규칙 + 임계값 근거

| 팩터 ID | 조건 | 근거 |
|---|---|---|
| `krw_weak` | `forex.change_20d_pct >= +3` | 20일 3% 상승 = 유의미한 약세 (IMF·한은 레포트 기준) |
| `krw_strong` | `forex.change_20d_pct <= -3` | 대칭 |
| `oil_up` | `oil.change_20d_pct >= +10` | WTI 20일 10%+ = 급등 (2022 러우전쟁 수준) |
| `oil_down` | `oil.change_20d_pct <= -10` | 대칭 |
| `kospi_crash` | `kospi.change_5d_pct <= -3` OR `kospi.vs_ma20_pct <= -5` | 5일 -3% = 단기 조정 / MA20 -5% = 추세 이탈 |
| `foreign_sell` | 최근 10일 `foreign_net < 0` 날 수 ≥ 7 | 외국인 지속 매도 시그널 |
| `foreign_buy` | 최근 10일 `foreign_net > 0` 날 수 ≥ 7 | 대칭 |

**충돌 방지**:
- `krw_weak` + `krw_strong` 동시 불가 (임계값상 자동 회피)
- `foreign_sell` + `foreign_buy` 동시 불가

**데이터 부족 케이스**:
- 필드 `null` → 해당 팩터 추천 안 함
- 사용자 경험상 "데이터 없음" 표시보다 **조용히 숨김** (오히려 노이즈)

### A-6. 외국인 수급 집계 (기존 데이터 활용)

`fundamentals.json`은 이미 `foreign_net: number[]` 필드 보유 (최근 10~30일).

프론트엔드에서:
```typescript
function detectForeignTrend(foreign_net: number[]): 'sell' | 'buy' | null {
  if (!foreign_net || foreign_net.length < 10) return null
  const recent10 = foreign_net.slice(-10)
  const sellDays = recent10.filter((v) => v < 0).length
  const buyDays = recent10.filter((v) => v > 0).length
  if (sellDays >= 7) return 'sell'
  if (buyDays >= 7) return 'buy'
  return null
}
```

**주의**: `fundamentals.json`은 종목별. 전체 시장 추세 계산하려면:
- 대형주 20~30종목만 샘플링해 평균
- 또는 KOSPI 대표 종목(삼성전자, SK하이닉스, 현대차 등)만 집계

**Phase 14 단순화**: 대형주 10개(foreign_sell 정의된 nameKeywords) 집계 평균 사용.

### A-7. 프론트엔드 자동 탐지 훅

```typescript
// src/lib/macro/useMacroAutoDetect.ts
export interface MacroIndicators {
  updated_at: string
  forex_usd_krw: { current: number; change_20d_pct: number | null; ... } | null
  oil_wti: { ... } | null
  kospi: { ... } | null
}

export function useMacroAutoDetect(
  indicators: MacroIndicators | null,
  fundamentals: FundamentalsJson | null
): string[] {
  if (!indicators) return []
  const detected: string[] = []

  const forex = indicators.forex_usd_krw
  if (forex?.change_20d_pct != null) {
    if (forex.change_20d_pct >= 3) detected.push('krw_weak')
    else if (forex.change_20d_pct <= -3) detected.push('krw_strong')
  }

  const oil = indicators.oil_wti
  if (oil?.change_20d_pct != null) {
    if (oil.change_20d_pct >= 10) detected.push('oil_up')
    else if (oil.change_20d_pct <= -10) detected.push('oil_down')
  }

  const kospi = indicators.kospi
  if (kospi) {
    if ((kospi.change_5d_pct ?? 0) <= -3 || (kospi.vs_ma20_pct ?? 0) <= -5) {
      detected.push('kospi_crash')
    }
  }

  // 외국인 수급: 대형주 10개 평균
  if (fundamentals) {
    const trend = detectAggregateForeignTrend(fundamentals)
    if (trend === 'sell') detected.push('foreign_sell')
    else if (trend === 'buy') detected.push('foreign_buy')
  }

  return detected
}
```

---

## 🎨 A. UI 상세

### A-8. `/environment` 페이지 상단 자동 감지 카드

```
┌──────────────────────────────────────┐
│ 🤖 자동 감지됨                      │
│ 오늘 시장 상황으로 이런 팩터들이     │
│ 맞아 보여요 (3개)                    │
│                                      │
│ 🟡 원화 약세 (환율 20일 +3.4%)      │
│    [💡 자동 감지] 적용됨 [끄기]     │
│ 🔴 유가 급등 (WTI 20일 +12.1%)      │
│    [💡 자동 감지] 적용됨 [끄기]     │
│ 🔴 코스피 급락 (5일 -3.2%)          │
│    [💡 자동 감지] [적용]            │
│                                      │
│ [💡 자동 감지 전부 켜기]            │
│                                      │
│ 업데이트: 2026-04-17 오후 6:00      │
└──────────────────────────────────────┘

A. 지정학 (1/7)    ← 기존 수동 섹션 계속
...
```

**동작 규칙**:
- 자동 감지 카드는 **최상단 고정**
- 각 팩터 상태: "적용됨" / "적용 안 됨"
- 개별 적용/해제 가능
- "전부 켜기" 버튼 = 감지된 것 모두 ON (이미 켜진 건 스킵)
- 업데이트 시각 표시 (freshness 판단)
- 감지된 팩터 0개일 때: "오늘은 특별한 시장 이벤트가 없어 보여요 🌤️"

### A-9. 각 `FactorCard`에 자동 감지 뱃지

기존 `FactorCard` 우측에 작은 뱃지 추가:
```tsx
{isAutoDetected && (
  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
    💡 자동 감지
  </span>
)}
```

자동 감지됐지만 사용자가 끈 경우: 뱃지 색 회색
자동 감지됐고 켜진 경우: 노랑 강조

### A-10. 자동/수동 충돌 규칙

| 상황 | 처리 |
|---|---|
| 자동 감지됨 + 사용자가 켬 (일치) | 정상, 뱃지 표시 |
| 자동 감지됨 + 사용자가 끔 (무시) | 존중, 회색 뱃지로 "감지됐지만 끔" 표시 |
| 자동 감지 안 됨 + 사용자가 켬 | 정상, 뱃지 없음 |
| 자동 감지 안 됨 + 사용자가 끔 (기본 상태) | 정상 |

**자동 감지가 사용자 선택을 덮어쓰지 않음** — 모든 토글은 사용자가 직접.

### A-11. 첫 방문 가이드 업데이트

기존 3단계 가이드 유지. 첫 방문 시 자동 감지 카드 자연스레 보이므로 가이드 문구만 조정:

```
1. 🌍 시장 환경이란?
   "지금 세계에서 벌어지는 일"에 따라 유리한 종목이 달라져요.
2. 🤖 자동 감지
   환율·유가·코스피는 실제 데이터로 자동 감지해서 추천해드려요.
   마음에 들면 "자동 감지 전부 켜기" 버튼으로 바로 적용하세요.
3. 수동 설정
   전쟁·산업 붐 같은 건 직접 뉴스 보시고 켜주세요.
```

---

## ⚖️ B. 가중치 차등화 설계

### B-1. 타입 변경

```typescript
// src/lib/macro/types.ts

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
  weight: number  // 신규: 3~10, 기본 5
}
```

### B-2. 30개 팩터 가중치 배분 (근거 포함)

**구간**: 3 (보조) / 5 (보통) / 7 (상당) / 8 (강력) / 10 (매우 강력)

#### weight 10 (매우 강력, 3개)
시장 전반에 광범위하게 강한 영향
| ID | 이유 |
|---|---|
| `war_ongoing` | 전쟁 지속은 방산 급등·항공 급락 등 10% 이상 단기 영향 사례 빈번 |
| `kospi_crash` | 전체 시장 -3% 급락은 방어주/성장주 명확 분리 |
| `foreign_sell` | 외국인 지속 매도는 대형주 10% 하락 유도 가능 |

#### weight 8 (강력, 6개)
| ID | 이유 |
|---|---|
| `rate_hike` | 금리 1회 인상 → 성장주 -5~10% 단기 |
| `rate_cut` | 대칭 |
| `inflation` | CPI 1%p 상승 → 필수소비 +, 기술주 - |
| `ai_boom` | 2023-24년 AI 섹터 연간 +50%+ 현상 |
| `us_china` | 양국 관세 발표 시 관련주 5~15% 급변 |
| `oil_up` | WTI 10%+ 상승 → 항공 -5% 즉시 반영 |

#### weight 7 (상당, 6개)
| ID | 이유 |
|---|---|
| `krw_weak` | 3% 환율 변동 → 수출주 +3~5% |
| `krw_strong` | 대칭 |
| `oil_down` | 대칭 (운송 +3~5%) |
| `ev_boom` | 2020-23 전기차 붐 때 관련주 +30% 연간 |
| `export_boom` | 수출 증가는 대형 수출주 실적 직결 |
| `foreign_buy` | 외국인 매수 상위 10종목 평균 +5% (사례 연구) |

#### weight 5 (보통, 9개) - 기본값
| ID |
|---|
| `middle_east`, `trade_boom`, `bio_boom`, `defense_boom`, `realestate_tight`, `realestate_boost`, `domestic_down`, `domestic_up`, `kcontent_boom` |

**이유**: 영향 범위가 제한적이거나 간접적. 명확하지만 다른 요인에 쉽게 가려짐.

#### weight 3 (보조, 6개)
| ID | 이유 |
|---|---|
| `nk_provocation` | 단기 스파이크 후 원위치 경향 (학습 효과) |
| `gold_up` | 금값 상승은 금광주 몇 개만 국지적 영향 |
| `taiwan_tension` | 장기 리스크지만 단기 반영 약함 |
| `korea_peace` | 기대감 반영, 실제 수혜까지 시차 |
| `lithium_copper` | 공급망 전체에 분산 |
| `grain_up` | 식품 가공주 가격 전가 시차 |

### B-3. 스코어 계산 변경

**Before** (Phase 13):
```typescript
const BENEFIT_WEIGHT = 5
const LOSS_WEIGHT = 5
delta += BENEFIT_WEIGHT  // 고정
```

**After** (Phase 14):
```typescript
export function computeMacroBonus(
  stockName: string,
  themes: string[] | undefined,
  activeFactors: MacroFactor[]
): MacroBonus {
  const detail: MacroBonusDetail[] = []
  for (const f of activeFactors) {
    let delta = 0
    if (matchesFactor(stockName, themes, f.beneficiaries)) delta += f.weight
    if (matchesFactor(stockName, themes, f.losers)) delta -= f.weight
    if (delta !== 0) {
      detail.push({
        factorId: f.id,
        factorName: f.name,
        delta,
        role: delta > 0 ? 'benefit' : 'loss'
      })
    }
  }
  return { total: detail.reduce((s, d) => s + d.delta, 0), detail }
}
```

### B-4. 최대 가산 시뮬레이션

5개 활성·모두 수혜 극단 케이스:
- Phase 13: 5 × 5 = **+25점**
- Phase 14 (weight 10 팩터 3개 + weight 8 팩터 2개 가정): 10+10+10+8+8 = **+46점**

프리셋 점수 범위 60~80점 대비 **50~80% 영향** → 일부 극단적. 하지만:
- 실제로 한 종목이 5개 팩터 모두 매칭되는 경우 드묾 (대부분 1~3개)
- 평균 영향: 1~3개 × 평균 weight 6 = **±6~18점** (적절)

→ **극단 케이스는 의도된 "강한 시그널"**로 수용

### B-5. UI 영향

- `MacroBadge`: `🌍 환경 +18` (정확 수치)
- `MacroDetailPanel`: 각 팩터별 `delta` 표시 — 기존과 동일 구조
- `FactorCard`: 우측에 "**강도: ±10**" 배지 표시 (사용자 인지)

```tsx
<span className="text-xs text-text-secondary-light">
  강도: ±{factor.weight}
</span>
```

---

## 🗂 파일 구조

```
scripts/
├── fetch_macro_indicators.py    [신규]

.github/workflows/
├── daily-update.yml              [수정 — macro indicator 단계 추가]

public/data/
├── macro_indicators.json         [신규 데이터]

src/
├── lib/
│   ├── macro/
│   │   ├── types.ts              [수정 — weight 필드 추가]
│   │   ├── factors.ts            [수정 — 30개 weight 부여]
│   │   ├── scoring.ts            [수정 — weight 적용]
│   │   ├── useMacroAutoDetect.ts [신규]
│   │   └── __tests__/
│   │       ├── scoring.test.ts   [수정 — weight 반영]
│   │       ├── factors.test.ts   [수정 — weight 범위 검증]
│   │       └── autoDetect.test.ts [신규]
│   ├── dataLoader.ts             [수정 — loadMacroIndicators() 추가]
│   └── types/
│       └── indicators.ts         [수정 — MacroIndicators 타입]
└── app/[basePath]/environment/
    ├── EnvironmentView.tsx       [수정 — 자동 감지 카드 통합]
    ├── AutoDetectCard.tsx        [신규]
    ├── FactorCard.tsx            [수정 — 자동 감지 뱃지 + 강도 표시]
    └── ...
└── lib/strings/ko.ts             [수정 — autoDetect 섹션]
```

---

## 🧪 테스트 전략

### 단위 테스트

**`autoDetect.test.ts`** (신규):
```typescript
describe('useMacroAutoDetect', () => {
  it('detects krw_weak when forex >= +3%')
  it('detects krw_strong when forex <= -3%')
  it('detects oil_up when oil >= +10%')
  it('detects kospi_crash when 5d <= -3%')
  it('detects kospi_crash when vs_ma20 <= -5%')
  it('detects foreign_sell when 7+/10 days negative')
  it('returns empty when indicators null')
  it('ignores null fields')
})
```

**`scoring.test.ts`** (수정):
- 기존 케이스의 `±5` → 해당 팩터 weight 사용
- 신규 케이스: 복수 팩터 weight 합산 정확성

**`factors.test.ts`** (수정):
- 모든 팩터에 weight 존재
- weight 범위 3~10
- 가중치 분포 (3/5/7/8/10 각 개수 정확)

### Python 테스트
없음 (단순 수집 스크립트). 대신:
- 로컬 수동 실행 → JSON 파일 형식 검증
- null 필드 처리 확인 (네트워크 에러 시뮬레이션)

### 통합 테스트 (수동)
- `/environment` 접속 → 자동 감지 카드 렌더
- "전부 켜기" → 해당 팩터들 ON
- 개별 토글 → 상태 유지
- 새로고침 → localStorage 반영
- 데이터 없을 때 ("오늘은 특별한 이벤트 없음")
- 모바일 레이아웃
- 다크 모드

---

## 🚀 태스크 분해 (총 20 tasks)

### Phase A: 데이터 파이프라인 (Tasks 1-3)

**Task 1**: `fetch_macro_indicators.py` 작성
- FDR + pykrx 조합, fallback, null 처리
- 30분 수동 실행 테스트

**Task 2**: `daily-update.yml`에 단계 추가
- `continue-on-error: true`
- 커밋·푸시 단계 포함

**Task 3**: TS 타입 + 로더
- `src/lib/types/indicators.ts` MacroIndicators 추가
- `src/lib/dataLoader.ts` `loadMacroIndicators(tradeDate)` 추가

### Phase B: 자동 탐지 로직 (Tasks 4-6)

**Task 4**: `useMacroAutoDetect` 훅 + 테스트
**Task 5**: 외국인 수급 집계 (대형주 10개 평균)
**Task 6**: 충돌 방지 + 엣지케이스 테스트

### Phase C: UI 통합 (Tasks 7-10)

**Task 7**: `AutoDetectCard` 컴포넌트
**Task 8**: `/environment` 페이지에 통합
**Task 9**: `FactorCard` 뱃지·강도 표시
**Task 10**: ko.ts autoDetect 섹션 추가

### Phase D: 가중치 차등화 (Tasks 11-13)

**Task 11**: types.ts + factors.ts weight 추가 (30개)
**Task 12**: scoring.ts 가중치 반영 + 기존 테스트 업데이트
**Task 13**: `MacroBadge`·`MacroDetailPanel` 동작 재확인

### Phase E: 첫 방문 가이드 + 충돌 UX (Tasks 14-15)

**Task 14**: 가이드 모달 3단계 업데이트
**Task 15**: 자동/수동 충돌 UX (회색 뱃지)

### Phase F: QA + 배포 (Tasks 16-20)

**Task 16**: E2E 로컬 검증
**Task 17**: 프로덕션 빌드 확인
**Task 18**: 수동 QA 체크리스트
**Task 19**: GitHub Actions 한 번 수동 실행 (macro_indicators.json 생성 확인)
**Task 20**: PR 생성 + 문서 정리

**총 예상**: 12시간 ≈ 1.5일

---

## ⚠️ 엣지 케이스 & 리스크

| 케이스 | 처리 |
|---|---|
| FDR 네트워크 실패 | 해당 필드 `null`, 프론트엔드는 조용히 숨김 |
| `macro_indicators.json` 자체 없음 | 자동 탐지 카드 숨김, 수동 모드만 동작 |
| 탐지 임계값 오탐(false positive) | 사용자가 수동으로 끌 수 있음 |
| 가중치 10 팩터 중복 매칭 | 합산 (정상 동작, 의도된 강 시그널) |
| 대형주 외국인 수급 데이터 부족 | `foreign_sell`/`foreign_buy` 감지 안 함 |
| 주말·휴일 | FDR이 최신 영업일 반환, 변동률 계산 정상 |
| 과거 데이터 < 20일 | 해당 변동률 `null`, 팩터 감지 스킵 |
| 데이터 너무 낡음 (7일+) | 노란 경고 "데이터가 오래됐어요" 뱃지 |

---

## 📊 기대 정확도 개선

Phase 13 대비:
- 매핑 논리: 동일 (85%)
- 데이터 커버리지: 동일 (60%)
- **예측력**: 60% → **67%** (+7%p)
  - 이유: 자동 탐지로 "유저가 틀리게 토글한 상태" 리스크 감소
  - 가중치 차등으로 "중요한 팩터가 더 큰 영향" 반영
- **사용자 체감**: 80% → **88%** (+8%p)
  - "자동으로 맞춰주니 편하다" 피드백 기대

종합 정확도: **65~75% → 72~82%**

백테스트 시 추가 튜닝 여지 큼.

---

## 🔜 Phase 15+ 확장

1. **사용자 가중치 슬라이더** — 팩터별 강도 직접 조정 (3~10 범위)
2. **뉴스·공시 연동** — DART·네이버 뉴스로 지정학·테마 자동 탐지
3. **백테스트 모듈** — 과거 데이터로 팩터 가중치 자동 최적화
4. **알림** — 자동 감지된 팩터 변경 시 Push 알림
5. **시장 체온계** — 현재 활성 팩터 종합 해석 ("방어 장세", "위험 회피 구간" 등)

---

## 🎯 시작 조건

1. Phase 13 PR 머지 (코드 기반 필요)
2. 새 브랜치 `feature/phase-14-macro-auto-detect` (off main)
3. 본 spec 승인 → plan 작성 → subagent 주도 실행 (Phase 13과 동일 방식)

---

## ❓ 리뷰 확인 포인트

1. **자동 탐지 7개 팩터 + 임계값** — 적절한가? 더 민감/둔감?
2. **가중치 배분 (3/5/7/8/10)** — 특정 팩터 조정? 
3. **대형주 외국인 수급 집계 단순화** — 10개 샘플로 충분? 아니면 모든 대형주 평균?
4. **충돌 UX** — 자동 감지됐는데 끈 경우 UI 표시 방식 OK?
5. **Phase 15+** 언급 기능 중 Phase 14에 넣고 싶은 것?

확정 시 writing-plans로 넘어감.
