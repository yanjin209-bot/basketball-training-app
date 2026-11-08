import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { ATTR_KEYS, ATTR_META, POSITION_WEIGHTS } from '@shared/config/career'
import { IQ_QUESTIONS, QUIZ_LENGTH, SKILL_TESTS, SKILL_TEST_MAP, type SkillTestDef } from '@shared/config/skills'
import { todayStr } from '@shared/logic/dates'
import { attrMapOf, scoreTest } from '@shared/logic/skills'
import { validateTestRaw } from '@shared/logic/validation'
import type { AttrKey, SkillTestRecord } from '@shared/types'
import { Icon } from '../art/icons'
import { AttributeRadar } from '../components/AttributeRadar'
import { Field, NumberInput, PageHeader, SourceTag } from '../components/ui'
import { api } from '../lib/api'
import { errMsg, relDay } from '../lib/format'
import { AnimatedCounter, ElasticButton, HoverTiltCard, SpringModal, XPProgressBar, spring } from '../motion'
import { mutate, useApp } from '../store/app'

export function Attributes(): JSX.Element {
  const d = useApp((s) => s.dashboard)
  const [sel, setSel] = useState<AttrKey>('shooting')
  const [tests, setTests] = useState<SkillTestRecord[]>([])
  const [entry, setEntry] = useState<SkillTestDef | null>(null)
  const [quiz, setQuiz] = useState(false)
  const [delId, setDelId] = useState<number | null>(null)
  const toast = useApp((s) => s.toast)
  const load = (): void => {
    api.tests
      .list()
      .then(setTests)
      .catch((e) => toast({ tone: 'error', title: '加载失败', detail: errMsg(e) }))
  }
  useEffect(load, [toast])
  if (!d) return <div />
  const attrs = attrMapOf(d.attributes)
  const detail = d.attributes.find((a) => a.key === sel)!
  const weights = POSITION_WEIGHTS[d.player.position]

  const runAstTo = async (): Promise<void> => {
    await mutate(() => api.tests.computeAstTo())
    load()
  }

  return (
    <div className="px-10 pb-10 pt-4">
      <PageHeader tag="ATTRIBUTES" title="能力属性" sub="能力评分只由标准化测试计算（取每个测试最近一次成绩），普通训练不会直接提升评分。" />
      <div className="grid grid-cols-[400px_minmax(0,1fr)] gap-6">
        <div className="panel panel-cut flex flex-col p-6">
          <div className="flex items-end justify-between">
            <div>
              <div className="tag-orange">OVERALL · {d.player.position}</div>
              <div className="num text-gradient-orange text-[88px] font-bold leading-none">
                <AnimatedCounter value={d.ovr} />
              </div>
            </div>
            <div className="mb-3 text-right text-[12px] text-silver/55">{d.ovrEstimated ? '含自评预估数据' : '全部来自真实测试'}</div>
          </div>
          <AttributeRadar attrs={attrs} height={300} />
          <div className="mt-2 rounded-lg bg-black/25 p-4">
            <div className="tag mb-2 text-[10px]">{d.player.position} 位置 OVR 权重</div>
            <div className="grid grid-cols-3 gap-2">
              {ATTR_KEYS.map((k) => (
                <div key={k} className="flex justify-between text-[12px]">
                  <span className="text-silver/70">{ATTR_META[k].name}</span>
                  <span className="mono text-chalk">{Math.round(weights[k] * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-3 gap-3">
            {d.attributes.map((a, i) => {
              const active = a.key === sel
              return (
                <motion.div key={a.key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.page, delay: i * 0.04 }}>
                  <HoverTiltCard onClick={() => setSel(a.key)} maxTilt={4} lift={4} className="rounded-xl">
                    <div className={`relative overflow-hidden rounded-xl p-4 ring-1 ring-inset transition-colors ${active ? 'bg-hoop/[0.12] ring-hoop/60' : 'panel ring-white/5'}`}>
                      {active && <motion.div layoutId="attr-active" className="absolute left-0 top-0 h-full w-1 bg-hoop" transition={spring.slide} />}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="tag text-[10px]">{ATTR_META[a.key].en}</div>
                          <div className="font-display text-[20px] font-semibold text-chalk">{ATTR_META[a.key].name}</div>
                        </div>
                        <div className={`num text-[40px] font-bold leading-none ${a.value >= 80 ? 'text-champ' : active ? 'text-hoop' : 'text-chalk'}`}>
                          <AnimatedCounter value={a.value} />
                        </div>
                      </div>
                      <XPProgressBar value={a.value} max={99} height={5} color={a.value >= 80 ? 'gold' : 'orange'} showShine={false} className="mt-3" />
                      <div className="mt-2.5 flex items-center justify-between">
                        <SourceTag source={a.source} />
                        <span className="text-[11px] text-silver/50">
                          {a.subs.filter((s) => s.score != null).length}/{a.subs.length} 项已测
                        </span>
                      </div>
                    </div>
                  </HoverTiltCard>
                </motion.div>
              )
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={sel} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={spring.page} className="mt-6">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <div className="tag-orange">STANDARDIZED TESTS</div>
                  <div className="font-display text-[22px] font-semibold text-chalk">{ATTR_META[sel].name} · 子能力与测试</div>
                </div>
                {detail.source === 'estimated' && <div className="text-[12px] text-champ">当前为自评预估：完成任一测试即替换为真实评分</div>}
              </div>
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {SKILL_TESTS.filter((t) => t.attr === sel).map((t) => {
                  const sub = detail.subs.find((s) => s.testId === t.id)!
                  return (
                    <div key={t.id} className="panel flex flex-col rounded-xl p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="tag-orange text-[10px]">{t.sub}</div>
                          <div className="font-display text-[19px] font-semibold text-chalk">{t.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="num text-[34px] font-bold leading-none text-chalk">{sub.score ?? '—'}</div>
                          <div className="tag text-[9px]">{sub.best != null ? `最佳 ${sub.best}` : '未测试'}</div>
                        </div>
                      </div>
                      <p className="mt-2 flex-1 text-[12px] leading-relaxed text-silver/60">{t.protocol}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="mono text-[12px] text-silver/55">{sub.raw != null ? `最近：${sub.raw} ${t.unit} · ${sub.date}` : '暂无记录'}</span>
                        {t.builtIn === 'quiz' ? (
                          <ElasticButton size="sm" icon={<Icon.play width={12} height={12} />} onClick={() => setQuiz(true)}>
                            开始问答
                          </ElasticButton>
                        ) : t.builtIn === 'games' ? (
                          <ElasticButton size="sm" variant="secondary" onClick={() => void runAstTo()}>
                            从实战记录计算
                          </ElasticButton>
                        ) : (
                          <ElasticButton size="sm" icon={<Icon.plus width={13} height={13} />} onClick={() => setEntry(t)}>
                            录入成绩
                          </ElasticButton>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="panel mt-6 rounded-xl p-5">
            <div className="tag-orange mb-3">TEST HISTORY · 测试记录</div>
            {tests.length === 0 ? (
              <div className="text-[13px] text-silver/55">还没有测试记录。选择一个子能力完成第一次标准化测试吧。</div>
            ) : (
              <div className="max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
                {tests.map((t) => {
                  const def = SKILL_TEST_MAP[t.testId]
                  return (
                    <div key={t.id} className="flex items-center gap-4 rounded-md bg-black/25 px-4 py-2 text-[13px]">
                      <span className="w-20 text-silver/60">{relDay(t.date, todayStr())}</span>
                      <span className="flex-1 text-chalk">
                        {def?.name} <span className="text-silver/45">· {ATTR_META[def?.attr ?? 'iq'].name}</span>
                      </span>
                      <span className="mono w-28 text-silver/80">
                        {t.raw} {def?.unit}
                      </span>
                      <span className="num w-10 text-right text-[16px] font-bold text-hoop">{t.score}</span>
                      <motion.button type="button" whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.88 }} transition={spring.press} onClick={() => setDelId(t.id)} className="flex h-7 w-7 items-center justify-center rounded text-silver/50 hover:text-[#ff8b82]" aria-label="删除">
                        <Icon.trash width={14} height={14} />
                      </motion.button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <TestEntryModal def={entry} onClose={() => setEntry(null)} onDone={load} />
      <QuizModal open={quiz} onClose={() => setQuiz(false)} onDone={load} />
      <SpringModal open={delId != null} onClose={() => setDelId(null)} title="删除测试记录？" tag="DELETE" width={420}>
        <p className="text-[14px] text-silver/75">删除后能力评分会按剩余测试记录重新计算。</p>
        <div className="mt-6 flex justify-end gap-3">
          <ElasticButton variant="ghost" onClick={() => setDelId(null)}>
            取消
          </ElasticButton>
          <ElasticButton
            variant="danger"
            onClick={async () => {
              const id = delId!
              setDelId(null)
              await mutate(() => api.tests.remove(id), '测试记录已删除')
              load()
            }}
          >
            确认删除
          </ElasticButton>
        </div>
      </SpringModal>
    </div>
  )
}

function TestEntryModal({ def, onClose, onDone }: { def: SkillTestDef | null; onClose: () => void; onDone: () => void }): JSX.Element {
  const [raw, setRaw] = useState<number | ''>('')
  const [date, setDate] = useState(todayStr())
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setRaw('')
    setDate(todayStr())
    setNotes('')
  }, [def])
  const errors = def && raw !== '' ? validateTestRaw(def.id, Number(raw), date, todayStr()) : []
  const preview = def && raw !== '' && !errors.length ? scoreTest(def.id, Number(raw)) : null
  const submit = async (): Promise<void> => {
    if (!def || raw === '' || errors.length) return
    setBusy(true)
    const r = await mutate(() => api.tests.submit({ testId: def.id, raw: Number(raw), date, notes }))
    setBusy(false)
    if (r) {
      onClose()
      onDone()
    }
  }
  return (
    <SpringModal open={!!def} onClose={onClose} title={def?.name} tag={def ? `${ATTR_META[def.attr].en} · ${def.sub}` : ''} width={520}>
      {def && (
        <div className="space-y-5">
          <div className="rounded-lg bg-black/30 p-4 text-[13px] leading-relaxed text-silver/75">{def.protocol}</div>
          <div className="grid grid-cols-2 gap-4">
            <Field label={def.inputLabel} hint={`${def.range.min}–${def.range.max}`}>
              <NumberInput value={raw} min={def.range.min} max={def.range.max} step={def.range.step} onChange={setRaw} className="text-[20px]" />
            </Field>
            <Field label="测试日期">
              <input type="date" className="field mono" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <Field label="备注" hint="可选">
            <input className="field" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="flex items-center justify-between rounded-lg bg-hoop/10 px-5 py-4 ring-1 ring-inset ring-hoop/25">
            <span className="text-[13px] text-silver/80">{def.better === 'lower' ? '用时越短评分越高' : '成绩越高评分越高'} · 预计评分</span>
            <span className="num text-[40px] font-bold leading-none text-hoop">{preview ?? '—'}</span>
          </div>
          {errors.length > 0 && <div className="text-[13px] text-[#ff9c94]">{errors.join('；')}</div>}
          <ElasticButton size="lg" block loading={busy} disabled={raw === '' || errors.length > 0} onClick={() => void submit()}>
            提交测试成绩
          </ElasticButton>
        </div>
      )}
    </SpringModal>
  )
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function QuizModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }): JSX.Element {
  const questions = useMemo(() => (open ? shuffle(IQ_QUESTIONS).slice(0, QUIZ_LENGTH).map((q) => ({ q: q.q, options: shuffle(q.options) })) : []), [open])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (open) {
      setIdx(0)
      setAnswers([])
    }
  }, [open])
  const cur = questions[idx]
  const choose = (opt: string): void => {
    const next = [...answers]
    next[idx] = opt
    setAnswers(next)
    if (idx < questions.length - 1) setTimeout(() => setIdx((i) => i + 1), 220)
  }
  const submit = async (): Promise<void> => {
    setBusy(true)
    const r = await mutate(() => api.tests.submitQuiz(questions.map((q, i) => ({ question: q.q, chosen: answers[i] }))))
    setBusy(false)
    if (r) {
      useApp.getState().toast({ tone: 'success', title: `问答完成：答对 ${r.raw}/${QUIZ_LENGTH}`, detail: `战术理解评分 ${r.score}` })
      onClose()
      onDone()
    }
  }
  return (
    <SpringModal open={open} onClose={onClose} title="战术情境问答" tag={`BASKETBALL IQ · ${idx + 1}/${QUIZ_LENGTH}`} width={640}>
      {cur && (
        <div>
          <div className="mb-5 flex gap-1">
            {questions.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${answers[i] ? 'bg-hoop' : i === idx ? 'bg-white/40' : 'bg-white/10'}`} />
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={idx} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={spring.page}>
              <p className="text-[17px] font-semibold leading-relaxed text-chalk">{cur.q}</p>
              <div className="mt-5 space-y-2.5">
                {cur.options.map((o, i) => {
                  const picked = answers[idx] === o
                  return (
                    <motion.button
                      key={o}
                      type="button"
                      onClick={() => choose(o)}
                      whileHover={{ x: 6 }}
                      whileTap={{ scale: 0.97 }}
                      transition={spring.press}
                      className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-[14px] transition-colors ${picked ? 'border-hoop bg-hoop/15 text-chalk' : 'border-white/10 bg-white/[0.03] text-silver/85 hover:border-white/25'}`}
                    >
                      <span className={`num flex h-7 w-7 shrink-0 items-center justify-center rounded text-[13px] font-bold ${picked ? 'bg-hoop text-white' : 'bg-white/5 text-silver/60'}`}>{'ABCD'[i]}</span>
                      {o}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="mt-6 flex items-center justify-between">
            <ElasticButton variant="ghost" size="sm" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
              上一题
            </ElasticButton>
            {answers.filter(Boolean).length === QUIZ_LENGTH ? (
              <ElasticButton loading={busy} onClick={() => void submit()}>
                提交并评分
              </ElasticButton>
            ) : (
              <ElasticButton variant="secondary" size="sm" disabled={!answers[idx] || idx === QUIZ_LENGTH - 1} onClick={() => setIdx(idx + 1)}>
                下一题
              </ElasticButton>
            )}
          </div>
          <p className="mt-4 text-[12px] text-silver/45">答案在主进程校验评分，结果计入「球商 · 战术理解」。</p>
        </div>
      )}
    </SpringModal>
  )
}
