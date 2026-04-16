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
  beginner: {
    linkLabel: '입문 추천 종목',
    pageTitle: '🌱 입문 추천 종목',
    pageDesc: '처음 시작하시는 분을 위한 테마별 유망 종목 모음입니다.'
  },
  stockList: {
    title: '수집된 종목 리스트',
    linkLabel: '전체 종목',
    searchPlaceholder: '종목명·코드로 검색',
    totalCount: (n: number) => `총 ${n}개 종목`,
    filteredCount: (matched: number, total: number) => `${matched}개 / 전체 ${total}개`,
    empty: '수집된 종목 데이터가 없습니다'
  },
  firstVisit: {
    skipButton: '건너뛰기',
    nextButton: '다음',
    startButton: '시작',
    dontShowAgain: '다시 보지 않기',
    closeAria: '안내 닫기'
  },
  watchlist: {
    pageTitle: '⭐ 지켜볼 종목',
    linkLabel: '지켜볼 종목',
    addAria: '지켜볼 종목에 추가',
    removeAria: '지켜볼 종목에서 빼기',
    added: '추가됨',
    empty: '지켜볼 종목이 없습니다. 종목 상세에서 ☆를 눌러 추가하세요.',
    sortAddedDesc: '추가순',
    sortReturnDesc: '많이 오른순',
    sortReturnAsc: '많이 내린순',
    sortName: '가나다순',
    columnPrice: '지금 가격',
    columnChange: '어제보다',
    columnAddedAt: '추가일',
    deleteConfirm: (name: string) => `${name}을(를) 지켜볼 종목에서 뺄까요?`
  },
  portfolio: {
    pageTitle: '💼 내가 산 주식',
    linkLabel: '내가 산 주식',
    addButton: '＋ 산 주식 추가',
    empty: '아직 기록한 주식이 없습니다. ＋ 버튼으로 산 주식을 기록해 보세요.',
    summaryProfit: (n: number) => `지금까지 +${n.toLocaleString()}원 벌었어요 🟢`,
    summaryLoss: (n: number) => `지금까지 ${n.toLocaleString()}원 잃었어요 🔴`,
    summaryEven: '아직 손익이 거의 없어요',
    summarySubtitle: (cost: number, value: number) =>
      `(전체 산 가격 ${cost.toLocaleString()}원 → 지금 가치 ${value.toLocaleString()}원)`,
    cardBuy: (price: number, qty: number, cost: number) =>
      `산 가격: ${price.toLocaleString()}원 × ${qty}주 = ${cost.toLocaleString()}원`,
    cardNow: (price: number, qty: number, value: number) =>
      `지금:    ${price.toLocaleString()}원 × ${qty}주 = ${value.toLocaleString()}원`,
    cardProfit: (n: number, pct: number) =>
      `👉 +${n.toLocaleString()}원 벌었어요 (${pct.toFixed(2)}% 🟢)`,
    cardLoss: (n: number, pct: number) =>
      `👉 ${n.toLocaleString()}원 잃었어요 (${pct.toFixed(2)}% 🔴)`,
    cardNoPrice: '현재 가격 정보가 없어요',
    cardFooter: '※ 수수료·세금 미반영 (참고용)',
    deleteConfirm: (name: string) => `${name} 기록을 지울까요?`,
    modal: {
      addTitle: '산 주식 추가',
      editTitle: '기록 수정',
      stockLabel: '종목',
      stockPlaceholder: '종목명·코드로 검색',
      buyPriceLabel: '산 가격 (원)',
      quantityLabel: '주식 수',
      boughtAtLabel: '매수일',
      memoLabel: '메모 (선택)',
      hint: '한 번만 매수했을 때 기준이에요. 여러 번 나눠 사셨다면 평균 가격을 입력하세요.',
      save: '저장',
      cancel: '취소'
    }
  },
  stock: {
    backToScreener: '← 검색기로',
    currentPrice: '현재가',
    marketCap: '시가총액',
    indicators: '주요 지표',
    fundamentals: '펀더멘털',
    supply: '수급',
    matchedPresets: '매칭된 프리셋',
    noMatches: '매칭된 프리셋 없음',
    notFound: '종목을 찾을 수 없습니다',
    beginnerWhyNow: '💡 지금 관심있게 볼 이유',
    beginnerGuide: '📘 참고 가이드',
    buyTiming: '매수 타이밍',
    holdingPeriod: '보유 기간',
    stopLoss: '손절 기준',
    caution: '⚠️ 투자 판단은 본인 책임입니다'
  },
  maintenance: {
    title: '🛠️ 서비스 일시 중단 중입니다',
    description: '이번 달 무료 사용 한도에 근접하여 서비스가 일시 중단되었습니다.',
    resumeLabel: '재개 예정',
    contactLabel: '긴급 문의'
  },
  presets: {
    golden_cross: {
      name: '골든크로스 (MA20↑MA60)',
      beginnerDesc: '단기 상승 신호가 처음 나타난 종목',
      expertDesc: '20일선이 60일선을 상향 돌파한 종목 (오늘)',
      buyTiming: '돌파 당일 종가 또는 다음 날 시초가',
      holdingPeriod: '2주~3개월',
      stopLoss: 'MA20 재하향 이탈 시',
      traps: '횡보장에서 가짜 신호 발생. 거래량 조건 결합 권장'
    },
    alignment: {
      name: '정배열 확정 (MA5>MA20>MA60>MA120)',
      beginnerDesc: '추세가 정식 확정된 종목',
      expertDesc: '4개 이평선이 정배열 완성된 첫날',
      buyTiming: '정배열 유지되면서 MA20 터치 후 반등 시점',
      holdingPeriod: '1~6개월',
      stopLoss: 'MA20 하향 이탈',
      traps: '이미 많이 오른 종목은 피크 근접 위험'
    },
    ma60_turn_up: {
      name: '60일선 상승 전환',
      beginnerDesc: '중기 추세가 상승으로 바뀐 종목',
      expertDesc: 'MA60 기울기 음→양 전환',
      buyTiming: '전환 후 첫 눌림목',
      holdingPeriod: '1~3개월',
      stopLoss: 'MA60 재하향',
      traps: '신호 빈도 낮음'
    },
    high_52w: {
      name: '52주 신고가 돌파',
      beginnerDesc: '1년 내 최고가에 근접한 종목',
      expertDesc: '종가가 52주 신고가의 N% 이상',
      buyTiming: '돌파 당일 또는 눌림',
      holdingPeriod: '수일~1개월',
      stopLoss: '돌파 당일 저가 이탈',
      traps: '돌파 실패 시 급락 위험'
    },
    volume_spike: {
      name: '거래량 급증',
      beginnerDesc: '거래량이 평소보다 크게 늘어난 종목',
      expertDesc: '양봉 + 거래량이 20일 평균의 K배 이상',
      buyTiming: '급증 발생일 종가 또는 다음 날 눌림',
      holdingPeriod: '3일~3주',
      stopLoss: '급증 봉 저가 이탈',
      traps: '음봉 + 거래량 급증은 매도 신호'
    },
    foreign_inst_buy: {
      name: '외국인·기관 동반 순매수',
      beginnerDesc: '큰 손이 함께 사는 종목',
      expertDesc: '최근 N일 외국인·기관 모두 순매수',
      buyTiming: '연속 매수 3~5일차',
      holdingPeriod: '1주~1개월',
      stopLoss: '순매도 전환',
      traps: '단기 차익실현 가능성'
    },
    rsi_rebound: {
      name: 'RSI 과매도 반등',
      beginnerDesc: '과매도 구간 후 반등 시작',
      expertDesc: 'RSI 30 이하에서 재돌파, MA60 상승 추세',
      buyTiming: '30 재돌파 당일',
      holdingPeriod: '1주~1개월',
      stopLoss: '직전 저점 이탈',
      traps: '하락 추세 중 과매도는 더 깊어질 수 있음'
    },
    macd_cross: {
      name: 'MACD 골든크로스',
      beginnerDesc: '상승 추세 시작 신호',
      expertDesc: 'MACD 라인이 Signal 라인 상향 돌파',
      buyTiming: '돌파일 종가',
      holdingPeriod: '2주~2개월',
      stopLoss: '재데드크로스',
      traps: '횡보장에서 신호 남발'
    },
    bb_lower_bounce: {
      name: '볼린저밴드 하단 복귀',
      beginnerDesc: '저점에서 반등 시작',
      expertDesc: '하단 이탈 후 밴드 내 재진입',
      buyTiming: '재진입 당일 종가',
      holdingPeriod: '수일~3주',
      stopLoss: '하단 재이탈',
      traps: '강한 하락 추세에서는 계속 하단 이탈'
    },
    low_pbr: {
      name: 'PBR 저평가',
      beginnerDesc: '자산 대비 저평가된 종목',
      expertDesc: 'PBR < K (파라미터)',
      buyTiming: '기술적 신호와 결합 시',
      holdingPeriod: '중장기',
      stopLoss: '업종 악재 발생 시',
      traps: '저 PBR은 저평가가 아닌 구조적 문제일 수도'
    },
    combo_golden: {
      name: '⭐ 중장기 황금 조합',
      beginnerDesc: '가장 신뢰할 수 있는 중장기 상승 신호',
      expertDesc: '골든크로스 + 거래량 급증 + RSI>50',
      buyTiming: '조건 일치 당일 종가',
      holdingPeriod: '1~3개월',
      stopLoss: 'MA20 이탈',
      traps: '조건이 겹칠 확률 낮음 (희소 신호)'
    },
    combo_value_rebound: {
      name: '⭐ 저평가 반등',
      beginnerDesc: '저평가에서 반등 시작',
      expertDesc: 'PBR<1 + RSI 반등 + MA60 지지',
      buyTiming: '반등 당일 종가',
      holdingPeriod: '1~6개월',
      stopLoss: 'MA60 하향 이탈',
      traps: '구조적 저 PBR 종목은 반등이 약할 수 있음'
    }
  }
} as const

export type Strings = typeof strings
