import { motion } from 'motion/react'
import { useEffect } from 'react'
import { SKILL_TEST_MAP } from '@shared/config/skills'
import { ATTR_META } from '@shared/config/career'
import type { Celebration } from '../store/app'
import { ElasticButton } from './ElasticButton'
import { spring } from './springs'

/** 升级 / 刷新纪录的全屏庆祝弹层 */
export function AchievementPopup({ item, onDone }: { item: Exclude<Celebration, { type: 'badge' }>; onDone: () => void }): JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' || e.key === 'Enter') onDone()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])

  const isLevel = item.type === 'levelUp'
  const test = item.type === 'pb' ? SKILL_TEST_MAP[item.testId] : null
  return (
    <motion.div className="fixed inset-0 z-[90] flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} onClick={onDone}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[3px]" />
      {/* 横向光带 */}
      <motion.div
        aria-hidden
        className="absolute left-0 right-0 h-[240px] bg-gradient-to-r from-transparent via-hoop/25 to-transparent"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div aria-hidden className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-hoop to-transparent" style={{ top: 'calc(50% - 120px)' }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.1, duration: 0.6 }} />
      <motion.div aria-hidden className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-hoop to-transparent" style={{ top: 'calc(50% + 120px)' }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.15, duration: 0.6 }} />

      <div className="relative flex flex-col items-center text-center" onClick={(e) => e.stopPropagation()}>
        <motion.div initial={{ opacity: 0, letterSpacing: '0.8em' }} animate={{ opacity: 1, letterSpacing: '0.42em' }} transition={{ duration: 0.6 }} className="font-label text-[18px] font-bold text-hoop">
          {isLevel ? 'LEVEL UP' : 'NEW PERSONAL BEST'}
        </motion.div>
        {isLevel ? (
          <div className="mt-2 flex items-center gap-6">
            <motion.span initial={{ opacity: 0, x: 30 }} animate={{ opacity: 0.35, x: 0 }} transition={spring.page} className="num text-[72px] font-bold text-silver">
              {item.from}
            </motion.span>
            <motion.svg initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...spring.pop, delay: 0.15 }} width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#FF6B20" strokeWidth="2.6" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></motion.svg>
            <motion.span initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...spring.pop, delay: 0.25 }} className="num text-gradient-orange text-[148px] font-bold leading-none drop-shadow-[0_0_40px_rgba(255,107,32,0.5)]">
              {item.to}
            </motion.span>
          </div>
        ) : (
          <div className="mt-3 flex items-end gap-5">
            {item.prev != null && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} className="num mb-4 text-[56px] font-bold text-silver line-through decoration-2">
                {item.prev}
              </motion.span>
            )}
            <motion.span initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...spring.pop, delay: 0.2 }} className="num text-gradient-gold text-[140px] font-bold leading-none">
              {item.score}
            </motion.span>
          </div>
        )}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.page, delay: 0.45 }} className="mt-3 font-display text-[28px] font-semibold text-chalk">
          {isLevel ? (item.title ? `晋升「${item.title}」` : `生涯等级 LV${item.to}`) : `${test?.name ?? ''} · ${test ? ATTR_META[test.attr].name : ''}`}
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-2 max-w-md text-[14px] text-silver/70">
          {isLevel ? '经验来自真实训练。继续保持节奏，下一个称号在等你。' : item.prev == null ? '首次完成该测试，能力评分已改为真实测试数据。' : '真实能力评分已刷新，球员卡同步更新。'}
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.page, delay: 0.7 }} className="mt-8">
          <ElasticButton size="lg" onClick={onDone} autoFocus>
            继续
          </ElasticButton>
        </motion.div>
      </div>
    </motion.div>
  )
}
