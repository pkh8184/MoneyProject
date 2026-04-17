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
  footer: {
    glossaryLinkLabel: '📘 용어집'
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
    pageTitle: '⭐ 관심 종목',
    linkLabel: '관심 종목',
    addAria: '관심 종목에 추가',
    removeAria: '관심 종목에서 빼기',
    added: '추가됨',
    empty: '관심 종목에 등록한 종목이 없어요. 종목 페이지에서 ☆를 눌러 추가해 보세요.',
    sortAddedDesc: '추가한 순서',
    sortReturnDesc: '많이 오른 순',
    sortReturnAsc: '많이 내린 순',
    sortName: '이름 순',
    columnPrice: '지금 가격',
    columnChange: '어제보다',
    columnAddedAt: '추가한 날',
    deleteConfirm: (name: string) => `${name}을(를) 관심 종목에서 뺄까요?`
  },
  portfolio: {
    pageTitle: '💼 보유한 주식',
    linkLabel: '보유한 주식',
    addButton: '＋ 주식 기록하기',
    empty: '아직 기록한 주식이 없어요. ＋ 버튼으로 보유한 주식을 기록해 보세요.',
    summaryProfit: (n: number) => `지금까지 +${n.toLocaleString()}원 벌었어요 🟢`,
    summaryLoss: (n: number) => `지금까지 ${n.toLocaleString()}원 잃었어요 🔴`,
    summaryEven: '아직 크게 벌거나 잃지 않았어요',
    summarySubtitle: (cost: number, value: number) =>
      `(전부 산 가격 ${cost.toLocaleString()}원 → 지금 가치 ${value.toLocaleString()}원)`,
    cardBuy: (price: number, qty: number, cost: number) =>
      `산 가격: ${price.toLocaleString()}원 × ${qty}주 = ${cost.toLocaleString()}원`,
    cardNow: (price: number, qty: number, value: number) =>
      `지금:    ${price.toLocaleString()}원 × ${qty}주 = ${value.toLocaleString()}원`,
    cardProfit: (n: number, pct: number) =>
      `👉 +${n.toLocaleString()}원 벌었어요 (${pct.toFixed(2)}% 🟢)`,
    cardLoss: (n: number, pct: number) =>
      `👉 ${n.toLocaleString()}원 잃었어요 (${pct.toFixed(2)}% 🔴)`,
    cardNoPrice: '지금 가격 정보가 없어요',
    cardFooter: '※ 수수료·세금은 빠져있어요 (참고용이에요)',
    deleteConfirm: (name: string) => `${name} 기록을 지울까요?`,
    modal: {
      addTitle: '보유 주식 기록하기',
      editTitle: '기록 수정',
      stockLabel: '어떤 주식이에요?',
      stockPlaceholder: '주식 이름이나 코드로 찾기',
      buyPriceLabel: '얼마에 샀어요? (원)',
      quantityLabel: '몇 주 샀어요?',
      boughtAtLabel: '언제 샀어요?',
      memoLabel: '메모 (안 써도 돼요)',
      hint: '한 번에 산 가격 기준이에요. 여러 번 나눠 사셨다면 평균 가격을 적어주세요.',
      save: '저장',
      cancel: '취소'
    }
  },
  journal: {
    pageTitle: '📓 매매일지',
    linkLabel: '매매일지',
    addButton: '＋ 거래 기록하기',
    empty: '아직 매매 기록이 없어요. ＋ 버튼으로 사고 판 기록을 남겨보세요.',
    monthlyTitle: (m: string) => `📅 이번 달 (${m}) 요약`,
    monthlyTotal: (n: number) => `이번 달 거래: ${n}번`,
    monthlyBuySell: (b: number, s: number) => `산 횟수: ${b}번 / 판 횟수: ${s}번`,
    monthlyWinLoss: (w: number, l: number) => `돈 번 거래: ${w}번 🟢 / 돈 잃은 거래: ${l}번 🔴`,
    monthlyHint: '(돈을 벌었는지/잃었는지는 직접 입력한 금액으로 계산해요)',
    cardBuy: (price: number, qty: number) => `샀어요 · ${price.toLocaleString()}원 × ${qty}주 = ${(price * qty).toLocaleString()}원`,
    cardSell: (price: number, qty: number) => `팔았어요 · ${price.toLocaleString()}원 × ${qty}주 = ${(price * qty).toLocaleString()}원`,
    cardProfit: (n: number) => `👉 +${n.toLocaleString()}원 벌었어요 🟢`,
    cardLoss: (n: number) => `👉 ${n.toLocaleString()}원 잃었어요 🔴`,
    cardMemo: (m: string) => `메모: "${m}"`,
    deleteConfirm: '이 기록을 지울까요?',
    filterAll: '전체',
    filterBuy: '산 것만',
    filterSell: '판 것만',
    modal: {
      addTitle: '거래 기록하기',
      editTitle: '거래 기록 수정',
      dateLabel: '언제 거래했어요?',
      stockLabel: '어떤 주식이에요?',
      stockPlaceholder: '주식 이름이나 코드로 찾기',
      typeLabel: '산 거래예요, 판 거래예요?',
      typeBuy: '샀어요',
      typeSell: '팔았어요',
      priceLabel: '얼마에 거래했어요? (원)',
      quantityLabel: '몇 주 거래했어요?',
      profitLabel: '이번 거래로 얼마 벌었어요? (잃었으면 앞에 - 표시)',
      profitHint: '안 써도 돼요. 쓰면 월별 요약에 반영돼요.',
      reasonLabel: '메모 (안 써도 돼요)',
      save: '저장',
      cancel: '취소'
    }
  },
  glossary: {
    pageTitle: '📘 용어집',
    linkLabel: '용어집',
    searchPlaceholder: '용어 검색',
    categoryAll: '전체',
    empty: '검색 결과가 없습니다'
  },
  heatmap: {
    pageTitle: '🗺 오늘 잘 나가는 분야',
    linkLabel: '오늘 잘 나가는 분야',
    topTitle: '🔥 오늘 가장 잘 나가는 5 분야',
    bottomTitle: '❄️ 오늘 힘든 5 분야',
    selectedSectorTitle: (s: string) => `📈 ${s} — 오늘 많이 오른 순 (Top 20)`,
    pickHint: '분야를 눌러보면 그 분야 종목들이 나와요',
    empty: '아직 오늘 자료가 충분하지 않아요'
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
  dataIO: {
    menuLabel: '데이터',
    exportButton: '내보내기 (JSON)',
    importButton: '가져오기 (JSON)',
    exportSuccess: '내려받기가 시작되었습니다',
    importConfirm: '기존 데이터를 덮어씁니다. 계속할까요?',
    importSuccess: '가져오기 완료',
    importInvalid: '유효하지 않은 파일입니다'
  },
  ml: {
    badgeLabel: (score: number) => `🤖 +${score}`,
    panelTitle: '🤖 ML 예측',
    probabilityLabel: (pct: number) => `D+20 KOSPI 초과 확률: ${(pct * 100).toFixed(1)}%`,
    scoreLabel: (score: number) => `예상 점수: +${score} / 20`,
    topFeaturesTitle: '📊 예측 근거 (상위 3 피처)',
    featureRow: (name: string, value: number) => `• ${name} = ${value.toFixed(2)}`,
    modelInfo: (version: string, auc: number) => `모델 ${version} · AUC ${auc.toFixed(2)}`,
    disclaimer: '※ 과거 5년 패턴 기반. 미래 수익 보장 아님.',
    metricsPageTitle: '🤖 ML 모델 지표',
    metricsUpdated: (iso: string) => `훈련: ${new Date(iso).toLocaleString('ko-KR')}`
  },
  environment: {
    pageTitle: '🌍 시장 환경',
    linkLabel: '시장 환경',
    subtitle: '현재 상황에 맞는 팩터를 켜두면 추천 점수에 반영돼요',
    activeCount: (n: number, total: number) => `현재 활성: ${n} / ${total}개`,
    clearAll: '모두 끄기',
    presetSoon: '추천 세팅 (준비 중)',
    categoryTitle: {
      geopolitics: 'A. 지정학',
      rates: 'B. 금리·환율',
      commodity: 'C. 원자재·에너지',
      domestic: 'D. 국내 경제',
      theme: 'E. 산업 테마',
      sentiment: 'F. 시장 심리'
    },
    categoryCount: (active: number, total: number) => `(${active} / ${total})`,
    beneficiaryLabel: '👍 수혜',
    loserLabel: '👎 피해',
    guideStep1Title: '🌍 시장 환경이란?',
    guideStep1Body: '"지금 세계에서 벌어지는 일"에 따라 유리한 종목이 달라져요.',
    guideStep2Title: '🤖 자동 감지',
    guideStep2Body: '환율·유가·코스피는 실제 데이터로 자동 감지해서 추천해드려요.\n마음에 들면 "자동 감지 전부 켜기" 버튼으로 바로 적용하세요.',
    guideStep3Title: '수동 설정',
    guideStep3Body: '전쟁·산업 붐 같은 건 직접 뉴스 보시고 켜주세요.'
  },
  macro: {
    badgeLabel: (total: number) => `🌍 환경 ${total > 0 ? '+' : ''}${total}`,
    noActive: '활성 팩터가 없어요',
    detailTitle: '🌍 현재 환경에서의 위치',
    matchSummary: (matched: number, total: number) =>
      `활성 팩터 ${total}개 중 ${matched}개 매칭`,
    roleBenefit: '(수혜)',
    roleLoss: '(피해)',
    totalLine: '합계',
    goToSettings: '🌍 시장 환경 설정 바로가기 →',
    weightLabel: (w: number) => `강도: ±${w}`,
    confidenceHigh: '★★★★★',
    confidenceMedium: '★★★☆☆',
    confidenceLow: '★☆☆☆☆',
    backtestSummary: (effect: number, sample: number) =>
      `과거 평균 수혜 D+5 ${effect > 0 ? '+' : ''}${effect.toFixed(2)}% (샘플 ${sample}일)`,
    stockResponse: (effect: number, sample: number) =>
      `📊 이 종목은 과거 평균 D+5 ${effect > 0 ? '+' : ''}${effect.toFixed(2)}% (${sample}일)`,
    rotationTitle: '⚡ 오늘의 섹터 흐름 (최근 30일)',
    rotationStrong: '🔥 강세',
    rotationWeak: '❄️ 약세',
    rotationNeutral: '보통',
    rotationNoData: '섹터 데이터 준비 중이에요',
    rotationBadge: (delta: number) => `⚡ 섹터 ${delta > 0 ? '+' : ''}${delta}`,
    rotationRowPct: (pct: number) => `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`,
    decayLabel: (days: number, pct: number) => `활성 ${days}일 · 효과 ${pct}%`
  },
  autoDetect: {
    title: (n: number) => `🤖 자동 감지됨 (${n}개)`,
    description: '오늘 시장 상황으로 이런 팩터들이 맞아 보여요',
    noneDetected: '🌤️ 오늘은 특별한 시장 이벤트가 감지되지 않았어요',
    badgeLabel: '💡 자동 감지',
    applied: '적용됨',
    notApplied: '적용 안 됨',
    turnOn: '적용',
    turnOff: '끄기',
    applyAll: '💡 자동 감지 전부 켜기',
    updatedAt: (iso: string) => `업데이트: ${new Date(iso).toLocaleString('ko-KR')}`
  },
  bowlPhase: {
    title: '🍚 밥그릇 진행 단계',
    subtitle: '4단계 중 현재 위치',
    phase1: {
      short: '① 급락',
      full: '급락 (역배열)',
      desc: '주가가 크게 떨어지는 중. 장기선이 단기선보다 위에 있어요 (역배열).'
    },
    phase2: {
      short: '② 횡보·매집',
      full: '횡보·매집 (수렴)',
      desc: '하락이 멈추고 옆으로 기어가는 중. 이평선들이 점점 모여요. 세력이 조용히 물량을 모으는 구간.'
    },
    phase3: {
      short: '③ 공이',
      full: '공이 (골든크로스)',
      desc: '드디어 장기선을 뚫고 올라서는 시점. 역배열이 정배열로 바뀌기 시작하는 변곡점. 밥그릇 기법의 핵심 매수 구간!'
    },
    phase4: {
      short: '④ 폭등',
      full: '폭등 (정배열)',
      desc: '본격 상승. 단기선이 장기선 위로 정렬되어 상승 추세 확정.'
    },
    currentLabel: '← 현재 위치',
    notDetected: '저점 정보가 없어 단계 판정 불가',
    hint: '③ 공이 구간 진입 직후가 매수 타이밍이에요. ① 급락이나 ② 횡보 구간에서는 섣불리 들어가지 마세요.'
  },
  momentum: {
    panelTitle: '📊 오늘의 체크포인트',
    summary: (bullish: number, warning: number) =>
      `긍정 ${bullish}개 · 주의 ${warning}개`,
    emptyMessage: '감지된 신호가 없어요. 뉴스·공시·실적 이슈 가능성이 있어요.',
    dataNote: 'ℹ️ 데이터 기준: 어제 종가 · 뉴스·공시는 추적하지 않아요.',
    moreLink: '자세히 →',
    timingLatest: '어제 종가 기준',
    timingRecent: '최근',
    timingOngoing: '진행 중',
    expandAria: '체크포인트 펼치기',
    collapseAria: '체크포인트 접기'
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
