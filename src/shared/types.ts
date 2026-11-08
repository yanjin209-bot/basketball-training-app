// ───────────────────────────────────────────────────────────
// COURT//RISE 领域类型（主进程 / 预加载 / 渲染进程共用）
// ───────────────────────────────────────────────────────────

export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C'
export type PlayStyle = 'sharpshooter' | 'slasher' | 'playmaker' | 'lockdown' | 'allround'
export type Hand = 'right' | 'left' | 'both'
export type AttrKey = 'shooting' | 'dribbling' | 'finishing' | 'defense' | 'athleticism' | 'iq'

export type AttrMap = Record<AttrKey, number>

export interface Player {
  id: number
  nickname: string
  jersey: number
  heightCm: number
  weightKg: number
  hand: Hand
  position: Position
  style: PlayStyle
  avatar: string | null
  /** 创建时的自评，仅作为“预估”数据 */
  estimates: AttrMap
  createdAt: string
}

export interface PlayerInput {
  nickname: string
  jersey: number
  heightCm: number
  weightKg: number
  hand: Hand
  position: Position
  style: PlayStyle
  avatar: string | null
  estimates: AttrMap
}

// ── 训练 ──────────────────────────────────────────────────
export interface TrainingSetInput {
  location?: string | null
  attempts?: number | null
  makes?: number | null
  reps?: number | null
}

export interface TrainingInput {
  drillId: string
  date: string // YYYY-MM-DD
  durationMin: number
  rpe: number // 1–10 主观疲劳度
  notes?: string
  sets: TrainingSetInput[]
}

export interface TrainingSet {
  id: number
  idx: number
  location: string | null
  attempts: number
  makes: number
  reps: number
}

export interface TrainingSession {
  id: number
  drillId: string
  date: string
  durationMin: number
  rpe: number
  notes: string
  xpRaw: number
  xpAwarded: number
  sets: TrainingSet[]
  attempts: number
  makes: number
  reps: number
  accuracy: number | null
  createdAt: string
}

// ── 能力测试 ──────────────────────────────────────────────
export interface SkillTestRecord {
  id: number
  testId: string
  date: string
  raw: number
  score: number
  notes: string
  createdAt: string
}

export type AttrSource = 'tested' | 'mixed' | 'estimated'

export interface AttributeDetail {
  key: AttrKey
  value: number
  source: AttrSource
  subs: Array<{
    testId: string
    score: number | null
    raw: number | null
    best: number | null
    date: string | null
  }>
}

// ── 生涯 / 任务 / 徽章 ────────────────────────────────────
export interface CareerState {
  totalXp: number
  level: number
  title: string
  titleEn: string
  xpIntoLevel: number
  xpForLevel: number
  nextTitle: { title: string; level: number } | null
}

export type QuestStatus = 'active' | 'completed' | 'claimed' | 'expired'

export interface Quest {
  id: number
  date: string
  defId: string
  title: string
  kind: string
  target: number
  progress: number
  reward: number
  unit: string
  status: QuestStatus
  recovery: boolean
}

export type BadgeTier = 1 | 2 | 3 | 4 // 铜 银 金 传奇

export interface BadgeProgress {
  badgeId: string
  tier: 0 | BadgeTier
  value: number
  nextThreshold: number | null
  unlockedAt: Record<number, string>
}

export interface Achievement {
  id: number
  kind: string
  ref: string
  title: string
  detail: string
  createdAt: string
}

export interface SeasonInfo {
  index: number
  name: string
  start: string
  end: string
  day: number // 1..28
  xp: number
  level: number
  sessions: number
  minutes: number
  goals: Array<{ key: string; label: string; target: number; value: number }>
}

export interface SeasonSummary extends SeasonInfo {
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  ovrStart: number
  ovrEnd: number
  attrStart: AttrMap
  attrEnd: AttrMap
  badges: Array<{ badgeId: string; tier: number }>
  bests: Array<{ label: string; value: string }>
  testsTaken: number
  complete: boolean
}

// ── 比赛记录 ──────────────────────────────────────────────
export type GameMode = '3v3' | '5v5'
export interface GameLogInput {
  date: string
  mode: GameMode
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  result: 'W' | 'L' | null
  notes: string
}
export interface GameLog extends GameLogInput {
  id: number
  createdAt: string
}

export interface Snapshot {
  id: number
  takenAt: string
  reason: string
  ovr: number
  level: number
  attributes: AttrMap
  sources: Record<AttrKey, AttrSource>
}

// ── 动效事件（主进程计算，渲染进程播放） ─────────────────
export type GameEvent =
  | { type: 'xp'; amount: number; capped: boolean }
  | { type: 'levelUp'; from: number; to: number; title: string | null }
  | { type: 'badge'; badgeId: string; tier: BadgeTier }
  | { type: 'pb'; testId: string; score: number; prev: number | null }
  | { type: 'questComplete'; title: string }
  | { type: 'achievement'; title: string; detail: string }

export interface MutationResult<T = unknown> {
  data: T
  events: GameEvent[]
}

// ── 仪表盘 / 统计 ─────────────────────────────────────────
export interface Dashboard {
  player: Player
  career: CareerState
  ovr: number
  ovrEstimated: boolean
  attributes: AttributeDetail[]
  quests: Quest[]
  isRecoveryDay: boolean
  season: SeasonInfo
  recentSessions: TrainingSession[]
  week: Array<{ date: string; minutes: number; xp: number }>
  todayXp: number
  dailyCap: number
  badges: BadgeProgress[]
  recentAchievements: Achievement[]
  streak: number
  pendingSeasonSummary: number | null
}

export interface StatsBundle {
  calendar: Array<{ date: string; minutes: number; sessions: number }>
  weekly: Array<{ week: string; minutes: number; sessions: number; xp: number }>
  monthly: Array<{ month: string; minutes: number; sessions: number; attempts: number; makes: number }>
  accuracyTrend: Array<{ date: string; drillId: string; accuracy: number; attempts: number }>
  totals: { sessions: number; minutes: number; attempts: number; makes: number; reps: number; games: number }
  records: Array<{ label: string; value: string; date: string | null }>
  games: GameLog[]
  gameAverages: { games: number; points: number; rebounds: number; assists: number; steals: number; blocks: number; turnovers: number } | null
  snapshots: Snapshot[]
}

// ── 设置 / AI ─────────────────────────────────────────────
export interface AppSettings {
  reducedMotion: 'system' | 'on' | 'off'
  backgroundFx: boolean
  lastSeasonSeen: number
}

export type AiProvider = 'openai' | 'deepseek' | 'custom'
export interface AiConfigPublic {
  provider: AiProvider
  model: string
  baseUrl: string
  hasKey: boolean
  keyHint: string | null
  secureStorage: boolean
}
export interface AiConfigInput {
  provider: AiProvider
  model: string
  baseUrl: string
  apiKey?: string // 留空 = 不修改
  clearKey?: boolean
}
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
export interface CoachReply {
  content: string
  source: 'ai' | 'local'
  error?: string
}
