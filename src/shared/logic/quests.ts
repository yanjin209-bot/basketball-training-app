// 每日任务生成与进度计算
import { DRILL_MAP } from '../config/drills'
import { QUEST_MAP, QUEST_POOL, RECOVERY_RULES, type QuestDef } from '../config/quests'
import { addDays } from './dates'

export interface DaySessionLite {
  date: string
  drillId: string
  durationMin: number
  rpe: number
  attempts: number
}

/** 恢复日判定：连续高频训练或昨日负荷过高 */
export function isRecoveryDay(today: string, sessions: DaySessionLite[]): boolean {
  const trainedDays = new Set(sessions.filter((s) => DRILL_MAP[s.drillId]?.category !== 'recovery').map((s) => s.date))
  let consecutive = true
  for (let i = 1; i <= RECOVERY_RULES.consecutiveDays; i++) {
    if (!trainedDays.has(addDays(today, -i))) consecutive = false
  }
  if (consecutive) return true
  const y = addDays(today, -1)
  const load = sessions
    .filter((s) => s.date === y && DRILL_MAP[s.drillId]?.category !== 'recovery')
    .reduce((a, s) => a + s.durationMin * s.rpe, 0)
  return load >= RECOVERY_RULES.heavyLoad
}

/** 简单可复现的伪随机（同一天同一球员结果固定） */
export function seededRandom(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateDailyQuests(
  date: string,
  playerId: number,
  opts: { recovery: boolean; testedRecently: boolean }
): QuestDef[] {
  if (opts.recovery) return QUEST_POOL.filter((q) => q.group === 'recovery')
  const rnd = seededRandom(`${playerId}:${date}`)
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
  const shooting = pick(QUEST_POOL.filter((q) => q.group === 'shooting'))
  const skills = QUEST_POOL.filter((q) => q.group === 'skill')
  const skill = pick(skills)
  const third = opts.testedRecently ? pick(skills.filter((q) => q.id !== skill.id)) : QUEST_MAP.test1
  return [shooting, skill, third]
}

export interface DayActivity {
  sessions: Array<{ drillId: string; durationMin: number; attempts: number }>
  tests: number
  games: number
}

export function questProgress(def: QuestDef, day: DayActivity): number {
  const match = (drillId: string): boolean => {
    if (!def.filter) return true
    if (def.filter.drillId) return def.filter.drillId === drillId
    if (def.filter.category) return DRILL_MAP[drillId]?.category === def.filter.category
    return true
  }
  switch (def.kind) {
    case 'attempts':
      return day.sessions.filter((s) => match(s.drillId)).reduce((a, s) => a + s.attempts, 0)
    case 'minutes':
      return Math.round(day.sessions.filter((s) => match(s.drillId)).reduce((a, s) => a + s.durationMin, 0))
    case 'test':
      return day.tests
    case 'games':
      return day.games
  }
}
