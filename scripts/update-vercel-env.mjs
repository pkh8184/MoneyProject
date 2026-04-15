#!/usr/bin/env node
/**
 * Vercel 환경변수 SITE_ENABLED 업데이트.
 * 환경변수: VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID (optional)
 * 인자: --value true|false
 */
const { VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID } = process.env

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
