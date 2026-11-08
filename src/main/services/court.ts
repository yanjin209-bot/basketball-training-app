// ───────────────────────────────────────────────────────────
// 核心业务服务：所有写操作都会触发 reconcile()，
// 由真实记录整体重算 XP / 任务 / 徽章，保证可修改、可删除且不重复发奖
// ───────────────────────────────────────────────────────────
import type Database from 'better-sqlite3'
import { BADGES, BADGE_MAP, TIER_META } from '../../shared/config/badges'
import { ATTR_META, CAREER_CONFIG, SEASON_CONFIG, TITLES } from '../../shared/config/career'
import { DRILL_MAP } from '../../shared/config/drills'
import { QUEST_MAP, RECOVERY_RULES } from '../../shared/config/quests'
import { IQ_QUESTIONS, QUIZ_LENGTH, SKILL_TEST_MAP } from '../../shared/config/skills'
import { evaluateBadges, type BadgeMetrics } from '../../shared/logic/badges'
import { addDays, diffDays, monthKey, pad, rangeDays, toDateStr, weekStart } from '../../shared/logic/dates'
import { accuracy, allocateDailyXp, careerState, levelFromXp, sessionXp, titleForLevel, totalsOf } from '../../shared/logic/progression'
import { generateDailyQuests, isRecoveryDay, questProgress, type DayActivity } from '../../shared/logic/quests'
import { seasonGrade, seasonIndexFor, seasonLevel, seasonName, seasonRange } from '../../shared/logic/season'
import { attrMapOf, computeAttributes, computeOvr, scoreTest, type TestRow } from '../../shared/logic/skills'
import { currentStreak, longestStreak } from '../../shared/logic/streak'
import { validateGame, validatePlayer, validateTestRaw, validateTraining } from '../../shared/logic/validation'
import type { QuizAnswer } from '../../shared/api'
import type {
  Achievement,
  AppSettings,
  AttrKey,
  AttrMap,
  AttributeDetail,
  BadgeProgress,
  BadgeTier,
  Dashboard,
  GameEvent,
  GameLog,
  GameLogInput,
  MutationResult,
  Player,
  PlayerInput,
  Quest,
  SeasonInfo,
  SeasonSummary,
  SkillTestRecord,
  Snapshot,
  StatsBundle,
  TrainingInput,
  TrainingSession
} from '../../shared/types'

export class UserError extends Error {}

const DEFAULT_SETTINGS: AppSettings = { reducedMotion: 'system', backgroundFx: true, lastSeasonSeen: 0 }

interface SessionRow {
  id: number
  drill_id: string
  date: string
  duration_min: number
  rpe: number
  notes: string
  xp_raw: number
  xp_awarded: number
  created_at: string
}
interface SetRow {
  id: number
  session_id: number
  idx: number
  location: string | null
  attempts: number
  makes: number
  reps: number
}

interface StateMark {
  totalXp: number
  level: number
  badges: Map<string, number>
  completedQuests: Set<number>
}

export class CourtService {
  constructor(
    private readonly db: Database.Database,
    private readonly clock: () => Date = () => new Date()
  ) {}

  // ── 时间工具 ──────────────────────────────────────────────
  today(): string {
    return toDateStr(this.clock())
  }
  private stamp(): string {
    const d = this.clock()
    return `${toDateStr(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  // ── 球员 ──────────────────────────────────────────────────
  getPlayer(): Player | null {
    const r = this.db.prepare('SELECT * FROM players ORDER BY id LIMIT 1').get() as Record<string, unknown> | undefined
    if (!r) return null
    return {
      id: r.id as number,
      nickname: r.nickname as string,
      jersey: r.jersey as number,
      heightCm: r.height_cm as number,
      weightKg: r.weight_kg as number,
      hand: r.hand as Player['hand'],
      position: r.position as Player['position'],
      style: r.style as Player['style'],
      avatar: (r.avatar as string | null) ?? null,
      estimates: JSON.parse(r.estimates_json as string) as AttrMap,
      createdAt: r.created_at as string
    }
  }

  private requirePlayer(): Player {
    const p = this.getPlayer()
    if (!p) throw new UserError('请先创建球员')
    return p
  }

  createPlayer(input: PlayerInput): MutationResult<Player> {
    if (this.getPlayer()) throw new UserError('球员已存在')
    const errors = validatePlayer(input)
    if (errors.length) throw new UserError(errors.join('；'))
    const now = this.stamp()
    this.db
      .prepare(
        `INSERT INTO players (nickname, jersey, height_cm, weight_kg, hand, position, style, avatar, estimates_json, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(input.nickname.trim(), input.jersey, input.heightCm, input.weightKg, input.hand, input.position, input.style, input.avatar, JSON.stringify(input.estimates), now, now)
    const player = this.requirePlayer()
    this.takeSnapshot('创建球员')
    this.addAchievement('debut', 'debut', '生涯开启', `${player.nickname} #${player.jersey} 正式登场`)
    return { data: player, events: [] }
  }

  updatePlayer(input: PlayerInput): MutationResult<Player> {
    const p = this.requirePlayer()
    const errors = validatePlayer(input)
    if (errors.length) throw new UserError(errors.join('；'))
    this.db
      .prepare(
        `UPDATE players SET nickname=?, jersey=?, height_cm=?, weight_kg=?, hand=?, position=?, style=?, avatar=?, estimates_json=?, updated_at=? WHERE id=?`
      )
      .run(input.nickname.trim(), input.jersey, input.heightCm, input.weightKg, input.hand, input.position, input.style, input.avatar, JSON.stringify(input.estimates), this.stamp(), p.id)
    return { data: this.requirePlayer(), events: [] }
  }

  // ── 训练记录 ──────────────────────────────────────────────
  private mapSessions(rows: SessionRow[]): TrainingSession[] {
    if (rows.length === 0) return []
    const ids = rows.map((r) => r.id)
    const sets = this.db
      .prepare(`SELECT * FROM training_sets WHERE session_id IN (${ids.map(() => '?').join(',')}) ORDER BY idx`)
      .all(...ids) as SetRow[]
    const bySession = new Map<number, SetRow[]>()
    for (const s of sets) bySession.set(s.session_id, [...(bySession.get(s.session_id) ?? []), s])
    return rows.map((r) => {
      const ss = bySession.get(r.id) ?? []
      const attempts = ss.reduce((a, s) => a + s.attempts, 0)
      const makes = ss.reduce((a, s) => a + s.makes, 0)
      const reps = ss.reduce((a, s) => a + s.reps, 0)
      return {
        id: r.id,
        drillId: r.drill_id,
        date: r.date,
        durationMin: r.duration_min,
        rpe: r.rpe,
        notes: r.notes,
        xpRaw: r.xp_raw,
        xpAwarded: r.xp_awarded,
        sets: ss.map((s) => ({ id: s.id, idx: s.idx, location: s.location, attempts: s.attempts, makes: s.makes, reps: s.reps })),
        attempts,
        makes,
        reps,
        accuracy: DRILL_MAP[r.drill_id]?.metric === 'shots' ? accuracy(attempts, makes) : null,
        createdAt: r.created_at
      }
    })
  }

  listSessions(opts: { limit?: number; drillId?: string } = {}): TrainingSession[] {
    const p = this.requirePlayer()
    const limit = Math.min(Math.max(opts.limit ?? 200, 1), 5000)
    const rows = opts.drillId
      ? (this.db.prepare('SELECT * FROM training_sessions WHERE player_id=? AND drill_id=? ORDER BY date DESC, id DESC LIMIT ?').all(p.id, opts.drillId, limit) as SessionRow[])
      : (this.db.prepare('SELECT * FROM training_sessions WHERE player_id=? ORDER BY date DESC, id DESC LIMIT ?').all(p.id, limit) as SessionRow[])
    return this.mapSessions(rows)
  }

  private getSession(id: number): TrainingSession {
    const p = this.requirePlayer()
    const row = this.db.prepare('SELECT * FROM training_sessions WHERE id=? AND player_id=?').get(id, p.id) as SessionRow | undefined
    if (!row) throw new UserError('训练记录不存在')
    return this.mapSessions([row])[0]
  }

  private normalizeSets(input: TrainingInput): TrainingInput['sets'] {
    const drill = DRILL_MAP[input.drillId]
    return input.sets.map((s) => ({
      location: drill.locations ? (s.location ?? drill.locations[0]) : null,
      attempts: drill.metric === 'shots' ? (s.attempts ?? 0) : 0,
      makes: drill.metric === 'shots' ? (s.makes ?? 0) : 0,
      reps: drill.metric === 'shots' ? 0 : (s.reps ?? 0)
    }))
  }

  submitTraining(input: TrainingInput): MutationResult<TrainingSession> {
    const p = this.requirePlayer()
    const errors = validateTraining(input, this.today())
    if (errors.length) throw new UserError(errors.join('；'))
    const before = this.mark()
    const sets = this.normalizeSets(input)
    const raw = sessionXp(input.drillId, input.durationMin, totalsOf(sets))
    const firstEver = (this.db.prepare('SELECT COUNT(*) c FROM training_sessions WHERE player_id=?').get(p.id) as { c: number }).c === 0
    const id = this.db.transaction(() => {
      const now = this.stamp()
      const res = this.db
        .prepare('INSERT INTO training_sessions (player_id, drill_id, date, duration_min, rpe, notes, xp_raw, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
        .run(p.id, input.drillId, input.date, input.durationMin, input.rpe, (input.notes ?? '').trim(), raw, now, now)
      const sid = Number(res.lastInsertRowid)
      this.insertSets(sid, sets)
      return sid
    })()
    this.reconcile()
    if (firstEver) this.addAchievement('first_session', 'first', '第一次训练', `${DRILL_MAP[input.drillId].name} · ${input.durationMin} 分钟`)
    const session = this.getSession(id)
    const events: GameEvent[] = [{ type: 'xp', amount: session.xpAwarded, capped: session.xpAwarded < session.xpRaw }, ...this.diff(before)]
    return { data: session, events }
  }

  updateTraining(id: number, input: TrainingInput): MutationResult<TrainingSession> {
    const existing = this.getSession(id)
    if (existing.drillId !== input.drillId) throw new UserError('不能修改训练项目类型，请删除后重新记录')
    const errors = validateTraining(input, this.today())
    if (errors.length) throw new UserError(errors.join('；'))
    const before = this.mark()
    const sets = this.normalizeSets(input)
    const raw = sessionXp(input.drillId, input.durationMin, totalsOf(sets))
    this.db.transaction(() => {
      this.db
        .prepare('UPDATE training_sessions SET date=?, duration_min=?, rpe=?, notes=?, xp_raw=?, updated_at=? WHERE id=?')
        .run(input.date, input.durationMin, input.rpe, (input.notes ?? '').trim(), raw, this.stamp(), id)
      this.db.prepare('DELETE FROM training_sets WHERE session_id=?').run(id)
      this.insertSets(id, sets)
    })()
    this.reconcile()
    const after = this.getSession(id)
    const delta = after.xpAwarded - existing.xpAwarded
    const events = this.diff(before)
    if (delta !== 0) events.unshift({ type: 'xp', amount: delta, capped: after.xpAwarded < after.xpRaw })
    return { data: after, events }
  }

  removeTraining(id: number): MutationResult<null> {
    this.getSession(id)
    const before = this.mark()
    this.db.prepare('DELETE FROM training_sessions WHERE id=?').run(id)
    this.reconcile()
    return { data: null, events: this.diff(before) }
  }

  private insertSets(sessionId: number, sets: TrainingInput['sets']): void {
    const ins = this.db.prepare('INSERT INTO training_sets (session_id, idx, location, attempts, makes, reps) VALUES (?,?,?,?,?,?)')
    sets.forEach((s, i) => ins.run(sessionId, i, s.location ?? null, s.attempts ?? 0, s.makes ?? 0, s.reps ?? 0))
  }

  // ── 生涯 XP ──────────────────────────────────────────────
  totalXp(): number {
    const p = this.requirePlayer()
    return (this.db.prepare('SELECT COALESCE(SUM(amount),0) s FROM xp_transactions WHERE player_id=?').get(p.id) as { s: number }).s
  }

  /** 由真实记录重算全部派生数据 */
  reconcile(): void {
    const p = this.requirePlayer()
    this.db.transaction(() => {
      // 1. 训练 XP：按日上限重新分配
      const rows = this.db.prepare('SELECT id, date, xp_raw raw FROM training_sessions WHERE player_id=?').all(p.id) as Array<{ id: number; date: string; raw: number }>
      const alloc = allocateDailyXp(rows)
      const upd = this.db.prepare('UPDATE training_sessions SET xp_awarded=? WHERE id=?')
      this.db.prepare("DELETE FROM xp_transactions WHERE player_id=? AND source='session'").run(p.id)
      const ins = this.db.prepare("INSERT INTO xp_transactions (player_id, source, ref_id, date, amount, note, created_at) VALUES (?, 'session', ?, ?, ?, ?, ?)")
      const now = this.stamp()
      for (const r of rows) {
        const award = alloc.get(r.id) ?? 0
        upd.run(award, r.id)
        if (award > 0) ins.run(p.id, r.id, r.date, award, '训练', now)
      }
      // 2. 已领取任务若因记录修改不再达成，则撤销奖励
      const claimed = this.db.prepare('SELECT * FROM quests WHERE player_id=? AND claimed_at IS NOT NULL').all(p.id) as Array<{ id: number; date: string; def_id: string }>
      for (const q of claimed) {
        const def = QUEST_MAP[q.def_id]
        if (!def || questProgress(def, this.dayActivity(q.date)) < def.target) {
          this.db.prepare('UPDATE quests SET claimed_at=NULL WHERE id=?').run(q.id)
          this.db.prepare("DELETE FROM xp_transactions WHERE source='quest' AND ref_id=?").run(q.id)
        }
      }
      // 3. 徽章：按当前真实数据增减
      const evals = evaluateBadges(this.badgeMetrics())
      const existing = this.db.prepare('SELECT badge_id, tier FROM unlocked_badges WHERE player_id=?').all(p.id) as Array<{ badge_id: string; tier: number }>
      const has = new Set(existing.map((e) => `${e.badge_id}:${e.tier}`))
      const addBadge = this.db.prepare('INSERT INTO unlocked_badges (player_id, badge_id, tier, unlocked_at) VALUES (?,?,?,?)')
      for (const ev of evals) {
        for (let t = 1; t <= ev.tier; t++) {
          if (!has.has(`${ev.badgeId}:${t}`)) {
            addBadge.run(p.id, ev.badgeId, t, now)
            const b = BADGE_MAP[ev.badgeId]
            this.addAchievement('badge', `${ev.badgeId}:${t}`, `解锁徽章 · ${b.name}`, `${TIER_META[t - 1].name}级 · ${b.description}`)
          }
        }
        this.db.prepare('DELETE FROM unlocked_badges WHERE player_id=? AND badge_id=? AND tier>?').run(p.id, ev.badgeId, ev.tier)
      }
      // 4. 称号晋升记录
      const level = levelFromXp(this.totalXp())
      for (const t of TITLES) {
        if (level >= t.level && t.level > 1) this.addAchievement('title', String(t.level), `晋升「${t.title}」`, `生涯等级达到 LV${t.level}`)
      }
    })()
  }

  private mark(): StateMark {
    const p = this.requirePlayer()
    const totalXp = this.totalXp()
    const badges = new Map<string, number>()
    for (const r of this.db.prepare('SELECT badge_id, MAX(tier) t FROM unlocked_badges WHERE player_id=? GROUP BY badge_id').all(p.id) as Array<{ badge_id: string; t: number }>) {
      badges.set(r.badge_id, r.t)
    }
    const completed = new Set(this.getQuests(this.today(), true).filter((q) => q.status === 'completed' || q.status === 'claimed').map((q) => q.id))
    return { totalXp, level: levelFromXp(totalXp), badges, completedQuests: completed }
  }

  private diff(before: StateMark): GameEvent[] {
    const after = this.mark()
    const events: GameEvent[] = []
    for (const q of this.getQuests(this.today(), false)) {
      if (q.status === 'completed' && !before.completedQuests.has(q.id)) events.push({ type: 'questComplete', title: q.title })
    }
    if (after.level > before.level) {
      const oldTitle = titleForLevel(before.level).title
      const newTitle = titleForLevel(after.level).title
      events.push({ type: 'levelUp', from: before.level, to: after.level, title: newTitle !== oldTitle ? newTitle : null })
    }
    for (const [id, tier] of after.badges) {
      if (tier > (before.badges.get(id) ?? 0)) events.push({ type: 'badge', badgeId: id, tier: tier as BadgeTier })
    }
    return events
  }

  // ── 每日任务 ──────────────────────────────────────────────
  private dayActivity(date: string): DayActivity {
    const p = this.requirePlayer()
    const sessions = this.db
      .prepare(
        `SELECT s.drill_id drillId, s.duration_min durationMin, COALESCE(SUM(t.attempts),0) attempts
         FROM training_sessions s LEFT JOIN training_sets t ON t.session_id = s.id
         WHERE s.player_id=? AND s.date=? GROUP BY s.id`
      )
      .all(p.id, date) as DayActivity['sessions']
    const tests = (this.db.prepare('SELECT COUNT(*) c FROM skill_tests WHERE player_id=? AND date=?').get(p.id, date) as { c: number }).c
    const games = (this.db.prepare('SELECT COUNT(*) c FROM game_logs WHERE player_id=? AND date=?').get(p.id, date) as { c: number }).c
    return { sessions, tests, games }
  }

  recoveryDay(date: string): boolean {
    const p = this.requirePlayer()
    const from = addDays(date, -RECOVERY_RULES.consecutiveDays)
    const rows = this.db
      .prepare(
        `SELECT s.date, s.drill_id drillId, s.duration_min durationMin, s.rpe, COALESCE(SUM(t.attempts),0) attempts
         FROM training_sessions s LEFT JOIN training_sets t ON t.session_id=s.id
         WHERE s.player_id=? AND s.date>=? AND s.date<? GROUP BY s.id`
      )
      .all(p.id, from, date) as Array<{ date: string; drillId: string; durationMin: number; rpe: number; attempts: number }>
    return isRecoveryDay(date, rows)
  }

  private ensureQuests(date: string): void {
    const p = this.requirePlayer()
    const exists = (this.db.prepare('SELECT COUNT(*) c FROM quests WHERE player_id=? AND date=?').get(p.id, date) as { c: number }).c
    if (exists) return
    const recovery = this.recoveryDay(date)
    const testedRecently =
      (this.db.prepare('SELECT COUNT(*) c FROM skill_tests WHERE player_id=? AND date>=?').get(p.id, addDays(date, -RECOVERY_RULES.testCooldownDays)) as { c: number }).c > 0
    const defs = generateDailyQuests(date, p.id, { recovery, testedRecently })
    const ins = this.db.prepare('INSERT OR IGNORE INTO quests (player_id, date, def_id, recovery) VALUES (?,?,?,?)')
    this.db.transaction(() => defs.forEach((d) => ins.run(p.id, date, d.id, recovery ? 1 : 0)))()
  }

  getQuests(date: string, ensure = true): Quest[] {
    const p = this.requirePlayer()
    const today = this.today()
    if (ensure && date === today) this.ensureQuests(date)
    const rows = this.db.prepare('SELECT * FROM quests WHERE player_id=? AND date=? ORDER BY id').all(p.id, date) as Array<{
      id: number
      date: string
      def_id: string
      recovery: number
      claimed_at: string | null
    }>
    const day = this.dayActivity(date)
    return rows
      .filter((r) => QUEST_MAP[r.def_id])
      .map((r) => {
        const def = QUEST_MAP[r.def_id]
        const progress = questProgress(def, day)
        const done = progress >= def.target
        const status: Quest['status'] = r.claimed_at ? 'claimed' : date < today ? 'expired' : done ? 'completed' : 'active'
        return { id: r.id, date: r.date, defId: r.def_id, title: def.title, kind: def.kind, target: def.target, progress: Math.min(progress, def.target), reward: def.reward, unit: def.unit, status, recovery: !!r.recovery }
      })
  }

  claimQuest(id: number): MutationResult<null> {
    const p = this.requirePlayer()
    const row = this.db.prepare('SELECT date FROM quests WHERE id=? AND player_id=?').get(id, p.id) as { date: string } | undefined
    if (!row) throw new UserError('任务不存在')
    const q = this.getQuests(row.date).find((x) => x.id === id)
    if (!q) throw new UserError('任务不存在')
    if (q.status === 'claimed') throw new UserError('奖励已领取')
    if (q.status === 'expired') throw new UserError('任务已过期')
    if (q.status !== 'completed') throw new UserError('任务尚未完成')
    const before = this.mark()
    this.db.transaction(() => {
      this.db.prepare('UPDATE quests SET claimed_at=? WHERE id=?').run(this.stamp(), id)
      this.db
        .prepare("INSERT INTO xp_transactions (player_id, source, ref_id, date, amount, note, created_at) VALUES (?, 'quest', ?, ?, ?, ?, ?)")
        .run(p.id, id, q.date, q.reward, `任务：${q.title}`, this.stamp())
    })()
    this.reconcile()
    return { data: null, events: [{ type: 'xp', amount: q.reward, capped: false }, ...this.diff(before).filter((e) => e.type !== 'questComplete')] }
  }

  // ── 能力测试 ──────────────────────────────────────────────
  private testRows(): TestRow[] {
    const p = this.requirePlayer()
    return this.db.prepare('SELECT id, test_id testId, date, raw, score FROM skill_tests WHERE player_id=? ORDER BY date, id').all(p.id) as TestRow[]
  }

  listTests(): SkillTestRecord[] {
    const p = this.requirePlayer()
    return this.db
      .prepare('SELECT id, test_id testId, date, raw, score, notes, created_at createdAt FROM skill_tests WHERE player_id=? ORDER BY date DESC, id DESC')
      .all(p.id) as SkillTestRecord[]
  }

  attributes(asOf?: string): AttributeDetail[] {
    const p = this.requirePlayer()
    return computeAttributes(p.estimates, this.testRows(), asOf)
  }

  private insertTest(testId: string, raw: number, date: string, notes: string): MutationResult<SkillTestRecord> {
    const p = this.requirePlayer()
    const before = this.mark()
    const prevBest = (this.db.prepare('SELECT MAX(score) m FROM skill_tests WHERE player_id=? AND test_id=?').get(p.id, testId) as { m: number | null }).m
    const score = scoreTest(testId, raw)
    const res = this.db
      .prepare('INSERT INTO skill_tests (player_id, test_id, date, raw, score, notes, created_at) VALUES (?,?,?,?,?,?,?)')
      .run(p.id, testId, date, raw, score, notes.slice(0, 300), this.stamp())
    const id = Number(res.lastInsertRowid)
    this.takeSnapshot(`测试：${SKILL_TEST_MAP[testId].name}`)
    this.reconcile()
    const events: GameEvent[] = []
    if (prevBest == null || score > prevBest) {
      events.push({ type: 'pb', testId, score, prev: prevBest })
      this.addAchievement('pb', `${testId}:${score}`, `刷新纪录 · ${SKILL_TEST_MAP[testId].name}`, `评分 ${prevBest ?? '—'} → ${score}`)
    }
    events.push(...this.diff(before))
    const rec = this.db.prepare('SELECT id, test_id testId, date, raw, score, notes, created_at createdAt FROM skill_tests WHERE id=?').get(id) as SkillTestRecord
    return { data: rec, events }
  }

  submitTest(input: { testId: string; raw: number; date: string; notes?: string }): MutationResult<SkillTestRecord> {
    this.requirePlayer()
    const errors = validateTestRaw(input.testId, input.raw, input.date, this.today())
    if (errors.length) throw new UserError(errors.join('；'))
    return this.insertTest(input.testId, input.raw, input.date, input.notes ?? '')
  }

  /** 问答在主进程判分，渲染进程无法伪造正确率 */
  submitQuiz(answers: QuizAnswer[]): MutationResult<SkillTestRecord> {
    this.requirePlayer()
    if (!Array.isArray(answers) || answers.length !== QUIZ_LENGTH) throw new UserError(`需要完成全部 ${QUIZ_LENGTH} 道题`)
    const seen = new Set<string>()
    let correct = 0
    for (const a of answers) {
      const q = IQ_QUESTIONS.find((x) => x.q === a?.question)
      if (!q || seen.has(q.q)) throw new UserError('题目数据无效')
      seen.add(q.q)
      if (a.chosen === q.options[q.answer]) correct++
    }
    return this.insertTest('iq_quiz', correct, this.today(), `${correct}/${QUIZ_LENGTH}`)
  }

  computeAstTo(): MutationResult<SkillTestRecord> {
    const p = this.requirePlayer()
    const games = this.db.prepare('SELECT assists, turnovers FROM game_logs WHERE player_id=? ORDER BY date DESC, id DESC LIMIT 10').all(p.id) as Array<{ assists: number; turnovers: number }>
    if (games.length < 3) throw new UserError('至少需要 3 场实战记录才能计算助攻失误比')
    const ast = games.reduce((a, g) => a + g.assists, 0)
    const to = games.reduce((a, g) => a + g.turnovers, 0)
    const ratio = Math.min(10, Math.round((ast / Math.max(1, to)) * 100) / 100)
    return this.insertTest('ast_to', ratio, this.today(), `最近 ${games.length} 场：${ast} 助攻 / ${to} 失误`)
  }

  removeTest(id: number): MutationResult<null> {
    const p = this.requirePlayer()
    const r = this.db.prepare('SELECT id FROM skill_tests WHERE id=? AND player_id=?').get(id, p.id)
    if (!r) throw new UserError('测试记录不存在')
    const before = this.mark()
    this.db.prepare('DELETE FROM skill_tests WHERE id=?').run(id)
    this.reconcile()
    return { data: null, events: this.diff(before) }
  }

  // ── 快照 / 成就 ──────────────────────────────────────────
  takeSnapshot(reason: string): void {
    const p = this.requirePlayer()
    const attrs = this.attributes()
    const map = attrMapOf(attrs)
    const totalXp = (this.db.prepare('SELECT COALESCE(SUM(amount),0) s FROM xp_transactions WHERE player_id=?').get(p.id) as { s: number }).s
    const data = {
      ovr: computeOvr(p.position, map),
      level: levelFromXp(totalXp),
      attributes: map,
      sources: Object.fromEntries(attrs.map((a) => [a.key, a.source]))
    }
    this.db.prepare('INSERT INTO player_snapshots (player_id, taken_at, reason, data_json) VALUES (?,?,?,?)').run(p.id, this.stamp(), reason, JSON.stringify(data))
  }

  private weeklySnapshot(): void {
    const p = this.requirePlayer()
    const last = this.db.prepare('SELECT taken_at FROM player_snapshots WHERE player_id=? ORDER BY id DESC LIMIT 1').get(p.id) as { taken_at: string } | undefined
    if (!last || last.taken_at.slice(0, 10) <= addDays(this.today(), -7)) this.takeSnapshot('每周记录')
  }

  listSnapshots(): Snapshot[] {
    const p = this.requirePlayer()
    const rows = this.db.prepare('SELECT * FROM player_snapshots WHERE player_id=? ORDER BY id').all(p.id) as Array<{ id: number; taken_at: string; reason: string; data_json: string }>
    return rows.map((r) => {
      const d = JSON.parse(r.data_json)
      return { id: r.id, takenAt: r.taken_at, reason: r.reason, ovr: d.ovr, level: d.level, attributes: d.attributes, sources: d.sources }
    })
  }

  private addAchievement(kind: string, ref: string, title: string, detail: string): void {
    const p = this.requirePlayer()
    this.db.prepare('INSERT OR IGNORE INTO achievements (player_id, kind, ref, title, detail, created_at) VALUES (?,?,?,?,?,?)').run(p.id, kind, ref, title, detail, this.stamp())
  }

  listAchievements(limit = 20): Achievement[] {
    const p = this.requirePlayer()
    return this.db
      .prepare('SELECT id, kind, ref, title, detail, created_at createdAt FROM achievements WHERE player_id=? ORDER BY created_at DESC, id DESC LIMIT ?')
      .all(p.id, limit) as Achievement[]
  }

  // ── 徽章 ──────────────────────────────────────────────────
  badgeMetrics(): BadgeMetrics {
    const p = this.requirePlayer()
    const agg = (where: string, col: string): number =>
      (this.db.prepare(`SELECT COALESCE(SUM(${col}),0) v FROM training_sessions s JOIN training_sets t ON t.session_id=s.id WHERE s.player_id=? AND ${where}`).get(p.id) as { v: number }).v
    const minutes = (ids: string[]): number =>
      (this.db.prepare(`SELECT COALESCE(SUM(duration_min),0) v FROM training_sessions WHERE player_id=? AND drill_id IN (${ids.map(() => '?').join(',')})`).get(p.id, ...ids) as { v: number }).v
    const ftBest = (
      this.db
        .prepare(
          `SELECT MAX(acc) v FROM (SELECT SUM(t.makes)*100.0/SUM(t.attempts) acc, SUM(t.attempts) att FROM training_sessions s JOIN training_sets t ON t.session_id=s.id
           WHERE s.player_id=? AND s.drill_id='free_throw' GROUP BY s.id) WHERE att >= 50`
        )
        .get(p.id) as { v: number | null }
    ).v
    const dates = (this.db.prepare('SELECT DISTINCT date FROM training_sessions WHERE player_id=?').all(p.id) as Array<{ date: string }>).map((r) => r.date)
    const seasonCounts = new Map<number, number>()
    for (const r of this.db.prepare('SELECT date FROM training_sessions WHERE player_id=?').all(p.id) as Array<{ date: string }>) {
      const idx = seasonIndexFor(p.createdAt.slice(0, 10), r.date)
      seasonCounts.set(idx, (seasonCounts.get(idx) ?? 0) + 1)
    }
    const attrs = this.attributes()
    const allTested = attrs.every((a) => a.source !== 'estimated')
    return {
      totalMakes: agg("s.drill_id IN ('spot_shooting','free_throw','three_point')", 't.makes'),
      ftBestAccuracy: ftBest == null ? 0 : Math.floor(ftBest * 10) / 10,
      handleMinutes: minutes(['ball_handling', 'weak_hand', 'crossover']),
      layupMakes: agg("s.drill_id='layup'", 't.makes'),
      defenseMinutes: minutes(['def_slides']),
      longestStreak: longestStreak(dates),
      bestSeasonSessions: Math.max(0, ...seasonCounts.values()),
      minTestedAttr: allTested ? Math.min(...attrs.map((a) => a.value)) : 0,
      careerLevel: levelFromXp(this.totalXp())
    }
  }

  badges(): BadgeProgress[] {
    const p = this.requirePlayer()
    const evals = evaluateBadges(this.badgeMetrics())
    const rows = this.db.prepare('SELECT badge_id, tier, unlocked_at FROM unlocked_badges WHERE player_id=?').all(p.id) as Array<{ badge_id: string; tier: number; unlocked_at: string }>
    return BADGES.map((b) => {
      const ev = evals.find((e) => e.badgeId === b.id)!
      const unlockedAt: Record<number, string> = {}
      let stored = 0
      for (const r of rows.filter((x) => x.badge_id === b.id)) {
        unlockedAt[r.tier] = r.unlocked_at
        stored = Math.max(stored, r.tier)
      }
      return { badgeId: b.id, tier: stored as BadgeProgress['tier'], value: ev.value, nextThreshold: stored < 4 ? b.tiers[stored] : null, unlockedAt }
    })
  }

  // ── 赛季 ──────────────────────────────────────────────────
  seasonInfo(index?: number): SeasonInfo {
    const p = this.requirePlayer()
    const created = p.createdAt.slice(0, 10)
    const today = this.today()
    const idx = index ?? seasonIndexFor(created, today)
    const { start, end } = seasonRange(created, idx)
    const xp = (this.db.prepare('SELECT COALESCE(SUM(amount),0) v FROM xp_transactions WHERE player_id=? AND date BETWEEN ? AND ?').get(p.id, start, end) as { v: number }).v
    const s = this.db.prepare('SELECT COUNT(*) c, COALESCE(SUM(duration_min),0) m FROM training_sessions WHERE player_id=? AND date BETWEEN ? AND ?').get(p.id, start, end) as { c: number; m: number }
    const tests = (this.db.prepare('SELECT COUNT(*) c FROM skill_tests WHERE player_id=? AND date BETWEEN ? AND ?').get(p.id, start, end) as { c: number }).c
    const values: Record<string, number> = { sessions: s.c, minutes: Math.round(s.m), tests }
    const day = Math.min(SEASON_CONFIG.lengthDays, Math.max(1, diffDays(start, today) + 1))
    return {
      index: idx,
      name: seasonName(idx),
      start,
      end,
      day,
      xp,
      level: seasonLevel(xp),
      sessions: s.c,
      minutes: Math.round(s.m),
      goals: SEASON_CONFIG.goals.map((g) => ({ ...g, value: values[g.key] ?? 0 }))
    }
  }

  seasonSummary(index: number): SeasonSummary {
    const p = this.requirePlayer()
    if (!Number.isInteger(index) || index < 1) throw new UserError('赛季编号无效')
    const info = this.seasonInfo(index)
    const today = this.today()
    const endRef = info.end < today ? info.end : today
    const attrStart = attrMapOf(this.attributes(addDays(info.start, -1)))
    const attrEnd = attrMapOf(this.attributes(endRef))
    const badgeRows = this.db
      .prepare('SELECT badge_id badgeId, tier FROM unlocked_badges WHERE player_id=? AND substr(unlocked_at,1,10) BETWEEN ? AND ? ORDER BY tier DESC')
      .all(p.id, info.start, info.end) as Array<{ badgeId: string; tier: number }>
    const sessions = this.mapSessions(
      this.db.prepare('SELECT * FROM training_sessions WHERE player_id=? AND date BETWEEN ? AND ?').all(p.id, info.start, info.end) as SessionRow[]
    )
    const bests: SeasonSummary['bests'] = []
    const shooting = sessions.filter((s) => s.accuracy != null && s.attempts >= 30)
    if (shooting.length) {
      const b = shooting.reduce((a, c) => ((c.accuracy ?? 0) > (a.accuracy ?? 0) ? c : a))
      bests.push({ label: '单次最高命中率', value: `${b.accuracy}%（${DRILL_MAP[b.drillId].name} ${b.makes}/${b.attempts}）` })
    }
    if (sessions.length) {
      const l = sessions.reduce((a, c) => (c.durationMin > a.durationMin ? c : a))
      bests.push({ label: '最长单次训练', value: `${l.durationMin} 分钟（${DRILL_MAP[l.drillId].name}）` })
      bests.push({ label: '赛季总命中', value: `${sessions.reduce((a, s) => a + s.makes, 0)} 球` })
    }
    const bestTest = this.db
      .prepare('SELECT test_id testId, MAX(score) score FROM skill_tests WHERE player_id=? AND date BETWEEN ? AND ? GROUP BY test_id ORDER BY score DESC LIMIT 1')
      .get(p.id, info.start, info.end) as { testId: string; score: number } | undefined
    if (bestTest) bests.push({ label: '最佳测试', value: `${SKILL_TEST_MAP[bestTest.testId].name} · ${bestTest.score}` })
    const tests = info.goals.find((g) => g.key === 'tests')?.value ?? 0
    return {
      ...info,
      grade: seasonGrade(info.goals),
      ovrStart: computeOvr(p.position, attrStart),
      ovrEnd: computeOvr(p.position, attrEnd),
      attrStart,
      attrEnd,
      badges: badgeRows,
      bests,
      testsTaken: tests,
      complete: info.end < today
    }
  }

  // ── 仪表盘 ────────────────────────────────────────────────
  dashboard(): Dashboard {
    const p = this.requirePlayer()
    this.weeklySnapshot()
    const today = this.today()
    const attributes = this.attributes()
    const map = attrMapOf(attributes)
    const career = careerState(this.totalXp())
    const week = rangeDays(addDays(today, -6), today).map((date) => {
      const r = this.db.prepare('SELECT COALESCE(SUM(duration_min),0) m FROM training_sessions WHERE player_id=? AND date=?').get(p.id, date) as { m: number }
      const x = this.db.prepare('SELECT COALESCE(SUM(amount),0) v FROM xp_transactions WHERE player_id=? AND date=?').get(p.id, date) as { v: number }
      return { date, minutes: Math.round(r.m), xp: x.v }
    })
    const todayXp = (this.db.prepare("SELECT COALESCE(SUM(amount),0) v FROM xp_transactions WHERE player_id=? AND date=? AND source='session'").get(p.id, today) as { v: number }).v
    const dates = (this.db.prepare('SELECT DISTINCT date FROM training_sessions WHERE player_id=?').all(p.id) as Array<{ date: string }>).map((r) => r.date)
    const season = this.seasonInfo()
    const settings = this.getSettings()
    const pendingSeasonSummary = season.index > 1 && settings.lastSeasonSeen < season.index - 1 ? season.index - 1 : null
    const quests = this.getQuests(today)
    return {
      player: p,
      career,
      ovr: computeOvr(p.position, map),
      ovrEstimated: attributes.some((a) => a.source === 'estimated'),
      attributes,
      quests,
      isRecoveryDay: quests.some((q) => q.recovery),
      season,
      recentSessions: this.listSessions({ limit: 6 }),
      week,
      todayXp,
      dailyCap: CAREER_CONFIG.dailyTrainingXpCap,
      badges: this.badges(),
      recentAchievements: this.listAchievements(6),
      streak: currentStreak(dates, today),
      pendingSeasonSummary
    }
  }

  // ── 统计 ──────────────────────────────────────────────────
  stats(): StatsBundle {
    const p = this.requirePlayer()
    const today = this.today()
    const all = this.mapSessions(this.db.prepare('SELECT * FROM training_sessions WHERE player_id=? ORDER BY date, id').all(p.id) as SessionRow[])
    const byDate = new Map<string, { minutes: number; sessions: number }>()
    for (const s of all) {
      const d = byDate.get(s.date) ?? { minutes: 0, sessions: 0 }
      d.minutes += s.durationMin
      d.sessions++
      byDate.set(s.date, d)
    }
    const calStart = weekStart(addDays(today, -7 * 17))
    const calendar = rangeDays(calStart, today).map((date) => ({ date, minutes: Math.round(byDate.get(date)?.minutes ?? 0), sessions: byDate.get(date)?.sessions ?? 0 }))

    const xpByDate = new Map<string, number>()
    for (const r of this.db.prepare('SELECT date, SUM(amount) v FROM xp_transactions WHERE player_id=? GROUP BY date').all(p.id) as Array<{ date: string; v: number }>) xpByDate.set(r.date, r.v)
    const weekly: StatsBundle['weekly'] = []
    const thisWeek = weekStart(today)
    for (let i = 11; i >= 0; i--) {
      const ws = addDays(thisWeek, -7 * i)
      const days = rangeDays(ws, addDays(ws, 6))
      weekly.push({
        week: ws.slice(5),
        minutes: Math.round(days.reduce((a, d) => a + (byDate.get(d)?.minutes ?? 0), 0)),
        sessions: days.reduce((a, d) => a + (byDate.get(d)?.sessions ?? 0), 0),
        xp: days.reduce((a, d) => a + (xpByDate.get(d) ?? 0), 0)
      })
    }
    const monthly: StatsBundle['monthly'] = []
    const months: string[] = []
    const [ty, tm] = today.split('-').map(Number)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ty, tm - 1 - i, 1)
      months.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`)
    }
    for (const m of months) {
      const ss = all.filter((s) => monthKey(s.date) === m)
      monthly.push({
        month: m,
        minutes: Math.round(ss.reduce((a, s) => a + s.durationMin, 0)),
        sessions: ss.length,
        attempts: ss.reduce((a, s) => a + s.attempts, 0),
        makes: ss.reduce((a, s) => a + s.makes, 0)
      })
    }
    const accuracyTrend = all
      .filter((s) => s.accuracy != null && s.attempts >= 10 && DRILL_MAP[s.drillId]?.category === 'shooting')
      .slice(-60)
      .map((s) => ({ date: s.date, drillId: s.drillId, accuracy: s.accuracy as number, attempts: s.attempts }))

    const games = this.listGames()
    const totals = {
      sessions: all.length,
      minutes: Math.round(all.reduce((a, s) => a + s.durationMin, 0)),
      attempts: all.reduce((a, s) => a + s.attempts, 0),
      makes: all.reduce((a, s) => a + s.makes, 0),
      reps: all.reduce((a, s) => a + s.reps, 0),
      games: games.length
    }
    const records: StatsBundle['records'] = []
    const shots = all.filter((s) => s.accuracy != null && s.attempts >= 30)
    if (shots.length) {
      const b = shots.reduce((a, c) => ((c.accuracy ?? 0) > (a.accuracy ?? 0) ? c : a))
      records.push({ label: '单次最高命中率（≥30 出手）', value: `${b.accuracy}%`, date: b.date })
      const m = shots.reduce((a, c) => (c.makes > a.makes ? c : a))
      records.push({ label: '单次最多命中', value: `${m.makes} 球`, date: m.date })
    }
    if (all.length) {
      const l = all.reduce((a, c) => (c.durationMin > a.durationMin ? c : a))
      records.push({ label: '最长单次训练', value: `${l.durationMin} 分钟`, date: l.date })
      records.push({ label: '最长连续训练', value: `${longestStreak(all.map((s) => s.date))} 天`, date: null })
    }
    if (games.length) {
      const g = games.reduce((a, c) => (c.points > a.points ? c : a))
      records.push({ label: '单场最高得分', value: `${g.points} 分（${g.mode.toUpperCase()}）`, date: g.date })
    }
    for (const r of this.db
      .prepare('SELECT test_id testId, MAX(score) score, date FROM skill_tests WHERE player_id=? GROUP BY test_id ORDER BY score DESC LIMIT 4')
      .all(p.id) as Array<{ testId: string; score: number; date: string }>) {
      records.push({ label: `${SKILL_TEST_MAP[r.testId].name}最佳评分`, value: String(r.score), date: r.date })
    }
    const gameAverages = games.length
      ? (() => {
          const n = games.length
          const avg = (k: keyof GameLogInput): number => Math.round((games.reduce((a, g) => a + (g[k] as number), 0) / n) * 10) / 10
          return { games: n, points: avg('points'), rebounds: avg('rebounds'), assists: avg('assists'), steals: avg('steals'), blocks: avg('blocks'), turnovers: avg('turnovers') }
        })()
      : null
    return { calendar, weekly, monthly, accuracyTrend, totals, records, games, gameAverages, snapshots: this.listSnapshots() }
  }

  // ── 实战记录 ──────────────────────────────────────────────
  listGames(): GameLog[] {
    const p = this.requirePlayer()
    return (this.db.prepare('SELECT * FROM game_logs WHERE player_id=? ORDER BY date DESC, id DESC').all(p.id) as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as number,
      date: r.date as string,
      mode: r.mode as GameLog['mode'],
      points: r.points as number,
      rebounds: r.rebounds as number,
      assists: r.assists as number,
      steals: r.steals as number,
      blocks: r.blocks as number,
      turnovers: r.turnovers as number,
      result: (r.result as GameLog['result']) ?? null,
      notes: r.notes as string,
      createdAt: r.created_at as string
    }))
  }

  addGame(input: GameLogInput): MutationResult<GameLog> {
    const p = this.requirePlayer()
    const errors = validateGame(input, this.today())
    if (errors.length) throw new UserError(errors.join('；'))
    const before = this.mark()
    const res = this.db
      .prepare('INSERT INTO game_logs (player_id, date, mode, points, rebounds, assists, steals, blocks, turnovers, result, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(p.id, input.date, input.mode, input.points, input.rebounds, input.assists, input.steals, input.blocks, input.turnovers, input.result, (input.notes ?? '').trim(), this.stamp())
    this.reconcile()
    const g = this.listGames().find((x) => x.id === Number(res.lastInsertRowid))!
    return { data: g, events: this.diff(before) }
  }

  updateGame(id: number, input: GameLogInput): MutationResult<GameLog> {
    const p = this.requirePlayer()
    if (!this.db.prepare('SELECT id FROM game_logs WHERE id=? AND player_id=?').get(id, p.id)) throw new UserError('比赛记录不存在')
    const errors = validateGame(input, this.today())
    if (errors.length) throw new UserError(errors.join('；'))
    const before = this.mark()
    this.db
      .prepare('UPDATE game_logs SET date=?, mode=?, points=?, rebounds=?, assists=?, steals=?, blocks=?, turnovers=?, result=?, notes=? WHERE id=?')
      .run(input.date, input.mode, input.points, input.rebounds, input.assists, input.steals, input.blocks, input.turnovers, input.result, (input.notes ?? '').trim(), id)
    this.reconcile()
    return { data: this.listGames().find((x) => x.id === id)!, events: this.diff(before) }
  }

  removeGame(id: number): MutationResult<null> {
    const p = this.requirePlayer()
    if (!this.db.prepare('SELECT id FROM game_logs WHERE id=? AND player_id=?').get(id, p.id)) throw new UserError('比赛记录不存在')
    const before = this.mark()
    this.db.prepare('DELETE FROM game_logs WHERE id=?').run(id)
    this.reconcile()
    return { data: null, events: this.diff(before) }
  }

  // ── 设置 ──────────────────────────────────────────────────
  getSettings(): AppSettings {
    const rows = this.db.prepare("SELECT key, value FROM settings WHERE key LIKE 'app.%'").all() as Array<{ key: string; value: string }>
    const out: AppSettings = { ...DEFAULT_SETTINGS }
    for (const r of rows) {
      const k = r.key.slice(4) as keyof AppSettings
      if (k in out) {
        try {
          ;(out as unknown as Record<string, unknown>)[k] = JSON.parse(r.value)
        } catch {
          /* 忽略损坏值 */
        }
      }
    }
    return out
  }

  setSettings(patch: Partial<AppSettings>): AppSettings {
    const allowed: Array<keyof AppSettings> = ['reducedMotion', 'backgroundFx', 'lastSeasonSeen']
    const up = this.db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    for (const k of allowed) {
      if (patch[k] === undefined) continue
      const v = patch[k]
      if (k === 'reducedMotion' && !['system', 'on', 'off'].includes(v as string)) continue
      if (k === 'backgroundFx' && typeof v !== 'boolean') continue
      if (k === 'lastSeasonSeen' && !Number.isInteger(v)) continue
      up.run(`app.${k}`, JSON.stringify(v))
    }
    return this.getSettings()
  }

  getRaw(key: string): string | null {
    return (this.db.prepare('SELECT value FROM settings WHERE key=?').get(key) as { value: string } | undefined)?.value ?? null
  }
  setRaw(key: string, value: string | null): void {
    if (value == null) this.db.prepare('DELETE FROM settings WHERE key=?').run(key)
    else this.db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, value)
  }

  // ── AI 教练数据上下文（只读，仅包含真实记录） ─────────────
  coachContext(): string {
    const p = this.requirePlayer()
    const today = this.today()
    const attrs = this.attributes()
    const map = attrMapOf(attrs)
    const career = careerState(this.totalXp())
    const recent = this.mapSessions(
      this.db.prepare('SELECT * FROM training_sessions WHERE player_id=? AND date>=? ORDER BY date').all(p.id, addDays(today, -27)) as SessionRow[]
    )
    const lines: string[] = []
    lines.push(`今天日期：${today}`)
    lines.push(`球员：${p.nickname}，#${p.jersey}，位置 ${p.position}，打法 ${p.style}，身高 ${p.heightCm}cm，体重 ${p.weightKg}kg，惯用手 ${p.hand}`)
    lines.push(`生涯等级 LV${career.level}（${career.title}），OVR ${computeOvr(p.position, map)}`)
    lines.push(
      '六项能力：' +
        attrs.map((a) => `${ATTR_META[a.key].name} ${a.value}${a.source === 'estimated' ? '（自评预估，未测试）' : a.source === 'mixed' ? '（部分测试）' : '（已测试）'}`).join('，')
    )
    const tests = this.listTests().slice(0, 12)
    lines.push(tests.length ? '最近能力测试：' + tests.map((t) => `${t.date} ${SKILL_TEST_MAP[t.testId]?.name} 成绩 ${t.raw}${SKILL_TEST_MAP[t.testId]?.unit} 评分 ${t.score}`).join('；') : '最近能力测试：无记录')
    if (recent.length === 0) lines.push('最近 28 天训练：无记录')
    else {
      lines.push(`最近 28 天训练共 ${recent.length} 次，总时长 ${Math.round(recent.reduce((a, s) => a + s.durationMin, 0))} 分钟。明细：`)
      for (const s of recent.slice(-40)) {
        const d = DRILL_MAP[s.drillId]
        const extra = s.accuracy != null ? `，出手 ${s.attempts} 命中 ${s.makes}（${s.accuracy}%）` : s.reps ? `，${d.repsLabel ?? '次数'} ${s.reps}` : ''
        lines.push(`- ${s.date} ${d.name} ${s.durationMin} 分钟，RPE ${s.rpe}${extra}`)
      }
    }
    const games = this.listGames().slice(0, 8)
    lines.push(games.length ? '最近实战：' + games.map((g) => `${g.date} ${g.mode} ${g.points}分 ${g.rebounds}板 ${g.assists}助 ${g.steals}断 ${g.blocks}帽 ${g.turnovers}失误`).join('；') : '最近实战：无记录')
    lines.push(`今日是否恢复日：${this.recoveryDay(today) ? '是' : '否'}；当前连续训练 ${currentStreak(recent.map((s) => s.date), today)} 天`)
    return lines.join('\n')
  }

  /** 供本地规则教练使用的结构化数据 */
  coachData(): {
    player: Player
    attrs: AttributeDetail[]
    recent: TrainingSession[]
    previous: TrainingSession[]
    recovery: boolean
    games: GameLog[]
  } {
    const p = this.requirePlayer()
    const today = this.today()
    const recent = this.mapSessions(this.db.prepare('SELECT * FROM training_sessions WHERE player_id=? AND date>=? ORDER BY date').all(p.id, addDays(today, -13)) as SessionRow[])
    const previous = this.mapSessions(
      this.db.prepare('SELECT * FROM training_sessions WHERE player_id=? AND date>=? AND date<? ORDER BY date').all(p.id, addDays(today, -27), addDays(today, -13)) as SessionRow[]
    )
    return { player: p, attrs: this.attributes(), recent, previous, recovery: this.recoveryDay(today), games: this.listGames().slice(0, 10) }
  }
}

export type { AttrKey }
