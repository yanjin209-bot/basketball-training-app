import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ATTR_KEYS, ATTR_META } from '@shared/config/career'
import { DRILL_MAP } from '@shared/config/drills'
import { todayStr } from '@shared/logic/dates'
import { attrMapOf } from '@shared/logic/skills'
import { validateGame } from '@shared/logic/validation'
import type { GameLog, GameLogInput, StatsBundle } from '@shared/types'
import { Icon } from '../art/icons'
import { AttributeRadar } from '../components/AttributeRadar'
import { Chips, EmptyState, Field, NumberInput, PageHeader, StatTile } from '../components/ui'
import { api } from '../lib/api'
import { errMsg, fmtMinutes } from '../lib/format'
import { AnimatedCounter, AnimatedTab, ElasticButton, SpringModal, spring } from '../motion'
import { mutate, useApp } from '../store/app'

type Tab = 'overview' | 'shooting' | 'growth' | 'games' | 'records'

const axis = { stroke: 'rgba(187,195,207,0.35)', fontSize: 11, tickLine: false, axisLine: false }
const tooltipStyle = { contentStyle: { background: '#171A20', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }, labelStyle: { color: '#BBC3CF' }, cursor: { fill: 'rgba(255,107,32,0.08)' } }

export function Stats(): JSX.Element {
  const [tab, setTab] = useState<Tab>('overview')
  const [data, setData] = useState<StatsBundle | null>(null)
  const [gameModal, setGameModal] = useState<GameLog | 'new' | null>(null)
  const consumeIntent = useApp((s) => s.consumeIntent)
  const toast = useApp((s) => s.toast)
  const dash = useApp((s) => s.dashboard)
  const load = (): void => {
    api
      .stats()
      .then(setData)
      .catch((e) => toast({ tone: 'error', title: '数据加载失败', detail: errMsg(e) }))
  }
  useEffect(() => {
    load()
    if (consumeIntent() === 'game') {
      setTab('games')
      setGameModal('new')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="px-10 pb-10 pt-4">
      <PageHeader
        tag="CAREER STATS"
        title="生涯数据"
        sub="所有图表都来自本地真实记录。"
        right={
          <AnimatedTab<Tab>
            tabs={[
              { id: 'overview', label: '总览' },
              { id: 'shooting', label: '投篮' },
              { id: 'growth', label: '能力成长' },
              { id: 'games', label: '实战' },
              { id: 'records', label: '纪录' }
            ]}
            value={tab}
            onChange={setTab}
          />
        }
      />
      {!data ? (
        <div className="h-60" />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={spring.page}>
            {tab === 'overview' && <Overview s={data} />}
            {tab === 'shooting' && <Shooting s={data} />}
            {tab === 'growth' && <Growth s={data} current={dash ? attrMapOf(dash.attributes) : null} ovr={dash?.ovr ?? 0} />}
            {tab === 'games' && <Games s={data} onAdd={() => setGameModal('new')} onEdit={(g) => setGameModal(g)} reload={load} />}
            {tab === 'records' && <Records s={data} />}
          </motion.div>
        </AnimatePresence>
      )}
      <GameModal
        value={gameModal}
        onClose={() => setGameModal(null)}
        onSaved={() => {
          setGameModal(null)
          load()
        }}
      />
    </div>
  )
}

function Overview({ s }: { s: StatsBundle }): JSX.Element {
  const go = useApp((x) => x.go)
  if (s.totals.sessions === 0)
    return <EmptyState icon={<Icon.stats width={36} height={36} />} title="生涯数据从第一次训练开始" text="完成训练后，这里会出现训练日历、每周趋势、月度统计和命中率曲线。" action={<ElasticButton onClick={() => go('training')}>开始第一次训练</ElasticButton>} />
  const max = Math.max(1, ...s.calendar.map((c) => c.minutes))
  const weeks: Array<typeof s.calendar> = []
  for (let i = 0; i < s.calendar.length; i += 7) weeks.push(s.calendar.slice(i, i + 7))
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-3">
        <StatTile label="训练次数" value={<AnimatedCounter value={s.totals.sessions} />} />
        <StatTile label="累计时长" value={<AnimatedCounter value={Math.round(s.totals.minutes / 6) / 10} decimals={1} suffix="h" />} sub={fmtMinutes(s.totals.minutes)} />
        <StatTile label="累计出手" value={<AnimatedCounter value={s.totals.attempts} />} />
        <StatTile label="累计命中" value={<AnimatedCounter value={s.totals.makes} />} accent sub={s.totals.attempts ? `总命中率 ${((s.totals.makes / s.totals.attempts) * 100).toFixed(1)}%` : undefined} />
        <StatTile label="实战场次" value={<AnimatedCounter value={s.totals.games} />} />
      </div>

      <div className="panel rounded-xl p-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="tag-orange">TRAINING CALENDAR</div>
            <div className="font-display text-[20px] font-semibold text-chalk">训练日历 · 近 18 周</div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-silver/50">
            少
            {[0.08, 0.3, 0.55, 0.8, 1].map((o) => (
              <span key={o} className="h-3 w-3 rounded-[3px]" style={{ background: `rgba(255,107,32,${o})` }} />
            ))}
            多
          </div>
        </div>
        <div className="flex gap-[5px]">
          <div className="mr-1 flex flex-col gap-[5px] pt-0 text-[10px] text-silver/40">
            {['一', '', '三', '', '五', '', '日'].map((l, i) => (
              <span key={i} className="h-[15px] leading-[15px]">
                {l}
              </span>
            ))}
          </div>
          {weeks.map((w, wi) => (
            <div key={wi} className="flex flex-col gap-[5px]">
              {w.map((c, ci) => (
                <motion.div
                  key={c.date}
                  title={`${c.date} · ${c.minutes} 分钟 · ${c.sessions} 次`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...spring.pop, delay: wi * 0.012 + ci * 0.004 }}
                  whileHover={{ scale: 1.35 }}
                  className="h-[15px] w-[15px] rounded-[3px]"
                  style={{ background: c.minutes ? `rgba(255,107,32,${0.25 + 0.75 * (c.minutes / max)})` : 'rgba(255,255,255,0.05)' }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="panel rounded-xl p-6">
          <div className="tag-orange">WEEKLY TREND</div>
          <div className="mb-3 font-display text-[18px] font-semibold text-chalk">每周训练时长（分钟）</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={s.weekly}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="week" {...axis} />
              <YAxis {...axis} width={34} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="minutes" name="分钟" fill="#FF6B20" radius={[4, 4, 0, 0]} animationDuration={700} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="panel rounded-xl p-6">
          <div className="tag-orange">MONTHLY</div>
          <div className="mb-3 font-display text-[18px] font-semibold text-chalk">每月训练统计</div>
          <div className="space-y-1.5">
            <div className="grid grid-cols-5 px-3 tag text-[10px]">
              <span>月份</span>
              <span>次数</span>
              <span>时长</span>
              <span>出手</span>
              <span>命中率</span>
            </div>
            {s.monthly.map((m) => (
              <div key={m.month} className="grid grid-cols-5 rounded bg-black/25 px-3 py-2 text-[13px]">
                <span className="text-silver/75">{m.month}</span>
                <span className="mono text-chalk">{m.sessions}</span>
                <span className="mono text-chalk">{m.minutes}′</span>
                <span className="mono text-chalk">{m.attempts}</span>
                <span className="mono text-hoop">{m.attempts ? `${((m.makes / m.attempts) * 100).toFixed(1)}%` : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Shooting({ s }: { s: StatsBundle }): JSX.Element {
  const drills = [...new Set(s.accuracyTrend.map((a) => a.drillId))]
  const [drill, setDrill] = useState<string>('all')
  const list = s.accuracyTrend.filter((a) => drill === 'all' || a.drillId === drill).map((a, i) => ({ ...a, n: i + 1, label: a.date.slice(5) }))
  if (s.accuracyTrend.length === 0) return <EmptyState icon={<Icon.training width={36} height={36} />} title="还没有投篮数据" text="记录至少 10 次出手的投篮训练（定点、罚球、三分）后，这里会显示命中率趋势。" />
  const avg = list.length ? list.reduce((a, x) => a + x.accuracy, 0) / list.length : 0
  return (
    <div className="panel rounded-xl p-6">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="tag-orange">ACCURACY TREND</div>
          <div className="font-display text-[20px] font-semibold text-chalk">投篮命中率趋势</div>
        </div>
        <Chips size="sm" options={[{ id: 'all', label: '全部' }, ...drills.map((d) => ({ id: d, label: DRILL_MAP[d].name }))]} value={drill} onChange={setDrill} />
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={list}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis {...axis} domain={[0, 100]} width={34} unit="%" />
          <Tooltip {...tooltipStyle} formatter={(v: number, _n, p) => [`${v}%（${p.payload.attempts} 次出手）`, DRILL_MAP[p.payload.drillId as string]?.name ?? '']} />
          <Line type="monotone" dataKey="accuracy" stroke="#FF6B20" strokeWidth={2.5} dot={{ r: 3, fill: '#FF6B20', strokeWidth: 0 }} activeDot={{ r: 6 }} animationDuration={800} />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-3 text-[13px] text-silver/60">
        区间平均命中率 <span className="mono text-chalk">{avg.toFixed(1)}%</span> · 共 {list.length} 次训练
      </div>
    </div>
  )
}

function Growth({ s, current, ovr }: { s: StatsBundle; current: ReturnType<typeof attrMapOf> | null; ovr: number }): JSX.Element {
  const first = s.snapshots[0]
  const data = s.snapshots.map((x) => ({ date: x.takenAt.slice(5, 10), OVR: x.ovr, ...Object.fromEntries(ATTR_KEYS.map((k) => [ATTR_META[k].name, x.attributes[k]])) }))
  const colors = ['#FF6B20', '#F2C46D', '#45DDA0', '#7FB2FF', '#C792EA', '#BBC3CF']
  return (
    <div className="grid grid-cols-[420px_1fr] gap-6">
      <div className="panel rounded-xl p-6">
        <div className="tag-orange">RADAR</div>
        <div className="font-display text-[18px] font-semibold text-chalk">当前 vs 初始</div>
        {current && <AttributeRadar attrs={current} compare={first?.attributes} height={300} />}
        <div className="flex justify-center gap-5 text-[12px] text-silver/60">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded bg-hoop" />
            当前 OVR {ovr}
          </span>
          {first && (
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 border-t-2 border-dashed border-silver" />
              初始 OVR {first.ovr}
            </span>
          )}
        </div>
      </div>
      <div className="panel rounded-xl p-6">
        <div className="tag-orange">ATTRIBUTE HISTORY</div>
        <div className="mb-3 font-display text-[18px] font-semibold text-chalk">六维能力与 OVR 变化</div>
        {data.length < 2 ? (
          <div className="py-16 text-center text-[13px] text-silver/55">完成更多能力测试后，这里会显示能力变化曲线。</div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" {...axis} />
              <YAxis {...axis} domain={[20, 99]} width={30} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="OVR" stroke="#F7F8FA" strokeWidth={3} dot={false} />
              {ATTR_KEYS.map((k, i) => (
                <Line key={k} type="monotone" dataKey={ATTR_META[k].name} stroke={colors[i]} strokeWidth={1.6} dot={false} strokeOpacity={0.85} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function Games({ s, onAdd, onEdit, reload }: { s: StatsBundle; onAdd: () => void; onEdit: (g: GameLog) => void; reload: () => void }): JSX.Element {
  const [del, setDel] = useState<GameLog | null>(null)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {s.gameAverages ? (
          <div className="grid flex-1 grid-cols-6 gap-3 pr-6">
            {(
              [
                ['场均得分', s.gameAverages.points],
                ['篮板', s.gameAverages.rebounds],
                ['助攻', s.gameAverages.assists],
                ['抢断', s.gameAverages.steals],
                ['盖帽', s.gameAverages.blocks],
                ['失误', s.gameAverages.turnovers]
              ] as const
            ).map(([l, v]) => (
              <StatTile key={l} label={l} value={v} accent={l === '场均得分'} />
            ))}
          </div>
        ) : (
          <div className="text-[14px] text-silver/60">手动记录 3V3、5V5 实战数据，助攻失误比可用于球商测试。</div>
        )}
        <ElasticButton size="lg" icon={<Icon.plus width={16} height={16} />} onClick={onAdd}>
          记录比赛
        </ElasticButton>
      </div>
      {s.games.length === 0 ? (
        <EmptyState icon={<Icon.game width={36} height={36} />} title="还没有实战记录" text="打完一场球？记录得分、篮板、助攻、抢断、盖帽和心得，追踪你的实战表现。" />
      ) : (
        <div className="space-y-2.5">
          {s.games.map((g, i) => (
            <motion.div key={g.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring.page, delay: i * 0.03 }} className="panel flex items-center gap-5 rounded-xl px-5 py-4">
              <div className="w-24">
                <div className="mono text-[13px] text-silver/70">{g.date}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="rounded bg-white/10 px-1.5 py-0.5 font-label text-[11px] font-bold tracking-wider text-chalk">{g.mode.toUpperCase()}</span>
                  {g.result && <span className={`font-label text-[12px] font-bold ${g.result === 'W' ? 'text-win' : 'text-[#ff8b82]'}`}>{g.result === 'W' ? '胜' : '负'}</span>}
                </div>
              </div>
              <div className="grid flex-1 grid-cols-6 gap-2">
                {(
                  [
                    ['PTS', g.points],
                    ['REB', g.rebounds],
                    ['AST', g.assists],
                    ['STL', g.steals],
                    ['BLK', g.blocks],
                    ['TOV', g.turnovers]
                  ] as const
                ).map(([l, v]) => (
                  <div key={l} className="text-center">
                    <div className={`num text-[24px] font-bold leading-none ${l === 'PTS' ? 'text-hoop' : 'text-chalk'}`}>{v}</div>
                    <div className="tag mt-1 text-[9px]">{l}</div>
                  </div>
                ))}
              </div>
              <div className="w-[26%] truncate text-[12px] text-silver/60" title={g.notes}>
                {g.notes || '—'}
              </div>
              <div className="flex gap-1">
                <motion.button type="button" whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.88 }} transition={spring.press} onClick={() => onEdit(g)} className="flex h-8 w-8 items-center justify-center rounded text-silver/60 hover:bg-white/5 hover:text-chalk" aria-label="修改">
                  <Icon.edit width={15} height={15} />
                </motion.button>
                <motion.button type="button" whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.88 }} transition={spring.press} onClick={() => setDel(g)} className="flex h-8 w-8 items-center justify-center rounded text-silver/60 hover:bg-white/5 hover:text-[#ff8b82]" aria-label="删除">
                  <Icon.trash width={15} height={15} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      <SpringModal open={!!del} onClose={() => setDel(null)} title="删除比赛记录？" tag="DELETE" width={420}>
        <div className="mt-2 flex justify-end gap-3">
          <ElasticButton variant="ghost" onClick={() => setDel(null)}>
            取消
          </ElasticButton>
          <ElasticButton
            variant="danger"
            onClick={async () => {
              const id = del!.id
              setDel(null)
              await mutate(() => api.games.remove(id), '比赛记录已删除')
              reload()
            }}
          >
            确认删除
          </ElasticButton>
        </div>
      </SpringModal>
    </div>
  )
}

const emptyGame = (): GameLogInput => ({ date: todayStr(), mode: '3v3', points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, result: null, notes: '' })

function GameModal({ value, onClose, onSaved }: { value: GameLog | 'new' | null; onClose: () => void; onSaved: () => void }): JSX.Element {
  const [g, setG] = useState<GameLogInput>(emptyGame)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (value === 'new') setG(emptyGame())
    else if (value) setG({ ...value })
  }, [value])
  const errors = validateGame(g, todayStr())
  const save = async (): Promise<void> => {
    if (errors.length || !value) return
    setBusy(true)
    const r = value === 'new' ? await mutate(() => api.games.add(g), '比赛已记录') : await mutate(() => api.games.update(value.id, g), '比赛已更新')
    setBusy(false)
    if (r) onSaved()
  }
  const stat = (k: keyof GameLogInput, label: string): JSX.Element => (
    <Field label={label}>
      <NumberInput value={g[k] as number} min={0} onChange={(v) => setG({ ...g, [k]: v === '' ? 0 : Math.round(v) })} className="text-center text-[18px]" />
    </Field>
  )
  return (
    <SpringModal open={value != null} onClose={onClose} title={value === 'new' ? '记录实战' : '修改实战记录'} tag="GAME LOG" width={620}>
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <Field label="日期">
            <input type="date" className="field mono" value={g.date} max={todayStr()} onChange={(e) => setG({ ...g, date: e.target.value })} />
          </Field>
          <Field label="模式">
            <Chips options={[{ id: '3v3', label: '3V3' }, { id: '5v5', label: '5V5' }]} value={g.mode} onChange={(mode) => setG({ ...g, mode })} />
          </Field>
          <Field label="结果">
            <Chips options={[{ id: 'W', label: '胜' }, { id: 'L', label: '负' }]} value={g.result} onChange={(result) => setG({ ...g, result: g.result === result ? null : result })} />
          </Field>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {stat('points', '得分')}
          {stat('rebounds', '篮板')}
          {stat('assists', '助攻')}
          {stat('steals', '抢断')}
          {stat('blocks', '盖帽')}
          {stat('turnovers', '失误')}
        </div>
        <Field label="比赛心得" hint="可选">
          <textarea className="field min-h-[80px] resize-none" maxLength={1000} value={g.notes} onChange={(e) => setG({ ...g, notes: e.target.value })} placeholder="哪些回合打得好？下次想改进什么？" />
        </Field>
        {errors.length > 0 && <div className="text-[13px] text-[#ff9c94]">{errors.join('；')}</div>}
        <ElasticButton size="lg" block loading={busy} disabled={errors.length > 0} onClick={() => void save()}>
          保存
        </ElasticButton>
      </div>
    </SpringModal>
  )
}

function Records({ s }: { s: StatsBundle }): JSX.Element {
  if (s.records.length === 0) return <EmptyState icon={<Icon.trophy width={36} height={36} />} title="还没有个人纪录" text="完成训练、测试或实战后，你的个人最高纪录会出现在这里。" />
  return (
    <div className="grid grid-cols-3 gap-4">
      {s.records.map((r, i) => (
        <motion.div key={r.label} initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...spring.pop, delay: i * 0.05 }} className="panel relative overflow-hidden rounded-xl p-5">
          <Icon.trophy width={64} height={64} className="absolute -right-2 -top-2 text-champ/10" />
          <div className="tag text-[10px]">{r.label}</div>
          <div className="num text-gradient-gold mt-2 text-[38px] font-bold leading-none">{r.value}</div>
          <div className="mt-2 text-[12px] text-silver/50">{r.date ?? '生涯'}</div>
        </motion.div>
      ))}
    </div>
  )
}
