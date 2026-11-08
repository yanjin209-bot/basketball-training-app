import { describe, expect, it } from 'vitest'
import { validateGame, validatePlayer, validateTestRaw, validateTraining } from '@shared/logic/validation'
import type { PlayerInput, TrainingInput } from '@shared/types'

const today = '2026-06-15'
const base = (patch: Partial<TrainingInput> = {}): TrainingInput => ({ drillId: 'spot_shooting', date: today, durationMin: 20, rpe: 6, sets: [{ location: '罚球线', attempts: 50, makes: 25 }], ...patch })

describe('训练校验', () => {
  it('合法记录通过', () => expect(validateTraining(base(), today)).toEqual([]))
  it('命中不能超过出手', () => expect(validateTraining(base({ sets: [{ attempts: 10, makes: 11 }] }), today).join()).toContain('不能超过'))
  it('拒绝未来日期', () => expect(validateTraining(base({ date: '2026-06-16' }), today).join()).toContain('未来'))
  it('拒绝不合理的出手密度', () => expect(validateTraining(base({ durationMin: 5, sets: [{ attempts: 500, makes: 100 }] }), today).join()).toContain('合理范围'))
  it('时长范围', () => expect(validateTraining(base({ durationMin: 0 }), today).length).toBeGreaterThan(0))
  it('次数类项目需要正整数', () => expect(validateTraining({ drillId: 'crossover', date: today, durationMin: 10, rpe: 6, sets: [{ reps: 0 }] }, today).length).toBeGreaterThan(0))
  it('计时类项目允许没有分组', () => expect(validateTraining({ drillId: 'conditioning', date: today, durationMin: 25, rpe: 7, sets: [] }, today)).toEqual([]))
  it('非法日期', () => expect(validateTraining(base({ date: '2026-02-30' }), today).join()).toContain('日期'))
})

describe('球员校验', () => {
  const p: PlayerInput = { nickname: '阿杰', jersey: 23, heightCm: 180, weightKg: 70, hand: 'right', position: 'SG', style: 'slasher', avatar: null, estimates: { shooting: 50, dribbling: 50, finishing: 50, defense: 50, athleticism: 50, iq: 50 } }
  it('合法', () => expect(validatePlayer(p)).toEqual([]))
  it('号码越界', () => expect(validatePlayer({ ...p, jersey: 100 }).length).toBe(1))
  it('空昵称', () => expect(validatePlayer({ ...p, nickname: '  ' }).length).toBe(1))
  it('自评越界', () => expect(validatePlayer({ ...p, estimates: { ...p.estimates, iq: 99 } }).length).toBe(1))
})

describe('测试与比赛校验', () => {
  it('超出测试范围', () => expect(validateTestRaw('ft50', 51, today, today).length).toBe(1))
  it('内置测试不能手填', () => expect(validateTestRaw('iq_quiz', 8, today, today).join()).toContain('系统自动'))
  it('比赛数据范围', () => {
    expect(validateGame({ date: today, mode: '3v3', points: 21, rebounds: 5, assists: 3, steals: 1, blocks: 0, turnovers: 2, result: 'W', notes: '' }, today)).toEqual([])
    expect(validateGame({ date: today, mode: '3v3', points: -1, rebounds: 5, assists: 3, steals: 1, blocks: 0, turnovers: 2, result: null, notes: '' }, today).length).toBe(1)
  })
})
