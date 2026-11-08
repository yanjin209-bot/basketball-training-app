import { BADGES, type BadgeMetric } from '../config/badges'
import type { BadgeTier } from '../types'

export type BadgeMetrics = Record<BadgeMetric, number>

export function tierFor(value: number, tiers: readonly number[]): 0 | BadgeTier {
  let t = 0
  for (let i = 0; i < tiers.length; i++) if (value >= tiers[i]) t = i + 1
  return t as 0 | BadgeTier
}

/** 每个徽章当前应达到的等级 */
export function evaluateBadges(m: BadgeMetrics): Array<{ badgeId: string; tier: 0 | BadgeTier; value: number; next: number | null }> {
  return BADGES.map((b) => {
    const value = m[b.metric] ?? 0
    const tier = tierFor(value, b.tiers)
    return { badgeId: b.id, tier, value, next: tier < 4 ? (b.tiers as readonly number[])[tier] : null }
  })
}
