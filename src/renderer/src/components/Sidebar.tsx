import { LayoutGroup, motion } from 'motion/react'
import { useApp, type PageId } from '../store/app'
import { GameMenuItem, XPProgressBar, spring } from '../motion'
import { Icon } from '../art/icons'
import { Logo } from '../art/Logo'

export const MENU: Array<{ id: PageId; label: string; sub: string; icon: (p?: object) => JSX.Element }> = [
  { id: 'career', label: 'MY CAREER', sub: '生涯大厅', icon: Icon.career },
  { id: 'player', label: 'MY PLAYER', sub: '我的球员', icon: Icon.player },
  { id: 'training', label: 'TRAINING', sub: '训练中心', icon: Icon.training },
  { id: 'attributes', label: 'ATTRIBUTES', sub: '能力属性', icon: Icon.attributes },
  { id: 'badges', label: 'BADGES', sub: '徽章收藏', icon: Icon.badges },
  { id: 'stats', label: 'STATS', sub: '生涯数据', icon: Icon.stats },
  { id: 'coach', label: 'AI COACH', sub: 'AI 私人教练', icon: Icon.coach },
  { id: 'settings', label: 'SETTINGS', sub: '设置', icon: Icon.settings }
]

export function Sidebar(): JSX.Element {
  const page = useApp((s) => s.page)
  const go = useApp((s) => s.go)
  const d = useApp((s) => s.dashboard)
  const claimable = d?.quests.filter((q) => q.status === 'completed').length ?? 0
  return (
    <aside className="relative z-10 flex w-[252px] shrink-0 flex-col border-r border-white/[0.06] bg-gradient-to-b from-black/55 via-black/40 to-black/60 backdrop-blur-xl">
      <div className="drag h-10 shrink-0" />
      <div className="px-6 pb-6">
        <Logo />
      </div>
      <LayoutGroup id="sidebar">
        <nav className="flex flex-col gap-1 px-3">
          {MENU.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring.page, delay: 0.04 * i }}>
              <GameMenuItem active={page === m.id} icon={m.icon()} label={m.label} sub={m.sub} onClick={() => go(m.id)} badge={m.id === 'career' ? claimable : undefined} />
            </motion.div>
          ))}
        </nav>
      </LayoutGroup>
      <div className="mt-auto p-4">
        {d && (
          <motion.button
            type="button"
            onClick={() => go('player')}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={spring.press}
            className="panel flex w-full items-center gap-3 rounded-lg p-3 text-left"
          >
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-hoop to-hoop-deep">
              {d.player.avatar ? <img src={d.player.avatar} alt="" className="h-full w-full object-cover" /> : <span className="num text-[18px] font-bold text-white">{d.player.jersey}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between">
                <span className="truncate font-display text-[14px] font-semibold uppercase text-chalk">{d.player.nickname}</span>
                <span className="num text-[12px] text-hoop">LV{d.career.level}</span>
              </div>
              <XPProgressBar value={d.career.xpIntoLevel} max={d.career.xpForLevel} level={d.career.level} height={4} className="mt-1.5" showShine={false} />
              <div className="mt-1 text-[10px] text-silver/50">{d.career.title}</div>
            </div>
          </motion.button>
        )}
      </div>
    </aside>
  )
}
