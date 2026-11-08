// XP 与生涯等级规则（纯函数，便于测试）
import { CAREER_CONFIG, TITLES } from '../config/career'
import { DRILL_MAP, INTENSITY_META } from '../config/drills'
import type { CareerState, TrainingInput } from '../types'

export interface SessionTotals {
  attempts: number
  makes: number
  reps: number
}

export function totalsOf(sets: TrainingInput['sets']): SessionTotals {
  return sets.reduce<SessionTotals>(
    (acc, s) => ({
      attempts: acc.attempts + (s.attempts ?? 0),
      makes: acc.makes + (s.makes ?? 0),
      reps: acc.reps + (s.reps ?? 0)
    }),
    { attempts: 0, makes: 0, reps: 0 }
  )
}

export function accuracy(attempts: number, makes: number): number | null {
  if (!attempts || attempts <= 0) return null
  return Math.round((makes / attempts) * 1000) / 10 // 保留 1 位小数的百分比
}

const REP_XP: Record<string, number> = { crossover: 0.1, def_slides: 2, agility: 2 }

/** 单次训练的原始 XP（未计入每日上限） */
export function sessionXp(drillId: string, durationMin: number, totals: SessionTotals): number {
  const drill = DRILL_MAP[drillId]
  if (!drill) return 0
  const minutes = Math.max(0, Math.min(durationMin, 240))
  if (drill.category === 'recovery') {
    return Math.round(Math.min(minutes, 30) * INTENSITY_META.low.xpPerMin)
  }
  let xp = minutes * INTENSITY_META[drill.intensity].xpPerMin
  if (drill.metric === 'shots') {
    xp += totals.attempts * 0.35 + totals.makes * 0.6
    if (totals.attempts >= 20) {
      const acc = totals.makes / totals.attempts
      const shift = drill.category === 'finishing' ? 0.2 : 0
      if (acc >= 0.8 + shift * 0.5) xp += 24
      else if (acc >= 0.65 + shift) xp += 16
      else if (acc >= 0.5 + shift) xp += 8
    }
  } else if (drill.metric === 'reps') {
    xp += totals.reps * (REP_XP[drillId] ?? 0.1)
  }
  return Math.round(Math.min(xp, CAREER_CONFIG.sessionXpCap))
}

/**
 * 按日期分配 XP：同一天内按记录先后扣减每日上限。
 * 修改 / 删除任何记录后整体重算，保证不会重复发放。
 */
export function allocateDailyXp(
  sessions: Array<{ id: number; date: string; raw: number }>,
  cap: number = CAREER_CONFIG.dailyTrainingXpCap
): Map<number, number> {
  const out = new Map<number, number>()
  const used = new Map<string, number>()
  const sorted = [...sessions].sort((a, b) => (a.date === b.date ? a.id - b.id : a.date < b.date ? -1 : 1))
  for (const s of sorted) {
    const u = used.get(s.date) ?? 0
    const award = Math.max(0, Math.min(s.raw, cap - u))
    used.set(s.date, u + award)
    out.set(s.id, award)
  }
  return out
}

/** 达到第 level 级所需的累计 XP */
export function xpForLevel(level: number): number {
  let total = 0
  for (let l = 1; l < level; l++) total += CAREER_CONFIG.xpToNext(l)
  return total
}

export function levelFromXp(totalXp: number): number {
  let level = 1
  let need = CAREER_CONFIG.xpToNext(1)
  let rest = Math.max(0, totalXp)
  while (rest >= need && level < CAREER_CONFIG.maxLevel) {
    rest -= need
    level++
    need = CAREER_CONFIG.xpToNext(level)
  }
  return level
}

export function titleForLevel(level: number): { title: string; en: string; level: number } {
  let t = TITLES[0]
  for (const x of TITLES) if (level >= x.level) t = x
  return t
}

export function careerState(totalXp: number): CareerState {
  const level = levelFromXp(totalXp)
  const base = xpForLevel(level)
  const isMax = level >= CAREER_CONFIG.maxLevel
  const forLevel = isMax ? 1 : CAREER_CONFIG.xpToNext(level)
  const t = titleForLevel(level)
  const next = TITLES.find((x) => x.level > level) ?? null
  return {
    totalXp,
    level,
    title: t.title,
    titleEn: t.en,
    xpIntoLevel: isMax ? 1 : totalXp - base,
    xpForLevel: forLevel,
    nextTitle: next ? { title: next.title, level: next.level } : null
  }
}
