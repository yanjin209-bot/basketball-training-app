// 4 周个人训练赛季
import { SEASON_CONFIG } from '../config/career'
import { addDays, diffDays } from './dates'

export function seasonIndexFor(createdDate: string, date: string): number {
  return Math.max(1, Math.floor(diffDays(createdDate, date) / SEASON_CONFIG.lengthDays) + 1)
}

export function seasonRange(createdDate: string, index: number): { start: string; end: string } {
  const start = addDays(createdDate, (index - 1) * SEASON_CONFIG.lengthDays)
  return { start, end: addDays(start, SEASON_CONFIG.lengthDays - 1) }
}

export function seasonName(index: number): string {
  const n = SEASON_CONFIG.names[(index - 1) % SEASON_CONFIG.names.length]
  return `S${index} · ${n}`
}

export function seasonLevel(xp: number): number {
  return Math.min(SEASON_CONFIG.maxSeasonLevel, Math.floor(Math.max(0, xp) / SEASON_CONFIG.xpPerSeasonLevel) + 1)
}

export function seasonGrade(goals: Array<{ target: number; value: number }>): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (goals.length === 0) return 'D'
  const ratio = goals.reduce((a, g) => a + Math.min(1, g.value / g.target), 0) / goals.length
  if (ratio >= 1) return 'S'
  if (ratio >= 0.8) return 'A'
  if (ratio >= 0.6) return 'B'
  if (ratio >= 0.35) return 'C'
  return 'D'
}
