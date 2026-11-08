import { motion } from 'motion/react'
import { BADGE_MAP, TIER_META } from '@shared/config/badges'
import { BadgeEmblem } from '../art/BadgeEmblem'
import { ElasticButton } from './ElasticButton'
import { spring } from './springs'

/** 徽章解锁：压暗 → 中央弹性放大并短暂旋转 → 金光扫过 → 文字与稀有度分层出现 */
export function BadgeUnlockAnimation({ badgeId, tier, onDone }: { badgeId: string; tier: number; onDone: () => void }): JSX.Element {
  const def = BADGE_MAP[badgeId]
  const meta = TIER_META[tier - 1]
  return (
    <motion.div className="fixed inset-0 z-[90] flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} onClick={onDone}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-[3px]" />
      {/* 旋转光芒 */}
      <motion.div
        aria-hidden
        className="absolute h-[640px] w-[640px] rounded-full opacity-60"
        style={{ background: `conic-gradient(from 0deg, transparent 0 8%, ${meta.glow} 10%, transparent 12% 33%, ${meta.glow} 35%, transparent 37% 58%, ${meta.glow} 60%, transparent 62% 83%, ${meta.glow} 85%, transparent 87%)`, maskImage: 'radial-gradient(circle, black 10%, transparent 65%)' }}
        initial={{ scale: 0.3, rotate: 0, opacity: 0 }}
        animate={{ scale: 1, rotate: 90, opacity: 0.6 }}
        transition={{ scale: spring.pop, opacity: { duration: 0.4 }, rotate: { duration: 8, ease: 'linear' } }}
      />
      <div className="relative flex flex-col items-center text-center" onClick={(e) => e.stopPropagation()}>
        <motion.div
          className="relative overflow-hidden"
          initial={{ scale: 0, rotate: -28 }}
          animate={{ scale: [0, 1.18, 1], rotate: [-28, 8, 0] }}
          transition={{ duration: 0.75, times: [0, 0.6, 1], ease: [0.22, 1.4, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 40px ${meta.glow})` }}
        >
          <BadgeEmblem badgeId={badgeId} tier={tier} size={220} />
          {/* 局部金色光线扫过 */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-1/3"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,240,200,0.75), transparent)', mixBlendMode: 'overlay' }}
            initial={{ x: '-120%', skewX: -20 }}
            animate={{ x: '380%' }}
            transition={{ delay: 0.55, duration: 0.7, ease: 'easeInOut' }}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.page, delay: 0.45 }} className="tag mt-6" style={{ color: meta.color }}>
          BADGE UNLOCKED · {meta.en}
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.page, delay: 0.55 }} className="mt-2 font-display text-[54px] font-bold leading-none tracking-wide text-chalk">
          {def.name}
        </motion.h2>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="mt-2 font-label text-[14px] font-semibold tracking-[0.3em] text-silver/70">
          {def.en}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...spring.pop, delay: 0.75 }}
          className="mt-5 rounded-full px-5 py-1.5 font-label text-[14px] font-bold tracking-[0.25em]"
          style={{ background: `${meta.color}22`, color: meta.color, boxShadow: `inset 0 0 0 1px ${meta.color}66` }}
        >
          {meta.name}级 · 稀有度 {tier}/4
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }} className="mt-4 max-w-sm text-[14px] text-silver/75">
          {def.description}达到 {def.tiers[tier - 1]} {def.unit}
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.page, delay: 0.95 }} className="mt-8">
          <ElasticButton variant={tier >= 3 ? 'gold' : 'primary'} size="lg" onClick={onDone} autoFocus>
            点击继续
          </ElasticButton>
        </motion.div>
      </div>
    </motion.div>
  )
}
