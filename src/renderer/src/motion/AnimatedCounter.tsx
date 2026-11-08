import { AnimatePresence, motion, useMotionValueEvent, useSpring } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { spring } from './springs'

interface Props {
  value: number
  decimals?: number
  className?: string
  suffix?: string
  /** 数值变化时显示浮动的 +N */
  showDelta?: boolean
  highlightClass?: string
}

/** 数字平滑滚动；变化时短暂高亮并弹一下 */
export function AnimatedCounter({ value, decimals = 0, className = '', suffix = '', showDelta = false, highlightClass = 'text-hoop' }: Props): JSX.Element {
  const mv = useSpring(value, { stiffness: 90, damping: 20, mass: 1 })
  const [display, setDisplay] = useState(value)
  const [delta, setDelta] = useState<{ id: number; v: number } | null>(null)
  const [flash, setFlash] = useState(0)
  const prev = useRef(value)

  useMotionValueEvent(mv, 'change', (v) => setDisplay(v))
  useEffect(() => {
    if (value !== prev.current) {
      const d = value - prev.current
      prev.current = value
      mv.set(value)
      setFlash((f) => f + 1)
      if (showDelta && d !== 0) setDelta({ id: Date.now(), v: d })
    }
  }, [value, mv, showDelta])
  useEffect(() => {
    if (!delta) return
    const t = setTimeout(() => setDelta(null), 1400)
    return () => clearTimeout(t)
  }, [delta])

  const text = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString('en-US')
  return (
    <span className="relative inline-flex items-baseline">
      <motion.span
        key={flash}
        initial={flash ? { scale: 1.12 } : false}
        animate={{ scale: 1 }}
        transition={spring.pop}
        className={`inline-block tabular-nums transition-colors duration-700 ${flash && display !== value ? highlightClass : ''} ${className}`}
      >
        {text}
        {suffix}
      </motion.span>
      <AnimatePresence>
        {delta && (
          <motion.span
            key={delta.id}
            initial={{ opacity: 0, y: 6, scale: 0.8 }}
            animate={{ opacity: 1, y: -18, scale: 1 }}
            exit={{ opacity: 0, y: -30 }}
            transition={spring.pop}
            className={`pointer-events-none absolute -right-2 top-0 translate-x-full whitespace-nowrap font-mono text-[12px] font-bold ${delta.v > 0 ? 'text-win' : 'text-[#ff6b6b]'}`}
          >
            {delta.v > 0 ? '+' : ''}
            {decimals ? delta.v.toFixed(decimals) : delta.v}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
