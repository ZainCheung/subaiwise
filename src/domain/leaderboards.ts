import type { Billing, SubAIWiseEntry } from '../data/schema'
import {
  entryLabel,
  selectBenchmarkScore,
  selectBenchmarkVariant,
  selectEntriesForLeaderboard,
} from './selectors'

export type LeaderboardPoint = {
  id: string
  label: string
  planName: string
  modelId: string
  modelName: string
  maker: string
  channel: string
  billing: Billing
  realUsdPerMtok: number
  score: number
  variant: string | null
}

export function toLeaderboardPoint(entry: SubAIWiseEntry, boardId: string): LeaderboardPoint | null {
  const score = selectBenchmarkScore(entry, boardId)
  if (score == null || !(entry.pricing.effectiveUsdPerMillionTokens > 0)) return null
  return {
    id: entry.id,
    label: entryLabel(entry),
    planName: entry.plan.name,
    modelId: entry.model.id,
    modelName: entry.model.name,
    maker: entry.provider,
    channel: entry.channel,
    billing: entry.plan.billing,
    realUsdPerMtok: entry.pricing.effectiveUsdPerMillionTokens,
    score,
    variant: selectBenchmarkVariant(entry, boardId),
  }
}

/** Classic maximize-score / minimize-price frontier (subscription only). */
export function subscriptionFrontier(
  entries: readonly SubAIWiseEntry[],
  boardId: string,
): SubAIWiseEntry[] {
  const scored = entries.filter(
    (entry) =>
      entry.plan.billing === 'subscription' &&
      selectBenchmarkScore(entry, boardId) != null &&
      entry.pricing.effectiveUsdPerMillionTokens > 0,
  )

  const sorted = [...scored].sort(
    (a, b) =>
      a.pricing.effectiveUsdPerMillionTokens - b.pricing.effectiveUsdPerMillionTokens ||
      (selectBenchmarkScore(b, boardId) ?? 0) - (selectBenchmarkScore(a, boardId) ?? 0),
  )

  let best = -Infinity
  const frontier: SubAIWiseEntry[] = []
  for (const entry of sorted) {
    const score = selectBenchmarkScore(entry, boardId) ?? -Infinity
    if (score > best) {
      best = score
      frontier.push(entry)
    }
  }
  return frontier
}

function uniqueByPrice(entries: readonly SubAIWiseEntry[]): SubAIWiseEntry[] {
  const byPrice = new Map<number, SubAIWiseEntry>()
  for (const entry of entries) {
    const price = entry.pricing.effectiveUsdPerMillionTokens
    const previous = byPrice.get(price)
    if (!previous || (previous.plan.billing === 'metered' && entry.plan.billing === 'subscription')) {
      byPrice.set(price, entry)
    }
  }
  return [...byPrice.values()]
}

/** Cheapest observed plan for each model. Used by the efficiency heuristic. */
export function cheapestPerModel(entries: readonly SubAIWiseEntry[]): SubAIWiseEntry[] {
  const byModel = new Map<string, SubAIWiseEntry[]>()
  for (const entry of entries) {
    const group = byModel.get(entry.model.id) ?? []
    group.push(entry)
    byModel.set(entry.model.id, group)
  }
  const cheapest: SubAIWiseEntry[] = []
  for (const group of byModel.values()) {
    const sorted = [...uniqueByPrice(group)].sort(
      (a, b) =>
        a.pricing.effectiveUsdPerMillionTokens - b.pricing.effectiveUsdPerMillionTokens,
    )
    if (sorted[0]) cheapest.push(sorted[0])
  }
  return cheapest
}

/**
 * Ranking heuristic, not the Pareto definition: among each model's cheapest
 * plan, pick the lowest real price in the top 15% of that score range.
 */
export function mostEfficientEntry(
  entries: readonly SubAIWiseEntry[],
  boardId: string,
): SubAIWiseEntry | null {
  const cheapest = cheapestPerModel(selectEntriesForLeaderboard(entries, boardId))
  if (!cheapest.length) return null
  const scores = cheapest.map((entry) => selectBenchmarkScore(entry, boardId) ?? 0)
  const maxY = Math.max(...scores)
  const minY = Math.min(...scores)
  const cutoff = maxY - 0.15 * (maxY - minY || 1)
  const nearTop = cheapest.filter((entry) => (selectBenchmarkScore(entry, boardId) ?? 0) >= cutoff)
  return nearTop.reduce((a, b) =>
    a.pricing.effectiveUsdPerMillionTokens <= b.pricing.effectiveUsdPerMillionTokens ? a : b,
  )
}

export function sameModelEntries(
  entries: readonly SubAIWiseEntry[],
  modelId: string,
): SubAIWiseEntry[] {
  return entries.filter((entry) => entry.model.id === modelId)
}

export type CoordGroup = {
  key: string
  x: number
  y: number
  entries: SubAIWiseEntry[]
}

/** Group records that share an exact (real price, score) pair. Never jitter. */
export function groupByExactCoords(
  entries: readonly SubAIWiseEntry[],
  boardId: string,
): CoordGroup[] {
  const groups = new Map<string, CoordGroup>()
  for (const entry of entries) {
    const score = selectBenchmarkScore(entry, boardId)
    const price = entry.pricing.effectiveUsdPerMillionTokens
    if (score == null || !(price > 0)) continue
    const groupKey = `${price}|${score}`
    const existing = groups.get(groupKey)
    if (existing) {
      existing.entries.push(entry)
    } else {
      groups.set(groupKey, {
        key: groupKey,
        x: price,
        y: score,
        entries: [entry],
      })
    }
  }
  return [...groups.values()]
}
