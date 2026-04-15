#!/usr/bin/env node
/**
 * GitHub Actions 사용량 조회. Public 리포는 무제한.
 * 환경변수: GH_TOKEN, GITHUB_REPOSITORY (예: owner/repo)
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
  const limit = data?.included_minutes ?? 2000
  const level = getLevel(used, limit)
  console.log(JSON.stringify({ level, actions: { used, limit, pct: (used / limit * 100).toFixed(1) } }, null, 2))
  if (level === 'critical') process.exit(1)
  process.exit(0)
}

main()
