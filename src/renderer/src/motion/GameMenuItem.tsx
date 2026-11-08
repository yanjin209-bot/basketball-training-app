import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { spring } from './springs'

interface Props {
  active: boolean
  icon: ReactNode
  label: string
  sub: string
  onClick: () => void
  badge?: number
}

/** 游戏式菜单项：激活背景与橙色指示条通过 layoutId 在菜单间弹性滑动 */
export function GameMenuItem({ active, icon, label, sub, onClick, badge }: Props): JSX.Element {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap="press"
      variants={{ rest: { scale: 1 }, hover: { scale: 1 }, press: { scale: 0.97 } }}
      transition={spring.press}
      className="group relative flex h-[54px] w-full items-center gap-3.5 overflow-hidden rounded-lg pl-5 pr-3 text-left"
      aria-current={active ? 'page' : undefined}
    >
      {/* 悬停高光：从左侧滑入 */}
      <motion.span
        aria-hidden
        className="absolute inset-0 origin-left rounded-lg bg-gradient-to-r from-white/[0.07] via-white/[0.03] to-transparent"
        variants={{ rest: { opacity: 0, scaleX: 0.6 }, hover: { opacity: active ? 0 : 1, scaleX: 1 } }}
        transition={spring.hover}
      />
      {active && (
        <>
          <motion.span
            layoutId="menu-active-bg"
            className="absolute inset-0 rounded-lg bg-gradient-to-r from-hoop/25 via-hoop/[0.08] to-transparent ring-1 ring-inset ring-hoop/25"
            transition={spring.slide}
          />
          <motion.span
            layoutId="menu-active-bar"
            className="absolute left-0 top-2 bottom-2 w-[4px] rounded-r-full bg-hoop shadow-[0_0_16px_2px_rgba(255,107,32,0.75)]"
            transition={{ ...spring.slide, stiffness: 560, damping: 28 }}
          />
        </>
      )}
      <motion.span
        className={`relative flex h-6 w-6 shrink-0 items-center justify-center ${active ? 'text-hoop' : 'text-silver/70 group-hover:text-chalk'}`}
        variants={{ rest: { x: 0 }, hover: { x: 3 }, press: { x: 1 } }}
        transition={spring.hover}
      >
        {icon}
      </motion.span>
      <motion.span className="relative flex min-w-0 flex-col leading-none" variants={{ rest: { x: 0 }, hover: { x: 4 }, press: { x: 2 } }} transition={spring.hover}>
        <span className={`font-label text-[15px] font-bold tracking-[0.12em] transition-colors duration-200 ${active ? 'text-chalk' : 'text-silver/80 group-hover:text-chalk'}`}>{label}</span>
        <span className={`mt-1 text-[11px] transition-colors duration-200 ${active ? 'text-hoop/90' : 'text-silver/45 group-hover:text-silver/70'}`}>{sub}</span>
      </motion.span>
      {!!badge && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={spring.pop}
          className="relative ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-hoop px-1.5 font-mono text-[10px] font-bold text-white"
        >
          {badge}
        </motion.span>
      )}
    </motion.button>
  )
}
