import { canonicalBenchmarkKey } from '../lib/leaderboards'
import type {
  Benchmark,
  BenchmarkConfiguration,
  BenchmarkMapping,
  SubAIWiseDataset,
  SubAIWiseEntry,
} from './schema'

export const DEFAULT_BENCHMARK_SELECTION = 'highest_archived_reference' as const

export type BenchmarkReference = {
  configuration: BenchmarkConfiguration
  mapping: BenchmarkMapping
  selection: typeof DEFAULT_BENCHMARK_SELECTION
}

export type BenchmarkConfigFilter = {
  harness?: readonly string[] | null
  effort?: readonly string[] | null
  mode?: readonly string[] | null
}

function matchesFilter(
  configuration: BenchmarkConfiguration,
  filter?: BenchmarkConfigFilter,
): boolean {
  if (!filter) return true
  const harness = filter.harness
  if (harness != null) {
    if (harness.length === 0) return false
    if (!configuration.agentHarness || !harness.includes(configuration.agentHarness)) return false
  }
  const effort = filter.effort
  if (effort != null) {
    if (effort.length === 0) return false
    if (!configuration.reasoningEffort || !effort.includes(configuration.reasoningEffort)) return false
  }
  const mode = filter.mode
  if (mode != null) {
    if (mode.length === 0) return false
    if (!configuration.serviceMode || !mode.includes(configuration.serviceMode)) return false
  }
  return true
}

export function configurationsForEntryBoard(
  dataset: Pick<SubAIWiseDataset, 'benchmarkConfigurations' | 'benchmarkMappings'>,
  entryId: string,
  boardId: string,
  filter?: BenchmarkConfigFilter,
): BenchmarkReference[] {
  const configs = new Map(dataset.benchmarkConfigurations.map((item) => [item.id, item]))
  const refs: BenchmarkReference[] = []
  for (const mapping of dataset.benchmarkMappings) {
    if (mapping.entryId !== entryId) continue
    const configuration = configs.get(mapping.configurationId)
    if (!configuration || configuration.boardId !== boardId) continue
    if (!matchesFilter(configuration, filter)) continue
    refs.push({ configuration, mapping, selection: DEFAULT_BENCHMARK_SELECTION })
  }
  return refs
}

/**
 * Upstream's published default: `highest_archived_reference`.
 *
 * Among mapped configurations for one entry + board, prefer archived rows,
 * then the highest score, then measured over estimated, then a stable id.
 * This is not a UI `Math.max` of whatever is on screen.
 */
export function selectDefaultBenchmarkReference(
  dataset: Pick<SubAIWiseDataset, 'benchmarkConfigurations' | 'benchmarkMappings'>,
  entryId: string,
  boardId: string,
  filter?: BenchmarkConfigFilter,
): BenchmarkReference | null {
  const refs = configurationsForEntryBoard(dataset, entryId, boardId, filter)
  if (!refs.length) return null

  const scored = refs.filter(
    (ref) => typeof ref.configuration.score === 'number' && Number.isFinite(ref.configuration.score),
  )
  const pool = scored.length ? scored : refs
  const archived = pool.filter((ref) => Boolean(ref.configuration.archive))
  const ranked = archived.length ? archived : pool

  return [...ranked].sort((a, b) => {
    const scoreA = typeof a.configuration.score === 'number' ? a.configuration.score : Number.NEGATIVE_INFINITY
    const scoreB = typeof b.configuration.score === 'number' ? b.configuration.score : Number.NEGATIVE_INFINITY
    if (scoreA !== scoreB) return scoreB - scoreA
    const estimatedA = a.configuration.scoreIsEstimated === true ? 1 : 0
    const estimatedB = b.configuration.scoreIsEstimated === true ? 1 : 0
    if (estimatedA !== estimatedB) return estimatedA - estimatedB
    return a.configuration.id.localeCompare(b.configuration.id)
  })[0]
}

export function benchmarkFromReference(
  reference: BenchmarkReference,
  configurationCount: number,
): Benchmark {
  const { configuration, mapping } = reference
  return {
    score: configuration.score ?? null,
    variant: configuration.variant ?? null,
    scoreIsEstimated: configuration.scoreIsEstimated ?? null,
    scoreLow: configuration.scoreLow ?? null,
    scoreHigh: configuration.scoreHigh ?? null,
    meanCostUsdPerTask: configuration.meanCostUsdPerTask ?? null,
    medianCostUsdPerTask: configuration.medianCostUsdPerTask ?? null,
    source: configuration.source ?? null,
    mappingConfidence: mapping.mappingConfidence ?? null,
    mappingNote: mapping.mappingNote ?? null,
    agentHarness: configuration.agentHarness ?? null,
    reasoningEffort: configuration.reasoningEffort ?? null,
    serviceMode: configuration.serviceMode ?? null,
    selection: reference.selection,
    configurationCount,
    quotaEffortMatched: mapping.quotaEffortMatched ?? null,
  }
}

export function deriveEntryBenchmarks(
  entry: SubAIWiseEntry,
  dataset: Pick<SubAIWiseDataset, 'benchmarkConfigurations' | 'benchmarkMappings' | 'leaderboards'>,
): SubAIWiseEntry['benchmarks'] {
  const next = { ...entry.benchmarks }
  for (const boardId of Object.keys(dataset.leaderboards)) {
    const mapped = configurationsForEntryBoard(dataset, entry.id, boardId)
    const selected = selectDefaultBenchmarkReference(dataset, entry.id, boardId)
    if (!selected) continue
    next[canonicalBenchmarkKey(boardId)] = benchmarkFromReference(selected, mapped.length)
  }
  return next
}
