import { motion } from 'motion/react'
import { ATTR_KEYS, ATTR_META, PLAY_STYLES } from '@shared/config/career'
import type { AttrMap, Player } from '@shared/types'
import { PlayerArt } from '../art/PlayerArt'
import { BadgeEmblem } from '../art/BadgeEmblem'
import { HoverTiltCard } from './HoverTiltCard'
import { spring } from './springs'

interface Props {
  player: Player
  ovr: number
  level: number
  attrs: AttrMap
  estimated?: boolean
  seasonName?: string
  badges?: Array<{ badgeId: string; tier: number }>
  width?: number
  layoutId?: string
  onClick?: () => void
  label?: string
}

/** 原创收藏级球员卡：金属边框 + 立绘 + OVR，悬停 3D 倾斜，OVR 轻微弹动 */
export function AnimatedPlayerCard({ player, ovr, level, attrs, estimated, seasonName, badges = [], width = 300, layoutId, onClick, label }: Props): JSX.Element {
  const style = PLAY_STYLES.find((s) => s.id === player.style)
  const tierColor = ovr >= 85 ? '#F2C46D' : ovr >= 70 ? '#FF6B20' : ovr >= 55 ? '#BBC3CF' : '#C9824B'
  const h = width * 1.42
  return (
    <HoverTiltCard onClick={onClick} layoutId={layoutId} className="rounded-[18px]" style={{ width, height: h }} maxTilt={7}>
      <motion.div initial="rest" whileHover="hover" animate="rest" className="relative h-full w-full overflow-hidden rounded-[18px] p-[2px]" style={{ background: `linear-gradient(150deg, ${tierColor} 0%, #2a2f38 30%, #11141a 60%, ${tierColor}aa 100%)` }}>
        <div className="relative h-full w-full overflow-hidden rounded-[16px] bg-[linear-gradient(170deg,#20252e_0%,#12151b_55%,#0b0d11_100%)]">
          {/* 背景图形 */}
          <div className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(circle at 50% 30%, ${tierColor}33, transparent 60%)` }} />
          <svg aria-hidden className="absolute inset-0 h-full w-full opacity-[0.07]" viewBox="0 0 100 142" preserveAspectRatio="none">
            <path d="M-10 40 L110 10 M-10 70 L110 40 M-10 100 L110 70 M-10 130 L110 100" stroke="#fff" strokeWidth="0.6" />
          </svg>
          <div className="num outline-text absolute -right-3 top-6 select-none text-[150px] font-bold leading-none" style={{ fontSize: width * 0.55 }}>
            {player.jersey}
          </div>

          {/* 立绘 */}
          <motion.div className="absolute inset-x-0 bottom-[22%] top-[9%] flex justify-center" variants={{ rest: { scale: 1, y: 0 }, hover: { scale: 1.04, y: -4 } }} transition={spring.hover}>
            <PlayerArt jersey={player.jersey} className="h-full drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]" mirrored={player.hand === 'left'} />
          </motion.div>
          {/* 轮廓光变化 */}
          <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 45% at 50% 40%, ${tierColor}2e, transparent 70%)` }} variants={{ rest: { opacity: 0.3 }, hover: { opacity: 1 } }} transition={{ duration: 0.3 }} />

          {/* OVR */}
          <div className="absolute left-4 top-4 flex flex-col items-center">
            <motion.div className="num font-bold leading-none" style={{ color: tierColor, fontSize: width * 0.2, textShadow: `0 0 24px ${tierColor}66` }} variants={{ rest: { scale: 1 }, hover: { scale: 1.12 } }} transition={spring.pop}>
              {ovr}
            </motion.div>
            <div className="tag mt-1 text-[10px]">{estimated ? 'OVR · 预估' : 'OVR'}</div>
            <div className="mt-2 font-display text-[18px] font-semibold text-chalk">{player.position}</div>
          </div>
          <div className="absolute right-4 top-4 text-right">
            <div className="tag text-[10px]">LV</div>
            <div className="num text-[22px] font-bold leading-none text-chalk">{level}</div>
          </div>
          {label && <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/50 px-3 py-0.5 tag text-[9px]">{label}</div>}

          {/* 底部信息 */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/90 to-transparent px-4 pb-3.5 pt-10">
            <div className="flex items-end justify-between">
              <div className="min-w-0">
                <div className="truncate font-display text-[22px] font-bold uppercase leading-none tracking-wide text-chalk">{player.nickname}</div>
                <div className="mt-1 text-[11px] text-silver/70">
                  #{player.jersey} · {style?.name}
                  {seasonName ? ` · ${seasonName}` : ''}
                </div>
              </div>
              <div className="flex -space-x-2">
                {badges.slice(0, 3).map((b) => (
                  <BadgeEmblem key={b.badgeId} badgeId={b.badgeId} tier={b.tier} size={26} />
                ))}
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-6 gap-1">
              {ATTR_KEYS.map((k) => (
                <div key={k} className="rounded bg-white/[0.04] py-1 text-center">
                  <div className="num text-[14px] font-bold leading-none text-chalk">{attrs[k]}</div>
                  <div className="mt-0.5 font-label text-[9px] font-bold tracking-wider text-silver/55">{ATTR_META[k].short}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </HoverTiltCard>
  )
}
