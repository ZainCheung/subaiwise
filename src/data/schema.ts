import { z } from 'zod'

export const BillingSchema = z.enum(['subscription', 'metered'])
export type Billing = z.infer<typeof BillingSchema>

export const WorkloadMixSchema = z.object({
  cache: z.number().finite().min(0),
  input: z.number().finite().min(0),
  output: z.number().finite().min(0),
})
export type WorkloadMix = z.infer<typeof WorkloadMixSchema>

export const BoardMetaSchema = z.object({
  name: z.string(),
  metric: z.string(),
  url: z.string().url(),
  snapshot: z.string(),
})
export type BoardMeta = z.infer<typeof BoardMetaSchema>

export const BenchmarkSchema = z.object({
  score: z.number().finite().nullable().optional(),
  variant: z.string().nullable().optional(),
  scoreIsEstimated: z.boolean().nullable().optional(),
  scoreLow: z.number().finite().nullable().optional(),
  scoreHigh: z.number().finite().nullable().optional(),
  meanCostUsdPerTask: z.number().finite().nullable().optional(),
  medianCostUsdPerTask: z.number().finite().nullable().optional(),
  source: z.string().nullable().optional(),
  mappingConfidence: z.string().nullable().optional(),
  mappingNote: z.string().nullable().optional(),
  agentHarness: z.string().nullable().optional(),
  reasoningEffort: z.string().nullable().optional(),
  serviceMode: z.string().nullable().optional(),
  selection: z.string().nullable().optional(),
  configurationCount: z.number().int().nonnegative().nullable().optional(),
  quotaEffortMatched: z.boolean().nullable().optional(),
})
export type Benchmark = z.infer<typeof BenchmarkSchema>

export const SubAIWiseEntrySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).optional(),
  /** Model manufacturer (DeepSeek, OpenAI, Meta). Not the access/service provider. */
  provider: z.string().min(1),
  /** Access / service provider (Ollama, OpenCode, OpenAI). */
  channel: z.string().min(1),
  plan: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    billing: BillingSchema,
  }),
  model: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
  }),
  pricing: z.object({
    monthlyUsd: z.number().finite().nonnegative().nullable(),
    effectiveUsdPerMillionTokens: z.number().finite().nonnegative(),
    listUsdPerMillionTokens: z.number().finite().nonnegative().nullable(),
  }),
  allowance: z.object({
    monthlyTokens: z.number().finite().nonnegative().nullable(),
  }),
  quality: z.object({
    confidence: z.string(),
    tier: z.string(),
  }),
  /**
   * @deprecated Derived summary of the default mapped configuration per board.
   * Canonical truth is `benchmarkConfigurations` + `benchmarkMappings`.
   */
  benchmarks: z.record(BenchmarkSchema),
  source: z.object({
    label: z.string(),
    note: z.string(),
  }),
})
export type SubAIWiseEntry = z.infer<typeof SubAIWiseEntrySchema>

/**
 * Overrides may change observations, but never identity.  An identity change
 * belongs in `exclusions` plus an `additions` entry instead.
 */
const LocalPlanOverrideSchema = SubAIWiseEntrySchema.shape.plan
  .omit({ id: true })
  .deepPartial()
  .strict()
const LocalModelOverrideSchema = SubAIWiseEntrySchema.shape.model
  .omit({ id: true })
  .deepPartial()
  .strict()

export const LocalEntryOverrideSchema = z
  .object({
    label: z.string().min(1).optional(),
    provider: z.string().min(1).optional(),
    channel: z.string().min(1).optional(),
    plan: LocalPlanOverrideSchema.optional(),
    model: LocalModelOverrideSchema.optional(),
    pricing: SubAIWiseEntrySchema.shape.pricing.deepPartial().optional(),
    allowance: SubAIWiseEntrySchema.shape.allowance.deepPartial().optional(),
    quality: SubAIWiseEntrySchema.shape.quality.deepPartial().optional(),
    benchmarks: z.record(BenchmarkSchema.deepPartial()).optional(),
    source: SubAIWiseEntrySchema.shape.source.deepPartial().optional(),
  })
  .strict()
export type LocalEntryOverride = z.infer<typeof LocalEntryOverrideSchema>

export const LocalDataSchema = z.object({
  additions: z.array(SubAIWiseEntrySchema).default([]),
  overrides: z.record(LocalEntryOverrideSchema).default({}),
  exclusions: z.array(z.string().min(1)).default([]),
})
export type LocalData = z.infer<typeof LocalDataSchema>

export const BenchmarkConfigurationSchema = z.object({
  id: z.string().min(1),
  boardId: z.string().min(1),
  modelId: z.string().min(1),
  variant: z.string().nullable().optional(),
  score: z.number().finite().nullable().optional(),
  scoreIsEstimated: z.boolean().nullable().optional(),
  scoreLow: z.number().finite().nullable().optional(),
  scoreHigh: z.number().finite().nullable().optional(),
  agentHarness: z.string().nullable().optional(),
  reasoningEffort: z.string().nullable().optional(),
  serviceMode: z.string().nullable().optional(),
  meanCostUsdPerTask: z.number().finite().nullable().optional(),
  medianCostUsdPerTask: z.number().finite().nullable().optional(),
  source: z.string().nullable().optional(),
  archive: z.string().nullable().optional(),
  checkedAt: z.string().nullable().optional(),
})
export type BenchmarkConfiguration = z.infer<typeof BenchmarkConfigurationSchema>

export const BenchmarkMappingSchema = z.object({
  entryId: z.string().min(1),
  configurationId: z.string().min(1),
  mappingKind: z.string().nullable().optional(),
  mappingConfidence: z.string().nullable().optional(),
  mappingNote: z.string().nullable().optional(),
  quotaEffortMatched: z.boolean().nullable().optional(),
})
export type BenchmarkMapping = z.infer<typeof BenchmarkMappingSchema>

export const SubAIWiseDatasetSchema = z.object({
  /**
   * 2: benchmarkConfigurations / benchmarkMappings are canonical.
   * `entry.benchmarks` is a derived summary from default selection and is
   * kept for product selectors until a later removal.
   */
  schemaVersion: z.literal(2),
  snapshot: z.string().min(1),
  source: z.object({
    repository: z.string().min(1),
    commit: z.string().regex(/^[0-9a-f]{40}$/i),
  }),
  workloadMix: WorkloadMixSchema,
  leaderboards: z.record(BoardMetaSchema),
  entries: z.array(SubAIWiseEntrySchema),
  benchmarkConfigurations: z.array(BenchmarkConfigurationSchema),
  benchmarkMappings: z.array(BenchmarkMappingSchema),
})
export type SubAIWiseDataset = z.infer<typeof SubAIWiseDatasetSchema>
