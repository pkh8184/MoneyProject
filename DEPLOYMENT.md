# Deployment Guide

## Prerequisites

- GitHub 계정 (pkh8184)
- Vercel 계정
- 리포지토리: pkh8184/MoneyProject (Public)

## 1. Vercel Project Setup

### 1-1. 프로젝트 연결
1. Vercel 대시보드 → New Project → GitHub 연동
2. pkh8184/MoneyProject 선택 → Import
3. Framework Preset: Next.js (자동 감지)
4. Root Directory: ./

### 1-2. Spending Limit (필수)
1. Settings → Billing → Spending Limit
2. **$0.00 설정**
3. 결제 수단 **등록 안 함**

### 1-3. 환경변수 등록
Settings → Environment Variables → Production + Preview + Development 모두 체크

| Key | Value | 설명 |
|---|---|---|
| JWT_SECRET | 32+ bytes random hex | openssl rand -hex 32 |
| SECRET_BASE_PATH | 임의 문자열 (예: x7kq2z) | 비밀 URL |
| SITE_ENABLED | true | Kill Switch |
| USER_KYUNGWON_ID | kyungwon | |
| USER_KYUNGWON_HASH | bcrypt 해시 | npm run hash-password -- "비번" |
| USER_OH_ID | oh | |
| USER_OH_HASH | bcrypt 해시 | |

### 1-4. Deploy Hook 생성
1. Settings → Git → Deploy Hooks → Create Hook
2. Name: daily-update-trigger, Branch: main
3. 생성된 URL → GitHub Secret VERCEL_DEPLOY_HOOK

### 1-5. API Token 생성
1. Account Settings → Tokens → Create
2. Name: money-screener-ci
3. 토큰 → GitHub Secret VERCEL_TOKEN

## 2. GitHub Secrets 등록

Repository Settings → Secrets and variables → Actions

| Secret | Value |
|---|---|
| VERCEL_TOKEN | Vercel API 토큰 |
| VERCEL_PROJECT_ID | Vercel Project Settings → General |
| VERCEL_TEAM_ID | 개인 계정이면 비워둠 |
| VERCEL_DEPLOY_HOOK | Deploy Hook URL |
| GH_TOKEN | Fine-grained PAT, Actions 읽기 권한 |

## 3. 첫 데이터 수집 (수동)

1. GitHub Actions 탭 → Daily Stock Data Update
2. Run workflow 클릭
3. 30~45분 대기
4. data 브랜치 생성 확인
5. Vercel 자동 재배포

## 4. 접속 확인

- / → 404
- /x7kq2z/login → 로그인 폼
- 로그인 후 /x7kq2z/screener → 검색기

## 5. 운영

### 일상 (자동)
- 평일 KST 18:00 데이터 갱신
- 매일 KST 06:00 사용량 체크
- 매월 1일 SITE_ENABLED 복구

### 수동 조작
- 긴급 차단: Vercel env SITE_ENABLED=false + 재배포
- 비번 변경: npm run hash-password -- "신비번" → env 업데이트

## 6. Troubleshooting

- Actions Fetch stocks 실패 → 다음 날 재시도
- Push to data branch 실패 → 리포 용량 확인
- Vercel 빌드 실패 → build-with-data.sh 실행 권한 확인
- 로그인 안 됨 → bcrypt 해시 + SITE_ENABLED + SECRET_BASE_PATH 확인
