// 输入校验：主进程在写库前强制执行，渲染进程用于即时提示
import { PLAYER_LIMITS, ATTR_KEYS, POSITIONS, PLAY_STYLES, HANDS } from '../config/career'
import { DRILL_MAP, TRAINING_LIMITS } from '../config/drills'
import { SKILL_TEST_MAP } from '../config/skills'
import type { GameLogInput, PlayerInput, TrainingInput } from '../types'
import { isDateStr } from './dates'

const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n)
const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)
const inRange = (n: number, r: { min: number; max: number }): boolean => n >= r.min && n <= r.max

export function validatePlayer(p: PlayerInput): string[] {
  const e: string[] = []
  const nick = typeof p?.nickname === 'string' ? p.nickname.trim() : ''
  if (nick.length < PLAYER_LIMITS.nickname.min || nick.length > PLAYER_LIMITS.nickname.max) e.push('昵称长度需为 1–16 个字符')
  if (!isInt(p?.jersey) || !inRange(p.jersey, PLAYER_LIMITS.jersey)) e.push('球衣号码需为 0–99 的整数')
  if (!isNum(p?.heightCm) || !inRange(p.heightCm, PLAYER_LIMITS.heightCm)) e.push('身高需在 120–240 厘米之间')
  if (!isNum(p?.weightKg) || !inRange(p.weightKg, PLAYER_LIMITS.weightKg)) e.push('体重需在 30–180 公斤之间')
  if (!HANDS.some((h) => h.id === p?.hand)) e.push('请选择惯用手')
  if (!POSITIONS.some((x) => x.id === p?.position)) e.push('请选择场上位置')
  if (!PLAY_STYLES.some((x) => x.id === p?.style)) e.push('请选择球员打法')
  if (p?.avatar != null && (typeof p.avatar !== 'string' || !p.avatar.startsWith('data:image/') || p.avatar.length > 800_000)) e.push('头像格式无效或文件过大')
  for (const k of ATTR_KEYS) {
    const v = p?.estimates?.[k]
    if (!isInt(v) || !inRange(v, PLAYER_LIMITS.estimate)) e.push('自评能力需在 25–85 之间')
  }
  return [...new Set(e)]
}

export function validateTraining(t: TrainingInput, today: string): string[] {
  const e: string[] = []
  const drill = DRILL_MAP[t?.drillId]
  if (!drill) return ['未知的训练项目']
  if (!isDateStr(t.date)) e.push('日期格式无效')
  else if (t.date > today) e.push('不能记录未来日期的训练')
  if (!isNum(t.durationMin) || !inRange(t.durationMin, TRAINING_LIMITS.durationMin)) e.push('训练时长需在 1–240 分钟之间')
  if (!isInt(t.rpe) || !inRange(t.rpe, TRAINING_LIMITS.rpe)) e.push('疲劳度需为 1–10')
  if (t.notes && t.notes.length > TRAINING_LIMITS.notesMax) e.push('备注最多 500 字')
  if (!Array.isArray(t.sets)) return [...e, '训练组数据缺失']
  if (t.sets.length > TRAINING_LIMITS.setsMax) e.push('最多记录 20 组')

  let attempts = 0
  let reps = 0
  for (const [i, s] of t.sets.entries()) {
    const label = t.sets.length > 1 ? `第 ${i + 1} 组：` : ''
    if (drill.metric === 'shots') {
      if (!isInt(s.attempts) || s.attempts < 1 || s.attempts > TRAINING_LIMITS.attemptsPerSet) e.push(`${label}出手次数需为 1–600 的整数`)
      if (!isInt(s.makes) || s.makes < 0) e.push(`${label}命中次数需为非负整数`)
      else if (isInt(s.attempts) && s.makes > s.attempts) e.push(`${label}命中次数不能超过出手次数`)
      if (drill.locations && s.location && !drill.locations.includes(s.location)) e.push(`${label}训练位置无效`)
      attempts += isInt(s.attempts) ? s.attempts : 0
    } else if (drill.metric === 'reps') {
      if (!isInt(s.reps) || s.reps < 1 || s.reps > TRAINING_LIMITS.repsPerSet) e.push(`${label}${drill.repsLabel ?? '次数'}需为正整数`)
      reps += isInt(s.reps) ? s.reps : 0
    } else if (s.reps != null && (!isInt(s.reps) || s.reps < 0 || s.reps > TRAINING_LIMITS.repsPerSet)) {
      e.push(`${label}${drill.repsLabel ?? '次数'}无效`)
    }
  }
  if (drill.metric !== 'time' && t.sets.length === 0) e.push('至少需要记录一组成绩')
  if (drill.maxPerMinute && isNum(t.durationMin) && t.durationMin > 0) {
    const volume = drill.metric === 'shots' ? attempts : reps
    if (volume / t.durationMin > drill.maxPerMinute) {
      e.push(`成绩超出合理范围：${t.durationMin} 分钟内最多约 ${Math.floor(drill.maxPerMinute * t.durationMin)} ${drill.metric === 'shots' ? '次出手' : '次'}`)
    }
  }
  return [...new Set(e)]
}

export function validateTestRaw(testId: string, raw: number, date: string, today: string): string[] {
  const def = SKILL_TEST_MAP[testId]
  if (!def) return ['未知的测试项目']
  const e: string[] = []
  if (def.builtIn) e.push('该测试由系统自动计算，不能手动录入')
  if (!isNum(raw) || raw < def.range.min || raw > def.range.max) e.push(`成绩需在 ${def.range.min}–${def.range.max} ${def.unit} 之间`)
  if (!isDateStr(date)) e.push('日期格式无效')
  else if (date > today) e.push('不能记录未来日期的测试')
  return e
}

export function validateGame(g: GameLogInput, today: string): string[] {
  const e: string[] = []
  if (!isDateStr(g?.date)) e.push('日期格式无效')
  else if (g.date > today) e.push('不能记录未来日期的比赛')
  if (g?.mode !== '3v3' && g?.mode !== '5v5') e.push('请选择比赛模式')
  const lim: Record<string, number> = { points: 150, rebounds: 60, assists: 50, steals: 30, blocks: 30, turnovers: 30 }
  for (const [k, max] of Object.entries(lim)) {
    const v = (g as unknown as Record<string, unknown>)[k]
    if (!isInt(v) || v < 0 || v > max) e.push(`数据超出合理范围（${k} 需为 0–${max}）`)
  }
  if (g?.result != null && g.result !== 'W' && g.result !== 'L') e.push('比赛结果无效')
  if (g?.notes && g.notes.length > 1000) e.push('比赛心得最多 1000 字')
  return e
}
