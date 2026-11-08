import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { useApp, type Toast } from '../store/app'
import { spring } from './springs'

const tone: Record<Toast['tone'], { bar: string; icon: string; text: string }> = {
  xp: { bar: 'bg-hoop', icon: 'text-hoop', text: 'text-hoop' },
  success: { bar: 'bg-win', icon: 'text-win', text: 'text-win' },
  error: { bar: 'bg-[#ff5d52]', icon: 'text-[#ff5d52]', text: 'text-[#ff8b82]' },
  info: { bar: 'bg-silver', icon: 'text-silver', text: 'text-silver' },
  gold: { bar: 'bg-champ', icon: 'text-champ', text: 'text-champ' }
}

function ToastItem({ t }: { t: Toast }): JSX.Element {
  const dismiss = useApp((s) => s.dismissToast)
  const dur = t.tone === 'error' ? 5200 : 3200
  useEffect(() => {
    const h = setTimeout(() => dismiss(t.id), dur)
    return () => clearTimeout(h)
  }, [t.id, dismiss, dur])
  const c = tone[t.tone]
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95, transition: { duration: 0.18 } }}
      transition={spring.pop}
      onClick={() => dismiss(t.id)}
      className="panel pointer-events-auto relative w-[320px] cursor-pointer overflow-hidden rounded-md py-3 pl-5 pr-4"
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${c.bar}`} />
      <div className="flex items-center gap-3">
        {t.big && <div className={`num text-[26px] font-bold leading-none ${c.text}`}>{t.big}</div>}
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-chalk">{t.title}</div>
          {t.detail && <div className="mt-0.5 text-[12px] text-silver/70">{t.detail}</div>}
        </div>
      </div>
      <motion.div className={`absolute bottom-0 left-0 h-[2px] ${c.bar} opacity-60`} initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} style={{ originX: 0, width: '100%' }} transition={{ duration: dur / 1000, ease: 'linear' }} />
    </motion.div>
  )
}

/** 游戏式通知：从右侧弹入，可堆叠、可点击关闭 */
export function GameToastStack(): JSX.Element {
  const toasts = useApp((s) => s.toasts)
  return (
    <div className="pointer-events-none fixed right-6 top-14 z-[80] flex flex-col items-end gap-2.5">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} />
        ))}
      </AnimatePresence>
    </div>
  )
}
