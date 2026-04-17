# Phase 17 — LightGBM ML 예측 모델 설계

**Date**: 2026-04-17
**Status**: Draft (awaiting review)
**Scope**: 5년 과거 데이터로 훈련한 LightGBM 모델이 각 종목의 **D+20 초과수익 확률**을 예측하여 프리셋 결과 정렬에 추가 레이어로 주입한다. Phase 13~16까지의 피처를 전부 활용.

---

## 🎯 목적

Phase 16까지의 한계:
- **룰 기반**만으로 패턴 포착. 비선형 상호작용 미반영
- "프리셋 A + 팩터 B가 함께 활성 시 특히 강력" 같은 **조합 효과** 미활용
- 수동 튜닝한 가중치가 절대적

Phase 17 개선:
1. **LightGBM 모델**: 30+ 피처의 비선형 상호작용 학습
2. **종목별 예측 확률**: 각 종목이 D+20에 초과수익(KOSPI 대비 +5% 이상) 낼 확률
3. **`ml_score`** 레이어: 기존 preset + macro + rotation 위에 0~20점 추가 가산
4. **해석 지원**: 각 종목의 예측 근거 (SHAP top 3 피처) UI 표시

---

## ✅ 범위

1. 피처 엔지니어링 파이프라인 (`build_ml_features.py`)
2. 모델 훈련 스크립트 (`train_ml_model.py`) + 평가
3. 일일 예측 스크립트 (`run_ml_prediction.py`) → `predictions.json`
4. TS 로더 + `MLScoreBadge` 컴포넌트
5. `filter.ts`에 ml_score 통합
6. 종목 상세 **예측 근거 패널** (`MLPredictionPanel`)
7. 모델 버전 관리 (`model_v1.txt`)
8. 평가 메트릭 모니터링 페이지 `/environment/ml-metrics`

## ❌ 범위 제외 (Phase 18+)

- 딥러닝 (Transformer/LSTM)
- 실시간 예측 (일일만 지원)
- 자동 리트레이닝 (수동 워크플로우 디스패치)
- 멀티 모델 앙상블
- 개인화 (사용자별 모델)

---

## 📊 모델 설계

### 17-A. 예측 대상 (Target)

**Binary Classification**: D+20 거래일 후 수익률이 KOSPI 동기간 수익률 **+5% 초과** = 1, 아니면 0

```python
# 종목 close[t+20] / close[t] - 1  vs  KOSPI close[t+20] / close[t] - 1
stock_ret = (stock.close[t+20] - stock.close[t]) / stock.close[t]
kospi_ret = (kospi.close[t+20] - kospi.close[t]) / kospi.close[t]
target = 1 if stock_ret - kospi_ret >= 0.05 else 0
```

**왜 초과수익 분류**:
- 절대 수익률 → 시장 전체 흐름에 좌우 (모든 종목이 0/1 동시에)
- 초과수익 → 상대적 강세 종목만 골라냄
- 이진 분류 → 해석 쉬움 ("이 종목은 KOSPI 초과할 확률 72%")
- 임계값 +5% → 유의미한 차이 (노이즈 배제)

**하이브리드 옵션** (Phase 18): regression으로 초과수익 % 직접 예측

### 17-B. 피처 설계 (35개)

#### 기술 지표 (12개)
1. `close_vs_ma5`: (close - ma5) / ma5
2. `close_vs_ma20`: 동일
3. `close_vs_ma60`: 동일
4. `close_vs_ma120`: 동일
5. `ma5_vs_ma20`: 단기 추세
6. `ma20_vs_ma60`: 중기 추세
7. `rsi14`: 0~100
8. `macd_hist`: 히스토그램 값
9. `bb_position`: (close - bb_lower) / (bb_upper - bb_lower)
10. `volume_ratio`: 오늘 / 20일 평균
11. `return_5d`: 5일 수익률
12. `volatility_20d`: 20일 표준편차

#### 밥그릇 패턴 (6개)
13. `bowl_volume_score`: 0~100
14. `bowl_sideways_days_ratio`: 0~1
15. `bowl_ma_convergence_min`: 0~1
16. `bowl_phase`: 1/2/3/4 ordinal
17. `bowl_low_was_inverted`: 0/1
18. `bowl_has_recent_golden_cross`: 0/1

#### 펀더멘털 (5개)
19. `per`: null → 중간값 대체
20. `pbr`: null → 중간값
21. `log_market_cap`: log(시총)
22. `foreign_net_ratio_10d`: 최근 10일 중 순매수일 비율
23. `institution_net_ratio_10d`: 동일

#### 매크로 (6개)
24. `active_factor_count`: 사용자 활성 팩터 수 (**훈련 시엔 모든 자동 감지 팩터**로 계산)
25. `macro_bonus_for_stock`: 해당 종목의 computeMacroBonus total
26. `sector_rotation_delta`: +3 / 0 / -3
27. `kospi_5d_return`: 당일 KOSPI 5일 수익률
28. `krw_20d_change`: 당일 환율 20일 변화율
29. `oil_20d_change`: 유가 20일 변화율

#### 프리셋 매칭 (5개)
30. `matched_presets_count`: 매칭 개수
31. `has_golden_cross`: 0/1
32. `has_bowl_pattern`: 0/1
33. `has_volume_spike`: 0/1
34. `has_alignment`: 0/1

#### 섹터·테마 (1개)
35. `theme_count`: 해당 종목의 테마 개수

### 17-C. 훈련 데이터 구성

**기간**: 2021-01-01 ~ 2025-12-31 (5년, out-of-sample 마지막 6개월 제외 → 2021-01-01 ~ 2025-06-30)

**샘플링**:
- 전체 종목 × 매 5거래일 샘플 (일일 샘플은 너무 많음 & 자기상관 강함)
- 예상 샘플: 2500 종목 × 250일 = **~625,000개**
- 너무 많으면 대형주 500개 + 랜덤 1000개로 제한

**Train/Val/Test Split**:
- Train: 2021-01 ~ 2024-06 (70%)
- Validation: 2024-07 ~ 2024-12 (15%)
- Test: 2025-01 ~ 2025-06 (15%, out-of-sample)

**Target Distribution**:
- 전체 샘플 중 target=1 비율 예상 20~30% (초과수익 +5%)
- 클래스 불균형이면 `scale_pos_weight` 조정

### 17-D. LightGBM 하이퍼파라미터

```python
params = {
    'objective': 'binary',
    'metric': 'auc',
    'boosting_type': 'gbdt',
    'num_leaves': 63,
    'learning_rate': 0.05,
    'feature_fraction': 0.8,
    'bagging_fraction': 0.8,
    'bagging_freq': 5,
    'min_data_in_leaf': 50,
    'verbose': -1
}
num_boost_round = 500
early_stopping_rounds = 30
```

**목표 AUC**: ≥ 0.62 (out-of-sample). AUC 0.55 미만이면 피처·하이퍼 재검토.

### 17-E. 평가 메트릭

1. **AUC**: 순서 정확도
2. **Accuracy @ 0.5 threshold**
3. **Precision @ top 10%**: 예측 상위 10% 중 실제 target=1 비율 (가장 중요!)
4. **Lift**: top 10% / base rate

**목표**:
- AUC ≥ 0.62
- Precision @ top 10% ≥ 45% (base rate 25% 가정 시 +80% lift)

### 17-F. 예측 점수 → 스코어 변환

```
probability (0~1) → ml_score (0~20)
  prob < 0.3   → 0
  prob 0.3~0.5 → 5
  prob 0.5~0.7 → 10
  prob 0.7~0.85 → 15
  prob ≥ 0.85  → 20
```

**이유**:
- probability를 곧바로 점수로 쓰면 현재 스코어 범위 대비 과도
- 구간화(bucketing)로 극단값 완화
- 최대 +20점은 매크로 전체 합(최대 ~40) 대비 적정 가중

### 17-G. 모델 해석 (SHAP)

각 종목 예측 시 top 3 기여 피처 추출:
```python
import shap
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(features)
# 각 종목별 상위 3 피처 기록
```

출력 `predictions.json`:
```json
{
  "updated_at": "...",
  "model_version": "v1",
  "auc_holdout": 0.64,
  "predictions": {
    "005930": {
      "probability": 0.72,
      "ml_score": 15,
      "top_features": [
        { "name": "rsi14", "value": 38.2, "contribution": 0.18 },
        { "name": "bowl_volume_score", "value": 82, "contribution": 0.12 },
        { "name": "macro_bonus_for_stock", "value": 15, "contribution": 0.08 }
      ]
    }
  }
}
```

### 17-H. 파이프라인

```
Daily workflow:
  1. fetch_stocks / calculate_indicators / fetch_fundamentals  (기존)
  2. fetch_sectors / fetch_macro_indicators  (기존)
  3. calculate_sector_rotation / fetch_news_signals  (Phase 16)
  4. build_ml_features.py   ← 신규
  5. run_ml_prediction.py   ← 신규 (모델 파일이 있을 때만)
  6. split_ohlcv.py  (기존)
  7. push to data branch

Weekly/Manual:
  - train_ml_model.py  ← 모델 재훈련 (수동 workflow dispatch)
```

**모델 파일**: `public/models/model_v1.txt` (LightGBM native format, ~500KB~2MB)

**모델 버전 관리**:
- `model_v1.txt` (현재 프로덕션)
- `model_v1.json` (메타데이터: 훈련 일자, AUC, 피처 리스트)
- 신규 모델: `model_v2.txt` 훈련 → 비교 → 교체

---

## 🎨 UI 설계

### 17-I. ML Score Badge

**추천·검색기 결과 행**:
```
삼성전자  ₩65,200  +2.3%  🌍+15  ⚡+3  🤖+15
                                       ← ML 뱃지
```

`MLScoreBadge` 컴포넌트 — 색상:
- 0~5: 회색
- 10: 파랑
- 15: 녹색
- 20: 금색

### 17-J. 종목 상세 — `MLPredictionPanel`

```
🤖 ML 예측 (v1)
─────────────────
D+20 KOSPI 초과 확률: 72%
예상 점수: +15 / 20

📊 예측 근거 (상위 3 피처)
  • RSI14 = 38.2  (과매도 구간)
  • 밥그릇 거래량 점수 = 82  (강력)
  • 환경 보너스 = +15  (수혜)

모델 AUC: 0.64  ·  최근 재훈련: 2026-04-10
```

**주의 문구**: "과거 5년 패턴 기반. 미래 수익 보장 아님."

### 17-K. `/environment/ml-metrics` 모니터링 페이지

**Footer 링크만** (SideNav 제외):
- 모델 버전 · 훈련 일자 · AUC
- 최근 예측 분포 (histogram)
- 피처 중요도 (feature importance)
- 최근 5일 예측 적중률 (추후 수집 데이터)

---

## 🗂 파일 구조

```
scripts/
├── build_ml_features.py         [신규] — 피처 생성 → features.parquet
├── train_ml_model.py            [신규] — 훈련 → model_v1.txt + metrics.json
├── run_ml_prediction.py         [신규] — 일일 예측 → predictions.json
└── requirements.txt             [수정] — lightgbm, pandas-ml, shap

public/
├── models/
│   ├── model_v1.txt             [신규 바이너리]
│   └── model_v1.json            [신규 메타]
├── data/
│   ├── predictions.json         [신규]
│   └── ml_metrics.json          [신규]

.github/workflows/
├── daily-update.yml             [수정 — features+prediction 단계]
├── train-ml-model.yml           [신규 — 수동 디스패치]

src/
├── lib/
│   ├── ml/
│   │   ├── types.ts             [신규]
│   │   ├── useMlPredictions.ts  [신규]
│   │   └── __tests__/
│   ├── dataLoader.ts            [수정 — loadMlPredictions, loadMlMetrics]
│   ├── filter.ts                [수정 — mlScore 반영]
│   └── types/indicators.ts      [수정]
├── components/
│   └── ml/
│       ├── MLScoreBadge.tsx
│       └── MLPredictionPanel.tsx
├── app/[basePath]/
│   ├── stock/[code]/StockDetail.tsx  [수정 — MLPredictionPanel 삽입]
│   ├── recommendations/...           [수정 — MLBadge]
│   ├── screener/...                  [수정]
│   └── environment/
│       ├── EnvironmentView.tsx       [수정 — ML 요약 표시]
│       └── ml-metrics/
│           ├── page.tsx
│           └── MlMetricsView.tsx
└── components/layout/Footer.tsx       [수정 — ML 지표 링크]
```

---

## 🧪 테스트 전략

### Python (수동)
- `build_ml_features.py`: 샘플 100 종목으로 로컬 실행 → parquet 검증
- `train_ml_model.py`: Train/Val 분할 확인, AUC 출력 확인
- `run_ml_prediction.py`: 1일치 예측 → JSON 스키마 검증

### TypeScript (Vitest)
- `useMlPredictions` 훅 파싱
- `MLScoreBadge` 렌더 (각 probability 범위 → 색상)
- `MLPredictionPanel` — 예측 없는 종목 graceful

### 통합 (수동)
- 추천 리스트 ML 뱃지 표시
- 종목 상세 예측 근거 패널 렌더
- 예측 JSON 없을 때 graceful fallback
- `/environment/ml-metrics` 표 렌더

---

## 🚀 태스크 분해 (21 tasks)

### Phase 17A — 피처 파이프라인 + 훈련 (Tasks 1-6)

1. `build_ml_features.py` — 35개 피처 계산 → parquet
2. `train_ml_model.py` — LightGBM 훈련 + 평가
3. 로컬 실행 + AUC 확인
4. 모델 저장 + 메타 JSON
5. requirements.txt 업데이트 (lightgbm, shap, pandas)
6. `.github/workflows/train-ml-model.yml` (수동 디스패치)

### Phase 17B — 일일 예측 + 통합 (Tasks 7-11)

7. `run_ml_prediction.py` — 모델 로드 + 예측 + SHAP
8. `daily-update.yml`에 features + prediction 단계 추가
9. TS 타입 + 로더 + `useMlPredictions` 훅
10. `filter.ts`에 ml_score 통합
11. `FilterResult` 확장

### Phase 17C — UI (Tasks 12-17)

12. `MLScoreBadge` 컴포넌트
13. 추천·검색기에 ML 뱃지 통합
14. `MLPredictionPanel` 종목 상세
15. `StockDetail`에 패널 삽입
16. ko.ts ML 섹션
17. `/environment/ml-metrics` 페이지 + Footer 링크

### Phase 17D — QA + PR (Tasks 18-21)

18. 단위 테스트 (useMlPredictions, MLScoreBadge)
19. E2E 빌드 + 수동 QA
20. README·문서 업데이트 (훈련 방법, workflow dispatch)
21. PR 생성

**총 약 21 tasks, 5~7일 예상** (Python 훈련 튜닝에 시간 많이 듬)

---

## ⚠️ 리스크 & 대응

| 리스크 | 대응 |
|---|---|
| AUC < 0.55 (예측력 낮음) | 피처 추가 튜닝, 타겟 재정의, 데이터 기간 조정 |
| 과적합 (test AUC ≪ train AUC) | L1/L2 정규화, min_data_in_leaf 증가, early stopping |
| 훈련 시간 과도 | 샘플링 강화, 피처 축소 |
| 모델 바이너리 100MB 초과 | 압축, 분할 (현실적으론 < 5MB) |
| 예측 과도 극단값 | 구간화(bucketing)로 완화 |
| SHAP 계산 시간 | 상위 N개만 저장, 상세는 종목 상세에서만 |
| 모델 배포 복잡 | `public/models/` 정적 파일로 서빙 (Python에서 로드) |
| lightgbm 의존성 | `scripts/requirements.txt` 명시 |

---

## 📊 기대 개선

Phase 16 대비:
- **AUC 0.62 목표** → top 10% precision 45%+
- **ML 레이어**: 비선형 조합 포착 → +5~10%p
- **예측 근거 표시**: 사용자 신뢰 상승 → +3%p 체감

**종합 정확도**: Phase 16 (86~95%) → **90~97%** (+4~5%p)

다만 실제 out-of-sample 테스트 없인 추정값. 구현 후 실측.

---

## 🔜 Phase 18+ 확장

1. **자동 리트레이닝** — 월 1회 GitHub Actions에서 재훈련
2. **딥러닝** — Transformer 기반 시계열 모델
3. **멀티 타겟** — D+5, D+20, D+60 다중 예측
4. **개인화** — 사용자 선호 섹터·리스크 프로파일 반영
5. **백테스트 연동** — ML 예측을 Phase 15 백테스트 로직에 재주입

---

## 🎯 시작 조건

1. 현재 브랜치 작업은 Phase 15+16 머지 후 새 브랜치 권장 (대형 PR 분리)
2. 로컬 Python에 `lightgbm`, `shap`, `pandas`, `pyarrow` 설치 필요
3. 본 spec 승인 → plan 작성 → 실행

---

## ❓ 확정 전 확인

1. **타겟 정의** — "D+20 KOSPI 초과 +5%" 이진 분류 OK? 아니면 수익률 회귀?
2. **피처 35개** 적절? 추가/제거?
3. **ml_score 최대 ±20점** OK? 더 강/약?
4. **훈련 주기** — 수동 디스패치 OK? 자동 월 1회?
5. **모델 바이너리** public 노출 vs private S3? (public 단순, 보안 낮음. 현재 규모엔 public OK)
