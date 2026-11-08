import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { useRef } from 'react'
import { spring } from './springs'

interface Props {
  children: ReactNode
  className?: string
  maxTilt?: number
  lift?: number
  glare?: boolean
  onClick?: () => void
  layoutId?: string
  style?: React.CSSProperties
}

/** 跟随鼠标的轻微 3D 倾斜 + 高光，离开时弹性复位 */
export function HoverTiltCard({ children, className = '', maxTilt = 6, lift = 6, glare = true, onClick, layoutId, style }: Props): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const hovered = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 220, damping: 22 })
  const sy = useSpring(py, { stiffness: 220, damping: 22 })
  const sh = useSpring(hovered, { stiffness: 260, damping: 26 })
  const rotateY = useTransform(sx, [0, 1], [-maxTilt, maxTilt])
  const rotateX = useTransform(sy, [0, 1], [maxTilt, -maxTilt])
  const y = useTransform(sh, [0, 1], [0, -lift])
  const gx = useTransform(sx, (v) => `${v * 100}%`)
  const gy = useTransform(sy, (v) => `${v * 100}%`)
  const glareBg = useMotionTemplate`radial-gradient(420px circle at ${gx} ${gy}, rgba(255,255,255,0.14), transparent 45%)`

  const onMove = (e: React.PointerEvent): void => {
    if (reduce || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width)
    py.set((e.clientY - r.top) / r.height)
  }
  const onLeave = (): void => {
    px.set(0.5)
    py.set(0.5)
    hovered.set(0)
  }

  return (
    <div style={{ perspective: 1100 }} className="relative">
      <motion.div
        ref={ref}
        layoutId={layoutId}
        onPointerMove={onMove}
        onPointerEnter={() => hovered.set(1)}
        onPointerLeave={onLeave}
        onClick={onClick}
        whileTap={onClick ? { scale: 0.97 } : undefined}
        transition={spring.press}
        style={{ rotateX: reduce ? 0 : rotateX, rotateY: reduce ? 0 : rotateY, y, transformStyle: 'preserve-3d', ...style }}
        className={`relative will-change-transform ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        {children}
        {glare && <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background: glareBg, opacity: sh }} />}
      </motion.div>
    </div>
  )
}
