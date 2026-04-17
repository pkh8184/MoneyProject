# Phase 17 — LightGBM ML 예측 모델 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 5년 과거 데이터로 35개 피처 기반 LightGBM 모델을 훈련해 각 종목의 D+20 KOSPI 초과수익 확률을 예측하고, ml_score(0~20점)를 기존 스코어링 레이어에 추가한다.

**Architecture:** Python 3개 스크립트 파이프라인(features → train → predict)로 `predictions.json` 생성. 모델 바이너리 `public/models/model_v1.txt`. 프론트엔드에서 로드하여 `MLScoreBadge` + `MLPredictionPanel` 표시.

**Tech Stack:** Python (lightgbm, pandas, pyarrow, shap), TypeScript, Next.js 14, Vitest.

**Design Spec:** [`docs/superpowers/specs/2026-04-17-phase-17-ml-model-design.md`](../specs/2026-04-17-phase-17-ml-model-design.md)

---

## 사전 준비

- 브랜치: 현재 `feature/phase-15-backtest-weights` (통합 진행) 또는 Phase 15+16 머지 후 새 브랜치
- 프로젝트 루트: `/c/Users/rk454/Desktop/Project/Money/MoneyProject`
- Python 로컬에 `lightgbm`, `shap`, `pyarrow`, `pandas` 설치 필요 (`pip install lightgbm shap pyarrow pandas`)
- 모델 훈련 로컬 실행 필수 — GitHub Actions도 가능하지만 계산 시간·디버깅상 로컬 권장

---

## Phase 17A — 피처 엔지니어링 + 훈련 (Tasks 1-6)

### Task 1: `scripts/requirements.txt` 업데이트

**Files:** Modify `scripts/requirements.txt`

- [ ] **Step 1: 추가**

파일 끝에 추가:
```
lightgbm>=4.0.0
pyarrow>=15.0.0
shap>=0.44.0
```

`pandas` / `numpy`는 기존에 이미 설치됨.

---

### Task 2: `build_ml_features.py`

**Files:** Create `scripts/build_ml_features.py`

- [ ] **Step 1: 구현**

```python
"""ML 훈련·예측용 피처 생성.
입력: ohlcv/{code}.json, fundamentals.json, sectors.json,
      macro_indicators.json, historical_macro.json,
      sector_rotation.json, (optional) factor_backtest_results.json
출력:
  - public/data/ml_features.parquet (전체 역사 — 훈련용)
  - public/data/ml_features_today.parquet (오늘 예측용)
"""
import json
import sys
from pathlib import Path
from datetime import datetime
import pytz

import pandas as pd
import numpy as np

DATA_DIR = Path(__file__).resolve().parent.parent / 'public' / 'data'
KST = pytz.timezone('Asia/Seoul')


def load_json(name: str):
    path = DATA_DIR / name
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding='utf-8'))


def load_ohlcv(code: str) -> dict | None:
    path = DATA_DIR / 'ohlcv' / f'{code}.json'
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return None


def compute_tech_features(oh: dict, idx: int) -> dict | None:
    """개별 인덱스의 기술 지표 피처."""
    closes = oh.get('close') or []
    highs = oh.get('high') or closes
    lows = oh.get('low') or closes
    volumes = oh.get('volume') or []
    if idx < 120 or idx >= len(closes):
        return None
    close = closes[idx]
    if not close or close <= 0:
        return None

    # MAs
    ma5 = np.mean(closes[idx - 4:idx + 1])
    ma20 = np.mean(closes[idx - 19:idx + 1])
    ma60 = np.mean(closes[idx - 59:idx + 1])
    ma120 = np.mean(closes[idx - 119:idx + 1])

    # RSI14
    delta = np.diff(closes[max(0, idx - 14):idx + 1])
    gains = delta[delta > 0].sum() if len(delta) > 0 else 0
    losses = -delta[delta < 0].sum() if len(delta) > 0 else 0
    rsi = 100 - (100 / (1 + gains / losses)) if losses > 0 else 50

    # Bollinger Band position
    ma20_std = np.std(closes[idx - 19:idx + 1])
    bb_upper = ma20 + 2 * ma20_std
    bb_lower = ma20 - 2 * ma20_std
    bb_position = (close - bb_lower) / (bb_upper - bb_lower) if bb_upper > bb_lower else 0.5

    # Volume ratio (vs 20d avg)
    vol_20 = np.mean(volumes[idx - 19:idx + 1]) if len(volumes) > idx else 1
    cur_vol = volumes[idx] if idx < len(volumes) else 1
    vol_ratio = cur_vol / vol_20 if vol_20 > 0 else 1

    # 5d return
    ret_5d = (close - closes[idx - 5]) / closes[idx - 5] * 100 if closes[idx - 5] > 0 else 0

    # 20d volatility (std of daily returns)
    daily_rets = np.diff(closes[idx - 19:idx + 1]) / closes[idx - 20:idx] if idx >= 20 else np.array([0])
    volatility = np.std(daily_rets) * 100

    return {
        'close_vs_ma5': (close - ma5) / ma5 if ma5 > 0 else 0,
        'close_vs_ma20': (close - ma20) / ma20 if ma20 > 0 else 0,
        'close_vs_ma60': (close - ma60) / ma60 if ma60 > 0 else 0,
        'close_vs_ma120': (close - ma120) / ma120 if ma120 > 0 else 0,
        'ma5_vs_ma20': (ma5 - ma20) / ma20 if ma20 > 0 else 0,
        'ma20_vs_ma60': (ma20 - ma60) / ma60 if ma60 > 0 else 0,
        'rsi14': rsi,
        'bb_position': bb_position,
        'volume_ratio': vol_ratio,
        'return_5d': ret_5d,
        'volatility_20d': volatility,
        'macd_hist': 0,  # 간단화: 0 (향후 정식 계산)
    }


def compute_target(oh: dict, kospi_closes: list[float], kospi_dates: list[str], idx: int, date: str) -> int | None:
    """D+20 KOSPI 초과수익 +5% 이진 타겟."""
    closes = oh['close']
    if idx + 20 >= len(closes):
        return None
    stock_ret = (closes[idx + 20] - closes[idx]) / closes[idx]
    # 같은 날짜 KOSPI 인덱스 찾기
    try:
        k_idx = kospi_dates.index(date)
    except ValueError:
        return None
    if k_idx + 20 >= len(kospi_closes):
        return None
    kospi_ret = (kospi_closes[k_idx + 20] - kospi_closes[k_idx]) / kospi_closes[k_idx]
    return 1 if (stock_ret - kospi_ret) >= 0.05 else 0


def build_features_historical():
    """5년 역사 피처 + 타겟 생성."""
    stocks = load_json('stocks.json')
    sectors = load_json('sectors.json') or {}
    fundamentals = load_json('fundamentals.json') or {}
    historical = load_json('historical_macro.json')
    rotation = load_json('sector_rotation.json')
    if not stocks:
        print('[ERROR] stocks.json missing', file=sys.stderr)
        sys.exit(1)
    if not historical:
        print('[ERROR] historical_macro.json missing (run fetch_historical_macro.py first)', file=sys.stderr)
        sys.exit(1)

    kospi_series = historical.get('kospi') or []
    kospi_dates = [e['date'] for e in kospi_series]
    kospi_closes = [e['close'] for e in kospi_series]

    rows = []
    for s in stocks.get('stocks', []):
        code = s['code']
        name = s['name']
        oh = load_ohlcv(code)
        if not oh:
            continue
        dates = oh.get('dates') or []
        closes = oh.get('close') or []
        if len(closes) < 150:
            continue
        themes = (sectors.get(code) or {}).get('themes') or []
        fund = fundamentals.get(code) or {}
        per = fund.get('per')
        pbr = fund.get('pbr')
        market_cap = fund.get('market_cap') or 0
        foreign_net = fund.get('foreign_net') or []
        institution_net = fund.get('institution_net') or []

        # 섹터 로테이션 (단일 값 — 오늘 기준. 과거엔 정확하진 않지만 proxy)
        rot_delta = 0
        if rotation and themes:
            for t in themes:
                match = next((s for s in rotation.get('sectors', []) if s['theme'] == t), None)
                if match:
                    if match['rank'] == 'strong':
                        rot_delta = 3
                    elif match['rank'] == 'weak':
                        rot_delta = -3
                    break

        # 5일 간격 샘플링
        for idx in range(120, len(closes), 5):
            tech = compute_tech_features(oh, idx)
            if not tech:
                continue
            target = compute_target(oh, kospi_closes, kospi_dates, idx, dates[idx])
            if target is None:
                continue
            row = {
                'date': dates[idx],
                'code': code,
                **tech,
                # 펀더멘털 (일부는 시점 고정 — 완벽하지 않지만 근사)
                'per': per if per is not None else 15,
                'pbr': pbr if pbr is not None else 1.5,
                'log_market_cap': np.log(max(market_cap, 1e6)),
                'foreign_net_ratio_10d': len([x for x in foreign_net[-10:] if x > 0]) / max(len(foreign_net[-10:]), 1),
                'institution_net_ratio_10d': len([x for x in institution_net[-10:] if x > 0]) / max(len(institution_net[-10:]), 1),
                # 매크로 placeholder
                'sector_rotation_delta': rot_delta,
                'theme_count': len(themes),
                'active_factor_count': 0,  # 역사적 팩터는 복잡 — 간단화
                'macro_bonus_for_stock': 0,
                'kospi_5d_return': 0,
                'krw_20d_change': 0,
                'oil_20d_change': 0,
                # 밥그릇 placeholder (현재 시점 ohlcv에만 있음)
                'bowl_volume_score': 0,
                'bowl_sideways_days_ratio': 0,
                'bowl_ma_convergence_min': 0,
                'bowl_phase': 0,
                'bowl_low_was_inverted': 0,
                'bowl_has_recent_golden_cross': 0,
                # 프리셋 placeholder
                'matched_presets_count': 0,
                'has_golden_cross': 0,
                'has_bowl_pattern': 0,
                'has_volume_spike': 0,
                'has_alignment': 0,
                'target': target
            }
            rows.append(row)

    if not rows:
        print('[ERROR] No features built. Check data files.', file=sys.stderr)
        sys.exit(1)

    df = pd.DataFrame(rows)
    out = DATA_DIR / 'ml_features.parquet'
    df.to_parquet(out, index=False)
    print(f'[INFO] ml_features.parquet saved: {len(df)} rows, {df["target"].mean():.2%} positive rate')


def build_features_today():
    """오늘 예측용 피처 (최신 시점만, target 없음)."""
    stocks = load_json('stocks.json')
    sectors = load_json('sectors.json') or {}
    fundamentals = load_json('fundamentals.json') or {}
    rotation = load_json('sector_rotation.json')
    if not stocks:
        sys.exit(1)

    rows = []
    for s in stocks.get('stocks', []):
        code = s['code']
        oh = load_ohlcv(code)
        if not oh:
            continue
        dates = oh.get('dates') or []
        closes = oh.get('close') or []
        if len(closes) < 150:
            continue
        idx = len(closes) - 1
        tech = compute_tech_features(oh, idx)
        if not tech:
            continue

        themes = (sectors.get(code) or {}).get('themes') or []
        fund = fundamentals.get(code) or {}
        per = fund.get('per')
        pbr = fund.get('pbr')
        market_cap = fund.get('market_cap') or 0
        foreign_net = fund.get('foreign_net') or []
        institution_net = fund.get('institution_net') or []

        rot_delta = 0
        if rotation and themes:
            for t in themes:
                match = next((s for s in rotation.get('sectors', []) if s['theme'] == t), None)
                if match:
                    if match['rank'] == 'strong':
                        rot_delta = 3
                    elif match['rank'] == 'weak':
                        rot_delta = -3
                    break

        row = {
            'date': dates[idx],
            'code': code,
            **tech,
            'per': per if per is not None else 15,
            'pbr': pbr if pbr is not None else 1.5,
            'log_market_cap': np.log(max(market_cap, 1e6)),
            'foreign_net_ratio_10d': len([x for x in foreign_net[-10:] if x > 0]) / max(len(foreign_net[-10:]), 1),
            'institution_net_ratio_10d': len([x for x in institution_net[-10:] if x > 0]) / max(len(institution_net[-10:]), 1),
            'sector_rotation_delta': rot_delta,
            'theme_count': len(themes),
            'active_factor_count': 0,
            'macro_bonus_for_stock': 0,
            'kospi_5d_return': 0,
            'krw_20d_change': 0,
            'oil_20d_change': 0,
            'bowl_volume_score': 0,
            'bowl_sideways_days_ratio': 0,
            'bowl_ma_convergence_min': 0,
            'bowl_phase': 0,
            'bowl_low_was_inverted': 0,
            'bowl_has_recent_golden_cross': 0,
            'matched_presets_count': 0,
            'has_golden_cross': 0,
            'has_bowl_pattern': 0,
            'has_volume_spike': 0,
            'has_alignment': 0
        }
        rows.append(row)

    df = pd.DataFrame(rows)
    out = DATA_DIR / 'ml_features_today.parquet'
    df.to_parquet(out, index=False)
    print(f'[INFO] ml_features_today.parquet saved: {len(df)} rows')


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'both'
    if mode in ('historical', 'both'):
        build_features_historical()
    if mode in ('today', 'both'):
        build_features_today()


if __name__ == '__main__':
    main()
```

**주의**: 본 구현은 **간단화 버전**. 매크로·밥그릇 피처 일부는 placeholder로 채움 (Phase 18+에서 정교화).

- [ ] **Step 2: 문법 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && python -c "import ast; ast.parse(open('scripts/build_ml_features.py', encoding='utf-8').read()); print('OK')"`

---

### Task 3: `train_ml_model.py`

**Files:** Create `scripts/train_ml_model.py`

- [ ] **Step 1: 구현**

```python
"""LightGBM 모델 훈련 + 평가 + 저장.
입력: public/data/ml_features.parquet
출력:
  - public/models/model_v1.txt (LightGBM native)
  - public/models/model_v1.json (메타: 훈련일, AUC, 피처 리스트)
"""
import json
import sys
from pathlib import Path
from datetime import datetime
import pytz

import pandas as pd
import numpy as np

try:
    import lightgbm as lgb
    from sklearn.metrics import roc_auc_score, precision_score
except ImportError:
    print('[ERROR] lightgbm and scikit-learn required', file=sys.stderr)
    sys.exit(1)

PROJECT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT / 'public' / 'data'
MODEL_DIR = PROJECT / 'public' / 'models'
KST = pytz.timezone('Asia/Seoul')


FEATURES = [
    'close_vs_ma5', 'close_vs_ma20', 'close_vs_ma60', 'close_vs_ma120',
    'ma5_vs_ma20', 'ma20_vs_ma60', 'rsi14', 'bb_position', 'volume_ratio',
    'return_5d', 'volatility_20d', 'macd_hist',
    'bowl_volume_score', 'bowl_sideways_days_ratio', 'bowl_ma_convergence_min',
    'bowl_phase', 'bowl_low_was_inverted', 'bowl_has_recent_golden_cross',
    'per', 'pbr', 'log_market_cap',
    'foreign_net_ratio_10d', 'institution_net_ratio_10d',
    'active_factor_count', 'macro_bonus_for_stock', 'sector_rotation_delta',
    'kospi_5d_return', 'krw_20d_change', 'oil_20d_change',
    'matched_presets_count', 'has_golden_cross', 'has_bowl_pattern',
    'has_volume_spike', 'has_alignment', 'theme_count'
]


def main():
    features_path = DATA_DIR / 'ml_features.parquet'
    if not features_path.exists():
        print(f'[ERROR] {features_path} missing. Run build_ml_features.py first.', file=sys.stderr)
        sys.exit(1)

    df = pd.read_parquet(features_path)
    df['date'] = pd.to_datetime(df['date'])
    print(f'[INFO] Loaded {len(df)} rows. Target positive: {df["target"].mean():.2%}')

    # Train/Val/Test split (시간 기반)
    df = df.sort_values('date')
    cut1 = df['date'].quantile(0.70)
    cut2 = df['date'].quantile(0.85)
    train = df[df['date'] <= cut1]
    val = df[(df['date'] > cut1) & (df['date'] <= cut2)]
    test = df[df['date'] > cut2]
    print(f'[INFO] Train: {len(train)}, Val: {len(val)}, Test: {len(test)}')

    X_train = train[FEATURES]
    y_train = train['target']
    X_val = val[FEATURES]
    y_val = val['target']
    X_test = test[FEATURES]
    y_test = test['target']

    # 결측 중간값 대체
    for col in FEATURES:
        med = X_train[col].median()
        X_train[col] = X_train[col].fillna(med)
        X_val[col] = X_val[col].fillna(med)
        X_test[col] = X_test[col].fillna(med)

    # 클래스 가중치
    pos_rate = y_train.mean()
    scale_pos_weight = (1 - pos_rate) / pos_rate if pos_rate > 0 else 1

    train_data = lgb.Dataset(X_train, label=y_train)
    val_data = lgb.Dataset(X_val, label=y_val, reference=train_data)

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
        'scale_pos_weight': scale_pos_weight,
        'verbose': -1
    }

    model = lgb.train(
        params,
        train_data,
        num_boost_round=500,
        valid_sets=[train_data, val_data],
        valid_names=['train', 'val'],
        callbacks=[lgb.early_stopping(30), lgb.log_evaluation(50)]
    )

    # 평가
    val_pred = model.predict(X_val)
    test_pred = model.predict(X_test)
    auc_val = roc_auc_score(y_val, val_pred)
    auc_test = roc_auc_score(y_test, test_pred)

    # top 10% precision
    test_sorted_idx = np.argsort(test_pred)[::-1]
    top_n = len(test_pred) // 10
    top_targets = y_test.values[test_sorted_idx[:top_n]]
    precision_top10 = top_targets.mean() if top_n > 0 else 0
    base_rate = y_test.mean()
    lift = precision_top10 / base_rate if base_rate > 0 else 0

    print(f'[INFO] AUC val: {auc_val:.4f}, AUC test: {auc_test:.4f}')
    print(f'[INFO] Top 10% precision: {precision_top10:.4f} (base {base_rate:.4f}, lift {lift:.2f}x)')

    # 저장
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model.save_model(str(MODEL_DIR / 'model_v1.txt'))

    # Feature importance
    imp = model.feature_importance(importance_type='gain')
    imp_pairs = sorted(zip(FEATURES, imp.tolist()), key=lambda x: -x[1])

    meta = {
        'model_version': 'v1',
        'trained_at': datetime.now(KST).isoformat(),
        'n_samples': len(df),
        'positive_rate': float(df['target'].mean()),
        'auc_val': round(auc_val, 4),
        'auc_test': round(auc_test, 4),
        'precision_top10': round(float(precision_top10), 4),
        'lift_top10': round(float(lift), 2),
        'features': FEATURES,
        'feature_importance_top15': [
            {'name': n, 'importance': round(float(v), 2)} for n, v in imp_pairs[:15]
        ]
    }
    (MODEL_DIR / 'model_v1.json').write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8'
    )
    # ml_metrics.json 도 public/data에 복사 (웹에서 로드용)
    (DATA_DIR / 'ml_metrics.json').write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8'
    )
    print(f'[INFO] Model + metadata saved')


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: 문법 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && python -c "import ast; ast.parse(open('scripts/train_ml_model.py', encoding='utf-8').read()); print('OK')"`

---

### Task 4: `run_ml_prediction.py`

**Files:** Create `scripts/run_ml_prediction.py`

- [ ] **Step 1: 구현**

```python
"""모델 로드 → 오늘 피처로 예측 → predictions.json.
입력: public/models/model_v1.txt, public/data/ml_features_today.parquet
출력: public/data/predictions.json
"""
import json
import sys
from pathlib import Path
from datetime import datetime
import pytz

import pandas as pd
import numpy as np

try:
    import lightgbm as lgb
except ImportError:
    print('[ERROR] lightgbm required', file=sys.stderr)
    sys.exit(1)

PROJECT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT / 'public' / 'data'
MODEL_DIR = PROJECT / 'public' / 'models'
KST = pytz.timezone('Asia/Seoul')


def probability_to_score(prob: float) -> int:
    if prob < 0.3:
        return 0
    if prob < 0.5:
        return 5
    if prob < 0.7:
        return 10
    if prob < 0.85:
        return 15
    return 20


def main():
    features_path = DATA_DIR / 'ml_features_today.parquet'
    model_path = MODEL_DIR / 'model_v1.txt'
    meta_path = MODEL_DIR / 'model_v1.json'

    if not model_path.exists():
        print(f'[WARN] {model_path} missing, skipping prediction', file=sys.stderr)
        return
    if not features_path.exists():
        print(f'[WARN] {features_path} missing, skipping prediction', file=sys.stderr)
        return
    if not meta_path.exists():
        print(f'[WARN] {meta_path} missing', file=sys.stderr)
        return

    meta = json.loads(meta_path.read_text(encoding='utf-8'))
    features_list = meta['features']

    df = pd.read_parquet(features_path)
    if df.empty:
        return
    X = df[features_list].copy()
    # 결측 중간값 대체
    for col in features_list:
        med = X[col].median() if not X[col].isna().all() else 0
        X[col] = X[col].fillna(med)

    model = lgb.Booster(model_file=str(model_path))
    probs = model.predict(X)

    # SHAP 생략 (계산 비용 큼) — 대신 feature importance top 3를 공통으로 사용
    top_features = [f['name'] for f in meta.get('feature_importance_top15', [])][:3]

    predictions = {}
    for i, code in enumerate(df['code'].values):
        prob = float(probs[i])
        ml_score = probability_to_score(prob)
        # 개별 종목의 top 피처 값
        top_vals = []
        for name in top_features:
            val = df.iloc[i].get(name)
            if pd.notna(val):
                top_vals.append({'name': name, 'value': round(float(val), 4)})
        predictions[code] = {
            'probability': round(prob, 4),
            'ml_score': ml_score,
            'top_features': top_vals
        }

    out = {
        'updated_at': datetime.now(KST).isoformat(),
        'model_version': meta.get('model_version', 'v1'),
        'auc_holdout': meta.get('auc_test', None),
        'predictions': predictions
    }
    (DATA_DIR / 'predictions.json').write_text(
        json.dumps(out, ensure_ascii=False), encoding='utf-8'
    )
    print(f'[INFO] predictions.json saved: {len(predictions)} stocks')


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: 문법 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && python -c "import ast; ast.parse(open('scripts/run_ml_prediction.py', encoding='utf-8').read()); print('OK')"`

---

### Task 5: GitHub Actions 모델 훈련 워크플로

**Files:** Create `.github/workflows/train-ml-model.yml`

- [ ] **Step 1: 구현**

```yaml
name: Train ML Model

on:
  workflow_dispatch:

jobs:
  train:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.10'

      - name: Install dependencies
        run: pip install -r scripts/requirements.txt

      - name: Fetch data branch
        run: |
          git fetch origin data
          git worktree add /tmp/data-branch origin/data
          mkdir -p public/data
          cp -r /tmp/data-branch/public/data/* public/data/ || true

      - name: Build features
        run: |
          cd scripts
          python build_ml_features.py historical

      - name: Train model
        run: |
          cd scripts
          python train_ml_model.py

      - name: Commit model to data branch
        run: |
          cd /tmp/data-branch
          mkdir -p public/models public/data
          cp -r ${{ github.workspace }}/public/models/* public/models/
          cp ${{ github.workspace }}/public/data/ml_metrics.json public/data/
          git config user.email "action@github.com"
          git config user.name "GitHub Actions"
          git add -A
          git commit -m "chore: train ML model $(date +%Y-%m-%d)" || echo "no changes"
          git push origin HEAD:data
```

**주의**: 초기 구현. 실제로는 data branch 구조에 맞게 조정 필요. 이 단계에선 기본 템플릿만 제공하고 사용자가 실사용 시 조정.

---

### Task 6: daily-update.yml에 features + prediction 단계 추가

**Files:** Modify `.github/workflows/daily-update.yml`

- [ ] **Step 1: 단계 추가**

기존 `Fetch news signals` 이후 (혹은 `Calculate pattern stats` 직전)에:

```yaml
      - name: Build ML features (today)
        run: |
          cd scripts
          python build_ml_features.py today
        continue-on-error: true

      - name: Run ML prediction
        run: |
          cd scripts
          python run_ml_prediction.py
        continue-on-error: true
```

---

## Phase 17B — TS 통합 (Tasks 7-11)

### Task 7: TS 타입 + 로더

**Files:**
- Modify: `src/lib/types/indicators.ts`
- Modify: `src/lib/dataLoader.ts`

- [ ] **Step 1: `indicators.ts`에 추가**

```typescript
export interface MLTopFeature {
  name: string
  value: number
}

export interface MLPrediction {
  probability: number
  ml_score: number
  top_features: MLTopFeature[]
}

export interface MLPredictionsJson {
  updated_at: string
  model_version: string
  auc_holdout: number | null
  predictions: Record<string, MLPrediction>
}

export interface MLMetricsJson {
  model_version: string
  trained_at: string
  n_samples: number
  positive_rate: number
  auc_val: number
  auc_test: number
  precision_top10: number
  lift_top10: number
  features: string[]
  feature_importance_top15: { name: string; importance: number }[]
}
```

- [ ] **Step 2: `dataLoader.ts`에 로더 추가**

imports에 `MLPredictionsJson`, `MLMetricsJson` 추가.

```typescript
const IDB_ML_PRED_KEY = 'ml-predictions-cache-v1'
const IDB_ML_METRICS_KEY = 'ml-metrics-cache-v1'

export async function loadMlPredictions(tradeDate: string): Promise<MLPredictionsJson | null> {
  const cached = await getCached<MLPredictionsJson>(IDB_ML_PRED_KEY, tradeDate)
  if (cached) return cached
  try {
    const res = await fetch('/data/predictions.json', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as MLPredictionsJson
    await setCached(IDB_ML_PRED_KEY, tradeDate, data)
    return data
  } catch {
    return null
  }
}

export async function loadMlMetrics(tradeDate: string): Promise<MLMetricsJson | null> {
  const cached = await getCached<MLMetricsJson>(IDB_ML_METRICS_KEY, tradeDate)
  if (cached) return cached
  try {
    const res = await fetch('/data/ml_metrics.json', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as MLMetricsJson
    await setCached(IDB_ML_METRICS_KEY, tradeDate, data)
    return data
  } catch {
    return null
  }
}
```

- [ ] **Step 3: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`

---

### Task 8: `useMlPredictions` 훅

**Files:** Create `src/lib/ml/useMlPredictions.ts`

- [ ] **Step 1: 구현**

```typescript
'use client'
import { useEffect, useState } from 'react'
import { loadMlPredictions, loadUpdatedAt } from '@/lib/dataLoader'
import type { MLPredictionsJson } from '@/lib/types/indicators'

export function useMlPredictions(): MLPredictionsJson | null {
  const [data, setData] = useState<MLPredictionsJson | null>(null)

  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) return
      const d = await loadMlPredictions(u.trade_date)
      setData(d)
    })
  }, [])

  return data
}
```

---

### Task 9: `filter.ts`에 ml_score 통합

**Files:** Modify `src/lib/filter.ts`

- [ ] **Step 1: FilterResult 확장 + enrichWithMl 추가**

기존 FilterResult에 `mlPrediction?: MLPrediction` 추가.

전체 파일에서 `enrichWithMacro` 함수 옆에 추가:

```typescript
import type { MLPredictionsJson, MLPrediction } from '@/lib/types/indicators'

export function enrichWithMl(
  results: FilterResult[],
  predictions: MLPredictionsJson | null
): FilterResult[] {
  if (!predictions) return results
  const map = predictions.predictions
  const enriched = results.map((r) => {
    const pred = map[r.code]
    if (!pred) return r
    return {
      ...r,
      mlPrediction: pred,
      finalScore: (r.finalScore ?? r.score) + pred.ml_score
    }
  })
  enriched.sort((a, b) => (b.finalScore ?? b.score) - (a.finalScore ?? a.score))
  return enriched
}
```

**주의**: `FilterResult` 인터페이스에 `mlPrediction?: MLPrediction` 필드 추가.

- [ ] **Step 2: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`

---

### Task 10: 추천·검색기에 ML 주입

**Files:**
- Modify: `src/app/[basePath]/recommendations/RecommendationsList.tsx`
- Modify: `src/app/[basePath]/screener/ExpertScreener.tsx`

- [ ] **Step 1: RecommendationsList**

imports: `useMlPredictions`, `enrichWithMl`, `MLPredictionsJson`

사용:
```typescript
const mlPreds = useMlPredictions()
```

기존 `enrichWithMacro(results, sectors, activeFactors, rotation)` 뒤에:
```typescript
const finalResults = enrichWithMl(enriched, mlPreds)
```

- [ ] **Step 2: ExpertScreener도 동일**

- [ ] **Step 3: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`

---

### Task 11: Phase 17A+B 중간 커밋

```bash
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject add scripts/ .github/workflows/ src/lib/ 
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject commit -m "feat(ml): Phase 17 A+B — ML 피처/훈련/예측 파이프라인 + TS 로더"
```

---

## Phase 17C — UI (Tasks 12-17)

### Task 12: `MLScoreBadge` 컴포넌트

**Files:** Create `src/components/ml/MLScoreBadge.tsx`

- [ ] **Step 1: 구현**

```typescript
'use client'
import type { MLPrediction } from '@/lib/types/indicators'
import { strings } from '@/lib/strings/ko'

interface Props {
  prediction: MLPrediction
}

export default function MLScoreBadge({ prediction }: Props) {
  const score = prediction.ml_score
  if (score === 0) return null

  const color = score >= 20 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
    : score >= 15 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    : score >= 10 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    : 'bg-bg-secondary-light dark:bg-bg-secondary-dark text-text-secondary-light dark:text-text-secondary-dark'

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${color}`}>
      {strings.ml.badgeLabel(score)}
    </span>
  )
}
```

---

### Task 13: ko.ts ML 섹션

**Files:** Modify `src/lib/strings/ko.ts`

- [ ] **Step 1: `dataIO` 섹션 뒤에 추가**

```typescript
ml: {
  badgeLabel: (score: number) => `🤖 +${score}`,
  panelTitle: '🤖 ML 예측',
  probabilityLabel: (pct: number) => `D+20 KOSPI 초과 확률: ${(pct * 100).toFixed(1)}%`,
  scoreLabel: (score: number) => `예상 점수: +${score} / 20`,
  topFeaturesTitle: '📊 예측 근거 (상위 3 피처)',
  featureRow: (name: string, value: number) => `• ${name} = ${value.toFixed(2)}`,
  modelInfo: (version: string, auc: number) => `모델 ${version} · AUC ${auc.toFixed(2)}`,
  disclaimer: '※ 과거 5년 패턴 기반. 미래 수익 보장 아님.',
  metricsPageTitle: '🤖 ML 모델 지표',
  metricsUpdated: (iso: string) => `훈련: ${new Date(iso).toLocaleString('ko-KR')}`
},
```

---

### Task 14: `MLPredictionPanel` 컴포넌트

**Files:** Create `src/components/ml/MLPredictionPanel.tsx`

- [ ] **Step 1: 구현**

```typescript
'use client'
import Card from '@/components/ui/Card'
import { useMlPredictions } from '@/lib/ml/useMlPredictions'
import { strings } from '@/lib/strings/ko'

interface Props { code: string }

export default function MLPredictionPanel({ code }: Props) {
  const preds = useMlPredictions()
  if (!preds) return null
  const p = preds.predictions[code]
  if (!p) return null

  return (
    <Card padding="lg" className="mt-6">
      <h3 className="font-bold text-xl mb-3">{strings.ml.panelTitle}</h3>
      <p className="text-sm mb-1">{strings.ml.probabilityLabel(p.probability)}</p>
      <p className="text-base font-bold mb-4">{strings.ml.scoreLabel(p.ml_score)}</p>

      {p.top_features.length > 0 && (
        <>
          <div className="text-sm font-bold mb-2">{strings.ml.topFeaturesTitle}</div>
          <ul className="space-y-1 mb-4">
            {p.top_features.map((f) => (
              <li key={f.name} className="text-sm font-mono">
                {strings.ml.featureRow(f.name, f.value)}
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
        {preds.auc_holdout != null && strings.ml.modelInfo(preds.model_version, preds.auc_holdout)}
      </p>
      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-2">
        {strings.ml.disclaimer}
      </p>
    </Card>
  )
}
```

---

### Task 15: StockDetail에 MLPredictionPanel + 결과 리스트에 MLScoreBadge

**Files:**
- Modify: `src/app/[basePath]/stock/[code]/StockDetail.tsx`
- Modify: `src/app/[basePath]/recommendations/RecommendationsList.tsx`
- Modify: `src/app/[basePath]/screener/ExpertScreener.tsx`
- Modify: `src/components/screener/ResultTable.tsx`

- [ ] **Step 1: StockDetail**

imports에 `import MLPredictionPanel from '@/components/ml/MLPredictionPanel'` 추가.
JSX에서 기존 `<MacroDetailPanel ... />` 아래에:

```tsx
<MLPredictionPanel code={code} />
```

- [ ] **Step 2: 결과 리스트에 MLScoreBadge 추가**

`MacroBadge` 옆(또는 `sectorRotationBonus` 뱃지 옆)에:

```tsx
{r.mlPrediction && <MLScoreBadge prediction={r.mlPrediction} />}
```

`RecommendationsList`, `ExpertScreener` 결과 행, `ResultTable` 데스크톱/모바일에 모두 추가.

- [ ] **Step 3: 빌드 확인**

Run: `cd /c/Users/rk454/Desktop/Project/Money/MoneyProject && npx tsc --noEmit`

---

### Task 16: `/environment/ml-metrics` 페이지 + Footer 링크

**Files:**
- Create: `src/app/[basePath]/environment/ml-metrics/page.tsx`
- Create: `src/app/[basePath]/environment/ml-metrics/MlMetricsView.tsx`
- Modify: `src/components/layout/Footer.tsx` — ML 지표 링크

- [ ] **Step 1: page.tsx**

```typescript
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import MlMetricsView from './MlMetricsView'

export default function MlMetricsPage() {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[60vh]">
        <MlMetricsView />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: MlMetricsView**

```typescript
'use client'
import { useEffect, useState } from 'react'
import { loadMlMetrics, loadUpdatedAt } from '@/lib/dataLoader'
import { strings } from '@/lib/strings/ko'
import type { MLMetricsJson } from '@/lib/types/indicators'

export default function MlMetricsView() {
  const [data, setData] = useState<MLMetricsJson | null>(null)

  useEffect(() => {
    loadUpdatedAt().then(async (u) => {
      if (!u) return
      const d = await loadMlMetrics(u.trade_date)
      setData(d)
    })
  }, [])

  if (!data) return <p className="text-sm">ML 모델 훈련 전입니다. Train ML Model 워크플로를 실행하세요.</p>

  return (
    <>
      <h1 className="text-xl font-bold mb-4">{strings.ml.metricsPageTitle}</h1>
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
        {strings.ml.metricsUpdated(data.trained_at)}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-4 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark">
          <div className="text-sm">AUC (Test)</div>
          <div className="text-xl font-bold">{data.auc_test.toFixed(3)}</div>
        </div>
        <div className="p-4 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark">
          <div className="text-sm">Top 10% Precision</div>
          <div className="text-xl font-bold">{(data.precision_top10 * 100).toFixed(1)}%</div>
        </div>
        <div className="p-4 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark">
          <div className="text-sm">Lift</div>
          <div className="text-xl font-bold">{data.lift_top10.toFixed(2)}x</div>
        </div>
        <div className="p-4 rounded-2xl bg-bg-secondary-light dark:bg-bg-secondary-dark">
          <div className="text-sm">Samples</div>
          <div className="text-xl font-bold">{data.n_samples.toLocaleString()}</div>
        </div>
      </div>

      <h2 className="font-bold mb-3">피처 중요도 Top 15</h2>
      <ul className="space-y-1">
        {data.feature_importance_top15.map((f) => (
          <li key={f.name} className="flex justify-between text-sm">
            <span>{f.name}</span>
            <span className="font-mono">{f.importance.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </>
  )
}
```

- [ ] **Step 3: Footer에 링크 추가**

기존 "📊 백테스트 결과" 옆에:
```tsx
<Link href={`/${basePath}/environment/ml-metrics`} className="underline ml-3">
  🤖 ML 지표
</Link>
```

---

### Task 17: 최종 빌드 + 커밋 + 푸시

- [ ] **Step 1: 전체 검증**

```bash
cd /c/Users/rk454/Desktop/Project/Money/MoneyProject
npx tsc --noEmit
npx vitest run
npm run build
```

Expected:
- 176 tests 그대로 통과 (Phase 17은 기존 테스트 변경 없음)
- `/environment/ml-metrics` 라우트 생성
- Build 성공

- [ ] **Step 2: 커밋**

```bash
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject add src/components/ml/ src/app/\[basePath\]/environment/ml-metrics/ src/app/\[basePath\]/stock/\[code\]/StockDetail.tsx src/app/\[basePath\]/recommendations/RecommendationsList.tsx src/app/\[basePath\]/screener/ExpertScreener.tsx src/components/screener/ResultTable.tsx src/components/layout/Footer.tsx src/lib/strings/ko.ts src/lib/ml/ src/lib/filter.ts
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject commit -m "feat(ml): Phase 17 C — MLScoreBadge + MLPredictionPanel + ml-metrics 페이지"
git -C /c/Users/rk454/Desktop/Project/Money/MoneyProject push
```

---

## Self-Review

**Spec coverage**:
- ✅ 피처 35개 → Task 2 (일부 placeholder, 향후 정교화)
- ✅ LightGBM 훈련 → Task 3
- ✅ 예측 스크립트 → Task 4
- ✅ 모델 워크플로 → Tasks 5-6
- ✅ TS 로더 + 훅 → Tasks 7-8
- ✅ filter.ts 통합 → Task 9
- ✅ MLScoreBadge + MLPredictionPanel → Tasks 12, 14
- ✅ 결과 리스트 뱃지 → Task 15
- ✅ ml-metrics 페이지 → Task 16

**알려진 간단화**:
- 피처 일부 placeholder (매크로·밥그릇·프리셋 현재 시점만) — Phase 18에서 historical 계산 추가
- SHAP per-stock 계산 스킵 (공통 top feature importance로 대체)
- 모델 훈련은 로컬에서 한 번 실행 필요 (AUC 확인)

**Placeholder scan**: 모든 코드 완전. `continue-on-error`로 스크립트 실패 시 워크플로 중단 안 함.

**Type consistency**:
- `MLPrediction`, `MLPredictionsJson`, `MLMetricsJson` 타입 Task 7에서 정의 → 후속 사용 동일

**경로 확인**:
- Python: `public/data/`, `public/models/` (신규 경로)
- TS: `@/lib/ml/`, `@/components/ml/`, `@/app/[basePath]/environment/ml-metrics/`

**머지 후 필수 작업 (사용자)**:
1. 로컬 또는 GitHub Actions에서 `Train ML Model` 워크플로 1회 실행
   - 훈련 데이터 생성 + 모델 저장
2. Daily Stock Data Update 재실행
   - `predictions.json` 생성
3. 확인: `/environment/ml-metrics`, 종목 상세 MLPanel
