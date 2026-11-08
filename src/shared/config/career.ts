// 生涯等级、称号、XP 上限、赛季规则 —— 所有阈值集中在此配置
import type { AttrKey, PlayStyle, Position, Hand } from '../types'

export const CAREER_CONFIG = {
  maxLevel: 60,
  /** 第 L 级升到 L+1 级所需 XP */
  xpToNext: (level: number): number => 120 + (level - 1) * 45,
  /** 每日训练 XP 上限（任务奖励另计，单个任务奖励固定） */
  dailyTrainingXpCap: 400,
  /** 单次训练 XP 上限 */
  sessionXpCap: 220
}

export const TITLES: Array<{ level: number; title: string; en: string }> = [
  { level: 1, title: '新秀', en: 'ROOKIE' },
  { level: 6, title: '轮换球员', en: 'ROTATION' },
  { level: 12, title: '主力球员', en: 'STARTER' },
  { level: 20, title: '核心球员', en: 'CORNERSTONE' },
  { level: 30, title: '校园明星', en: 'CAMPUS STAR' },
  { level: 42, title: '球场传奇', en: 'COURT LEGEND' }
]

export const SEASON_CONFIG = {
  lengthDays: 28,
  xpPerSeasonLevel: 180,
  maxSeasonLevel: 30,
  goals: [
    { key: 'sessions', label: '赛季训练次数', target: 16 },
    { key: 'minutes', label: '赛季训练时长（分钟）', target: 600 },
    { key: 'tests', label: '完成能力测试', target: 3 }
  ],
  names: ['起势', '破晓', '燃点', '锋芒', '蜕变', '统治', '巅峰', '传承']
}

export const ATTR_META: Record<AttrKey, { name: string; en: string; short: string }> = {
  shooting: { name: '投篮', en: 'SHOOTING', short: 'SHT' },
  dribbling: { name: '运球', en: 'HANDLES', short: 'HND' },
  finishing: { name: '终结', en: 'FINISHING', short: 'FIN' },
  defense: { name: '防守', en: 'DEFENSE', short: 'DEF' },
  athleticism: { name: '体能', en: 'ATHLETICISM', short: 'ATH' },
  iq: { name: '球商', en: 'BASKETBALL IQ', short: 'IQ' }
}

export const ATTR_KEYS: AttrKey[] = ['shooting', 'dribbling', 'finishing', 'defense', 'athleticism', 'iq']

/** 不同位置的 OVR 权重，各行之和为 1 */
export const POSITION_WEIGHTS: Record<Position, Record<AttrKey, number>> = {
  PG: { shooting: 0.22, dribbling: 0.24, finishing: 0.13, defense: 0.13, athleticism: 0.12, iq: 0.16 },
  SG: { shooting: 0.28, dribbling: 0.18, finishing: 0.16, defense: 0.14, athleticism: 0.12, iq: 0.12 },
  SF: { shooting: 0.2, dribbling: 0.14, finishing: 0.18, defense: 0.18, athleticism: 0.16, iq: 0.14 },
  PF: { shooting: 0.12, dribbling: 0.1, finishing: 0.22, defense: 0.22, athleticism: 0.2, iq: 0.14 },
  C: { shooting: 0.08, dribbling: 0.06, finishing: 0.26, defense: 0.26, athleticism: 0.22, iq: 0.12 }
}

export const POSITIONS: Array<{ id: Position; name: string; en: string }> = [
  { id: 'PG', name: '控球后卫', en: 'POINT GUARD' },
  { id: 'SG', name: '得分后卫', en: 'SHOOTING GUARD' },
  { id: 'SF', name: '小前锋', en: 'SMALL FORWARD' },
  { id: 'PF', name: '大前锋', en: 'POWER FORWARD' },
  { id: 'C', name: '中锋', en: 'CENTER' }
]

export const PLAY_STYLES: Array<{ id: PlayStyle; name: string; en: string; desc: string; focus: AttrKey[] }> = [
  { id: 'sharpshooter', name: '外线神射手', en: 'SHARPSHOOTER', desc: '拉开空间，接球即投，三分线外的致命威胁。', focus: ['shooting', 'iq'] },
  { id: 'slasher', name: '突破终结者', en: 'SLASHER', desc: '第一步爆发，冲击篮筐，对抗中完成终结。', focus: ['finishing', 'athleticism'] },
  { id: 'playmaker', name: '控球组织者', en: 'PLAYMAKER', desc: '掌控节奏，读懂防守，把球送到最好的位置。', focus: ['dribbling', 'iq'] },
  { id: 'lockdown', name: '防守专家', en: 'LOCKDOWN', desc: '脚步扎实，贴身压迫，让对手每一球都难受。', focus: ['defense', 'athleticism'] },
  { id: 'allround', name: '全能型球员', en: 'ALL-AROUND', desc: '没有明显短板，哪里需要就出现在哪里。', focus: ['shooting', 'defense'] }
]

export const HANDS: Array<{ id: Hand; name: string }> = [
  { id: 'right', name: '右手' },
  { id: 'left', name: '左手' },
  { id: 'both', name: '左右开弓' }
]

export const PLAYER_LIMITS = {
  nickname: { min: 1, max: 16 },
  jersey: { min: 0, max: 99 },
  heightCm: { min: 120, max: 240 },
  weightKg: { min: 30, max: 180 },
  estimate: { min: 25, max: 85 }
}
