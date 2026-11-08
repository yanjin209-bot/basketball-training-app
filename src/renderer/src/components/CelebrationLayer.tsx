import { AnimatePresence } from 'motion/react'
import { useApp } from '../store/app'
import { AchievementPopup, BadgeUnlockAnimation } from '../motion'

/** 依次播放升级 / 徽章 / 纪录动画，队列保证高频操作不会互相打断 */
export function CelebrationLayer(): JSX.Element {
  const current = useApp((s) => s.celebrations[0])
  const shift = useApp((s) => s.shiftCelebration)
  return (
    <AnimatePresence mode="wait">
      {current &&
        (current.type === 'badge' ? (
          <BadgeUnlockAnimation key={current.key} badgeId={current.badgeId} tier={current.tier} onDone={shift} />
        ) : (
          <AchievementPopup key={current.key} item={current} onDone={shift} />
        ))}
    </AnimatePresence>
  )
}
