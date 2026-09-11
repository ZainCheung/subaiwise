import type { BenchmarkConfiguration, SubAIWiseDataset } from '../data/schema'

export {
  DEFAULT_BENCHMARK_SELECTION,
  benchmarkFromReference,
  configurationsForEntryBoard,
  configurationsForEntryBoard as selectMappedBenchmarkConfigurations,
  selectDefaultBenchmarkReference,
  selectDefaultBenchmarkReference as selectDefaultBenchmark,
  type BenchmarkConfigFilter,
  type BenchmarkReference,
} from '../data/benchmark-selection'

export function selectBenchmarkConfigurations(
  dataset: SubAIWiseDataset,
  opts: { boardId?: string; modelId?: string; entryId?: string } = {},
): BenchmarkConfiguration[] {
  let configurations = dataset.benchmarkConfigurations
  if (opts.boardId) {
    configurations = configurations.filter((item) => item.boardId === opts.boardId)
  }
  if (opts.modelId) {
    configurations = configurations.filter((item) => item.modelId === opts.modelId)
  }
  if (opts.entryId) {
    const ids = new Set(
      dataset.benchmarkMappings
        .filter((mapping) => mapping.entryId === opts.entryId)
        .map((mapping) => mapping.configurationId),
    )
    configurations = configurations.filter((item) => ids.has(item.id))
  }
  return configurations
}

export function selectBenchmarkMappings(
  dataset: SubAIWiseDataset,
  opts: { entryId?: string; configurationId?: string } = {},
) {
  return dataset.benchmarkMappings.filter((mapping) => {
    if (opts.entryId && mapping.entryId !== opts.entryId) return false
    if (opts.configurationId && mapping.configurationId !== opts.configurationId) return false
    return true
  })
}