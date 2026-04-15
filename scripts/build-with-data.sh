#!/bin/bash
set -euo pipefail

echo "📦 Fetching data branch..."
git fetch origin data || true
if git show-ref --verify --quiet refs/remotes/origin/data; then
  git checkout origin/data -- public/data/ 2>/dev/null || echo "⚠️ data branch has no public/data/ — starting with empty"
else
  echo "⚠️ data branch not found yet — first deploy before cron runs"
  mkdir -p public/data
fi

echo "🏗️ Running Next.js build..."
npm run build
