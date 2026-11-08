import { motion, type HTMLMotionProps } from 'motion/react'
import { forwardRef, type ReactNode } from 'react'
import { spring } from './springs'

type Variant = 'primary' | 'secondary' | 'ghost' | 'gold' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'xl'

export interface ElasticButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconRight?: ReactNode
  loading?: boolean
  block?: boolean
  children?: ReactNode
}

const base: Record<Variant, string> = {
  primary: 'text-white bg-gradient-to-b from-[#FF8240] to-[#E3560F] shadow-[0_10px_28px_-10px_rgba(255,107,32,0.85),inset_0_1px_0_rgba(255,255,255,0.35)]',
  secondary: 'text-chalk bg-gradient-to-b from-[#2C323C] to-[#1C2028] shadow-[0_8px_22px_-12px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] border border-white/10',
  ghost: 'text-silver bg-white/[0.03] border border-white/10',
  gold: 'text-[#2a1d05] bg-gradient-to-b from-[#FFE2A3] to-[#D9A548] shadow-[0_10px_28px_-10px_rgba(242,196,109,0.8),inset_0_1px_0_rgba(255,255,255,0.6)]',
  danger: 'text-white bg-gradient-to-b from-[#E2483C] to-[#B3271D] shadow-[0_10px_24px_-12px_rgba(226,72,60,0.8)]'
}
const glow: Record<Variant, string> = {
  primary: 'from-white/30 via-white/0 to-transparent',
  secondary: 'from-hoop/25 via-transparent to-transparent',
  ghost: 'from-white/10 via-transparent to-transparent',
  gold: 'from-white/50 via-white/0 to-transparent',
  danger: 'from-white/25 via-transparent to-transparent'
}
const ring: Record<Variant, string> = {
  primary: 'ring-1 ring-inset ring-[#FFC29C]/70',
  secondary: 'ring-1 ring-inset ring-hoop/60',
  ghost: 'ring-1 ring-inset ring-white/30',
  gold: 'ring-1 ring-inset ring-white/70',
  danger: 'ring-1 ring-inset ring-white/40'
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[12px] gap-1.5 rounded-md',
  md: 'h-10 px-4 text-[13px] gap-2 rounded-lg',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-lg',
  xl: 'h-14 px-8 text-[17px] gap-3 rounded-xl'
}

/**
 * Q 弹按钮：悬停放大上浮、按下压缩、松开过冲回弹（物理弹簧，而非固定关键帧）。
 * 所有状态都基于 transform / opacity，连续点击时动画会从当前值自然衔接。
 */
export const ElasticButton = forwardRef<HTMLButtonElement, ElasticButtonProps>(function ElasticButton(
  { variant = 'primary', size = 'md', icon, iconRight, loading, block, disabled, className = '', children, ...rest },
  ref
) {
  const inactive = disabled || loading
  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={inactive}
      initial="rest"
      animate="rest"
      whileHover={inactive ? undefined : 'hover'}
      whileTap={inactive ? undefined : 'press'}
      variants={{
        rest: { scale: 1, y: 0, transition: spring.press },
        hover: { scale: 1.035, y: -2, transition: spring.hover },
        press: { scale: 0.95, y: 0, transition: { ...spring.press, stiffness: 700 } }
      }}
      className={`group relative isolate inline-flex select-none items-center justify-center overflow-hidden font-label font-bold uppercase tracking-[0.08em] will-change-transform ${base[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${inactive ? 'cursor-not-allowed opacity-45 saturate-50' : 'cursor-pointer'} ${className}`}
      {...rest}
    >
      {/* 强调色渐变 */}
      <motion.span
        aria-hidden
        className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b ${glow[variant]}`}
        variants={{ rest: { opacity: 0 }, hover: { opacity: 1 }, press: { opacity: 0.6 } }}
        transition={{ duration: 0.22 }}
      />
      {/* 边框高光 */}
      <motion.span
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-[inherit] ${ring[variant]}`}
        variants={{ rest: { opacity: 0 }, hover: { opacity: 1 }, press: { opacity: 1 } }}
        transition={{ duration: 0.2 }}
      />
      {icon && (
        <motion.span className="relative flex shrink-0 items-center" variants={{ rest: { x: 0, rotate: 0 }, hover: { x: -1, rotate: -6 }, press: { x: 0, rotate: 0 } }} transition={spring.hover}>
          {loading ? <Spinner /> : icon}
        </motion.span>
      )}
      {!icon && loading && <Spinner />}
      {children != null && (
        <motion.span className="relative whitespace-nowrap" variants={{ rest: { x: 0 }, hover: { x: iconRight ? -1 : 1 }, press: { x: 0 } }} transition={spring.hover}>
          {children}
        </motion.span>
      )}
      {iconRight && (
        <motion.span className="relative flex shrink-0 items-center" variants={{ rest: { x: 0 }, hover: { x: 3 }, press: { x: 1 } }} transition={spring.hover}>
          {iconRight}
        </motion.span>
      )}
    </motion.button>
  )
})

function Spinner(): JSX.Element {
  return (
    <motion.span
      className="block h-4 w-4 rounded-full border-2 border-current border-t-transparent"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, ease: 'linear', duration: 0.8 }}
    />
  )
}
