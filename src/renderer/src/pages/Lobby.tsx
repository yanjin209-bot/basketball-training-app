import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useRef, useState } from 'react'
import { ATTR_META, PLAY_STYLES, POSITIONS } from '@shared/config/career'
import { DRILL_MAP } from '@shared/config/drills'
import { WEEKDAY_CN, parseDate, todayStr } from '@shared/logic/dates'
import type { Quest } from '@shared/types'
import { BadgeEmblem } from '../art/BadgeEmblem'
import { Icon } from '../art/icons'
import { PlayerArt } from '../art/PlayerArt'
import { SeasonSummaryModal } from '../components/SeasonSummaryModal'
import { SourceTag } from '../components/ui'
import { api } from '../lib/api'
import { relDay } from '../lib/format'
import { AnimatedCounter, ElasticButton, Stagger, StaggerItem, XPProgressBar, spring } from '../motion'
import { mutate, useApp } from '../store/app'

export function Lobby(): JSX.Element {
  const d = useApp((s) => s.dashboard)
  const go = useApp((s) => s.go)
  const [seasonOpen, setSeasonOpen] = useState(false)
  if (!d) return <div />
  const today = todayStr()
  const unlocked = d.badges.filter((b) => b.tier > 0).sort((a, b) => b.tier - a.tier)
  const weekday = WEEKDAY_CN[parseDate(today).getDay()]

  return (
    <div className="flex min-h-full flex-col px-8 pb-6 pt-2">
      {/* 顶部状态条 */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={spring.page} className="mb-4 flex items-center gap-3">
        <motion.button
          type="button"
          onClick={() => setSeasonOpen(true)}
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.96 }}
          transition={spring.press}
          className="flex items-center gap-3 rounded-full border border-hoop/40 bg-hoop/10 py-1.5 pl-2 pr-4"
        >
          <span className="rounded-full bg-hoop px-2.5 py-0.5 font-label text-[12px] font-bold tracking-widest text-white">SEASON</span>
          <span className="font-display text-[15px] font-semibold text-chalk">{d.season.name}</span>
          <span className="mono text-[12px] text-silver/70">DAY {d.season.day}/28</span>
        </motion.button>
        <div className="flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3.5 py-1.5 text-[13px] ring-1 ring-inset ring-white/10">
          <Icon.flame width={15} height={15} className={d.streak > 0 ? 'text-hoop' : 'text-silver/40'} />
          <span className="text-silver/70">连续训练</span>
          <span className="num font-semibold text-chalk">{d.streak}</span>
          <span className="text-silver/70">天</span>
        </div>
        {d.isRecoveryDay && (
          <div className="flex items-center gap-1.5 rounded-full bg-win/10 px-3.5 py-1.5 text-[13px] text-win ring-1 ring-inset ring-win/30">
            <Icon.moon width={15} height={15} /> 今日恢复日 · 降低强度
          </div>
        )}
        <div className="ml-auto text-right">
          <div className="font-display text-[15px] text-chalk">
            {today.replace(/-/g, '.')} <span className="text-silver/60">{weekday}</span>
          </div>
        </div>
      </motion.div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_380px] gap-6">
        <Hero />
        {/* 右侧信息栏 */}
        <Stagger className="flex min-h-0 flex-col gap-4">
          <StaggerItem>
            <div className="panel panel-cut p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="tag-orange">CAREER LEVEL</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="num text-[52px] font-bold leading-none text-chalk">
                      <AnimatedCounter value={d.career.level} />
                    </span>
                    <span className="font-display text-[18px] font-semibold text-hoop">{d.career.title}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="tag text-[10px]">TOTAL XP</div>
                  <div className="num text-[22px] font-bold text-chalk">
                    <AnimatedCounter value={d.career.totalXp} showDelta />
                  </div>
                </div>
              </div>
              <XPProgressBar value={d.career.xpIntoLevel} max={d.career.xpForLevel} level={d.career.level} height={10} className="mt-4" />
              <div className="mt-2 flex justify-between text-[12px]">
                <span className="mono text-silver/70">
                  {d.career.xpIntoLevel} / {d.career.xpForLevel} XP
                </span>
                <span className="text-silver/55">{d.career.nextTitle ? `LV${d.career.nextTitle.level} 晋升「${d.career.nextTitle.title}」` : '已达最高称号'}</span>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-md bg-black/30 px-3 py-2 text-[12px]">
                <span className="text-silver/65">今日训练 XP</span>
                <span className="mono">
                  <span className={d.todayXp >= d.dailyCap ? 'text-champ' : 'text-chalk'}>{d.todayXp}</span>
                  <span className="text-silver/45"> / {d.dailyCap} 上限</span>
                </span>
              </div>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="panel rounded-xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="tag-orange">{d.isRecoveryDay ? 'RECOVERY DAY' : 'DAILY QUESTS'}</div>
                  <div className="font-display text-[18px] font-semibold text-chalk">今日训练任务</div>
                </div>
                <span className="mono text-[12px] text-silver/60">
                  {d.quests.filter((q) => q.status === 'claimed').length}/{d.quests.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {d.quests.map((q, i) => (
                  <QuestRow key={q.id} q={q} index={i} />
                ))}
              </div>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="panel rounded-xl p-5">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <div className="tag-orange">THIS WEEK</div>
                  <div className="font-display text-[18px] font-semibold text-chalk">本周成长趋势</div>
                </div>
                <div className="text-right">
                  <div className="num text-[20px] font-bold text-chalk">{d.week.reduce((a, w) => a + w.minutes, 0)}</div>
                  <div className="tag text-[9px]">MINUTES</div>
                </div>
              </div>
              <WeekBars week={d.week} today={today} />
            </div>
          </StaggerItem>
        </Stagger>
      </div>

      {/* 底部快捷栏 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.page, delay: 0.2 }} className="mt-5 grid grid-cols-[auto_minmax(0,1fr)_minmax(0,0.9fr)] gap-4">
        <div className="career-shortcuts panel flex items-center gap-2.5 rounded-xl p-3">
          <ElasticButton size="lg" icon={<Icon.play width={16} height={16} />} onClick={() => go('training')}>
            开始训练
          </ElasticButton>
          <ElasticButton size="lg" variant="secondary" icon={<Icon.test width={18} height={18} />} onClick={() => go('attributes')}>
            能力测试
          </ElasticButton>
          <ElasticButton size="lg" variant="secondary" icon={<Icon.game width={18} height={18} />} onClick={() => go('stats', 'game')}>
            记录实战
          </ElasticButton>
          <ElasticButton size="lg" variant="secondary" icon={<Icon.coach width={18} height={18} />} onClick={() => go('coach')}>
            AI 教练
          </ElasticButton>
        </div>

        <div className="panel rounded-xl px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="tag-orange">RECENT TRAINING · 最近训练</span>
            <button type="button" className="text-[12px] text-silver/60 hover:text-chalk" onClick={() => go('training', 'history')}>
              全部 →
            </button>
          </div>
          {d.recentSessions.length === 0 ? (
            <div className="py-2 text-[13px] text-silver/55">还没有训练记录。完成第一次真实训练，开启你的成长曲线。</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {d.recentSessions.slice(0, 3).map((s) => (
                <div key={s.id} className="rounded-md bg-black/30 px-3 py-2">
                  <div className="truncate text-[13px] font-semibold text-chalk">{DRILL_MAP[s.drillId]?.name}</div>
                  <div className="mt-0.5 text-[11px] text-silver/55">
                    {relDay(s.date, today)} · {s.durationMin} 分钟
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="num text-[16px] font-bold text-chalk">{s.accuracy != null ? `${s.accuracy}%` : s.reps ? `${s.reps}` : '—'}</span>
                    <span className="mono text-[11px] text-hoop">+{s.xpAwarded} XP</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel flex items-center gap-4 rounded-xl px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="tag-orange">BADGES · 已解锁徽章</span>
              <span className="mono text-[11px] text-silver/50">{unlocked.length}/{d.badges.length}</span>
            </div>
            {unlocked.length === 0 ? (
              <div className="text-[12px] text-silver/55">{d.recentAchievements[0] ? `最近：${d.recentAchievements[0].title}` : '完成训练解锁第一枚徽章'}</div>
            ) : (
              <div className="flex gap-1.5">
                {unlocked.slice(0, 6).map((b, i) => (
                  <motion.div key={b.badgeId} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring.pop, delay: 0.3 + i * 0.05 }} whileHover={{ y: -4, scale: 1.1 }}>
                    <BadgeEmblem badgeId={b.badgeId} tier={b.tier} size={40} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
          <ElasticButton size="sm" variant="ghost" onClick={() => go('badges')}>
            收藏
          </ElasticButton>
        </div>
      </motion.div>

      <SeasonSummaryModal index={d.season.index} open={seasonOpen} onClose={() => setSeasonOpen(false)} />
    </div>
  )
}

/** 中央球员展示：多层视差 + 大号 OVR + 能力条 */
function Hero(): JSX.Element {
  const d = useApp((s) => s.dashboard)!
  const go = useApp((s) => s.go)
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 80, damping: 20 })
  const sy = useSpring(my, { stiffness: 80, damping: 20 })
  const backX = useTransform(sx, (v) => v * -18)
  const backY = useTransform(sy, (v) => v * -10)
  const midX = useTransform(sx, (v) => v * 10)
  const midY = useTransform(sy, (v) => v * 6)
  const frontX = useTransform(sx, (v) => v * 22)
  const style = PLAY_STYLES.find((s) => s.id === d.player.style)!
  const pos = POSITIONS.find((p) => p.id === d.player.position)!
  const onMove = (e: React.PointerEvent): void => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 2)
    my.set(((e.clientY - r.top) / r.height - 0.5) * 2)
  }
  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={() => {
        mx.set(0)
        my.set(0)
      }}
      className="relative min-h-[520px] overflow-hidden rounded-2xl"
    >
      {/* 背景层：巨型号码 + 聚光 */}
      <motion.div style={{ x: backX, y: backY }} className="pointer-events-none absolute inset-0">
        <div className="num outline-text absolute right-[2%] top-[-4%] select-none font-bold leading-none" style={{ fontSize: 'min(46vh, 420px)', WebkitTextStroke: '2px rgba(255,107,32,0.16)' }}>
          {d.player.jersey}
        </div>
        <div className="absolute left-1/2 top-[8%] h-[85%] w-[60%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,107,32,0.22),transparent_62%)]" />
      </motion.div>

      {/* 球员立绘 */}
      <motion.div style={{ x: midX, y: midY }} initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...spring.page, delay: 0.1 }} className="absolute bottom-0 left-[38%] top-[4%] w-[42%] cursor-pointer" onClick={() => go('player')}>
        <PlayerArt jersey={d.player.jersey} className="h-full w-full drop-shadow-[0_30px_50px_rgba(0,0,0,0.7)]" mirrored={d.player.hand === 'left'} />
      </motion.div>

      {/* 前景信息 */}
      <motion.div style={{ x: frontX }} className="relative z-10 flex h-full flex-col p-7">
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring.page, delay: 0.15 }}>
          <div className="flex items-center gap-2">
            <span className="tag-orange">MY PLAYER</span>
            <span className="tag">#{d.player.jersey}</span>
          </div>
          <h1 className="mt-1 max-w-[48%] break-words font-display text-[68px] font-bold uppercase leading-[0.95] tracking-tight text-chalk drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">{d.player.nickname}</h1>
          <div className="mt-2 flex items-center gap-2 text-[14px]">
            <span className="rounded bg-white/10 px-2 py-0.5 font-display font-semibold text-chalk">{d.player.position}</span>
            <span className="text-silver/80">{pos.name}</span>
            <span className="text-silver/30">/</span>
            <span className="text-hoop">{style.name}</span>
          </div>
        </motion.div>

        {/* OVR */}
        <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...spring.pop, delay: 0.3 }} className="mt-8 flex items-end gap-3">
          <div className="relative">
            <svg width="132" height="148" viewBox="0 0 132 148" className="absolute -left-3 -top-3">
              <path d="M66 4 L126 38 L126 110 L66 144 L6 110 L6 38 Z" fill="rgba(9,11,15,0.6)" stroke="rgba(255,107,32,0.6)" strokeWidth="2" />
            </svg>
            <div className="relative flex h-[124px] w-[108px] flex-col items-center justify-center">
              <div className="num text-gradient-orange text-[64px] font-bold leading-none drop-shadow-[0_0_24px_rgba(255,107,32,0.45)]">
                <AnimatedCounter value={d.ovr} />
              </div>
              <div className="tag mt-0.5 text-[11px] text-chalk">OVR</div>
            </div>
          </div>
          {d.ovrEstimated && <div className="mb-3 rounded bg-white/10 px-2 py-1 text-[11px] text-silver/80">含预估数据</div>}
        </motion.div>

        {/* 六维能力 */}
        <div className="mt-auto w-[34%] min-w-[230px] space-y-2">
          {d.attributes.map((a, i) => (
            <motion.div key={a.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring.page, delay: 0.35 + i * 0.05 }} className="flex items-center gap-3">
              <span className="w-10 font-label text-[12px] font-bold tracking-wider text-silver/70">{ATTR_META[a.key].short}</span>
              <div className="flex-1">
                <XPProgressBar value={a.value} max={99} height={5} color={a.value >= 80 ? 'gold' : 'orange'} showShine={false} />
              </div>
              <span className="num w-7 text-right text-[16px] font-bold text-chalk">{a.value}</span>
              {a.source !== 'tested' && (
                <span className="w-12">
                  <SourceTag source={a.source} />
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

function QuestRow({ q, index }: { q: Quest; index: number }): JSX.Element {
  const [busy, setBusy] = useState(false)
  const claim = async (): Promise<void> => {
    setBusy(true)
    await mutate(() => api.quests.claim(q.id))
    setBusy(false)
  }
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring.page, delay: 0.1 + index * 0.06 }} className={`relative overflow-hidden rounded-lg px-3.5 py-3 ring-1 ring-inset ${q.status === 'completed' ? 'bg-champ/[0.07] ring-champ/30' : 'bg-black/25 ring-white/[0.05]'}`}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className={`truncate text-[13px] font-semibold ${q.status === 'claimed' ? 'text-silver/50 line-through' : 'text-chalk'}`}>{q.title}</div>
          <div className="mt-1.5 flex items-center gap-2">
            <XPProgressBar value={q.progress} max={q.target} height={4} color={q.status === 'active' ? 'orange' : 'green'} showShine={false} className="flex-1" />
            <span className="mono text-[11px] text-silver/60">
              {q.progress}/{q.target}
            </span>
          </div>
        </div>
        {q.status === 'completed' ? (
          <ElasticButton size="sm" variant="gold" loading={busy} onClick={() => void claim()}>
            领取 +{q.reward}
          </ElasticButton>
        ) : q.status === 'claimed' ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-win/15 text-win">
            <Icon.check width={16} height={16} />
          </span>
        ) : (
          <span className="mono rounded bg-white/5 px-2 py-1 text-[11px] text-hoop">+{q.reward} XP</span>
        )}
      </div>
    </motion.div>
  )
}

function WeekBars({ week, today }: { week: Array<{ date: string; minutes: number; xp: number }>; today: string }): JSX.Element {
  const max = Math.max(30, ...week.map((w) => w.minutes))
  return (
    <div className="flex h-[96px] items-end gap-2">
      {week.map((w, i) => {
        const isToday = w.date === today
        return (
          <div key={w.date} className="group flex flex-1 flex-col items-center gap-1.5">
            <div className="relative flex h-[70px] w-full items-end justify-center">
              <span className="mono pointer-events-none absolute -top-1 text-[10px] text-silver/0 transition-colors group-hover:text-silver/80">{w.minutes}</span>
              <motion.div
                className={`w-full max-w-[26px] rounded-t-[4px] ${isToday ? 'bg-gradient-to-t from-hoop-deep to-hoop shadow-[0_0_14px_rgba(255,107,32,0.6)]' : w.minutes ? 'bg-gradient-to-t from-white/15 to-white/35' : 'bg-white/[0.06]'}`}
                style={{ height: `${Math.max(6, (w.minutes / max) * 100)}%`, originY: 1 }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ ...spring.fill, delay: 0.2 + i * 0.05 }}
              />
            </div>
            <span className={`font-label text-[11px] font-bold ${isToday ? 'text-hoop' : 'text-silver/50'}`}>{WEEKDAY_CN[parseDate(w.date).getDay()].slice(1)}</span>
          </div>
        )
      })}
    </div>
  )
}
