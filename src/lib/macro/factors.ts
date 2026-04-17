// src/lib/macro/factors.ts
import type { MacroFactor } from './types'

export const macroFactors: MacroFactor[] = [
  // ========== A. 지정학 (7) ==========
  {
    id: 'war_ongoing',
    category: 'geopolitics',
    level: 'danger',
    emoji: '🔴',
    name: '전쟁·분쟁 지속',
    desc: '전세계에서 전쟁이 이어지는 시기',
    beneficiaries: {
      themes: ['방산', '정유·에너지'],
      nameKeywords: ['고려아연', '풍산']
    },
    losers: {
      themes: ['항공·여행']
    },
    defaultActive: false
  },
  {
    id: 'nk_provocation',
    category: 'geopolitics',
    level: 'caution',
    emoji: '🟡',
    name: '북한 도발',
    desc: '북한이 미사일을 쏘거나 군사 활동이 많은 시기',
    beneficiaries: {
      themes: ['방산'],
      nameKeywords: ['빅텍', '스페코']
    },
    losers: {
      nameKeywords: ['현대엘리베이터', '아난티']
    },
    defaultActive: false
  },
  {
    id: 'middle_east',
    category: 'geopolitics',
    level: 'danger',
    emoji: '🔴',
    name: '중동 긴장',
    desc: '이스라엘·이란 등 중동 지역 긴장이 높은 시기',
    beneficiaries: {
      themes: ['정유·에너지'],
      nameKeywords: ['S-Oil', '현대중공업']
    },
    losers: {
      themes: ['항공·여행']
    },
    defaultActive: false
  },
  {
    id: 'us_china',
    category: 'geopolitics',
    level: 'danger',
    emoji: '🔴',
    name: '미·중 무역분쟁',
    desc: '미국과 중국 간 무역 갈등이 심한 시기',
    beneficiaries: {
      themes: ['반도체']
    },
    losers: {
      nameKeywords: ['LG생활건강', '아모레퍼시픽', '코스맥스']
    },
    defaultActive: false
  },
  {
    id: 'trade_boom',
    category: 'geopolitics',
    level: 'opportunity',
    emoji: '🟢',
    name: '글로벌 무역 확대',
    desc: '세계 교역량이 늘어나는 시기',
    beneficiaries: {
      themes: ['해운·물류']
    },
    losers: {},
    defaultActive: false
  },
  {
    id: 'taiwan_tension',
    category: 'geopolitics',
    level: 'danger',
    emoji: '🔴',
    name: '대만 긴장',
    desc: '중국-대만 긴장이 고조된 시기',
    beneficiaries: {
      themes: ['반도체'],
      nameKeywords: ['한미반도체', '이수페타시스']
    },
    losers: {},
    defaultActive: false
  },
  {
    id: 'korea_peace',
    category: 'geopolitics',
    level: 'opportunity',
    emoji: '🟢',
    name: '한반도 평화 무드',
    desc: '남북 관계 개선이 기대되는 시기',
    beneficiaries: {
      themes: ['건설'],
      nameKeywords: ['현대엘리베이터', '아난티', '현대건설']
    },
    losers: {},
    defaultActive: false
  },

  // ========== B. 금리·환율 (5) ==========
  {
    id: 'rate_hike',
    category: 'rates',
    level: 'danger',
    emoji: '🔴',
    name: '금리 인상기',
    desc: '중앙은행이 기준금리를 올리는 시기',
    beneficiaries: {
      themes: ['금융']
    },
    losers: {
      themes: ['AI', '바이오', '건설']
    },
    defaultActive: false
  },
  {
    id: 'rate_cut',
    category: 'rates',
    level: 'opportunity',
    emoji: '🟢',
    name: '금리 인하기',
    desc: '중앙은행이 기준금리를 내리는 시기',
    beneficiaries: {
      themes: ['AI', '바이오', '건설']
    },
    losers: {
      themes: ['금융']
    },
    defaultActive: false
  },
  {
    id: 'krw_weak',
    category: 'rates',
    level: 'danger',
    emoji: '🔴',
    name: '원화 약세 (환율↑)',
    desc: '달러당 원화 가치가 떨어지는 시기',
    beneficiaries: {
      themes: ['반도체', '전기차', '2차전지'],
      nameKeywords: ['현대차', '기아', '현대중공업']
    },
    losers: {
      themes: ['항공·여행', '유통']
    },
    defaultActive: false
  },
  {
    id: 'krw_strong',
    category: 'rates',
    level: 'opportunity',
    emoji: '🟢',
    name: '원화 강세 (환율↓)',
    desc: '달러당 원화 가치가 오르는 시기',
    beneficiaries: {
      themes: ['항공·여행', '유통']
    },
    losers: {
      themes: ['반도체'],
      nameKeywords: ['현대차', '기아']
    },
    defaultActive: false
  },
  {
    id: 'inflation',
    category: 'rates',
    level: 'danger',
    emoji: '🔴',
    name: '인플레이션 고조',
    desc: '물가가 빠르게 오르는 시기',
    beneficiaries: {
      themes: ['정유·에너지', '식품·음료', '철강·비철금속']
    },
    losers: {
      themes: ['AI', '바이오']
    },
    defaultActive: false
  },

  // ========== C. 원자재·에너지 (5) ==========
  {
    id: 'oil_up',
    category: 'commodity',
    level: 'danger',
    emoji: '🔴',
    name: '유가 급등',
    desc: '국제유가가 급격히 오르는 시기',
    beneficiaries: {
      themes: ['정유·에너지'],
      nameKeywords: ['S-Oil', 'GS', 'SK이노베이션']
    },
    losers: {
      themes: ['항공·여행', '해운·물류']
    },
    defaultActive: false
  },
  {
    id: 'oil_down',
    category: 'commodity',
    level: 'opportunity',
    emoji: '🟢',
    name: '유가 급락',
    desc: '국제유가가 급격히 내리는 시기',
    beneficiaries: {
      themes: ['항공·여행', '해운·물류']
    },
    losers: {
      themes: ['정유·에너지']
    },
    defaultActive: false
  },
  {
    id: 'gold_up',
    category: 'commodity',
    level: 'danger',
    emoji: '🔴',
    name: '금 가격 급등',
    desc: '안전자산 선호로 금 가격이 급등하는 시기',
    beneficiaries: {
      themes: ['철강·비철금속'],
      nameKeywords: ['고려아연', '풍산']
    },
    losers: {},
    defaultActive: false
  },
  {
    id: 'lithium_copper',
    category: 'commodity',
    level: 'opportunity',
    emoji: '🟢',
    name: '리튬·구리 상승',
    desc: '전기차 원자재 가격이 오르는 시기',
    beneficiaries: {
      themes: ['2차전지', '철강·비철금속'],
      nameKeywords: ['LG화학', '포스코퓨처엠', '고려아연']
    },
    losers: {},
    defaultActive: false
  },
  {
    id: 'grain_up',
    category: 'commodity',
    level: 'danger',
    emoji: '🔴',
    name: '곡물가 상승',
    desc: '밀·옥수수 등 국제 곡물 가격이 오르는 시기',
    beneficiaries: {
      themes: ['식품·음료'],
      nameKeywords: ['농심', '대한제분', 'CJ제일제당', '동원F&B']
    },
    losers: {
      nameKeywords: ['하림', '마니커']
    },
    defaultActive: false
  },

  // ========== D. 국내 경제 (5) ==========
  {
    id: 'realestate_tight',
    category: 'domestic',
    level: 'danger',
    emoji: '🔴',
    name: '부동산 규제 강화',
    desc: '정부가 부동산 규제를 강화하는 시기',
    beneficiaries: {},
    losers: {
      themes: ['건설', '시멘트·건자재']
    },
    defaultActive: false
  },
  {
    id: 'realestate_boost',
    category: 'domestic',
    level: 'opportunity',
    emoji: '🟢',
    name: '부동산 부양',
    desc: '정부가 부동산 시장을 부양하는 시기',
    beneficiaries: {
      themes: ['건설', '시멘트·건자재'],
      nameKeywords: ['삼표시멘트', '한일시멘트', '아시아시멘트']
    },
    losers: {},
    defaultActive: false
  },
  {
    id: 'domestic_down',
    category: 'domestic',
    level: 'danger',
    emoji: '🔴',
    name: '내수 침체',
    desc: '국내 소비가 둔화되는 시기',
    beneficiaries: {},
    losers: {
      themes: ['유통', '식품·음료']
    },
    defaultActive: false
  },
  {
    id: 'domestic_up',
    category: 'domestic',
    level: 'opportunity',
    emoji: '🟢',
    name: '소비 회복',
    desc: '국내 소비가 회복되는 시기',
    beneficiaries: {
      themes: ['유통', '식품·음료', '화장품'],
      nameKeywords: ['호텔신라', 'CJ ENM']
    },
    losers: {},
    defaultActive: false
  },
  {
    id: 'export_boom',
    category: 'domestic',
    level: 'opportunity',
    emoji: '🟢',
    name: '수출 호조',
    desc: '한국 수출이 잘 되는 시기',
    beneficiaries: {
      themes: ['반도체', '2차전지', '전기차'],
      nameKeywords: ['현대차', '기아']
    },
    losers: {},
    defaultActive: false
  },

  // ========== E. 산업 테마 (5) ==========
  {
    id: 'ai_boom',
    category: 'theme',
    level: 'opportunity',
    emoji: '🟢',
    name: 'AI 붐',
    desc: 'AI 산업이 활황인 시기',
    beneficiaries: {
      themes: ['AI', '반도체'],
      nameKeywords: ['SK하이닉스', '한미반도체']
    },
    losers: {},
    defaultActive: true
  },
  {
    id: 'ev_boom',
    category: 'theme',
    level: 'opportunity',
    emoji: '🟢',
    name: '전기차·자율주행 붐',
    desc: '전기차 수요가 늘어나는 시기',
    beneficiaries: {
      themes: ['전기차', '2차전지']
    },
    losers: {},
    defaultActive: false
  },
  {
    id: 'bio_boom',
    category: 'theme',
    level: 'opportunity',
    emoji: '🟢',
    name: '바이오 호조',
    desc: '제약·바이오 업종이 활황인 시기',
    beneficiaries: {
      themes: ['바이오']
    },
    losers: {},
    defaultActive: false
  },
  {
    id: 'kcontent_boom',
    category: 'theme',
    level: 'opportunity',
    emoji: '🟢',
    name: 'K-컨텐츠 호조',
    desc: 'K-pop·K-드라마 등 한국 컨텐츠 인기 시기',
    beneficiaries: {
      themes: ['게임', '엔터·미디어'],
      nameKeywords: ['CJ ENM', '하이브', '스튜디오드래곤']
    },
    losers: {},
    defaultActive: false
  },
  {
    id: 'defense_boom',
    category: 'theme',
    level: 'opportunity',
    emoji: '🟢',
    name: '방산 수주 확대',
    desc: '한국 방산 수출이 활발한 시기',
    beneficiaries: {
      themes: ['방산']
    },
    losers: {},
    defaultActive: false
  },

  // ========== F. 시장 심리 (3) ==========
  {
    id: 'foreign_sell',
    category: 'sentiment',
    level: 'danger',
    emoji: '🔴',
    name: '외국인 매도 지속',
    desc: '외국인이 한국 주식을 많이 파는 시기',
    beneficiaries: {
      themes: ['전력·가스', '통신', '담배'],
      nameKeywords: ['KT&G', 'KT', 'SK텔레콤', '한국전력']
    },
    losers: {
      nameKeywords: ['삼성전자', 'SK하이닉스', '현대차', 'LG에너지솔루션', '카카오', '네이버']
    },
    defaultActive: false
  },
  {
    id: 'foreign_buy',
    category: 'sentiment',
    level: 'opportunity',
    emoji: '🟢',
    name: '외국인 매수 지속',
    desc: '외국인이 한국 주식을 많이 사는 시기',
    beneficiaries: {
      themes: ['반도체', 'AI'],
      nameKeywords: ['삼성전자', 'SK하이닉스']
    },
    losers: {},
    defaultActive: false
  },
  {
    id: 'kospi_crash',
    category: 'sentiment',
    level: 'danger',
    emoji: '🔴',
    name: '코스피 급락',
    desc: '전체 시장이 급격히 하락하는 시기',
    beneficiaries: {
      themes: ['전력·가스', '통신', '담배'],
      nameKeywords: ['KT&G']
    },
    losers: {
      themes: ['AI', '바이오']
    },
    defaultActive: false
  }
]
