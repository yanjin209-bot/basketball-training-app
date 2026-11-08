import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { spring, stagger } from './springs'

/** 页面切换：旧页快速淡出，新页短距离上移入场，子元素分层出现 */
export function PageTransition({ pageKey, children }: { pageKey: string; children: ReactNode }): JSX.Element {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pageKey}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0, transition: { ...spring.page, opacity: { duration: 0.2 } } }}
        exit={{ opacity: 0, y: -8, transition: { duration: 0.12, ease: 'easeIn' } }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/** 页面内容的分层入场容器 */
export function Stagger({ children, className = '' }: { children: ReactNode; className?: string }): JSX.Element {
  return (
    <motion.div className={className} variants={stagger.container} initial="hidden" animate="show">
      {children}
    </motion.div>
  )
}
export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }): JSX.Element {
  return (
    <motion.div className={className} variants={stagger.item}>
      {children}
    </motion.div>
  )
}
