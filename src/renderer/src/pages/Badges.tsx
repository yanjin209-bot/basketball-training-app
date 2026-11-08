import { motion } from 'motion/react'
import { useState } from 'react'
import { BADGE_MAP, TIER_META } from '@shared/config/badges'
import type { BadgeProgress } from '@shared/types'
import { BadgeEmblem } from '../art/BadgeEmblem'
import { PageHeader } from '../components/ui'
import { AnimatedTab, HoverTiltCard, SpringModal, XPProgressBar, spring } from '../motion'
import { useApp } from '../store/app'

type Filter = 'all' | 'unlocked' | 'locked'

export function Badges(): JSX.Element {
  const badges = useApp((s) => s.dashboard?.badges ?? [])
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<BadgeProgress | null>(null)
  const unlockedCount = badges.filter((b) => b.tier > 0).length
  const list = badges.filter((b) => (filter === 'all' ? true : filter === 'unlocked' ? b.tier > 0 : b.tier === 0))
  const tierTotals = [1, 2, 3, 4].map((t) => badges.filter((b) => b.tier >= t).length)

  return (
    <div className="px-10 pb-10 pt-4">
      <PageHeader
        tag="BADGE COLLECTION"
        title="徽章收藏"
        sub="徽章全部由真实训练与测试记录自动解锁，无法通过点击获得。删除记录后不再满足条件的等级会被收回。"
        right={
          <AnimatedTab<Filter>
            tabs={[
              { id: 'all', label: '全部', count: badges.length },
              { id: 'unlocked', label: '已解锁', count: unlockedCount },
              { id: 'locked', label: '未解锁', count: badges.length - unlockedCount }
            ]}
            value={filter}
            onChange={setFilter}
          />
        }
      />
      <div className="mb-6 grid grid-cols-4 gap-3">
        {TIER_META.map((t, i) => (
          <div key={t.tier} className="panel flex items-center justify-between rounded-xl px-5 py-3">
            <div>
              <div className="tag text-[10px]" style={{ color: t.color }}>
                {t.en}
              </div>
              <div className="font-display text-[18px] font-semibold text-chalk">{t.name}级</div>
            </div>
            <div className="num text-[34px] font-bold" style={{ color: t.color }}>
              {tierTotals[i]}
            </div>
          </div>
        ))}
      </div>
      <motion.div layout className="badge-list grid grid-cols-3 gap-4">
        {list.map((b, i) => {
          const def = BADGE_MAP[b.badgeId]
          const meta = b.tier > 0 ? TIER_META[b.tier - 1] : null
          const prevT = b.tier > 0 ? def.tiers[b.tier - 1] : 0
          return (
            <motion.div key={b.badgeId} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.page, delay: i * 0.035 }}>
              <HoverTiltCard onClick={() => setOpen(b)} className="rounded-xl" maxTilt={6}>
                <div className={`panel relative flex h-[200px] gap-5 overflow-hidden rounded-xl p-5 ${b.tier === 0 ? 'opacity-75' : ''}`}>
                  {meta && <div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full" style={{ background: `radial-gradient(circle, ${meta.glow}, transparent 70%)`, opacity: 0.35 }} />}
                  <motion.div className="relative shrink-0 self-center" whileHover={{ rotate: [0, -8, 6, 0], scale: 1.06 }} transition={{ duration: 0.6 }}>
                    <BadgeEmblem badgeId={b.badgeId} tier={b.tier} size={110} />
                  </motion.div>
                  <div className="relative flex min-w-0 flex-1 flex-col">
                    <div className="tag text-[10px]" style={meta ? { color: meta.color } : undefined}>
                      {meta ? `${meta.en} · ${meta.name}级` : 'LOCKED · 未解锁'}
                    </div>
                    <div className="font-display text-[22px] font-semibold text-chalk">{def.name}</div>
                    <div className="tag text-[9px]">{def.en}</div>
                    <p className="mt-2 text-[12px] text-silver/60">{def.description}</p>
                    <div className="mt-auto">
                      {b.nextThreshold != null ? (
                        <>
                          <div className="mb-1 flex justify-between text-[11px]">
                            <span className="text-silver/55">下一级：{TIER_META[b.tier].name}</span>
                            <span className="mono text-chalk">
                              {Math.floor(b.value)}/{b.nextThreshold} {def.unit}
                            </span>
                          </div>
                          <XPProgressBar value={Math.max(0, b.value - prevT)} max={b.nextThreshold - prevT} height={5} color={b.tier >= 2 ? 'gold' : 'orange'} showShine={false} />
                        </>
                      ) : (
                        <div className="text-[12px] font-semibold text-hoop">已达到传奇等级</div>
                      )}
                    </div>
                  </div>
                </div>
              </HoverTiltCard>
            </motion.div>
          )
        })}
      </motion.div>
      {list.length === 0 && <div className="py-16 text-center text-[14px] text-silver/50">{filter === 'unlocked' ? '还没有解锁的徽章，完成训练就会自动解锁。' : '全部徽章都已解锁！'}</div>}

      <SpringModal open={!!open} onClose={() => setOpen(null)} width={620} tag="BADGE DETAIL" title={open ? BADGE_MAP[open.badgeId].name : ''}>
        {open && (
          <div className="grid grid-cols-[200px_1fr] gap-7">
            <div className="flex items-center justify-center">
              <HoverTiltCard maxTilt={14} glare={false}>
                <BadgeEmblem badgeId={open.badgeId} tier={open.tier} size={190} />
              </HoverTiltCard>
            </div>
            <div>
              <p className="text-[14px] text-silver/75">{BADGE_MAP[open.badgeId].description}</p>
              <div className="mt-1 text-[13px] text-silver/55">
                当前：<span className="mono text-chalk">{Math.floor(open.value)}</span> {BADGE_MAP[open.badgeId].unit}
              </div>
              <div className="mt-5 space-y-2">
                {BADGE_MAP[open.badgeId].tiers.map((th, i) => {
                  const t = TIER_META[i]
                  const got = open.tier > i
                  return (
                    <div key={i} className={`flex items-center justify-between rounded-lg px-4 py-2.5 ring-1 ring-inset ${got ? 'bg-white/[0.05]' : 'bg-black/25 ring-white/5'}`} style={got ? { boxShadow: `inset 0 0 0 1px ${t.color}55` } : undefined}>
                      <span className="flex items-center gap-3">
                        <BadgeEmblem badgeId={open.badgeId} tier={got ? i + 1 : 0} size={30} />
                        <span className="text-[14px]" style={{ color: got ? t.color : undefined }}>
                          {t.name}级
                        </span>
                      </span>
                      <span className="mono text-[13px] text-silver/80">
                        ≥ {th} {BADGE_MAP[open.badgeId].unit}
                      </span>
                      <span className="w-24 text-right text-[11px] text-silver/50">{open.unlockedAt[i + 1]?.slice(0, 10) ?? (got ? '' : '未达成')}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </SpringModal>
    </div>
  )
}
