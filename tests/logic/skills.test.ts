import { describe, expect, it } from 'vitest'
import { ATTR_KEYS, POSITION_WEIGHTS } from '@shared/config/career'
import { computeAttributes, computeOvr, scoreTest } from '@shared/logic/skills'
import type { AttrMap } from '@shared/types'

const est: AttrMap = { shooting: 50, dribbling: 50, finishing: 50, defense: 50, athleticism: 50, iq: 50 }

describe('测试评分曲线', () => {
  it('分段线性插值', () => {
    expect(scoreTest('ft50', 25)).toBe(55)
    expect(scoreTest('ft50', 29)).toBe(61)
  })
  it('越界时截断', () => {
    expect(scoreTest('ft50', 50)).toBe(99)
    expect(scoreTest('ft50', -5)).toBe(25)
  })
  it('用时类测试越短越高', () => {
    expect(scoreTest('sprint34', 3.0)).toBeGreaterThan(scoreTest('sprint34', 4.0))
  })
})

describe('能力计算', () => {
  it('未测试时使用预估并标注', () => {
    const a = computeAttributes(est, [])
    expect(a.every((x) => x.source === 'estimated')).toBe(true)
  })
  it('使用最近一次成绩，并保留历史最好', () => {
    const a = computeAttributes(est, [
      { id: 1, testId: 'ft50', date: '2026-01-01', raw: 45, score: 89 },
      { id: 2, testId: 'ft50', date: '2026-02-01', raw: 25, score: 55 }
    ])
    const s = a.find((x) => x.key === 'shooting')!
    expect(s.value).toBe(55)
    expect(s.source).toBe('mixed')
    expect(s.subs.find((x) => x.testId === 'ft50')!.best).toBe(89)
  })
  it('asOf 只考虑之前的测试', () => {
    const tests = [{ id: 1, testId: 'ft50', date: '2026-03-01', raw: 45, score: 89 }]
    expect(computeAttributes(est, tests, '2026-02-01').find((x) => x.key === 'shooting')!.source).toBe('estimated')
  })
})

describe('OVR', () => {
  it('各位置权重之和为 1', () => {
    for (const w of Object.values(POSITION_WEIGHTS)) {
      expect(ATTR_KEYS.reduce((a, k) => a + w[k], 0)).toBeCloseTo(1, 6)
    }
  })
  it('不同位置权重导致不同 OVR', () => {
    const a: AttrMap = { shooting: 90, dribbling: 85, finishing: 50, defense: 45, athleticism: 50, iq: 70 }
    expect(computeOvr('PG', a)).toBeGreaterThan(computeOvr('C', a))
  })
})
