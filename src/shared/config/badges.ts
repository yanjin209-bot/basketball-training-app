// 徽章定义：全部由本地真实记录推导，无法通过点击获得
export type BadgeMetric =
  | 'totalMakes'
  | 'ftBestAccuracy'
  | 'handleMinutes'
  | 'layupMakes'
  | 'defenseMinutes'
  | 'longestStreak'
  | 'bestSeasonSessions'
  | 'minTestedAttr'
  | 'careerLevel'

export interface BadgeDef {
  id: string
  name: string
  en: string
  metric: BadgeMetric
  unit: string
  description: string
  /** 铜 / 银 / 金 / 传奇 阈值 */
  tiers: [number, number, number, number]
  /** 原创图形：徽章中心图案 */
  glyph: 'flame' | 'target' | 'orbit' | 'bolt' | 'shield' | 'chain' | 'crown' | 'star' | 'laurel'
  shape: 'hex' | 'shield' | 'circle' | 'diamond' | 'octagon'
}

export const TIER_META = [
  { tier: 1, name: '铜', en: 'BRONZE', color: '#C9824B', glow: 'rgba(201,130,75,0.55)' },
  { tier: 2, name: '银', en: 'SILVER', color: '#BBC3CF', glow: 'rgba(187,195,207,0.55)' },
  { tier: 3, name: '金', en: 'GOLD', color: '#F2C46D', glow: 'rgba(242,196,109,0.6)' },
  { tier: 4, name: '传奇', en: 'LEGEND', color: '#FF6B20', glow: 'rgba(255,107,32,0.65)' }
] as const

export const BADGES: BadgeDef[] = [
  { id: 'hundred_shooter', name: '百球射手', en: 'BUCKET COLLECTOR', metric: 'totalMakes', unit: '球', description: '累计投篮训练命中数', tiers: [100, 600, 2500, 8000], glyph: 'flame', shape: 'hex' },
  { id: 'precise_ft', name: '精准罚球', en: 'CHARITY STRIPE', metric: 'ftBestAccuracy', unit: '%', description: '单次罚球训练（≥50 次出手）最高命中率', tiers: [60, 72, 82, 90], glyph: 'target', shape: 'circle' },
  { id: 'handle_master', name: '控球大师', en: 'HANDLE MASTER', metric: 'handleMinutes', unit: '分钟', description: '控球、弱侧手、变向训练累计时长', tiers: [60, 300, 900, 2400], glyph: 'orbit', shape: 'octagon' },
  { id: 'slasher', name: '突破专家', en: 'RIM ATTACKER', metric: 'layupMakes', unit: '球', description: '上篮训练累计命中数', tiers: [50, 300, 1200, 4000], glyph: 'bolt', shape: 'diamond' },
  { id: 'lockdown', name: '防守尖兵', en: 'LOCKDOWN', metric: 'defenseMinutes', unit: '分钟', description: '防守脚步训练累计时长', tiers: [30, 150, 500, 1500], glyph: 'shield', shape: 'shield' },
  { id: 'streak', name: '连续挑战者', en: 'IRON STREAK', metric: 'longestStreak', unit: '天', description: '最长连续训练天数（恢复训练计入）', tiers: [3, 7, 14, 30], glyph: 'chain', shape: 'hex' },
  { id: 'season_king', name: '赛季训练王', en: 'SEASON GRINDER', metric: 'bestSeasonSessions', unit: '次', description: '单个赛季最多训练次数', tiers: [10, 20, 32, 48], glyph: 'crown', shape: 'octagon' },
  { id: 'all_round', name: '全能球员', en: 'ALL-AROUND', metric: 'minTestedAttr', unit: '分', description: '六项能力全部完成测试后的最低分', tiers: [45, 58, 70, 82], glyph: 'star', shape: 'circle' },
  { id: 'legend', name: '球场传奇', en: 'COURT LEGEND', metric: 'careerLevel', unit: '级', description: '生涯等级', tiers: [10, 20, 32, 45], glyph: 'laurel', shape: 'shield' }
]

export const BADGE_MAP: Record<string, BadgeDef> = Object.fromEntries(BADGES.map((b) => [b.id, b]))
