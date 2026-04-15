#!/bin/bash
set -uo pipefail

echo "📦 Fetching data branch files via GitHub raw..."
mkdir -p public/data

REPO_OWNER="pkh8184"
REPO_NAME="MoneyProject"
DATA_BRANCH="${DATA_BRANCH:-data}"
BASE_URL="https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${DATA_BRANCH}/public/data"

FILES=(
  "stocks.json"
  "ohlcv.json"
  "indicators.json"
  "fundamentals.json"
  "updated_at.json"
)

for file in "${FILES[@]}"; do
  url="${BASE_URL}/${file}"
  echo "Downloading ${file}..."
  if curl -fsSL "${url}" -o "public/data/${file}"; then
    size=$(wc -c < "public/data/${file}" 2>/dev/null || echo "?")
    echo "  ✓ ${file} (${size} bytes)"
  else
    echo "  ⚠️ ${file} failed (404?) — creating empty"
    if [[ "${file}" == *.json ]]; then
      echo "{}" > "public/data/${file}"
    fi
  fi
done

echo "🏗️ Running Next.js build..."
npm run build
