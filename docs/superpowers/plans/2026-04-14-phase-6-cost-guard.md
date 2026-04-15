# Phase 6 — 비용 차단 시스템 (Cost Guard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** 무료 티어 한도 초과 시 서비스를 자동 차단하고, 월초 자동 복구하는 다층 방어 시스템을 구축한다.

**Architecture:** GitHub Actions workflow(`usage-check.yml`, `monthly-reset.yml`)로 Vercel/GitHub API에서 사용량 조회 → 임계치 초과 시 Vercel 환경변수 `SITE_ENABLED=false` 자동 설정 → 미들웨어가 503 반환. 월초 자동 복구.

**Tech Stack:** GitHub Actions + Node.js(API 호출) + Vercel REST API

**Branch:** `feature/phase-6-cost-guard`

**Prerequisite:** Phase 2 완료 (middleware의 SITE_ENABLED 체크 기존 구현)

---

## 📁 File Structure

**사용량 모니터링**
- `scripts/check-vercel-usage.mjs` — Vercel API 호출
- `scripts/check-actions-usage.mjs` — GitHub API 호출
- `scripts/update-vercel-env.mjs` — SITE_ENABLED 환경변수 업데이트

**GitHub Workflows**
- `.github/workflows/usage-check.yml`
- `.github/workflows/monthly-reset.yml`

**임계치 설정**
- `scripts/thresholds.mjs` — WARNING 80% / CRITICAL 95%

**테스트**
- `scripts/__tests__/thresholds.test.mjs` — 임계치 계산 TDD

---

## Task 1: 브랜치 + thresholds 유틸 (TDD)

- [ ] **Step 1: 브랜치**
```bash
cd c:/Users/rk454/Desktop/Project/Money/MoneyProject
git checkout feature/phase-5-beginner-stock-detail
git checkout -b feature/phase-6-cost-guard
```

- [ ] **Step 2: vitest가 .mjs 포함하도록 설정 업데이트**

Read `vitest.config.ts` first. Update `test.include` to include `scripts/**/*.test.{js,mjs}`:

```typescript
test: {
  environment: 'happy-dom',
  globals: true,
  include: ['src/**/*.{test,spec}.{ts,tsx}', 'scripts/**/*.test.{mjs,js}']
}
```

- [ ] **Step 3: 실패 테스트 작성 — `scripts/__tests__/thresholds.test.mjs`**

```javascript
import { describe, it, expect } from 'vitest'
import { getLevel, isOverWarning, isOverCritical } from '../thresholds.mjs'

describe('getLevel', () => {
  it('returns ok under 80%', () => {
    expect(getLevel(50, 100)).toBe('ok')
  })
  it('returns warning at 80%', () => {
    expect(getLevel(80, 100)).toBe('warning')
  })
  it('returns warning between 80 and 95', () => {
    expect(getLevel(90, 100)).toBe('warning')
  })
  it('returns critical at 95%', () => {
    expect(getLevel(95, 100)).toBe('critical')
  })
  it('handles zero limit gracefully', () => {
    expect(getLevel(0, 0)).toBe('ok')
  })
})

describe('isOverWarning / isOverCritical', () => {
  it('isOverWarning true at 80%', () => {
    expect(isOverWarning(80, 100)).toBe(true)
  })
  it('isOverWarning false at 79%', () => {
    expect(isOverWarning(79, 100)).toBe(false)
  })
  it('isOverCritical true at 95%', () => {
    expect(isOverCritical(95, 100)).toBe(true)
  })
  it('isOverCritical false at 94%', () => {
    expect(isOverCritical(94, 100)).toBe(false)
  })
})
```

- [ ] **Step 4: 실패 확인 + 구현 `scripts/thresholds.mjs`**
```javascript
export const WARNING_PCT = 0.80
export const CRITICAL_PCT = 0.95

export function getLevel(used, limit) {
  if (!limit || limit <= 0) return 'ok'
  const ratio = used / limit
  if (ratio >= CRITICAL_PCT) return 'critical'
  if (ratio >= WARNING_PCT) return 'warning'
  return 'ok'
}

export function isOverWarning(used, limit) {
  return getLevel(used, limit) !== 'ok'
}

export function isOverCritical(used, limit) {
  return getLevel(used, limit) === 'critical'
}
```

- [ ] **Step 5: 통과 + 커밋**
```bash
npm test scripts/__tests__/thresholds.test.mjs
git add vitest.config.ts scripts/thresholds.mjs scripts/__tests__/thresholds.test.mjs
git commit -m "feat(phase-6): add usage threshold utility (TDD)"
```

---

## Task 2: Vercel Usage Check Script

**File:** `scripts/check-vercel-usage.mjs`

```javascript
#!/usr/bin/env node
/**
 * Vercel 사용량 조회 및 critical 초과 시 SITE_ENABLED=false 설정.
 * 
 * 환경변수 필요:
 *   VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID (optional)
 * 
 * 호출: node scripts/check-vercel-usage.mjs
 * 
 * 출력 (stdout, JSON): { level: 'ok'|'warning'|'critical', ... }
 * 프로세스 exit code: 0 = ok/warning, 1 = critical (자동 차단 트리거)
 */
import { getLevel } from './thresholds.mjs'

const {
  VERCEL_TOKEN,
  VERCEL_PROJECT_ID,
  VERCEL_TEAM_ID
} = process.env

async function fetchUsage() {
  if (!VERCEL_TOKEN) {
    console.error('VERCEL_TOKEN not set')
    process.exit(2)
  }
  const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
  const res = await fetch(`https://api.vercel.com/v2/teams/usage${teamQuery}`, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
  })
  if (!res.ok) {
    console.error(`Vercel API error: ${res.status}`)
    process.exit(2)
  }
  return await res.json()
}

async function main() {
  try {
    const usage = await fetchUsage()
    // Vercel usage API 응답 형식 참조: bandwidth, serverlessFunctionExecution 등
    const bandwidthUsed = usage?.bandwidth?.currentBytes ?? 0
    const bandwidthLimit = usage?.bandwidth?.limitBytes ?? 100 * 1024 * 1024 * 1024  // 100GB
    const level = getLevel(bandwidthUsed, bandwidthLimit)
    const output = {
      level,
      bandwidth: { used: bandwidthUsed, limit: bandwidthLimit, pct: (bandwidthUsed / bandwidthLimit * 100).toFixed(1) }
    }
    console.log(JSON.stringify(output, null, 2))
    if (level === 'critical') process.exit(1)
    process.exit(0)
  } catch (e) {
    console.error('Error:', e.message)
    process.exit(2)
  }
}

main()
```

- [ ] **Verify (dry check):** `node scripts/check-vercel-usage.mjs` — will error without VERCEL_TOKEN but shouldn't crash syntactically.

- [ ] **Commit**
```bash
node -c scripts/check-vercel-usage.mjs 2>&1 || echo "OK - not set tokens"
git add scripts/check-vercel-usage.mjs
git commit -m "feat(phase-6): add Vercel usage check script"
```

---

## Task 3: GitHub Actions Usage Check Script

**File:** `scripts/check-actions-usage.mjs`

```javascript
#!/usr/bin/env node
/**
 * GitHub Actions 분(minute) 사용량 조회.
 * Public 리포는 무제한이지만 기록용으로 조회.
 * 
 * 환경변수: GH_TOKEN (repo scope), GITHUB_REPOSITORY (예: user/repo)
 * 호출: node scripts/check-actions-usage.mjs
 * exit: 0 ok/warning, 1 critical
 */
import { getLevel } from './thresholds.mjs'

const { GH_TOKEN, GITHUB_REPOSITORY } = process.env

async function main() {
  if (!GH_TOKEN || !GITHUB_REPOSITORY) {
    console.error('GH_TOKEN or GITHUB_REPOSITORY not set')
    process.exit(2)
  }
  const [owner] = GITHUB_REPOSITORY.split('/')
  const res = await fetch(`https://api.github.com/users/${owner}/settings/billing/actions`, {
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      Accept: 'application/vnd.github+json'
    }
  })
  if (!res.ok) {
    console.error(`GitHub API error: ${res.status} ${await res.text()}`)
    process.exit(2)
  }
  const data = await res.json()
  const used = data?.total_minutes_used ?? 0
  const limit = data?.included_minutes ?? 2000  // Private 한도 (Public은 무제한)
  const level = getLevel(used, limit)
  console.log(JSON.stringify({ level, actions: { used, limit, pct: (used / limit * 100).toFixed(1) } }, null, 2))
  if (level === 'critical') process.exit(1)
  process.exit(0)
}

main()
```

- [ ] **Commit**
```bash
git add scripts/check-actions-usage.mjs
git commit -m "feat(phase-6): add GitHub Actions usage check script"
```

---

## Task 4: Vercel Env Update Script (Kill Switch)

**File:** `scripts/update-vercel-env.mjs`

```javascript
#!/usr/bin/env node
/**
 * Vercel 환경변수 SITE_ENABLED 값 업데이트.
 * 
 * 환경변수: VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID (optional)
 * 인자: --value true|false
 * 
 * 호출: node scripts/update-vercel-env.mjs --value false
 */
const {
  VERCEL_TOKEN,
  VERCEL_PROJECT_ID,
  VERCEL_TEAM_ID
} = process.env

async function main() {
  const valueArg = process.argv.indexOf('--value')
  const value = valueArg >= 0 ? process.argv[valueArg + 1] : null
  if (value !== 'true' && value !== 'false') {
    console.error('Usage: update-vercel-env.mjs --value true|false')
    process.exit(2)
  }

  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    console.error('VERCEL_TOKEN or VERCEL_PROJECT_ID not set')
    process.exit(2)
  }

  const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''

  // 1. 기존 env 중 SITE_ENABLED 조회
  const envRes = await fetch(
    `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env${teamQuery}`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
  )
  if (!envRes.ok) {
    console.error(`Vercel env fetch error: ${envRes.status}`)
    process.exit(2)
  }
  const envList = await envRes.json()
  const siteEnabledEnv = envList.envs?.find((e) => e.key === 'SITE_ENABLED')

  const payload = {
    key: 'SITE_ENABLED',
    value,
    type: 'plain',
    target: ['production', 'preview', 'development']
  }

  let method, url
  if (siteEnabledEnv) {
    method = 'PATCH'
    url = `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env/${siteEnabledEnv.id}${teamQuery}`
  } else {
    method = 'POST'
    url = `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env${teamQuery}`
  }

  const updateRes = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!updateRes.ok) {
    console.error(`Vercel env update error: ${updateRes.status} ${await updateRes.text()}`)
    process.exit(2)
  }

  console.log(`SITE_ENABLED=${value} updated successfully`)
}

main()
```

- [ ] **Commit**
```bash
git add scripts/update-vercel-env.mjs
git commit -m "feat(phase-6): add Vercel environment variable update script"
```

---

## Task 5: usage-check Workflow

**File:** `.github/workflows/usage-check.yml`

```yaml
name: Usage Monitor

on:
  schedule:
    - cron: '0 21 * * *'  # UTC 21:00 = KST 06:00 매일
  workflow_dispatch:

jobs:
  check:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Check Vercel usage
        id: vercel_check
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
          VERCEL_TEAM_ID: ${{ secrets.VERCEL_TEAM_ID }}
        run: |
          set +e
          output=$(node scripts/check-vercel-usage.mjs)
          exit_code=$?
          echo "$output"
          echo "level=$(echo "$output" | grep -o '"level":[[:space:]]*"[^"]*"' | cut -d'"' -f4)" >> $GITHUB_OUTPUT
          exit 0  # 여기서 종료시키지 말고 다음 step에서 처리

      - name: Check GitHub Actions usage
        if: always()
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
          GITHUB_REPOSITORY: ${{ github.repository }}
        run: |
          set +e
          node scripts/check-actions-usage.mjs || true

      - name: Trigger shutdown if critical
        if: steps.vercel_check.outputs.level == 'critical'
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
          VERCEL_TEAM_ID: ${{ secrets.VERCEL_TEAM_ID }}
        run: |
          node scripts/update-vercel-env.mjs --value false
          curl -X POST "${{ secrets.VERCEL_DEPLOY_HOOK }}"
          echo "🔴 Service disabled due to critical usage threshold"

      - name: Warn if warning
        if: steps.vercel_check.outputs.level == 'warning'
        run: |
          echo "⚠️ Usage over 80% — consider manual action"
```

- [ ] **Commit**
```bash
git add .github/workflows/usage-check.yml
git commit -m "feat(phase-6): add usage monitor workflow"
```

---

## Task 6: monthly-reset Workflow

**File:** `.github/workflows/monthly-reset.yml`

```yaml
name: Monthly Reset

on:
  schedule:
    - cron: '0 15 1 * *'  # UTC 15:00 on day 1 of each month = KST 1일 00:00
  workflow_dispatch:

jobs:
  reset:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Restore SITE_ENABLED=true
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
          VERCEL_TEAM_ID: ${{ secrets.VERCEL_TEAM_ID }}
        run: node scripts/update-vercel-env.mjs --value true

      - name: Trigger redeploy
        run: curl -X POST "${{ secrets.VERCEL_DEPLOY_HOOK }}"

      - name: Summary
        run: echo "✅ Service re-enabled for new month"
```

- [ ] **Commit**
```bash
git add .github/workflows/monthly-reset.yml
git commit -m "feat(phase-6): add monthly reset workflow"
```

---

## Task 7: Middleware 확장 — 80% 경고 배너 (selective enhancement)

기존 `src/middleware.ts`는 이미 `SITE_ENABLED === 'false'`일 때 503을 반환합니다. 추가 배너는 Phase 3 UpdatedAtBadge 이웃에 `UsageWarningBanner`를 추가하는 방식으로 구현하지만, 이건 Phase 7에서 실제 사용량 데이터가 있을 때 실효성이 있습니다.

이번 Phase 6에서는 **스킵**. 스펙 문서에 노트만 추가.

Update `Workprogress/Phase_6_2026-04-14.md` — 해당 사항 명시.

---

## Task 8: Workprogress + 최종 검증

### Run tests
```bash
npm test
```
Expected: all passing (Phase 5 69 + new thresholds ~9 = ~78).

### Create `Workprogress/Phase_6_2026-04-14.md`

```markdown
# Phase 6 — 비용 차단 시스템 (Cost Guard)

Phase: 6
Status: 코드 완료 (실배포 Phase 7에서 Secrets 설정 후 활성화)
LastUpdate: 2026-04-14
Branch: feature/phase-6-cost-guard

RecentWork:
  - thresholds.mjs (80% warning / 95% critical) TDD
  - check-vercel-usage.mjs — Vercel API 사용량 조회
  - check-actions-usage.mjs — GitHub API Actions 분 조회
  - update-vercel-env.mjs — SITE_ENABLED Kill Switch
  - usage-check.yml — 매일 06:00 KST 모니터링
  - monthly-reset.yml — 매월 1일 00:00 KST 자동 복구

ResolvedWork:
  - Task 1-6

MainIssues:
  - (Phase 7) GitHub Secrets 설정: VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID, GH_TOKEN, VERCEL_DEPLOY_HOOK
  - (향후) 사용량 80% 배너는 실배포 후 실데이터 기반으로 추가 검토

ResolvedIssues: 없음

RelatedPhases:
  - Phase 2 (middleware의 SITE_ENABLED 체크 기존 존재)
  - Phase 7 (Secrets 설정 + 실제 배포)

NoteForFuture:
  - Vercel usage API 응답 스키마 변경 가능성 — 초기 배포 후 응답 구조 확인 필요
  - 사용량 80% 경고를 사용자 UI 배너로 노출 (Phase 7)
```

- [ ] **Commit**
```bash
git add Workprogress/Phase_6_2026-04-14.md
git commit -m "docs(phase-6): add Phase 6 workprogress record"
```

## 🏁 Phase 6 완료 조건

- [ ] 8 Task 완료
- [ ] Vitest thresholds 테스트 9 PASS
- [ ] workflow YAML 구문 유효 (검증: github.com에 푸시해서 Actions tab 확인)
- [ ] 사용자 확인 후 push + PR
