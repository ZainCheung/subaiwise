import type { Billing, SubAIWiseEntry } from '../data/schema'
import { entryLabel, monthlyYi, selectBenchmarkScore } from './selectors'

export type CompareView = 'models' | 'plans'
export type SortKey = 'price' | 'allowance' | string
export type BillingFilter = 'all' | Billing
export type ConfidenceFilter = 'all' | 'high' | 'medium' | 'low'

export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const
export const MAX_COMPARE = 4

export function isBoardSort(key: SortKey): boolean {
  return key !== 'price' && key !== 'allowance'
}

export function filterCompareEntries(
  entries: readonly SubAIWiseEntry[],
  opts: {
    query: string
    billing: BillingFilter
    vendor: string
    confidence: ConfidenceFilter
  },
): SubAIWiseEntry[] {
  const q = opts.query.trim().toLowerCase()
  return entries.filter((entry) => {
    if (opts.billing !== 'all' && entry.plan.billing !== opts.billing) return false
    if (opts.vendor !== 'all' && entry.provider !== opts.vendor) return false
    if (opts.confidence !== 'all' && entry.quality.confidence !== opts.confidence) return false
    if (!q) return true
    const hay =
      `${entry.model.name} ${entry.model.id} ${entry.plan.name} ${entryLabel(entry)} ${entry.provider} ${entry.channel}`.toLowerCase()
    return hay.includes(q)
  })
}

function metric(entry: SubAIWiseEntry, sort: SortKey): number | null {
  if (sort === 'price') return entry.pricing.effectiveUsdPerMillionTokens
  if (sort === 'allowance') return monthlyYi(entry)
  return selectBenchmarkScore(entry, sort)
}

function byPriceThenLabel(a: SubAIWiseEntry, b: SubAIWiseEntry): number {
  return (
    a.pricing.effectiveUsdPerMillionTokens - b.pricing.effectiveUsdPerMillionTokens ||
    entryLabel(a).localeCompare(entryLabel(b))
  )
}

/** Pick the plan that should represent a model for the active sort metric. */
export function representativeForMetric(
  plans: readonly SubAIWiseEntry[],
  sort: SortKey,
): SubAIWiseEntry {
  if (plans.length === 1) return plans[0]

  if (sort === 'allowance') {
    const withAllowance = plans.filter((entry) => {
      const yi = monthlyYi(entry)
      return yi != null && Number.isFinite(yi)
    })
    const pool = withAllowance.length ? withAllowance : plans
    return [...pool].sort(
      (a, b) => (monthlyYi(b) ?? -Infinity) - (monthlyYi(a) ?? -Infinity) || byPriceThenLabel(a, b),
    )[0]
  }

  if (isBoardSort(sort)) {
    const scored = plans.filter((entry) => metric(entry, sort) != null)
    const pool = scored.length ? scored : plans
    return [...pool].sort(byPriceThenLabel)[0]
  }

  return [...plans].sort(byPriceThenLabel)[0]
}

export function sortEntries(
  entries: readonly SubAIWiseEntry[],
  sort: SortKey,
): SubAIWiseEntry[] {
  const dir = sort === 'price' ? 1 : -1
  return [...entries].sort((a, b) => {
    const va = metric(a, sort)
    const vb = metric(b, sort)
    if (va == null && vb == null) return entryLabel(a).localeCompare(entryLabel(b))
    if (va == null) return 1
    if (vb == null) return -1
    if (va !== vb) return (va - vb) * dir
    return (
      a.pricing.effectiveUsdPerMillionTokens - b.pricing.effectiveUsdPerMillionTokens ||
      entryLabel(a).localeCompare(entryLabel(b))
    )
  })
}

export type ModelGroup = {
  model: string
  display: string
  vendor: string
  best: SubAIWiseEntry
  plans: SubAIWiseEntry[]
}

export function groupByModel(
  entries: readonly SubAIWiseEntry[],
  sortKey: SortKey = 'price',
): ModelGroup[] {
  const map = new Map<string, SubAIWiseEntry[]>()
  for (const entry of entries) {
    const list = map.get(entry.model.id) ?? []
    list.push(entry)
    map.set(entry.model.id, list)
  }
  const groups: ModelGroup[] = []
  for (const [model, plans] of map) {
    const best = representativeForMetric(plans, sortKey)
    groups.push({
      model,
      display: best.model.name,
      vendor: best.provider,
      best,
      plans: sortEntries(plans, sortKey),
    })
  }
  return groups
}

export function sortGroups(groups: ModelGroup[], sort: SortKey): ModelGroup[] {
  const dir = sort === 'price' ? 1 : -1
  return [...groups].sort((a, b) => {
    const va = metric(a.best, sort)
    const vb = metric(b.best, sort)
    if (va == null && vb == null) return a.display.localeCompare(b.display)
    if (va == null) return 1
    if (vb == null) return -1
    if (va !== vb) return (va - vb) * dir
    return a.best.pricing.effectiveUsdPerMillionTokens - b.best.pricing.effectiveUsdPerMillionTokens
  })
}
