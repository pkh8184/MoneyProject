export const strings = {
  app: {
    title: 'Money Screener',
    description: '국내 주식 중장기 스윙 포착 검색기'
  },
  common: {
    login: '로그인',
    logout: '로그아웃',
    loading: '불러오는 중...',
    error: '오류가 발생했습니다',
    retry: '다시 시도',
    confirm: '확인',
    cancel: '취소',
    close: '닫기'
  },
  mode: {
    beginner: '초보',
    expert: '전문가',
    toggle_aria: '모드 전환'
  },
  theme: {
    light: '라이트',
    dark: '다크',
    toggle_aria: '테마 전환'
  },
  dataStatus: {
    updatedAt: (time: string) => `최근 업데이트: ${time}`,
    stale24h: '⚠️ 데이터가 오래되었습니다. 업데이트 실패 가능',
    stale48h: '🔴 데이터 갱신 중단. 관리자에게 문의하세요',
    loading: '데이터를 불러오는 중입니다...'
  },
  auth: {
    loginTitle: '로그인',
    idLabel: '아이디',
    pwLabel: '비밀번호',
    loginButton: '로그인',
    agreementLabel: '위 내용을 확인했으며, 본 사이트 이용에 동의합니다.',
    loginFail: '아이디 또는 비밀번호가 일치하지 않습니다',
    rateLimit: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.',
    agreementRequired: '약관에 동의해주세요'
  },
  legal: {
    disclaimer: '본 사이트는 투자 참고 정보만 제공하며, 특정 종목의 매수·매도를 추천하지 않습니다. 투자 판단과 그에 따른 손익은 전적으로 투자자 본인의 책임입니다. 데이터 오류·지연에 대해 책임지지 않습니다.'
  },
  screener: {
    beginnerTitle: '오늘의 추천 종목',
    expertTitle: '전략 선택',
    empty: '조건에 맞는 종목이 없습니다',
    resultCount: (n: number) => `${n}개 종목`
  },
  maintenance: {
    title: '🛠️ 서비스 일시 중단 중입니다',
    description: '이번 달 무료 사용 한도에 근접하여 서비스가 일시 중단되었습니다.',
    resumeLabel: '재개 예정',
    contactLabel: '긴급 문의'
  }
} as const

export type Strings = typeof strings
