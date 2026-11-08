import { LayoutGroup, motion } from 'motion/react'
import { useId } from 'react'
import { spring } from './springs'

interface Props<T extends string> {
  tabs: Array<{ id: T; label: string; sub?: string; count?: number }>
  value: T
  onChange: (id: T) => void
  className?: string
  size?: 'sm' | 'md'
}

/** 游戏选项卡：选中指示块在选项间弹性滑动 */
export function AnimatedTab<T extends string>({ tabs, value, onChange, className = '', size = 'md' }: Props<T>): JSX.Element {
  const id = useId()
  return (
    <LayoutGroup id={id}>
      <div className={`animated-tabs relative inline-flex rounded-lg bg-black/35 p-1 ring-1 ring-inset ring-white/[0.07] ${className}`} role="tablist">
        {tabs.map((t) => {
          const active = t.id === value
          return (
            <motion.button
              key={t.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => onChange(t.id)}
              whileTap={{ scale: 0.94 }}
              transition={spring.press}
              className={`relative z-0 flex items-center gap-1.5 rounded-md font-label font-bold uppercase tracking-[0.12em] transition-colors duration-200 ${
                size === 'sm' ? 'h-8 px-3 text-[12px]' : 'h-10 px-5 text-[13px]'
              } ${active ? 'text-white' : 'text-silver/60 hover:text-chalk'}`}
            >
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 -z-10 rounded-md bg-gradient-to-b from-[#FF7F3D] to-[#E0570F] shadow-[0_6px_18px_-6px_rgba(255,107,32,0.9)]"
                  transition={spring.slide}
                />
              )}
              {t.label}
              {t.count != null && <span className={`font-mono text-[10px] ${active ? 'text-white/80' : 'text-silver/40'}`}>{t.count}</span>}
            </motion.button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
