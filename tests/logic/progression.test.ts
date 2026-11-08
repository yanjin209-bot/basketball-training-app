import { describe, expect, it } from 'vitest'
import { CAREER_CONFIG } from '@shared/config/career'
import { accuracy, allocateDailyXp, careerState, levelFromXp, sessionXp, titleForLevel, xpForLevel } from '@shared/logic/progression'

describe('命中率', () => {
  it('正确计算并保留一位小数', () => {
    expect(accuracy(50, 23)).toBe(46)
    expect(accuracy(3, 1)).toBe(33.3)
    expect(accuracy(7, 7)).toBe(100)
  })
  it('0 出手返回 null', () => {
    expect(accuracy(0, 0)).toBeNull()
  })
})

describe('训练 XP', () => {
  it('投篮训练：时长 + 出手 + 命中 + 命中率奖励', () => {
    // 20 分钟中强度 = 50；100 出手 35；60 命中 36；60% ≥ 50% → +8
    expect(sessionXp('spot_shooting', 20, { attempts: 100, makes: 60, reps: 0 })).toBe(129)
  })
  it('单次训练有上限', () => {
    expect(sessionXp('conditioning', 240, { attempts: 0, makes: 0, reps: 0 })).toBe(CAREER_CONFIG.sessionXpCap)
  })
  it('恢复训练 XP 固定且较低', () => {
    expect(sessionXp('recovery', 120, { attempts: 0, makes: 0, reps: 0 })).toBe(45)
  })
  it('未知项目返回 0', () => {
    expect(sessionXp('nope', 30, { attempts: 0, makes: 0, reps: 0 })).toBe(0)
  })
})

describe('每日 XP 上限', () => {
  it('同一天按记录顺序扣减上限', () => {
    const m = allocateDailyXp(
      [
        { id: 1, date: '2026-01-01', raw: 200 },
        { id: 2, date: '2026-01-01', raw: 150 },
        { id: 3, date: '2026-01-01', raw: 100 },
        { id: 4, date: '2026-01-02', raw: 100 }
      ],
      400
    )
    expect(m.get(1)).toBe(200)
    expect(m.get(2)).toBe(150)
    expect(m.get(3)).toBe(50)
    expect(m.get(4)).toBe(100)
  })
})

describe('等级', () => {
  it('阈值边界', () => {
    expect(levelFromXp(0)).toBe(1)
    expect(levelFromXp(CAREER_CONFIG.xpToNext(1) - 1)).toBe(1)
    expect(levelFromXp(CAREER_CONFIG.xpToNext(1))).toBe(2)
    expect(levelFromXp(xpForLevel(10))).toBe(10)
  })
  it('不超过最高等级', () => {
    expect(levelFromXp(10_000_000)).toBe(CAREER_CONFIG.maxLevel)
  })
  it('称号随等级变化', () => {
    expect(titleForLevel(1).title).toBe('新秀')
    expect(titleForLevel(6).title).toBe('轮换球员')
    expect(titleForLevel(45).title).toBe('球场传奇')
  })
  it('careerState 进度一致', () => {
    const s = careerState(xpForLevel(5) + 30)
    expect(s.level).toBe(5)
    expect(s.xpIntoLevel).toBe(30)
    expect(s.xpForLevel).toBe(CAREER_CONFIG.xpToNext(5))
  })
})
