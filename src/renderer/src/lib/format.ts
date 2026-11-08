export function fmtMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)} 分钟`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`
}

export function fmtDateCn(d: string): string {
  const [, m, day] = d.split('-')
  return `${Number(m)}月${Number(day)}日`
}

export function relDay(d: string, today: string): string {
  if (d === today) return '今天'
  const diff = Math.round((new Date(today + 'T12:00:00').getTime() - new Date(d + 'T12:00:00').getTime()) / 86400000)
  if (diff === 1) return '昨天'
  if (diff > 1 && diff < 7) return `${diff} 天前`
  return fmtDateCn(d)
}

export function errMsg(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  return m.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
}
