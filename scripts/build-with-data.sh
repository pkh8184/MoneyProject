#!/bin/bash
set -uo pipefail

echo "📦 Cloning data branch (depth=1)..."
REPO_OWNER="pkh8184"
REPO_NAME="MoneyProject"
DATA_BRANCH="${DATA_BRANCH:-data}"
TMP="/tmp/data-clone-$$"

mkdir -p public/data

if git clone --depth=1 --branch="$DATA_BRANCH" --single-branch \
     "https://github.com/${REPO_OWNER}/${REPO_NAME}.git" "$TMP" 2>&1 | tail -5; then
  if [ -d "$TMP/public/data" ]; then
    rm -rf public/data
    mkdir -p public/data
    cp -r "$TMP/public/data/." public/data/ 2>/dev/null || true

    echo "✓ Data cloned:"
    for f in stocks.json indicators.json fundamentals.json sectors.json pattern_stats.json updated_at.json; do
      if [ -f "public/data/$f" ]; then
        size=$(wc -c < "public/data/$f")
        echo "  ✓ $f ($size bytes)"
      else
        echo "  ⚠ $f missing"
      fi
    done
    if [ -d public/data/ohlcv ]; then
      count=$(find public/data/ohlcv -name '*.json' | wc -l)
      echo "  ✓ ohlcv/ ($count per-stock files)"
    else
      echo "  ⚠ ohlcv/ directory missing (first deploy before cron runs?)"
    fi
  else
    echo "⚠️ public/data not found in cloned branch"
  fi
  rm -rf "$TMP"
else
  echo "⚠️ Data branch clone failed — continuing with empty"
fi

echo "🏗️ Running Next.js build..."
npm run build
