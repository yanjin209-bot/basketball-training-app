// 本地日期工具：统一使用 YYYY-MM-DD 字符串（本地时区）

export const pad = (n: number): string => String(n).padStart(2, '0')

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayStr(now: Date = new Date()): string {
  return toDateStr(now)
}

export function isDateStr(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = parseDate(s)
  return toDateStr(d) === s
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

/** b - a 的天数 */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000)
}

/** 周一为一周起点 */
export function weekStart(s: string): string {
  const d = parseDate(s)
  const dow = (d.getDay() + 6) % 7
  return addDays(s, -dow)
}

export function monthKey(s: string): string {
  return s.slice(0, 7)
}

export function rangeDays(start: string, end: string): string[] {
  const out: string[] = []
  for (let cur = start; cur <= end; cur = addDays(cur, 1)) out.push(cur)
  return out
}

export const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
