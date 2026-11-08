// 能力评分：只根据标准化测试计算；未测试的子能力不计入，整项未测试时使用自评预估
import { ATTR_KEYS, POSITION_WEIGHTS } from '../config/career'
import { SKILL_TESTS, SKILL_TEST_MAP } from '../config/skills'
import type { AttrKey, AttrMap, AttributeDetail, Position } from '../types'

export function scoreTest(testId: string, raw: number): number {
  const def = SKILL_TEST_MAP[testId]
  if (!def || !Number.isFinite(raw)) return 0
  const c = def.curve
  if (raw <= c[0][0]) return clampScore(c[0][1])
  if (raw >= c[c.length - 1][0]) return clampScore(c[c.length - 1][1])
  for (let i = 0; i < c.length - 1; i++) {
    const [x0, y0] = c[i]
    const [x1, y1] = c[i + 1]
    if (raw >= x0 && raw <= x1) return clampScore(Math.round(y0 + ((raw - x0) / (x1 - x0)) * (y1 - y0)))
  }
  return 0
}

const clampScore = (n: number): number => Math.max(0, Math.min(99, Math.round(n)))

export interface TestRow {
  testId: string
  date: string
  raw: number
  score: number
  id: number
}

/** 以每个测试项目“最近一次”成绩计算当前能力（真实水平可能下降），同时给出历史最好 */
export function computeAttributes(estimates: AttrMap, tests: TestRow[], asOf?: string): AttributeDetail[] {
  const rows = asOf ? tests.filter((t) => t.date <= asOf) : tests
  const latest = new Map<string, TestRow>()
  const best = new Map<string, number>()
  for (const t of rows) {
    const cur = latest.get(t.testId)
    if (!cur || t.date > cur.date || (t.date === cur.date && t.id > cur.id)) latest.set(t.testId, t)
    best.set(t.testId, Math.max(best.get(t.testId) ?? 0, t.score))
  }
  return ATTR_KEYS.map((key) => {
    const defs = SKILL_TESTS.filter((d) => d.attr === key)
    const subs = defs.map((d) => {
      const l = latest.get(d.id)
      return { testId: d.id, score: l?.score ?? null, raw: l?.raw ?? null, best: best.get(d.id) ?? null, date: l?.date ?? null }
    })
    const tested = subs.filter((s) => s.score != null).map((s) => s.score as number)
    if (tested.length === 0) return { key, value: estimates[key], source: 'estimated' as const, subs }
    const avg = Math.round(tested.reduce((a, b) => a + b, 0) / tested.length)
    return { key, value: avg, source: tested.length === defs.length ? ('tested' as const) : ('mixed' as const), subs }
  })
}

export function attrMapOf(details: AttributeDetail[]): AttrMap {
  return Object.fromEntries(details.map((d) => [d.key, d.value])) as AttrMap
}

export function computeOvr(position: Position, attrs: AttrMap): number {
  const w = POSITION_WEIGHTS[position]
  let sum = 0
  for (const k of ATTR_KEYS) sum += (attrs[k] ?? 0) * w[k]
  return Math.max(0, Math.min(99, Math.round(sum)))
}

export function bestAttr(attrs: AttrMap): AttrKey {
  return ATTR_KEYS.reduce((a, b) => (attrs[b] > attrs[a] ? b : a))
}
export function weakestAttr(attrs: AttrMap): AttrKey {
  return ATTR_KEYS.reduce((a, b) => (attrs[b] < attrs[a] ? b : a))
}
