import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORY_META, DRILLS, DRILL_MAP, INTENSITY_META, TRAINING_LIMITS, type DrillCategory, type DrillDef } from '@shared/config/drills'
import { todayStr } from '@shared/logic/dates'
import { accuracy, sessionXp, totalsOf } from '@shared/logic/progression'
import { validateTraining } from '@shared/logic/validation'
import type { TrainingInput, TrainingSession, TrainingSetInput } from '@shared/types'
import { Icon } from '../art/icons'
import { Chips, EmptyState, Field, NumberInput, PageHeader } from '../components/ui'
import { api } from '../lib/api'
import { errMsg, relDay } from '../lib/format'
import { AnimatedCounter, AnimatedTab, ElasticButton, HoverTiltCard, SpringModal, spring } from '../motion'
import { mutate, useApp } from '../store/app'

type Cat = 'all' | DrillCategory

export function Training(): JSX.Element {
  const consumeIntent = useApp((s) => s.consumeIntent)
  const [tab, setTab] = useState<'drills' | 'history'>('drills')
  const [drill, setDrill] = useState<DrillDef | null>(null)
  useEffect(() => {
    if (consumeIntent() === 'history') setTab('history')
  }, [consumeIntent])
  return (
    <div className="px-10 pb-10 pt-4">
      <PageHeader
        tag="TRAINING CENTER"
        title="训练中心"
        sub="完成现实训练 → 录入真实成绩 → 获得 XP。普通训练只奖励经验，能力评分由标准化测试决定。"
        right={
          <AnimatedTab
            tabs={[
              { id: 'drills', label: '训练项目' },
              { id: 'history', label: '历史记录' }
            ]}
            value={tab}
            onChange={(t) => {
              setTab(t)
              setDrill(null)
            }}
          />
        }
      />
      <AnimatePresence mode="wait" initial={false}>
        {tab === 'history' ? (
          <motion.div key="history" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={spring.page}>
            <History />
          </motion.div>
        ) : drill ? (
          <motion.div key={`drill-${drill.id}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={spring.page}>
            <DrillSession drill={drill} onBack={() => setDrill(null)} />
          </motion.div>
        ) : (
          <motion.div key="grid" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={spring.page}>
            <DrillGrid onPick={setDrill} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const intensityColor = { low: 'text-win', mid: 'text-champ', high: 'text-hoop' }

function DrillGrid({ onPick }: { onPick: (d: DrillDef) => void }): JSX.Element {
  const [cat, setCat] = useState<Cat>('all')
  const recovery = useApp((s) => s.dashboard?.isRecoveryDay)
  const list = DRILLS.filter((d) => cat === 'all' || d.category === cat)
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <AnimatedTab<Cat>
          size="sm"
          tabs={[{ id: 'all', label: '全部' }, ...(Object.keys(CATEGORY_META) as DrillCategory[]).map((c) => ({ id: c as Cat, label: CATEGORY_META[c].name }))]}
          value={cat}
          onChange={setCat}
        />
        {recovery && (
          <div className="flex items-center gap-2 text-[13px] text-win">
            <Icon.moon width={16} height={16} /> 今天是恢复日，推荐「恢复训练」或轻量罚球
          </div>
        )}
      </div>
      <motion.div layout className="grid grid-cols-3 gap-4 xl:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {list.map((d, i) => (
            <motion.div key={d.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1, transition: { ...spring.page, delay: i * 0.025 } }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}>
              <HoverTiltCard onClick={() => onPick(d)} className="rounded-xl" maxTilt={5}>
                <div className={`panel relative h-[176px] overflow-hidden rounded-xl p-5 ${recovery && d.category === 'recovery' ? 'ring-1 ring-win/50' : ''}`}>
                  <div className="num outline-text absolute -right-2 -top-4 text-[86px] font-bold leading-none">{String(i + 1).padStart(2, '0')}</div>
                  <div className="tag-orange">{CATEGORY_META[d.category].en}</div>
                  <div className="mt-1 font-display text-[24px] font-semibold text-chalk">{d.name}</div>
                  <div className="tag text-[9px]">{d.en}</div>
                  <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-silver/60">{d.description}</p>
                  <div className="absolute inset-x-5 bottom-4 flex items-center justify-between text-[12px]">
                    <span className={intensityColor[d.intensity]}>{INTENSITY_META[d.intensity].name}</span>
                    <span className="mono text-silver/55">~{d.defaultMinutes} 分钟</span>
                  </div>
                </div>
              </HoverTiltCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function DrillSession({ drill, onBack }: { drill: DrillDef; onBack: () => void }): JSX.Element {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<TrainingSession | null>(null)
  const [formKey, setFormKey] = useState(0)
  const startRef = useRef(0)
  const baseRef = useRef(0)
  useEffect(() => {
    if (!running) return
    startRef.current = Date.now()
    const h = setInterval(() => setElapsed(baseRef.current + (Date.now() - startRef.current) / 1000), 250)
    return () => {
      clearInterval(h)
      baseRef.current += (Date.now() - startRef.current) / 1000
    }
  }, [running])
  const mm = Math.floor(elapsed / 60)
  const ss = Math.floor(elapsed % 60)
  const timerMinutes = elapsed >= 30 ? Math.max(1, Math.round(elapsed / 60)) : null
  const go = useApp((s) => s.go)

  return (
    <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6">
      <div className="space-y-5">
        <ElasticButton variant="ghost" size="sm" icon={<Icon.back width={14} height={14} />} onClick={onBack}>
          返回项目列表
        </ElasticButton>
        <div className="panel panel-cut p-6">
          <div className="tag-orange">
            {CATEGORY_META[drill.category].en} · {INTENSITY_META[drill.intensity].name}
          </div>
          <h2 className="mt-1 font-display text-[40px] font-bold leading-none text-chalk">{drill.name}</h2>
          <div className="tag mt-1">{drill.en}</div>
          <p className="mt-4 text-[14px] leading-relaxed text-silver/75">{drill.description}</p>
          <div className="mt-5 rounded-lg bg-hoop/[0.08] px-4 py-3 ring-1 ring-inset ring-hoop/25">
            <div className="tag-orange text-[10px]">训练目标</div>
            <div className="mt-1 text-[14px] text-chalk">{drill.goal}</div>
          </div>
          <ol className="mt-5 space-y-2.5">
            {drill.steps.map((s, i) => (
              <li key={s} className="flex gap-3 text-[13px] text-silver/80">
                <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white/5 text-[12px] font-bold text-hoop">{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </div>
        {/* 计时器 */}
        <div className="panel rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="tag-orange">TIMER · 训练计时</div>
            <span className={`flex items-center gap-1.5 text-[12px] ${running ? 'text-win' : 'text-silver/50'}`}>
              <span className={`h-2 w-2 rounded-full ${running ? 'animate-pulse bg-win' : 'bg-silver/40'}`} />
              {running ? '计时中' : elapsed > 0 ? '已暂停' : '未开始'}
            </span>
          </div>
          <div className="num my-3 text-center text-[84px] font-bold leading-none tracking-tight text-chalk">
            {String(mm).padStart(2, '0')}
            <span className={running ? 'text-hoop' : 'text-silver/40'}>:</span>
            {String(ss).padStart(2, '0')}
          </div>
          <div className="flex justify-center gap-3">
            <ElasticButton size="lg" icon={running ? <Icon.pause width={16} height={16} /> : <Icon.play width={16} height={16} />} onClick={() => setRunning(!running)}>
              {running ? '暂停' : elapsed > 0 ? '继续' : '开始计时'}
            </ElasticButton>
            <ElasticButton
              size="lg"
              variant="secondary"
              icon={<Icon.reset width={16} height={16} />}
              disabled={elapsed === 0}
              onClick={() => {
                setRunning(false)
                baseRef.current = 0
                setElapsed(0)
              }}
            >
              重置
            </ElasticButton>
          </div>
          <p className="mt-3 text-center text-[12px] text-silver/45">计时结束后，时长会自动填入成绩表单（可修改）</p>
        </div>
      </div>

      <div>
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={spring.pop} className="panel panel-cut relative overflow-hidden p-8">
              <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,107,32,0.3),transparent_70%)]" />
              <div className="relative text-center">
                <div className="tag-orange">SESSION COMPLETE</div>
                <h3 className="mt-2 font-display text-[40px] font-bold text-chalk">训练完成</h3>
                <div className="mt-6 flex justify-center gap-10">
                  <div>
                    <div className="num text-gradient-orange text-[72px] font-bold leading-none">
                      +<AnimatedCounter value={result.xpAwarded} />
                    </div>
                    <div className="tag mt-1">XP 获得</div>
                  </div>
                  {result.accuracy != null && (
                    <div>
                      <div className="num text-[72px] font-bold leading-none text-chalk">
                        <AnimatedCounter value={result.accuracy} decimals={1} />%
                      </div>
                      <div className="tag mt-1">
                        命中率 · {result.makes}/{result.attempts}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="num text-[72px] font-bold leading-none text-chalk">{result.durationMin}</div>
                    <div className="tag mt-1">分钟</div>
                  </div>
                </div>
                {result.xpAwarded < result.xpRaw && <div className="mt-5 text-[13px] text-champ">今日训练 XP 已达上限（本次原始 {result.xpRaw} XP）。休息同样是训练的一部分。</div>}
                <div className="mt-8 flex justify-center gap-3">
                  <ElasticButton
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      setResult(null)
                      setFormKey((k) => k + 1)
                      baseRef.current = 0
                      setElapsed(0)
                    }}
                  >
                    再记录一次
                  </ElasticButton>
                  <ElasticButton size="lg" iconRight={<Icon.arrow width={16} height={16} />} onClick={() => go('career')}>
                    返回生涯大厅
                  </ElasticButton>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key={`form${formKey}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.page} className="panel panel-cut p-7">
              <div className="tag-orange">RECORD RESULTS</div>
              <h3 className="mb-5 mt-1 font-display text-[26px] font-semibold text-chalk">录入训练成绩</h3>
              <TrainingForm
                drill={drill}
                timerMinutes={timerMinutes}
                submitLabel="提交记录"
                onSubmit={async (input) => {
                  setRunning(false)
                  const r = await mutate(() => api.training.submit(input))
                  if (r) setResult(r)
                  return !!r
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

interface SetDraft {
  location: string | null
  attempts: number | ''
  makes: number | ''
  reps: number | ''
}

export function TrainingForm({
  drill,
  initial,
  timerMinutes,
  submitLabel,
  onSubmit
}: {
  drill: DrillDef
  initial?: TrainingSession
  timerMinutes?: number | null
  submitLabel: string
  onSubmit: (input: TrainingInput) => Promise<boolean>
}): JSX.Element {
  const today = todayStr()
  const [date, setDate] = useState(initial?.date ?? today)
  const [duration, setDuration] = useState<number | ''>(initial?.durationMin ?? drill.defaultMinutes)
  const [rpe, setRpe] = useState(initial?.rpe ?? (drill.intensity === 'low' ? 3 : drill.intensity === 'mid' ? 6 : 7))
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [sets, setSets] = useState<SetDraft[]>(
    initial?.sets.length
      ? initial.sets.map((s) => ({ location: s.location, attempts: s.attempts || '', makes: s.attempts ? s.makes : '', reps: s.reps || '' }))
      : drill.metric === 'time'
        ? []
        : [{ location: drill.locations?.[0] ?? null, attempts: '', makes: '', reps: '' }]
  )
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (timerMinutes && !initial) setDuration(timerMinutes)
  }, [timerMinutes, initial])

  const input: TrainingInput = useMemo(
    () => ({
      drillId: drill.id,
      date,
      durationMin: duration === '' ? NaN : Number(duration),
      rpe,
      notes,
      sets: sets.map<TrainingSetInput>((s) => ({
        location: s.location,
        attempts: s.attempts === '' ? null : s.attempts,
        makes: s.makes === '' ? (drill.metric === 'shots' ? null : 0) : s.makes,
        reps: s.reps === '' ? (drill.metric === 'reps' ? null : 0) : s.reps
      }))
    }),
    [drill, date, duration, rpe, notes, sets]
  )
  const errors = validateTraining(input, today)
  const totals = totalsOf(input.sets)
  const acc = drill.metric === 'shots' ? accuracy(totals.attempts, totals.makes) : null
  const estXp = errors.length ? 0 : sessionXp(drill.id, Number(duration), totals)

  const updateSet = (i: number, patch: Partial<SetDraft>): void => setSets((xs) => xs.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const submit = async (): Promise<void> => {
    setTouched(true)
    if (errors.length) return
    setBusy(true)
    try {
      await onSubmit(input)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="训练日期">
          <input type="date" className="field mono" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="训练时长" hint="分钟 1–240">
          <NumberInput value={duration} min={1} max={240} onChange={setDuration} />
        </Field>
      </div>
      <Field label="主观疲劳度 RPE" hint="1 很轻松 · 10 极限">
        <div className="flex gap-1.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <motion.button
              key={n}
              type="button"
              onClick={() => setRpe(n)}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.88 }}
              transition={spring.press}
              className={`num h-9 flex-1 rounded-md text-[14px] font-bold transition-colors ${rpe === n ? (n >= 8 ? 'bg-[#e2483c] text-white' : n >= 5 ? 'bg-hoop text-white' : 'bg-win text-ink') : 'bg-white/5 text-silver/60 hover:bg-white/10'}`}
            >
              {n}
            </motion.button>
          ))}
        </div>
      </Field>

      {drill.metric !== 'time' && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-label text-[12px] font-bold uppercase tracking-[0.14em] text-silver/80">{drill.metric === 'shots' ? '分组成绩（可按位置记录）' : drill.repsLabel}</span>
            {sets.length < TRAINING_LIMITS.setsMax && (
              <ElasticButton size="sm" variant="ghost" icon={<Icon.plus width={14} height={14} />} onClick={() => setSets((xs) => [...xs, { location: drill.locations?.[(xs.length) % (drill.locations?.length ?? 1)] ?? null, attempts: '', makes: '', reps: '' }])}>
                添加一组
              </ElasticButton>
            )}
          </div>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {sets.map((s, i) => (
                <motion.div key={i} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={spring.page} className="overflow-hidden">
                  <div className="training-set flex items-center gap-2 rounded-lg bg-black/25 p-2.5">
                    <span className="num w-6 text-center text-[13px] text-silver/50">{i + 1}</span>
                    {drill.locations && drill.locations.length > 1 && (
                      <select className="field w-[130px] py-2 text-[13px]" value={s.location ?? ''} onChange={(e) => updateSet(i, { location: e.target.value })}>
                        {drill.locations.map((l) => (
                          <option key={l} value={l} className="bg-panel">
                            {l}
                          </option>
                        ))}
                      </select>
                    )}
                    {drill.metric === 'shots' ? (
                      <>
                        <NumberInput value={s.attempts} min={1} max={600} placeholder="出手" onChange={(v) => updateSet(i, { attempts: v })} className="py-2" />
                        <NumberInput value={s.makes} min={0} max={600} placeholder="命中" onChange={(v) => updateSet(i, { makes: v })} className="py-2" />
                        <span className="mono w-14 text-right text-[13px] text-hoop">{s.attempts && s.makes !== '' && s.attempts > 0 ? `${Math.round((Number(s.makes) / Number(s.attempts)) * 100)}%` : '—'}</span>
                      </>
                    ) : (
                      <NumberInput value={s.reps} min={1} max={3000} placeholder={drill.repsLabel} onChange={(v) => updateSet(i, { reps: v })} className="py-2" />
                    )}
                    {sets.length > 1 && (
                      <motion.button type="button" whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.1 }} onClick={() => setSets((xs) => xs.filter((_, j) => j !== i))} className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-silver/50 hover:bg-white/5 hover:text-[#ff8b82]" aria-label="删除这一组">
                        <Icon.trash width={15} height={15} />
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      <Field label="训练备注" hint="可选">
        <textarea className="field min-h-[64px] resize-none" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="今天的感受、发现的问题…" />
      </Field>

      {/* 实时结算 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-black/30 px-4 py-3">
          <div className="tag text-[10px]">命中率</div>
          <div className="num mt-1 text-[26px] font-bold text-chalk">{acc != null ? `${acc}%` : '—'}</div>
        </div>
        <div className="rounded-lg bg-black/30 px-4 py-3">
          <div className="tag text-[10px]">{drill.metric === 'shots' ? '出手 / 命中' : '合计'}</div>
          <div className="num mt-1 text-[26px] font-bold text-chalk">{drill.metric === 'shots' ? `${totals.attempts}/${totals.makes}` : drill.metric === 'reps' ? totals.reps : `${duration || 0}′`}</div>
        </div>
        <div className="rounded-lg bg-hoop/10 px-4 py-3 ring-1 ring-inset ring-hoop/25">
          <div className="tag-orange text-[10px]">预计 XP</div>
          <div className="num mt-1 text-[26px] font-bold text-hoop">+{estXp}</div>
        </div>
      </div>

      <AnimatePresence>
        {touched && errors.length > 0 && (
          <motion.ul initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-1 rounded-lg border border-[#ff5d52]/30 bg-[#ff5d52]/[0.08] px-4 py-3 text-[13px] text-[#ff9c94]">
            {errors.map((e) => (
              <li key={e}>· {e}</li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <ElasticButton size="xl" block loading={busy} icon={<Icon.check width={18} height={18} />} onClick={() => void submit()}>
        {submitLabel}
      </ElasticButton>
    </div>
  )
}

function History(): JSX.Element {
  const [list, setList] = useState<TrainingSession[] | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [editing, setEditing] = useState<TrainingSession | null>(null)
  const [deleting, setDeleting] = useState<TrainingSession | null>(null)
  const toast = useApp((s) => s.toast)
  const go = useApp((s) => s.go)
  const today = todayStr()
  const load = (): void => {
    api.training
      .list({ limit: 500 })
      .then(setList)
      .catch((e) => toast({ tone: 'error', title: '加载失败', detail: errMsg(e) }))
  }
  useEffect(load, [toast])
  if (!list) return <div className="h-40" />
  const shown = list.filter((s) => filter === 'all' || s.drillId === filter)
  const used = [...new Set(list.map((s) => s.drillId))]

  return (
    <div>
      {list.length === 0 ? (
        <EmptyState icon={<Icon.training width={36} height={36} />} title="还没有训练记录" text="完成一次现实训练并录入成绩后，这里会显示你的全部历史。所有记录都可以修改和删除，XP 会自动重新计算。" action={<ElasticButton onClick={() => go('training')}>去训练</ElasticButton>} />
      ) : (
        <>
          <Chips size="sm" className="mb-4" options={[{ id: 'all', label: `全部 ${list.length}` }, ...used.map((id) => ({ id, label: DRILL_MAP[id].name }))]} value={filter} onChange={setFilter} />
          <div className="panel overflow-hidden rounded-xl">
            <div className="grid grid-cols-[110px_1.3fr_90px_1.2fr_90px_96px] gap-3 border-b border-white/5 px-5 py-3 tag text-[10px]">
              <span>日期</span>
              <span>项目</span>
              <span>时长</span>
              <span>成绩</span>
              <span>XP</span>
              <span className="text-right">操作</span>
            </div>
            <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }}>
              {shown.map((s) => {
                const d = DRILL_MAP[s.drillId]
                return (
                  <motion.div key={s.id} variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }} className="grid grid-cols-[110px_1.3fr_90px_1.2fr_90px_96px] items-center gap-3 border-b border-white/[0.04] px-5 py-3 text-[13px] transition-colors hover:bg-white/[0.03]">
                    <span className="text-silver/70">{relDay(s.date, today)}</span>
                    <span className="font-semibold text-chalk">
                      {d.name}
                      {s.notes && <span className="ml-2 font-normal text-silver/45">· {s.notes.slice(0, 16)}</span>}
                    </span>
                    <span className="mono text-silver/80">{s.durationMin}′</span>
                    <span className="mono text-chalk">
                      {s.accuracy != null ? `${s.makes}/${s.attempts} · ${s.accuracy}%` : s.reps ? `${s.reps} ${d.repsLabel ?? '次'}` : `RPE ${s.rpe}`}
                    </span>
                    <span className="mono text-hoop" title={s.xpAwarded < s.xpRaw ? `受每日上限影响（原始 ${s.xpRaw}）` : undefined}>
                      +{s.xpAwarded}
                      {s.xpAwarded < s.xpRaw && <span className="text-champ">*</span>}
                    </span>
                    <span className="flex justify-end gap-1">
                      <motion.button type="button" whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.88 }} transition={spring.press} onClick={() => setEditing(s)} className="flex h-8 w-8 items-center justify-center rounded text-silver/60 hover:bg-white/5 hover:text-chalk" aria-label="修改">
                        <Icon.edit width={15} height={15} />
                      </motion.button>
                      <motion.button type="button" whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.88 }} transition={spring.press} onClick={() => setDeleting(s)} className="flex h-8 w-8 items-center justify-center rounded text-silver/60 hover:bg-white/5 hover:text-[#ff8b82]" aria-label="删除">
                        <Icon.trash width={15} height={15} />
                      </motion.button>
                    </span>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
          <p className="mt-3 text-[12px] text-silver/45">* 表示该次训练受每日 XP 上限影响。修改或删除记录后，XP、任务与徽章会按真实记录整体重算，不会重复发放。</p>
        </>
      )}

      <SpringModal open={!!editing} onClose={() => setEditing(null)} title={editing ? `修改 · ${DRILL_MAP[editing.drillId].name}` : ''} tag="EDIT SESSION" width={640}>
        {editing && (
          <TrainingForm
            drill={DRILL_MAP[editing.drillId]}
            initial={editing}
            submitLabel="保存修改"
            onSubmit={async (input) => {
              const r = await mutate(() => api.training.update(editing.id, input), '记录已更新')
              if (r) {
                setEditing(null)
                load()
              }
              return !!r
            }}
          />
        )}
      </SpringModal>
      <SpringModal open={!!deleting} onClose={() => setDeleting(null)} title="删除训练记录？" tag="DELETE" width={440}>
        {deleting && (
          <div>
            <p className="text-[14px] text-silver/75">
              将删除 {deleting.date} 的「{DRILL_MAP[deleting.drillId].name}」记录。相关 XP、任务进度与徽章会重新计算。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <ElasticButton variant="ghost" onClick={() => setDeleting(null)}>
                取消
              </ElasticButton>
              <ElasticButton
                variant="danger"
                icon={<Icon.trash width={15} height={15} />}
                onClick={async () => {
                  const id = deleting.id
                  setDeleting(null)
                  await mutate(() => api.training.remove(id), '记录已删除')
                  load()
                }}
              >
                确认删除
              </ElasticButton>
            </div>
          </div>
        )}
      </SpringModal>
    </div>
  )
}
