import type { SubAIWiseDataset, SubAIWiseEntry } from '../data/schema'

export interface SnapshotStats {
  generatedAt: string
  total: number
  subscription: number
  metered: number
  opencodeGo: number
  arenaCode: number
  arenaAgent: number
  aaIntel: number
  aaCoding: number
  designArena: number
  vendors: number
}

export function computeStats(data: SubAIWiseDataset): SnapshotStats {
  const entries = data.entries
  const scored = (key: string) =>
    entries.filter((entry) => entry.benchmarks[key]?.score != null).length

  return {
    generatedAt: data.snapshot,
    total: entries.length,
    subscription: entries.filter((entry) => entry.plan.billing === 'subscription').length,
    metered: entries.filter((entry) => entry.plan.billing === 'metered').length,
    opencodeGo: entries.filter((entry) => entry.plan.name.includes('OpenCode Go')).length,
    arenaCode: scored('codeArena'),
    arenaAgent: scored('agentArena'),
    aaIntel: scored('intelligence'),
    aaCoding: scored('codingAgent'),
    designArena: scored('designArena'),
    vendors: new Set(entries.map((entry) => entry.provider)).size,
  }
}

export function subscriptionEntries(entries: SubAIWiseEntry[]): SubAIWiseEntry[] {
  return entries.filter(
    (entry) =>
      entry.plan.billing === 'subscription' &&
      entry.allowance.monthlyTokens != null &&
      entry.allowance.monthlyTokens > 0,
  )
}

export interface QuickInsights {
  lowest: SubAIWiseEntry | null
  largest: SubAIWiseEntry | null
  frontier: SubAIWiseEntry | null
}

/** Frontier example is the highest-score Code Arena subscription Pareto point. */
export function computeInsights(data: SubAIWiseDataset): QuickInsights {
  const entries = data.entries
  if (!entries.length) return { lowest: null, largest: null, frontier: null }

  const lowest = entries.reduce((a, b) =>
    a.pricing.effectiveUsdPerMillionTokens <= b.pricing.effectiveUsdPerMillionTokens ? a : b,
  )
  const subs = subscriptionEntries(entries)
  const largest = subs.length
    ? subs.reduce((a, b) =>
        (a.allowance.monthlyTokens ?? 0) >= (b.allowance.monthlyTokens ?? 0) ? a : b,
      )
    : null
  const scored = subs
    .filter((entry) => {
      const score = entry.benchmarks.codeArena?.score
      return score != null && entry.pricing.effectiveUsdPerMillionTokens > 0
    })
    .sort(
      (a, b) =>
        a.pricing.effectiveUsdPerMillionTokens - b.pricing.effectiveUsdPerMillionTokens ||
        (b.benchmarks.codeArena?.score ?? -Infinity) -
          (a.benchmarks.codeArena?.score ?? -Infinity),
    )
  let best = -Infinity
  const frontierPts: SubAIWiseEntry[] = []
  for (const entry of scored) {
    const score = entry.benchmarks.codeArena?.score ?? -Infinity
    if (score > best) {
      best = score
      frontierPts.push(entry)
    }
  }
  const frontier = frontierPts.length ? frontierPts[frontierPts.length - 1] : null
  return { lowest, largest, frontier }
}
