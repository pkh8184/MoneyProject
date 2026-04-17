# Phase 15 — 백테스트 기반 가중치 튜닝 설계

**Date**: 2026-04-17
**Status**: Draft (awaiting review)
**Scope**: Phase 13+14의 **수동 추정 가중치**를 과거 5년 데이터 기반 **실측 통계**로 교체하여 예측 정확도를 끌어올린다.

---

## 🎯 목적

Phase 13+14 한계:
- 가중치 3~10점 배분은 **내 추정치** (시장 통념 기반)
- 실제 과거 반응과 다를 수 있음
- 팩터 매핑(수혜/피해 섹터)도 검증 안 됨

Phase 15 개선:
1. **백테스트 엔진**: 과거 5년 데이터로 팩터 활성 시점 식별 → 수혜/피해 종목군 실제 반응 측정
2. **가중치 자동 튜닝**: 통계적 효과 크기 기반 weight 재설정
3. **종목별 반응도 DB**: 종목 × 팩터 과거 반응 통계 (개별 정확도 상승)
4. **UI 시각화**: 사용자에게 각 팩터의 과거 신뢰도 표시

---

## ✅ 범위 (Phase 15)

1. `scripts/backtest_factors.py` — 백테스트 엔진
2. `scripts/fetch_historical_macro.py` — 5년 매크로 데이터 수집
3. 출력 JSON:
   - `public/data/factor_backtest_results.json` — 팩터별 통계
   - `public/data/stock_macro_response.json` — 종목별 반응도
4. 결과 기반 `src/lib/macro/factors.ts` weight 자동 업데이트 (스크립트)
5. `/environment` 페이지에 팩터별 **"과거 신뢰도" 뱃지** 추가
6. `MacroDetailPanel`에 종목별 반응도 반영 (정교한 delta)
7. 관리자용 백테스트 요약 페이지 `/environment/backtest`

## ❌ 범위 제외 (Phase 16+)

- 지정학 팩터 (war·us_china·taiwan_tension) 자동 기간 식별 — 이후 수동 라벨링
- 뉴스·DART 공시 연동 (Phase 16)
- ML 모델 (Phase 17)

---

## 📊 백테스트 설계

### 15-A. 데이터 준비

**필요 데이터**:
1. 종목별 5년 종가 — **이미 있음** (ohlcv/{code}.json, ~2500 종목)
2. 5년 매크로 지표 — **신규 수집** (`fetch_historical_macro.py`)
   - USD/KRW (FDR `'USD/KRW'`)
   - WTI 유가 (FDR `'CL=F'`)
   - KOSPI 지수 (pykrx)
3. 종목 × 테마 매핑 — **이미 있음** (sectors.json, Phase 13에서 22개 테마로 확장)

**기간**: 최근 1,260 거래일 (약 5년)

### 15-B. 팩터 활성 기간 식별

#### 자동 탐지 가능 팩터 (7개)
Phase 14 임계값 그대로 사용, 매일 적용하여 활성 여부 판정:

| 팩터 | 조건 |
|---|---|
| `krw_weak` | USD/KRW 20일 변동률 ≥ +3% |
| `krw_strong` | USD/KRW 20일 변동률 ≤ -3% |
| `oil_up` | WTI 20일 변동률 ≥ +10% |
| `oil_down` | WTI 20일 변동률 ≤ -10% |
| `kospi_crash` | 5일 ≤ -3% OR MA20 대비 -5% |
| `foreign_sell` | (대형주 10개 샘플) 최근 10일 중 7일+ 순매도 |
| `foreign_buy` | 반대 |

**출력**: 각 팩터별 활성 날짜 리스트 (예: `krw_weak: ['2022-09-15', '2022-09-16', ...]`)

#### 수동 지정 팩터 (9개)
정책 결정·이벤트 기반 팩터는 기간 하드코딩:

| 팩터 | 기간 | 근거 |
|---|---|---|
| `war_ongoing` | 2022-02-24 ~ 현재 | 러우전쟁 시작 |
| `us_china` | 2018-07-06 ~ 현재 (간헐) | 관세 부과 시점들 |
| `rate_hike` | 2022-01-01 ~ 2023-07-31 | 한국은행 금리 인상기 |
| `rate_cut` | 2024-10-01 ~ 현재 | 금리 인하기 |
| `ai_boom` | 2023-01-01 ~ 현재 | ChatGPT 이후 |
| `ev_boom` | 2020-01-01 ~ 2022-12-31 | 전기차 붐 피크 |
| `bio_boom` | 2020-03-01 ~ 2021-06-30 | 코로나 바이오 |
| `defense_boom` | 2022-06-01 ~ 현재 | 폴란드 K2 계약 이후 |
| `inflation` | 2021-06-01 ~ 2023-06-30 | CPI 5%+ 기간 |

**나머지 14개**는 명확한 기간 식별 어려움 → Phase 15에선 가중치 유지, **Phase 16에서 뉴스 연동으로 자동 식별**.

### 15-C. 수혜/피해 종목군 반응 측정

각 팩터별:
1. **수혜 종목군**: factor.beneficiaries (themes + nameKeywords) 매칭 종목들
2. **피해 종목군**: factor.losers 매칭 종목들
3. **중립 종목군**: 매칭 안 되는 전체 나머지 종목

팩터 활성 각 날짜 D에 대해:
- D+1, D+5, D+20 영업일 후 수익률 계산
  - `return_d = (close[D+d] - close[D]) / close[D] * 100`
- 각 종목군별 평균·중간값·표준편차 집계

#### 효과 크기 계산

```
effect_d = avg(수혜 수익률) - avg(중립 수익률)    # 수혜 초과수익
anti_effect_d = avg(피해 수익률) - avg(중립 수익률)  # 피해 초과손실 (음수 기대)
```

**통계적 유의성** (샘플 수 ≥ 30 & effect / std_err ≥ 2):
- `confidence = 'high' | 'medium' | 'low'`

### 15-D. 가중치 도출 공식

```python
def compute_weight(effect_pct: float, confidence: str) -> int:
    """효과 크기 (D+5 기준)를 3~10 weight로 변환."""
    if confidence == 'low':
        return 3  # 신뢰도 낮으면 최소 가중치
    
    abs_effect = abs(effect_pct)
    if abs_effect >= 5.0:   return 10
    if abs_effect >= 3.0:   return 8
    if abs_effect >= 1.5:   return 7
    if abs_effect >= 0.5:   return 5
    return 3
```

**부호 주의**:
- 수혜군이 과거에 **오히려 하락**했다면 → 팩터 매핑 잘못됨 경고
- 차이가 너무 작으면(< 0.3%) → weight 3 (사실상 무의미)

### 15-E. 종목별 반응도 DB

각 종목 × 팩터 조합:
```json
{
  "005930": {  // 삼성전자
    "ai_boom": { "avg_return_d5": 2.8, "sample_days": 250, "confidence": "high" },
    "rate_hike": { "avg_return_d5": -1.5, "sample_days": 380, "confidence": "medium" },
    ...
  }
}
```

상위 30종목(대형주) × 16개 팩터(자동+수동) = 480개 엔트리. 파일 크기 적정.

**사용 목적**:
- `MacroDetailPanel`에서 해당 종목의 **과거 반응 수치**를 함께 표시
- 예: "AI 붐 활성 시 삼성전자는 과거 +2.8%였어요 (250일 데이터)"
- 섹터 평균보다 **개별 종목 정확도** 높음

### 15-F. 결과 적용 방식

**자동 적용 금지** (안전):
1. 백테스트 결과 JSON 파일 생성
2. 스크립트 내 `generate_factors_update.py`가 **권장 weight 표** 출력
3. 개발자가 **검토 후 수동으로** `factors.ts` 업데이트
4. PR로 반영

**근거**:
- 자동 적용 시 데이터 오염·극단값이 factors.ts에 직접 반영되는 위험
- 사람 검토를 거쳐 이상치 거르기

---

## 🎨 UI 변경

### 15-G. FactorCard 과거 신뢰도 뱃지

각 팩터 카드에 추가:

```
🔴 전쟁·분쟁 지속  [💡 자동 감지]  [강도: ±10]
수혜: 방산, 정유·에너지
피해: 항공·여행
📊 과거 5년 신뢰도 ★★★★☆ (수혜 평균 +3.2%, 샘플 450일)
```

**뱃지 정보**:
- 별점 (신뢰도): ★ = low, ★★★ = medium, ★★★★★ = high
- 과거 평균 효과 크기 (D+5)
- 샘플 크기

**데이터 소스**: `factor_backtest_results.json`

### 15-H. MacroDetailPanel 종목별 반응 표시

종목 상세에서 각 팩터 옆에 과거 반응 정보 표시:

```
🌍 현재 환경에서의 위치
활성 팩터 5개 중 3개 매칭

  🟢 AI 붐           +8   (수혜)
     📊 이 종목은 과거 AI 붐 시 평균 +2.8% (250일)
  🟢 전기차 붐       +7   (수혜)
     📊 평균 +1.2% (180일)
  🔴 금리 인상기     -8   (피해)
     📊 평균 -1.5% (380일, 중간 신뢰도)
  ─────────────
  합계              +7
```

### 15-I. 백테스트 요약 페이지 `/environment/backtest`

관리자용(또는 고급 사용자용) 페이지:
- 16개 팩터의 과거 성과 표
- 각 팩터별 상위 수혜/피해 종목 리스트
- 데이터 업데이트 일자

SideNav에는 **추가 안 함** (고급 기능). Footer에 "📊 백테스트 결과" 링크.

---

## 🗂 파일 구조

```
scripts/
├── fetch_historical_macro.py       [신규] — 5년 환율·유가·코스피
├── backtest_factors.py             [신규] — 핵심 백테스트 엔진
├── generate_factors_update.py      [신규] — factors.ts 업데이트 권장안
└── requirements.txt                [수정? — scipy 추가 고려]

public/data/
├── historical_macro.json           [신규]
├── factor_backtest_results.json    [신규]
├── stock_macro_response.json       [신규]

src/
├── lib/
│   ├── macro/
│   │   ├── backtestResults.ts      [신규] — JSON 타입 + 로더
│   │   ├── types.ts                [수정] — BacktestResult 타입
│   │   └── factors.ts              [수정] — 백테스트 결과 반영 weight
│   ├── types/indicators.ts         [수정] — FactorBacktestJson 타입
│   └── dataLoader.ts               [수정] — loadFactorBacktest() 등
├── app/[basePath]/environment/
│   ├── FactorCard.tsx              [수정] — 신뢰도 뱃지
│   ├── EnvironmentView.tsx         [수정] — backtest 로드
│   └── backtest/
│       ├── page.tsx                [신규]
│       └── BacktestView.tsx        [신규]
├── components/macro/
│   └── MacroDetailPanel.tsx        [수정] — 종목별 반응 표시
└── lib/strings/ko.ts               [수정] — backtest 섹션
```

---

## 🧪 테스트 전략

### Python (수동 검증)
- 로컬에서 `python scripts/fetch_historical_macro.py` 실행 → JSON 포맷 검증
- `python scripts/backtest_factors.py --debug` → 각 팩터 활성 날짜 수, 샘플 크기 출력
- 결과의 극단값 수동 확인 (의도대로 도출됐는지)

### TypeScript (단위)
- `backtestResults.ts` 로더 파싱
- 종목별 반응도 조회 함수
- 신뢰도 뱃지 계산 로직

### 통합 (수동)
- `/environment` 페이지에 신뢰도 뱃지 렌더
- 종목 상세 `MacroDetailPanel`에 과거 반응 수치 표시
- 없는 종목은 섹터 평균으로 폴백 (graceful)

---

## 🚀 태스크 분해

### Phase 15A: Python 백테스트 엔진 (Tasks 1-4)

1. `fetch_historical_macro.py` — 5년 환율·유가·코스피 수집
2. `backtest_factors.py` — 활성 기간 식별 + 반응 측정 + 통계
3. `generate_factors_update.py` — 권장 weight 표 출력
4. 로컬 실행 + 결과 검증 (샘플 수·이상치)

### Phase 15B: 프론트엔드 통합 (Tasks 5-10)

5. TS 타입 + 로더 (`backtestResults.ts`, `dataLoader`)
6. `factors.ts` weight 수동 업데이트 (스크립트 결과 반영)
7. `FactorCard` 신뢰도 뱃지
8. `MacroDetailPanel` 종목별 반응 표시
9. `/environment/backtest` 페이지
10. ko.ts 문자열 추가

### Phase 15C: 워크플로 + QA (Tasks 11-13)

11. `daily-update.yml`에 백테스트 단계 추가 (주 1회 실행)
12. E2E 검증
13. PR 생성

**총 13 태스크, ~3일 예상**

---

## ⚠️ 리스크 & 한계

| 리스크 | 대응 |
|---|---|
| 과거 ≠ 미래 (과적합) | 최근 1년 out-of-sample 검증 추가 |
| 소형주 샘플 부족 | 샘플 <30이면 신뢰도 `low`, weight 유지 |
| 수동 지정 기간 부정확 | 문서에 근거 명시, Phase 16 뉴스 연동으로 자동화 |
| Python 계산 오래 걸림 | 일일 실행 X, 주 1회(일요일) 실행으로 제한 |
| 백테스트 JSON 크기 | 대형주 30개만 per-stock 저장, 섹터 레벨만 전체 |
| factors.ts 자동 적용 위험 | **수동 적용** 유지 (스크립트는 권장안만 출력) |

---

## 📊 기대 개선

| 지표 | Phase 14 | Phase 15 |
|---|---|---|
| 가중치 정확도 | 추정 기반 | **과거 5년 통계 기반** |
| 예측력 | 67% | **75~80%** (+8~13%p) |
| 사용자 신뢰도 | 88% | **92%** (신뢰도 뱃지 표시) |
| 종합 | 72~82% | **82~92%** |

**특히 매핑 재검증으로 오류 발견 가능**:
- 지금까지 수혜로 분류한 종목이 실제론 과거에 **하락**했다면 매핑 수정

---

## 🔜 Phase 16 (다음 단계)

1. 뉴스 RSS·DART 공시 연동 → 지정학·테마 팩터 자동 기간 식별
2. 섹터 로테이션 감지 (최근 30일 강세 섹터)
3. 시간 감쇠 (팩터 활성 오래되면 weight 감소)

---

## 🎯 시작 조건

1. 현재 브랜치: `feature/phase-15-backtest-weights`
2. 본 spec 승인 → plan 작성 → subagent 주도 실행
3. Phase 13+14는 이미 main에 머지됨 (데이터 파이프라인 유지됨)

---

## ❓ 확정 전 확인

1. **백테스트 범위 (5년)** — 더 길거나 짧게?
2. **수동 지정 팩터 기간** (위 표) — 수정할 것?
3. **per-stock 반응도 범위** — 대형주 30개 OK? 전체 2500개로 확장?
4. **자동 weight 적용** — 수동 검토 유지 OK? (자동 적용도 고려 가능)
5. **`/environment/backtest` 페이지** — SideNav에 추가? Footer 링크만?
