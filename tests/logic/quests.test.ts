import { describe, expect, it } from 'vitest'
import { QUEST_MAP } from '@shared/config/quests'
import { generateDailyQuests, isRecoveryDay, questProgress } from '@shared/logic/quests'
import { seasonGrade, seasonIndexFor, seasonRange } from '@shared/logic/season'
import { currentStreak, longestStreak } from '@shared/logic/streak'
import { tierFor } from '@shared/logic/badges'

describe('恢复日', () => {
  const s = (date: string, drillId = 'spot_shooting', durationMin = 30, rpe = 6) => ({ date, drillId, durationMin, rpe, attempts: 0 })
  it('连续三天训练后为恢复日', () => {
    expect(isRecoveryDay('2026-06-10', [s('2026-06-07'), s('2026-06-08'), s('2026-06-09')])).toBe(true)
  })
  it('恢复训练不计入连续天数', () => {
    expect(isRecoveryDay('2026-06-10', [s('2026-06-07'), s('2026-06-08', 'recovery'), s('2026-06-09')])).toBe(false)
  })
  it('昨日高负荷后为恢复日', () => {
    expect(isRecoveryDay('2026-06-10', [s('2026-06-09', 'conditioning', 100, 9)])).toBe(true)
  })
})

describe('每日任务', () => {
  it('同一天结果固定', () => {
    const a = generateDailyQuests('2026-06-10', 1, { recovery: false, testedRecently: false }).map((q) => q.id)
    const b = generateDailyQuests('2026-06-10', 1, { recovery: false, testedRecently: false }).map((q) => q.id)
    expect(a).toEqual(b)
    expect(new Set(a).size).toBe(3)
    expect(a).toContain('test1')
  })
  it('恢复日派发恢复任务', () => {
    expect(generateDailyQuests('2026-06-10', 1, { recovery: true, testedRecently: false }).every((q) => q.group === 'recovery')).toBe(true)
  })
  it('进度按过滤条件统计', () => {
    const day = { sessions: [{ drillId: 'free_throw', durationMin: 10, attempts: 20 }, { drillId: 'ball_handling', durationMin: 12, attempts: 0 }], tests: 0, games: 0 }
    expect(questProgress(QUEST_MAP.shots30, day)).toBe(20)
    expect(questProgress(QUEST_MAP.ft20, day)).toBe(20)
    expect(questProgress(QUEST_MAP.handle10, day)).toBe(12)
  })
})

describe('赛季 / 连续天数 / 徽章等级', () => {
  it('4 周一期', () => {
    expect(seasonIndexFor('2026-01-01', '2026-01-28')).toBe(1)
    expect(seasonIndexFor('2026-01-01', '2026-01-29')).toBe(2)
    expect(seasonRange('2026-01-01', 2)).toEqual({ start: '2026-01-29', end: '2026-02-25' })
  })
  it('评级', () => {
    expect(seasonGrade([{ target: 10, value: 10 }])).toBe('S')
    expect(seasonGrade([{ target: 10, value: 0 }])).toBe('D')
  })
  it('连续天数', () => {
    expect(longestStreak(['2026-01-01', '2026-01-02', '2026-01-04', '2026-01-05', '2026-01-06'])).toBe(3)
    expect(currentStreak(['2026-01-05', '2026-01-06'], '2026-01-07')).toBe(2)
    expect(currentStreak(['2026-01-04'], '2026-01-07')).toBe(0)
  })
  it('徽章等级', () => {
    expect(tierFor(0, [10, 20, 30, 40])).toBe(0)
    expect(tierFor(25, [10, 20, 30, 40])).toBe(2)
    expect(tierFor(99, [10, 20, 30, 40])).toBe(4)
  })
})
