# Phase 7 — 일일 데이터 자동화 + 배포 + 최종 정리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** 매일 평일 18:00 KST에 GitHub Actions가 데이터를 수집·계산하여 `data` 브랜치에 force push, Vercel이 자동 재배포하도록 한다. 프로젝트의 최종 README와 배포 가이드를 정리한다.

**Architecture:** `daily-update.yml` workflow가 Python 파이프라인 실행 → `public/data/*.json` 생성 → orphan commit으로 `data` 브랜치 force push → Vercel Deploy Hook 호출. Vercel 빌드 시 data 브랜치에서 `public/data/`를 pull.

**Tech Stack:** GitHub Actions + Python 3.11 + Vercel + bash scripts

**Branch:** `feature/phase-7-deploy-automation`

**Prerequisite:** Phase 1-6 완료

---

## 📁 File Structure

**워크플로**
- `.github/workflows/daily-update.yml` — 평일 18:00 KST 데이터 수집
- `.github/workflows/data-branch-sync.yml` — main 빌드 시 data 브랜치 파일 주입 (선택)

**스크립트**
- `scripts/holiday_exit_guard.py` — check_trading_day.py wrapper (Actions에서 사용)

**Next.js 빌드 커스터마이즈**
- `next.config.mjs` — data 브랜치 파일 읽기 관련 설정 (필요 시)

**최종 문서**
- `README.md` — 배포·환경변수·운영 가이드 완전 정리
- `Workprogress/Phase_7_2026-04-14.md`
- `DEPLOYMENT.md` — 배포 절차서 (Vercel Project 초기 셋업, Secrets 등록, GitHub 설정)

---

## Task 1: 브랜치 + holiday_exit_guard.py

- [ ] **Step 1: 브랜치**
```bash
cd c:/Users/rk454/Desktop/Project/Money/MoneyProject
git checkout feature/phase-6-cost-guard
git checkout -b feature/phase-7-deploy-automation
```

- [ ] **Step 2: Actions 용 휴장일 게이트**

Create `scripts/holiday_exit_guard.py`:
```python
"""
GitHub Actions 워크플로 내에서 휴장일 감지 후 exit.
사용: python scripts/holiday_exit_guard.py
거래일이면 exit 0 (계속 진행), 휴장일이면 exit 78 (Actions에서 job 중단)
"""
import sys
from datetime import datetime
import pytz
from check_trading_day import is_trading_day

kst = pytz.timezone('Asia/Seoul')
today = datetime.now(kst).strftime('%Y-%m-%d')

if is_trading_day(today):
    print(f'{today}: trading day — proceed')
    sys.exit(0)
else:
    print(f'{today}: holiday — skip workflow')
    sys.exit(78)  # 78은 GitHub Actions에서 중립 종료 코드
```

- [ ] **Step 3: Commit**
```bash
git add scripts/holiday_exit_guard.py
git commit -m "feat(phase-7): add holiday exit guard for Actions"
```

---

## Task 2: daily-update.yml Workflow

Create `.github/workflows/daily-update.yml`:
```yaml
name: Daily Stock Data Update

on:
  schedule:
    - cron: '0 9 * * 1-5'  # UTC 09:00 = KST 18:00 평일만
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
          cache-dependency-path: scripts/requirements.txt

      - name: Install Python deps
        run: pip install -r scripts/requirements.txt

      - name: Check trading day
        id: trading
        run: |
          cd scripts
          set +e
          python holiday_exit_guard.py
          exit_code=$?
          echo "exit_code=$exit_code" >> $GITHUB_OUTPUT
          if [ "$exit_code" -eq 78 ]; then
            echo "skip=true" >> $GITHUB_OUTPUT
          else
            echo "skip=false" >> $GITHUB_OUTPUT
          fi
          exit 0

      - name: Fetch stocks
        if: steps.trading.outputs.skip != 'true'
        run: |
          cd scripts
          python fetch_stocks.py

      - name: Calculate indicators
        if: steps.trading.outputs.skip != 'true'
        run: |
          cd scripts
          python calculate_indicators.py

      - name: Fetch fundamentals
        if: steps.trading.outputs.skip != 'true'
        run: |
          cd scripts
          python fetch_fundamentals.py

      - name: Push to data branch (orphan commit)
        if: steps.trading.outputs.skip != 'true'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          
          # data 브랜치 새로 초기화 (히스토리 없이 최신만)
          git checkout --orphan data-tmp
          git reset --hard
          git checkout ${{ github.sha }} -- public/data/
          git add public/data/
          git commit -m "data: $(date -u +%Y-%m-%d) KST $(TZ=Asia/Seoul date +%H:%M)"
          git push -f origin data-tmp:data

      - name: Trigger Vercel deploy
        if: steps.trading.outputs.skip != 'true'
        run: |
          if [ -n "${{ secrets.VERCEL_DEPLOY_HOOK }}" ]; then
            curl -X POST "${{ secrets.VERCEL_DEPLOY_HOOK }}"
            echo "✅ Vercel deploy triggered"
          else
            echo "⚠️ VERCEL_DEPLOY_HOOK not set — skipping redeploy"
          fi

      - name: Summary
        if: steps.trading.outputs.skip == 'true'
        run: echo "⏭ Skipped: today is a holiday"
```

- [ ] **Commit**
```bash
git add .github/workflows/daily-update.yml
git commit -m "feat(phase-7): add daily data update workflow"
```

---

## Task 3: Vercel 빌드 시 data 브랜치 JSON 자동 주입

Vercel 빌드는 main 브랜치 기준이므로 `public/data/`가 비어있습니다. 빌드 전에 `data` 브랜치의 JSON을 fetch해서 넣어야 합니다.

### Option A (권장): `vercel.json` + 빌드 훅

Create `vercel.json`:
```json
{
  "buildCommand": "bash scripts/build-with-data.sh",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

Create `scripts/build-with-data.sh`:
```bash
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
```

Make executable:
```bash
chmod +x scripts/build-with-data.sh
```

- [ ] **Commit**
```bash
git add vercel.json scripts/build-with-data.sh
git commit -m "feat(phase-7): configure Vercel build to pull data branch"
```

---

## Task 4: README 완전 정리

Replace `README.md` with comprehensive version:
```markdown
# Money Screener

국내 주식 중장기 스윙 포착 검색기 (Next.js 14 + Python pykrx).

- 매일 장 마감 후 자동으로 2,800개 종목 수집·지표 계산
- 12개 검증된 프리셋 (단일 10개 + 조합 2개) + 파라미터 조정
- 초보/전문가 모드 토글 + 라이트/다크 테마
- TradingView 차트 기반 종목 분석 페이지
- Vercel Hobby 플랜 완전 무료 운영 (사용량 95% 초과 시 자동 차단)

## 아키텍처

```
GitHub Actions (KST 18:00 평일)
  → Python pykrx로 수집·계산
  → data 브랜치에 orphan commit force push
  → Vercel Deploy Hook 트리거
  → Vercel 재빌드 (build-with-data.sh가 data 브랜치에서 JSON pull)
  → 프로덕션 배포
```

## Setup (개발)

### 1. Node 의존성
```bash
npm install
```

### 2. Python 가상환경 (데이터 수집용)
```bash
cd scripts
python -m venv venv
source venv/Scripts/activate   # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
```

### 3. 환경변수 (`.env.local`)
```
JWT_SECRET=<32자 이상 랜덤>
SECRET_BASE_PATH=dev
USER_KYUNGWON_ID=kyungwon
USER_KYUNGWON_HASH=<npm run hash-password -- "yourpw" 출력>
SITE_ENABLED=true
```

### 4. 개발 서버
```bash
npm run dev
# http://localhost:3000/dev/login 접속
```

### 5. 로컬 파이프라인 테스트 (옵션, ~30분)
```bash
cd scripts
source venv/Scripts/activate
python check_trading_day.py      # 오늘이 거래일인지
python fetch_stocks.py           # ~15분
python calculate_indicators.py   # ~1분
python fetch_fundamentals.py     # ~10분
# → public/data/*.json 5개 파일 생성됨
```

## 배포

`DEPLOYMENT.md` 참조. 핵심:
1. Vercel 프로젝트 연결 + Spending Limit $0
2. 환경변수 등록 (USER_*, JWT_SECRET, SECRET_BASE_PATH, SITE_ENABLED)
3. GitHub Secrets 등록 (VERCEL_TOKEN 등)
4. 첫 `workflow_dispatch`로 daily-update 수동 실행

## 디렉터리

```
src/
  app/
    [basePath]/login, screener, stock/[code]/
    api/auth/login, logout/
  components/
    layout/, providers/, screener/, stock/
  lib/
    auth/, presets/, types/, strings/, dataLoader, filter
  middleware.ts
  store/useAppStore.ts

scripts/
  fetch_stocks.py, calculate_indicators.py, fetch_fundamentals.py
  check_trading_day.py, holiday_exit_guard.py
  check-vercel-usage.mjs, check-actions-usage.mjs, update-vercel-env.mjs
  thresholds.mjs, hash-password.ts, build-with-data.sh
  tests/ (pytest)
  __tests__/ (vitest)

.github/workflows/
  daily-update.yml, usage-check.yml, monthly-reset.yml

docs/superpowers/
  specs/2026-04-14-money-screener-design.md
  plans/2026-04-14-phase-*.md
Workprogress/Phase_*.md
```

## 법적 고지

본 프로젝트는 투자 참고 정보만 제공하며 특정 종목의 매수·매도를 추천하지 않습니다. 투자 판단과 손익은 전적으로 투자자 본인의 책임입니다.

## License

Personal use only.
```

- [ ] **Commit**
```bash
git add README.md
git commit -m "docs(phase-7): rewrite README with full architecture and setup guide"
```

---

## Task 5: DEPLOYMENT.md

Create `DEPLOYMENT.md`:
```markdown
# Deployment Guide

## Prerequisites

- GitHub 계정 (pkh8184)
- Vercel 계정
- 리포지토리: pkh8184/MoneyProject (Public)

## 1. Vercel Project Setup

### 1-1. 프로젝트 연결
1. Vercel 대시보드 → New Project → GitHub 연동
2. `pkh8184/MoneyProject` 선택 → Import
3. Framework Preset: Next.js (자동 감지)
4. Root Directory: `./`
5. Build Command: (vercel.json이 `bash scripts/build-with-data.sh`로 덮어씀)

### 1-2. Spending Limit (필수)
1. Settings → Billing → Spending Limit
2. **$0.00 설정**
3. 결제 수단 **등록 안 함**

### 1-3. 환경변수 등록
Settings → Environment Variables → Production + Preview + Development 모두 체크

| Key | Value | 설명 |
|---|---|---|
| `JWT_SECRET` | (32+ bytes random hex) | `openssl rand -hex 32` 로 생성 |
| `SECRET_BASE_PATH` | `x7kq2z` 등 임의 문자열 | 비밀 URL 경로 |
| `SITE_ENABLED` | `true` | Kill Switch |
| `USER_KYUNGWON_ID` | `kyungwon` | |
| `USER_KYUNGWON_HASH` | (bcrypt 해시) | `npm run hash-password -- "비번"` 로 생성 |
| `USER_OH_ID` | `oh` | |
| `USER_OH_HASH` | (bcrypt 해시) | |

### 1-4. Deploy Hook 생성
1. Settings → Git → Deploy Hooks → Create Hook
2. Name: `daily-update-trigger`, Branch: `main`
3. 생성된 URL 복사 → GitHub Secrets `VERCEL_DEPLOY_HOOK`에 저장

### 1-5. API Token 생성
1. Account Settings → Tokens → Create
2. Name: `money-screener-ci`, Scope: Full Access
3. 토큰 복사 → GitHub Secrets `VERCEL_TOKEN`에 저장

## 2. GitHub Secrets 등록

Repository Settings → Secrets and variables → Actions → New repository secret

| Secret | Value |
|---|---|
| `VERCEL_TOKEN` | (Vercel API 토큰) |
| `VERCEL_PROJECT_ID` | Vercel Project Settings → General 에서 확인 |
| `VERCEL_TEAM_ID` | (개인 계정이면 비워두거나 personal ID) |
| `VERCEL_DEPLOY_HOOK` | (Deploy Hook URL) |
| `GH_TOKEN` | Settings → Developer settings → Personal access tokens (fine-grained, Actions 읽기 권한) |

## 3. 첫 데이터 수집 (수동)

1. GitHub → Actions 탭 → "Daily Stock Data Update"
2. "Run workflow" 클릭 (workflow_dispatch)
3. 약 30~45분 대기 (2,800개 종목 조회)
4. 완료 후 `data` 브랜치 생성 확인
5. Vercel 자동 재배포 (Deploy Hook 호출됨)

## 4. 접속 확인

- 루트 `/` → 404 (의도된 404)
- `/x7kq2z/login` → 로그인 폼 (경로는 SECRET_BASE_PATH에 따라)
- 로그인 후 `/x7kq2z/screener` → 검색기

## 5. 운영

### 일상
- 매일 평일 KST 18:00 자동 갱신
- 매일 KST 06:00 사용량 체크
- 매월 1일 00:00 SITE_ENABLED 자동 복구

### 수동 조작
- 긴급 차단: Vercel env `SITE_ENABLED=false` → 재배포
- 긴급 복구: `SITE_ENABLED=true` → 재배포
- 비번 변경: `npm run hash-password -- "신비번"` → env 업데이트

### 모니터링
- GitHub Actions 탭에서 최근 실행 확인
- Vercel Analytics 대시보드
- 리포 크기 (Settings → General → Repo size)

## 6. Troubleshooting

### Actions 실패
- `Fetch stocks` 실패: pykrx/Naver 크롤링 이슈, 다음 날 재시도
- `Push to data branch` 실패: 리포 용량 초과 가능 → Settings → Repo size 확인

### Vercel 빌드 실패
- `build-with-data.sh` 실행 권한 이슈: `chmod +x` 로컬 확인
- data 브랜치 부재: 첫 배포는 data 없이 가능 (빈 `public/data/` 자동 생성)

### 로그인 안 됨
- `.env.local` 또는 Vercel env의 bcrypt 해시 확인
- `SITE_ENABLED=true` 여부
- 미들웨어 경로 매칭 확인 (`SECRET_BASE_PATH` 오타)
```

- [ ] **Commit**
```bash
git add DEPLOYMENT.md
git commit -m "docs(phase-7): add deployment guide"
```

---

## Task 6: Next.js 14.2.15 보안 업그레이드 (deferred from Phase 1)

Phase 1에서 보류했던 next 업그레이드:
```bash
npm install next@^14.2.23 eslint-config-next@^14.2.23
```
(또는 `14.2.latest` 안전 범위)

Verify:
```bash
npm run type-check
npm run build
npm test
```

Commit:
```bash
git add package.json package-lock.json
git commit -m "chore(phase-7): upgrade next to 14.2.23 for security patches"
```

---

## Task 7: Workprogress + 최종 검증

### Run all
```bash
npm test              # all pass
npm run type-check
npm run build
```

### Create `Workprogress/Phase_7_2026-04-14.md`:
```markdown
# Phase 7 — 일일 데이터 자동화 + 배포 + 최종 정리

Phase: 7
Status: 코드 완료 (실배포 수행 대기)
LastUpdate: 2026-04-14
Branch: feature/phase-7-deploy-automation

RecentWork:
  - holiday_exit_guard.py — Actions 내 휴장일 분기
  - daily-update.yml — 평일 18:00 KST 데이터 수집 및 data 브랜치 force push
  - vercel.json + build-with-data.sh — Vercel 빌드 시 data 브랜치 JSON pull
  - README.md 전면 개편 (아키텍처, 셋업, 배포 가이드)
  - DEPLOYMENT.md — Vercel/GitHub 셋업 절차서
  - next 14.2.15 → 14.2.23 보안 업그레이드

ResolvedWork:
  - Task 1~6

MainIssues:
  - 실배포 및 첫 data 수집 워크플로 수동 실행 필요 (사용자 작업)
  - Vercel Secrets 등록 후 Kill Switch 동작 확인 (Phase 6 usage-check 자동 실행)

ResolvedIssues:
  - Next 14.2.15 취약점 4건 해소 (Phase 1에서 이관)

RelatedPhases:
  - Phase 1 (Python 파이프라인)
  - Phase 6 (사용량 모니터링 — Secrets 공유)

NoteForFuture:
  - 최초 배포 후 실제 pykrx 응답으로 수집 성공 여부 확인
  - data 브랜치 용량 주기적 확인 (리포 소프트 한도 1GB)

CommitLog: (git log 결과)
```

### Commit
```bash
git add Workprogress/Phase_7_2026-04-14.md
git commit -m "docs(phase-7): add Phase 7 workprogress record"
```

## 🏁 Phase 7 완료 조건

- [ ] 7 Task 완료
- [ ] 전체 테스트 통과
- [ ] 사용자 확인 후 push + PR
- [ ] 사용자 수동 배포 진행

---

## 🎉 프로젝트 전체 완료

Phase 1-7 모두 완료 시 프로젝트의 **코드 구현 단계 종료**. 실제 운영은 다음에 좌우:
- 사용자가 DEPLOYMENT.md 따라 Vercel 셋업
- GitHub Secrets 등록
- 첫 workflow_dispatch로 데이터 수집
- 로그인 테스트 후 실사용
