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
