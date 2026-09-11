import type { SubAIWiseDataset, SubAIWiseEntry } from '../data/schema'
import type { BenchmarkConfigFilter } from '../data/benchmark-selection'
import { selectDefaultBenchmarkReference } from '../data/benchmark-selection'
import { matchesIdFilter, type IdFilter } from '../lib/filters'
import { selectBenchmarkScore } from './selectors'
import { selectPriceRows, selectAllowanceRows } from './pricing'

export type AdvancedFilters = {
  makers: IdFilter
  confidence: IdFilter
  harness: IdFilter
  effort: IdFilter
  mode: IdFilter
}

export const EMPTY_ADVANCED_FILTERS: AdvancedFilters = {
  makers: null,
  confidence: null,
  harness: null,
  effort: null,
  mode: null,
}

export function isFilterActive(value: IdFilter): boolean {
  return value != null
}

export function activeAdvancedFilterCount(filters: AdvancedFilters): number {
  return (['makers', 'confidence', 'harness', 'effort', 'mode'] as const).filter(
    (key) => isFilterActive(filters[key]),
  ).length
}

export function filterEntriesByAdvanced(
  entries: readonly SubAIWiseEntry[],
  filters: AdvancedFilters,
): SubAIWiseEntry[] {
  return entries.filter(
    (entry) =>
      matchesIdFilter(entry.provider, filters.makers) &&
      matchesIdFilter(entry.quality.confidence, filters.confidence),
  )
}

function listOrNull(value: IdFilter): string[] | null {
  if (value == null) return null
  return [...value]
}

export function toBenchmarkConfigFilter(filters: AdvancedFilters): BenchmarkConfigFilter | undefined {
  if (filters.harness == null && filters.effort == null && filters.mode == null) return undefined
  return {
    harness: listOrNull(filters.harness),
    effort: listOrNull(filters.effort),
    mode: listOrNull(filters.mode),
  }
}

export function benchmarkScoreFor(
  dataset: SubAIWiseDataset,
  entry: SubAIWiseEntry,
  boardId: string,
  filters: AdvancedFilters,
): number | null {
  const filter = toBenchmarkConfigFilter(filters)
  if (!filter) return selectBenchmarkScore(entry, boardId)
  const selected = selectDefaultBenchmarkReference(dataset, entry.id, boardId, filter)
  const score = selected?.configuration.score
  return typeof score === 'number' && Number.isFinite(score) ? score : null
}

export function uniqueConfigValues(
  dataset: SubAIWiseDataset,
  key: 'agentHarness' | 'reasoningEffort' | 'serviceMode',
): string[] {
  const values = new Set<string>()
  for (const configuration of dataset.benchmarkConfigurations) {
    const value = configuration[key]
    if (value) values.add(value)
  }
  return [...values].sort((a, b) => a.localeCompare(b))
}

export function priceRowsIgnoringBenchmarkFilters(
  entries: readonly SubAIWiseEntry[],
  filters: AdvancedFilters,
) {
  return selectPriceRows(filterEntriesByAdvanced(entries, filters))
}

export function allowanceRowsIgnoringBenchmarkFilters(
  entries: readonly SubAIWiseEntry[],
  filters: AdvancedFilters,
) {
  return selectAllowanceRows(filterEntriesByAdvanced(entries, filters))
}
