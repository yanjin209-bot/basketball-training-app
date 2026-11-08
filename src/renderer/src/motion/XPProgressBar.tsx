import { motion, useAnimationControls } from 'motion/react'
import { useEffect, useRef } from 'react'
import { spring } from './springs'

interface Props {
  value: number
  max: number
  /** 当前等级：等级变化时先填满再从头填充 */
  level?: number
  height?: number
  color?: 'orange' | 'gold' | 'green' | 'silver'
  className?: string
  showShine?: boolean
}

const fills = {
  orange: 'from-[#D9520F] via-[#FF6B20] to-[#FFA066]',
  gold: 'from-[#B8862F] via-[#F2C46D] to-[#FFE6AE]',
  green: 'from-[#1F9D6C] via-[#45DDA0] to-[#9BF3CF]',
  silver: 'from-[#6B7482] via-[#BBC3CF] to-[#EEF1F5]'
}

/** 弹性填充的进度条：使用 scaleX（GPU 合成），不触发布局 */
export function XPProgressBar({ value, max, level, height = 8, color = 'orange', className = '', showShine = true }: Props): JSX.Element {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  const controls = useAnimationControls()
  const prevLevel = useRef(level)
  const mounted = useRef(false)

  useEffect(() => {
    let cancelled = false
    const run = async (): Promise<void> => {
      if (level !== undefined && prevLevel.current !== undefined && level > prevLevel.current) {
        await controls.start({ scaleX: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } })
        if (cancelled) return
        controls.set({ scaleX: 0 })
      }
      prevLevel.current = level
      await controls.start({ scaleX: ratio, transition: mounted.current ? spring.fill : { ...spring.fill, delay: 0.2 } })
      mounted.current = true
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [ratio, level, controls])

  return (
    <div className={`relative overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-inset ring-white/[0.06] ${className}`} style={{ height }}>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={controls}
        style={{ originX: 0 }}
        className={`absolute inset-0 rounded-full bg-gradient-to-r ${fills[color]} shadow-[0_0_14px_rgba(255,107,32,0.45)] will-change-transform`}
      >
        {showShine && <div className="shimmer absolute inset-0 overflow-hidden rounded-full" />}
      </motion.div>
    </div>
  )
}
