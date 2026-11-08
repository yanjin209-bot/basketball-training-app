// 统一的弹簧参数：所有组件从这里取值，保证手感一致
import type { Transition } from 'motion/react'

export const spring = {
  /** 按钮按压：快速压缩、轻微过冲回弹 */
  press: { type: 'spring', stiffness: 420, damping: 22, mass: 0.65 } as Transition,
  /** 悬停：带惯性但不拖沓 */
  hover: { type: 'spring', stiffness: 360, damping: 24, mass: 0.6 } as Transition,
  /** 页面 / 面板进入 */
  page: { type: 'spring', stiffness: 340, damping: 32, mass: 0.8 } as Transition,
  /** 菜单高亮滑块 */
  slide: { type: 'spring', stiffness: 480, damping: 36, mass: 0.7 } as Transition,
  /** 弹出式庆祝动画 */
  pop: { type: 'spring', stiffness: 300, damping: 15, mass: 0.9 } as Transition,
  /** 进度条填充：轻微弹性 */
  fill: { type: 'spring', stiffness: 120, damping: 18, mass: 1 } as Transition,
  /** 柔和 */
  soft: { type: 'spring', stiffness: 220, damping: 28 } as Transition
}

export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const
}

/** 内容分层入场 */
export const stagger = {
  container: {
    hidden: {},
    show: { transition: { staggerChildren: 0.045, delayChildren: 0.04 } }
  },
  item: {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: spring.page }
  }
}
