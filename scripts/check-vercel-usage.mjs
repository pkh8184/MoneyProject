#!/usr/bin/env node
/**
 * Vercel 사용량 조회. critical 초과 시 exit 1.
 * 환경변수: VERCEL_TOKEN, VERCEL_TEAM_ID (optional)
 */
import { getLevel } from './thresholds.mjs'

const { VERCEL_TOKEN, VERCEL_TEAM_ID } = process.env

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
    const bandwidthUsed = usage?.bandwidth?.currentBytes ?? 0
    const bandwidthLimit = usage?.bandwidth?.limitBytes ?? 100 * 1024 * 1024 * 1024
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
