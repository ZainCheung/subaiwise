import {
  BoardMetaSchema,
  LocalDataSchema,
  SubAIWiseDatasetSchema,
  SubAIWiseEntrySchema,
  type Benchmark,
  type BenchmarkConfiguration,
  type BenchmarkMapping,
  type LocalData,
  type LocalEntryOverride,
  type SubAIWiseDataset,
  type SubAIWiseEntry,
} from './schema'
import {
  planIdFromPointId,
  resolveChannel,
  warnUnknownChannels,
} from './channel'
import { deriveEntryBenchmarks } from './benchmark-selection'
import {
  UpstreamConfigurationSchema,
  UpstreamMappingSchema,
  UpstreamPayloadSchema,
  validateUpstreamBenchmarkFields,
  type UpstreamPayload,
  type UpstreamPoint,
} from './upstream-schema'

export const UPSTREAM_REPOSITORY = 'FeiZhuLulu/real-api-pricing'
export const TOKENS_PER_YI = 100_000_000

const BENCHMARK_NAMES: Record<string, string> = {
  arena_code: 'codeArena',
  arena_agent_mode: 'agentArena',
  aa_intelligence_index: 'intelligence',
  aa_coding_agent_index: 'codingAgent',
  open_design_arena: 'designArena',
}

function camelize(value: string): string {
  return value.replace(/[-_](\w)/g, (_, character: string) => character.toUpperCase())
}

function benchmarkName(upstreamBoard: string): string {
  return BENCHMARK_NAMES[upstreamBoard] ?? camelize(upstreamBoard)
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function nullableBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function buildBenchmark(point: UpstreamPoint, board: string): Benchmark {
  const prefix = `${board}__`

  return {
    score: nullableNumber(point[`${prefix}score`]),
    variant: nullableString(point[`${prefix}variant`]),
    scoreIsEstimated: nullableBoolean(point[`${prefix}score_is_estimated`]),
    scoreLow: nullableNumber(point[`${prefix}score_low`]),
    scoreHigh: nullableNumber(point[`${prefix}score_high`]),
    meanCostUsdPerTask: nullableNumber(point[`${prefix}mean_cost_usd_per_task`]),
    medianCostUsdPerTask: nullableNumber(point[`${prefix}median_cost_usd_per_task`]),
    source: nullableString(point[`${prefix}source`]),
    mappingConfidence: nullableString(point[`${prefix}mapping_confidence`]),
    mappingNote: nullableString(point[`${prefix}mapping_note`]),
    agentHarness: nullableString(point[`${prefix}agent_harness`]),
    reasoningEffort: nullableString(point[`${prefix}reasoning_effort`]),
    serviceMode: nullableString(point[`${prefix}service_mode`]),
    selection: nullableString(point[`${prefix}selection`]),
    configurationCount: nullableNumber(point[`${prefix}configuration_count`]),
    quotaEffortMatched: nullableBoolean(point[`${prefix}quota_effort_matched`]),
  }
}

function hasMeaningfulBenchmarkData(benchmark: Benchmark): boolean {
  return Object.entries(benchmark).some(([key, value]) => {
    if (value == null) return false
    if (value === '') return false

    if (key === 'configurationCount' && value === 0) {
      return false
    }

    return true
  })
}

/** Map one upstream row to the independent SubAIWise entry shape. */
export function adaptPoint(point: UpstreamPoint, boardNames: string[] = []): SubAIWiseEntry {
  const benchmarks: SubAIWiseEntry['benchmarks'] = {}

  for (const board of boardNames) {
    const benchmark = buildBenchmark(point, board)

    if (hasMeaningfulBenchmarkData(benchmark)) {
      benchmarks[benchmarkName(board)] = benchmark
    }
  }

  const planId =
    planIdFromPointId(point.id) ||
    point.plan.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  const channel = resolveChannel({
    id: point.id,
    planId,
    manufacturer: point.vendor,
  }).channel

  return SubAIWiseEntrySchema.parse({
    id: point.id,
    label: point.label || `${point.model_display} · ${point.plan}`,
    provider: point.vendor,
    channel,
    plan: {
      id: planId,
      name: point.plan,
      billing: point.billing,
    },
    model: {
      id: point.model,
      name: point.model_display || point.model,
    },
    pricing: {
      monthlyUsd: nullableNumber(point.price_usd),
      effectiveUsdPerMillionTokens: point.real_usd_per_mtok,
      listUsdPerMillionTokens: nullableNumber(point.list_blended_usd_per_mtok),
    },
    allowance: {
      monthlyTokens:
        point.monthly_yi == null ? null : point.monthly_yi * TOKENS_PER_YI,
    },
    quality: {
      confidence: point.confidence,
      tier: point.tier,
    },
    benchmarks,
    source: {
      label: point.source,
      note: point.note ?? '',
    },
  })
}

// Descriptive aliases keep the boundary easy to discover for scripts and tests.
export const adaptUpstreamPoint = adaptPoint

export type UpstreamBundle = {
  points: unknown
  configurations?: unknown
  mappings?: unknown
}

function normalizeBundle(input: unknown): Required<UpstreamBundle> {
  if (
    isRecord(input) &&
    'points' in input &&
    ('configurations' in input || 'mappings' in input) &&
    !('generatedAt' in input)
  ) {
    return {
      points: input.points,
      configurations: input.configurations ?? [],
      mappings: input.mappings ?? [],
    }
  }
  return { points: input, configurations: [], mappings: [] }
}

function adaptConfiguration(value: unknown): BenchmarkConfiguration {
  const raw = UpstreamConfigurationSchema.parse(value)
  return {
    id: raw.configuration_id,
    boardId: raw.board,
    modelId: raw.model,
    variant: raw.variant ?? null,
    score: raw.score ?? null,
    scoreIsEstimated: raw.score_is_estimated ?? null,
    scoreLow: raw.score_low ?? null,
    scoreHigh: raw.score_high ?? null,
    agentHarness: raw.agent_harness ?? null,
    reasoningEffort: raw.reasoning_effort ?? null,
    serviceMode: raw.service_mode ?? null,
    meanCostUsdPerTask: raw.mean_cost_usd_per_task ?? null,
    medianCostUsdPerTask: raw.median_cost_usd_per_task ?? null,
    source: raw.source ?? null,
    archive: raw.archive ?? null,
    checkedAt: raw.checked_at ?? null,
  }
}

function adaptMapping(value: unknown): BenchmarkMapping {
  const raw = UpstreamMappingSchema.parse(value)
  return {
    entryId: raw.point_id,
    configurationId: raw.configuration_id,
    mappingKind: raw.mapping_kind ?? null,
    mappingConfidence: raw.mapping_confidence ?? null,
    mappingNote: raw.mapping_note ?? null,
    quotaEffortMatched: raw.quota_effort_matched ?? null,
  }
}

export function assertBenchmarkIntegrity(dataset: SubAIWiseDataset): void {
  const boards = dataset.leaderboards
  const entries = new Map(dataset.entries.map((entry) => [entry.id, entry]))
  const configs = new Map<string, BenchmarkConfiguration>()

  for (const configuration of dataset.benchmarkConfigurations) {
    if (configs.has(configuration.id)) {
      throw new Error(`Duplicate benchmark configuration id: ${configuration.id}`)
    }
    if (!boards[configuration.boardId]) {
      throw new Error(
        `Benchmark configuration "${configuration.id}" references unknown board "${configuration.boardId}".`,
      )
    }
    configs.set(configuration.id, configuration)
  }

  const mappingKeys = new Set<string>()
  for (const mapping of dataset.benchmarkMappings) {
    const key = `${mapping.entryId}::${mapping.configurationId}`
    if (mappingKeys.has(key)) {
      throw new Error(`Duplicate benchmark mapping: ${key}`)
    }
    mappingKeys.add(key)

    const entry = entries.get(mapping.entryId)
    if (!entry) {
      throw new Error(`Benchmark mapping refers to unknown entry: ${mapping.entryId}`)
    }
    const configuration = configs.get(mapping.configurationId)
    if (!configuration) {
      throw new Error(
        `Benchmark mapping refers to unknown configuration: ${mapping.configurationId}`,
      )
    }
    if (configuration.modelId !== entry.model.id) {
      throw new Error(
        `Benchmark configuration "${configuration.id}" model "${configuration.modelId}" does not match entry "${entry.id}" model "${entry.model.id}".`,
      )
    }
  }
}

function deriveBenchmarks(dataset: SubAIWiseDataset): SubAIWiseDataset {
  const graph = {
    leaderboards: dataset.leaderboards,
    benchmarkConfigurations: dataset.benchmarkConfigurations,
    benchmarkMappings: dataset.benchmarkMappings,
  }
  const entries = dataset.entries.map((entry) => ({
    ...entry,
    benchmarks: deriveEntryBenchmarks(entry, graph),
  }))
  return { ...dataset, entries }
}

/** Adapt the complete, schema-validated upstream payload. */
export function adaptUpstream(
  payload: unknown,
  source: { repository: string; commit: string },
): SubAIWiseDataset {
  const bundle = normalizeBundle(payload)
  const upstream = UpstreamPayloadSchema.parse(bundle.points)
  validateUpstreamBenchmarkFields(upstream)
  const boardNames = Object.keys(upstream.boards).sort()
  const leaderboards = Object.fromEntries(
    boardNames.map((name) => [name, BoardMetaSchema.parse(upstream.boards[name])]),
  )
  const unknownPlanIds: string[] = []
  const entries = upstream.points.map((point) => {
    const planId =
      planIdFromPointId(point.id) ||
      point.plan.toLowerCase().replace(/[^a-z0-9]+/g, '_')
    const resolved = resolveChannel({
      id: point.id,
      planId,
      manufacturer: point.vendor,
    })
    if (!resolved.known) unknownPlanIds.push(resolved.planId)
    return adaptPoint(point, boardNames)
  })
  if (process.env.NODE_ENV !== 'test') {
    warnUnknownChannels(unknownPlanIds)
  }

  const configurations = Array.isArray(bundle.configurations)
    ? bundle.configurations.map(adaptConfiguration)
    : []
  const mappings = Array.isArray(bundle.mappings) ? bundle.mappings.map(adaptMapping) : []

  const dataset = deriveBenchmarks(
    SubAIWiseDatasetSchema.parse({
      schemaVersion: 2,
      snapshot: upstream.generatedAt,
      source,
      workloadMix: upstream.mix,
      leaderboards,
      entries,
      benchmarkConfigurations: stableSortConfigurations(configurations),
      benchmarkMappings: stableSortMappings(mappings),
    }),
  )
  assertBenchmarkIntegrity(dataset)
  return SubAIWiseDatasetSchema.parse(dataset)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Deterministic, non-mutating deep merge for local canonical overrides. */
export function mergeOverride<T>(base: T, override: unknown): T {
  if (!isRecord(base) || !isRecord(override)) {
    return (override === undefined ? base : override) as T
  }

  const result: Record<string, unknown> = { ...base }
  for (const key of Object.keys(override).sort()) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
    result[key] = key in result ? mergeOverride(result[key], override[key]) : override[key]
  }
  return result as T
}

function parseLocalData(local: unknown): LocalData {
  return LocalDataSchema.parse(local ?? {})
}

/** Apply exclusions, then canonical overrides, then local additions. */
export function applyLocalData(dataset: SubAIWiseDataset, local: unknown): SubAIWiseDataset {
  const patches = parseLocalData(local)
  const excluded = new Set(patches.exclusions)
  const overridden = dataset.entries
    .filter((entry) => !excluded.has(entry.id))
    .map((entry) => {
      const override = patches.overrides[entry.id]
      return override
        ? SubAIWiseEntrySchema.parse(mergeOverride(entry, override))
        : entry
    })

  const additionsById = new Map(patches.additions.map((entry) => [entry.id, entry]))
  const entries = overridden.filter((entry) => !additionsById.has(entry.id))
  entries.push(...additionsById.values())
  const entryIds = new Set(entries.map((entry) => entry.id))
  const mappings = dataset.benchmarkMappings.filter((mapping) => entryIds.has(mapping.entryId))

  const next = SubAIWiseDatasetSchema.parse({
    ...dataset,
    entries: stableSortEntries(entries),
    benchmarkMappings: stableSortMappings(mappings),
  })
  assertBenchmarkIntegrity(next)
  return next
}

export const applyLocalPatches = applyLocalData

export function stableSortEntries(entries: SubAIWiseEntry[]): SubAIWiseEntry[] {
  return [...entries].sort(
    (a, b) =>
      a.id.localeCompare(b.id) ||
      a.provider.localeCompare(b.provider) ||
      a.plan.id.localeCompare(b.plan.id) ||
      a.model.id.localeCompare(b.model.id),
  )
}

export function stableSortConfigurations(
  configurations: BenchmarkConfiguration[],
): BenchmarkConfiguration[] {
  return [...configurations].sort((a, b) => a.id.localeCompare(b.id))
}

export function stableSortMappings(mappings: BenchmarkMapping[]): BenchmarkMapping[] {
  return [...mappings].sort(
    (a, b) => a.entryId.localeCompare(b.entryId) || a.configurationId.localeCompare(b.configurationId),
  )
}

export function buildDataset(
  upstreamPayload: unknown,
  source: { repository: string; commit: string },
  local: unknown = {},
): SubAIWiseDataset {
  const adapted = adaptUpstream(upstreamPayload, source)
  return applyLocalData(
    {
      ...adapted,
      entries: stableSortEntries(adapted.entries),
      benchmarkConfigurations: stableSortConfigurations(adapted.benchmarkConfigurations),
      benchmarkMappings: stableSortMappings(adapted.benchmarkMappings),
    },
    local,
  )
}

export function serializeDataset(dataset: SubAIWiseDataset): string {
  const parsed = SubAIWiseDatasetSchema.parse({
    ...dataset,
    entries: stableSortEntries(dataset.entries),
    benchmarkConfigurations: stableSortConfigurations(dataset.benchmarkConfigurations),
    benchmarkMappings: stableSortMappings(dataset.benchmarkMappings),
  })
  return `${JSON.stringify(parsed, null, 2)}\n`
}

export type { LocalEntryOverride, UpstreamPayload }
