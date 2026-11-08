import { AnimatePresence, motion } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { spring } from './springs'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  tag?: string
  width?: number
  dismissable?: boolean
}

/** 弹簧弹窗：背景压暗 + 面板从中心弹出，Esc / 点击背景关闭 */
export function SpringModal({ open, onClose, children, title, tag, width = 560, dismissable = true }: Props): JSX.Element {
  useEffect(() => {
    if (!open || !dismissable) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, dismissable])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-6" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={dismissable ? onClose : undefined}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="panel panel-cut relative max-h-[86vh] w-full overflow-y-auto rounded-sm p-7"
            style={{ maxWidth: width }}
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: spring.pop }}
            exit={{ opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.16 } }}
          >
            <div aria-hidden className="absolute left-0 top-0 h-[3px] w-24 bg-hoop shadow-[0_0_18px_rgba(255,107,32,0.8)]" />
            {(title || tag) && (
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  {tag && <div className="tag-orange mb-1">{tag}</div>}
                  {title && <h2 className="font-display text-[26px] font-semibold tracking-wide text-chalk">{title}</h2>}
                </div>
                {dismissable && (
                  <motion.button
                    type="button"
                    onClick={onClose}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    transition={spring.press}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-silver hover:text-chalk"
                    aria-label="关闭"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l10 10M12 2 2 12" /></svg>
                  </motion.button>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
