export interface ThemeDef {
  id: string
  label: string
  keywords: string[]
}

export const THEME_DEFS: ThemeDef[] = [
  { id: 'semiconductor', label: '반도체', keywords: ['반도체', '메모리', '파운드리', '디스플레이'] },
  { id: 'battery', label: '2차전지', keywords: ['배터리', '2차전지', '양극재', '음극재'] },
  { id: 'ai', label: 'AI·소프트웨어', keywords: ['AI', '인공지능', '클라우드', '소프트웨어', '플랫폼'] },
  { id: 'ev', label: '전기차', keywords: ['전기차', '자동차', 'EV', '모빌리티'] },
  { id: 'security', label: '보안', keywords: ['보안', '사이버'] },
  { id: 'bio', label: '바이오·헬스', keywords: ['바이오', '제약', '헬스케어'] },
  { id: 'game', label: '게임', keywords: ['게임', '엔터테인먼트'] },
  { id: 'finance', label: '금융', keywords: ['은행', '증권', '보험', '카드'] }
]
