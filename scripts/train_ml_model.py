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
