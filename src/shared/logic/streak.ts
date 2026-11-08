import { addDays } from './dates'

export function longestStreak(dates: Iterable<string>): number {
  const sorted = [...new Set(dates)].sort()
  let best = 0
  let cur = 0
  let prev: string | null = null
  for (const d of sorted) {
    cur = prev && addDays(prev, 1) === d ? cur + 1 : 1
    best = Math.max(best, cur)
    prev = d
  }
  return best
}

/** 截至今天的连续训练天数；今天还没练则从昨天开始算 */
export function currentStreak(dates: Iterable<string>, today: string): number {
  const set = new Set(dates)
  let cur = set.has(today) ? today : addDays(today, -1)
  let n = 0
  while (set.has(cur)) {
    n++
    cur = addDays(cur, -1)
  }
  return n
}
