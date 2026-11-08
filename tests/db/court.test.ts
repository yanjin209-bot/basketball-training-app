import Database from 'better-sqlite3'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { IQ_QUESTIONS } from '@shared/config/skills'
import { CAREER_CONFIG } from '@shared/config/career'
import { migrate } from '../../src/main/db/schema'
import { openDatabase } from '../../src/main/db/connection'
import { CourtService, UserError } from '../../src/main/services/court'
import { exportData, importData } from '../../src/main/services/backup'
import { CoachService, type FetchLike } from '../../src/main/services/coach'
import type { PlayerInput } from '@shared/types'

const PLAYER: PlayerInput = {
  nickname: '测试球员',
  jersey: 7,
  heightCm: 182,
  weightKg: 75,
  hand: 'right',
  position: 'SG',
  style: 'sharpshooter',
  avatar: null,
  estimates: { shooting: 55, dribbling: 50, finishing: 48, defense: 45, athleticism: 52, iq: 50 }
}

let now = new Date(2026, 5, 15, 18, 0, 0)
const clock = (): Date => now
const setDay = (y: number, m: number, d: number): void => {
  now = new Date(y, m - 1, d, 18, 0, 0)
}

function fresh(): { db: Database.Database; svc: CourtService } {
  const db = new Database(':memory:')
  migrate(db)
  const svc = new CourtService(db, clock)
  svc.createPlayer(PLAYER)
  return { db, svc }
}

const shoot = (attempts: number, makes: number, date = '2026-06-15', durationMin = 30) => ({
  drillId: 'spot_shooting',
  date,
  durationMin,
  rpe: 6,
  sets: [{ location: '罚球线', attempts, makes }]
})

describe('CourtService', () => {
  let db: Database.Database
  let svc: CourtService
  beforeEach(() => {
    setDay(2026, 6, 15)
    ;({ db, svc } = fresh())
  })

  it('创建球员并且只能创建一次', () => {
    expect(svc.getPlayer()?.nickname).toBe('测试球员')
    expect(() => svc.createPlayer(PLAYER)).toThrow(UserError)
    expect(svc.listSnapshots().length).toBe(1)
  })

  it('提交训练：计算命中率、获得 XP、写入流水', () => {
    const r = svc.submitTraining(shoot(100, 47))
    expect(r.data.accuracy).toBe(47)
    expect(r.data.xpAwarded).toBeGreaterThan(0)
    expect(r.events[0]).toMatchObject({ type: 'xp', amount: r.data.xpAwarded })
    expect(svc.totalXp()).toBe(r.data.xpAwarded)
  })

  it('拒绝不合理成绩', () => {
    expect(() => svc.submitTraining(shoot(10, 12))).toThrow(/不能超过/)
    expect(() => svc.submitTraining(shoot(10, 5, '2026-06-16'))).toThrow(/未来/)
  })

  it('修改与删除记录后 XP 重新计算，不重复发放', () => {
    const a = svc.submitTraining(shoot(50, 20)).data
    const before = svc.totalXp()
    const upd = svc.updateTraining(a.id, shoot(120, 80))
    expect(upd.data.accuracy).toBeCloseTo(66.7, 1)
    expect(svc.totalXp()).toBe(upd.data.xpAwarded)
    expect(svc.totalXp()).toBeGreaterThan(before)
    // 重复更新同样的数据，XP 不变
    svc.updateTraining(a.id, shoot(120, 80))
    expect(svc.totalXp()).toBe(upd.data.xpAwarded)
    svc.removeTraining(a.id)
    expect(svc.totalXp()).toBe(0)
    expect((db.prepare("SELECT COUNT(*) c FROM xp_transactions WHERE source='session'").get() as { c: number }).c).toBe(0)
  })

  it('每日训练 XP 上限生效，删除后会把额度还给后续记录', () => {
    const ids: number[] = []
    for (let i = 0; i < 4; i++) ids.push(svc.submitTraining({ drillId: 'conditioning', date: '2026-06-15', durationMin: 60, rpe: 7, sets: [] }).data.id)
    expect(svc.totalXp()).toBe(CAREER_CONFIG.dailyTrainingXpCap)
    const last = svc.listSessions().find((s) => s.id === ids[3])!
    expect(last.xpAwarded).toBeLessThan(last.xpRaw)
    svc.removeTraining(ids[0])
    const after = svc.listSessions().find((s) => s.id === ids[3])!
    expect(after.xpAwarded).toBeGreaterThan(last.xpAwarded)
  })

  it('累计 XP 升级会产生 levelUp 事件', () => {
    let leveled = false
    for (let d = 1; d <= 6; d++) {
      const r = svc.submitTraining({ drillId: 'conditioning', date: `2026-06-0${d}`, durationMin: 60, rpe: 7, sets: [] })
      if (r.events.some((e) => e.type === 'levelUp')) leveled = true
    }
    expect(leveled).toBe(true)
    expect(svc.dashboard().career.level).toBeGreaterThan(1)
  })

  it('徽章由真实数据解锁，删除数据后收回', () => {
    const r = svc.submitTraining(shoot(150, 110, '2026-06-15', 20))
    expect(r.events.some((e) => e.type === 'badge' && e.badgeId === 'hundred_shooter')).toBe(true)
    expect(svc.badges().find((b) => b.badgeId === 'hundred_shooter')!.tier).toBe(1)
    svc.removeTraining(r.data.id)
    expect(svc.badges().find((b) => b.badgeId === 'hundred_shooter')!.tier).toBe(0)
  })

  it('每日任务：完成后才能领取，且只能领取一次', () => {
    const q = svc.getQuests('2026-06-15')
    expect(q.length).toBe(3)
    const first = q[0]
    expect(() => svc.claimQuest(first.id)).toThrow(/尚未完成/)
    // 完成所有任务所需的投篮 / 时长 / 测试
    svc.submitTraining(shoot(80, 40, '2026-06-15', 20))
    svc.submitTraining({ drillId: 'free_throw', date: '2026-06-15', durationMin: 10, rpe: 3, sets: [{ attempts: 30, makes: 20 }] })
    svc.submitTraining({ drillId: 'three_point', date: '2026-06-15', durationMin: 10, rpe: 5, sets: [{ location: '弧顶三分', attempts: 40, makes: 14 }] })
    const done = svc.getQuests('2026-06-15').find((x) => x.id === first.id)!
    expect(done.status).toBe('completed')
    const xp0 = svc.totalXp()
    svc.claimQuest(first.id)
    expect(svc.totalXp()).toBe(xp0 + first.reward)
    expect(() => svc.claimQuest(first.id)).toThrow(/已领取/)
  })

  it('过期任务不能领取', () => {
    const q = svc.getQuests('2026-06-15')[0]
    setDay(2026, 6, 16)
    expect(svc.getQuests('2026-06-15')[0].status).toBe('expired')
    expect(() => svc.claimQuest(q.id)).toThrow()
  })

  it('能力测试：评分、刷新纪录事件、OVR 改为真实数据', () => {
    const r = svc.submitTest({ testId: 'ft50', raw: 40, date: '2026-06-15' })
    expect(r.data.score).toBe(79)
    expect(r.events.some((e) => e.type === 'pb')).toBe(true)
    const worse = svc.submitTest({ testId: 'ft50', raw: 30, date: '2026-06-15' })
    expect(worse.events.some((e) => e.type === 'pb')).toBe(false)
    const shooting = svc.attributes().find((a) => a.key === 'shooting')!
    expect(shooting.source).toBe('mixed')
    expect(shooting.subs.find((s) => s.testId === 'ft50')!.best).toBe(79)
  })

  it('普通训练不会改变能力评分', () => {
    const before = svc.attributes().map((a) => a.value)
    svc.submitTraining(shoot(200, 180, '2026-06-15', 30))
    expect(svc.attributes().map((a) => a.value)).toEqual(before)
  })

  it('球商问答在服务端判分，拒绝伪造题目', () => {
    const qs = IQ_QUESTIONS.slice(0, 10)
    const r = svc.submitQuiz(qs.map((q, i) => ({ question: q.q, chosen: i < 7 ? q.options[q.answer] : q.options[(q.answer + 1) % q.options.length] })))
    expect(r.data.raw).toBe(7)
    expect(() => svc.submitQuiz(qs.map((q) => ({ question: q.q + 'x', chosen: '' })))).toThrow()
    expect(() => svc.submitQuiz(qs.slice(0, 5).map((q) => ({ question: q.q, chosen: '' })))).toThrow()
  })

  it('助攻失误比需要至少 3 场比赛', () => {
    expect(() => svc.computeAstTo()).toThrow(/3 场/)
    for (let i = 0; i < 3; i++) svc.addGame({ date: '2026-06-1' + i, mode: '3v3', points: 10, rebounds: 4, assists: 6, steals: 1, blocks: 0, turnovers: 2, result: 'W', notes: '' })
    expect(svc.computeAstTo().data.raw).toBe(3)
  })

  it('赛季信息与总结', () => {
    svc.submitTraining(shoot(60, 30, '2026-06-15'))
    const s = svc.seasonInfo()
    expect(s.index).toBe(1)
    expect(s.sessions).toBe(1)
    const sum = svc.seasonSummary(1)
    expect(sum.bests.length).toBeGreaterThan(0)
    setDay(2026, 7, 20)
    expect(svc.dashboard().pendingSeasonSummary).toBe(1)
    svc.setSettings({ lastSeasonSeen: 1 })
    expect(svc.dashboard().pendingSeasonSummary).toBeNull()
  })

  it('统计数据来自真实记录', () => {
    svc.submitTraining(shoot(50, 25, '2026-06-14'))
    svc.submitTraining(shoot(50, 35, '2026-06-15'))
    const st = svc.stats()
    expect(st.totals.sessions).toBe(2)
    expect(st.totals.makes).toBe(60)
    expect(st.accuracyTrend.map((a) => a.accuracy)).toEqual([50, 70])
    expect(st.calendar.find((c) => c.date === '2026-06-15')!.sessions).toBe(1)
  })

  it('导出 / 导入往返一致，且不导出 API Key', () => {
    svc.submitTraining(shoot(50, 25))
    svc.setRaw('ai.key.enc', 'SECRET')
    const file = exportData(db)
    expect(JSON.stringify(file)).not.toContain('SECRET')
    const db2 = new Database(':memory:')
    migrate(db2)
    importData(db2, JSON.parse(JSON.stringify(file)))
    const svc2 = new CourtService(db2, clock)
    expect(svc2.getPlayer()?.nickname).toBe('测试球员')
    expect(svc2.totalXp()).toBe(svc.totalXp())
    expect(() => importData(db2, { app: 'other' })).toThrow()
  })
})

describe('持久化', () => {
  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'court-rise-'))
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it('重启后数据不丢失', () => {
    const file = join(dir, 'test.db')
    const db1 = openDatabase(file)
    const s1 = new CourtService(db1, clock)
    s1.createPlayer(PLAYER)
    s1.submitTraining(shoot(40, 20))
    const xp = s1.totalXp()
    db1.close()
    const db2 = openDatabase(file)
    const s2 = new CourtService(db2, clock)
    expect(s2.getPlayer()?.jersey).toBe(7)
    expect(s2.listSessions().length).toBe(1)
    expect(s2.totalXp()).toBe(xp)
    db2.close()
  })
})

describe('AI 教练', () => {
  const secrets = { available: () => true, encrypt: (s: string) => Buffer.from(s).toString('base64'), decrypt: (s: string) => Buffer.from(s, 'base64').toString() }

  it('没有 API Key 时使用本地规则并明确标注', async () => {
    const { svc } = fresh()
    const coach = new CoachService(svc, secrets, async () => {
      throw new Error('不应联网')
    })
    const r = await coach.chat([{ role: 'user', content: '帮我制定下周计划' }])
    expect(r.source).toBe('local')
    expect(r.content).toContain('AI 服务未连接')
  })

  it('有 Key 时调用接口，上下文只含真实数据，错误信息不泄露密钥', async () => {
    const { svc } = fresh()
    svc.submitTraining(shoot(50, 21))
    let body = ''
    let auth = ''
    const fetchOk: FetchLike = async (_url, init) => {
      body = init.body
      auth = init.headers.Authorization
      return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: '练得不错' } }] }) }
    }
    const coach = new CoachService(svc, secrets, fetchOk)
    coach.saveConfig({ provider: 'deepseek', model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com', apiKey: 'sk-test-1234567890' })
    expect(coach.getPublicConfig().keyHint).not.toContain('1234567890')
    const r = await coach.chat([{ role: 'user', content: '分析一下' }])
    expect(r).toMatchObject({ source: 'ai', content: '练得不错' })
    expect(auth).toBe('Bearer sk-test-1234567890')
    expect(body).toContain('出手 50 命中 21')
    expect(body).toContain('绝不编造')

    const fetchFail: FetchLike = async () => ({ ok: false, status: 401, text: async () => JSON.stringify({ error: { message: 'bad key sk-test-1234567890' } }) })
    const coach2 = new CoachService(svc, secrets, fetchFail)
    const t = await coach2.testConnection()
    expect(t.ok).toBe(false)
    expect(t.message).toContain('API Key 无效')
    expect(t.message).not.toContain('1234567890')
    const fallback = await coach2.chat([{ role: 'user', content: '罚球' }])
    expect(fallback.source).toBe('local')
    expect(fallback.error).toBeTruthy()
  })

  it('拒绝非 https 的远程地址', () => {
    const { svc } = fresh()
    const coach = new CoachService(svc, secrets, async () => ({ ok: true, status: 200, text: async () => '' }))
    expect(() => coach.saveConfig({ provider: 'custom', model: 'x', baseUrl: 'http://evil.com' })).toThrow()
  })
})
