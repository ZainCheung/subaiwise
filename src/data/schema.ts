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
  provider: z.string().min(1),
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
  benchmarks: z.record(BenchmarkSchema),
  source: z.object({
    label: z.string(),
    note: z.string(),
  }),
})
export type SubAIWiseEntry = z.infer<typeof SubAIWiseEntrySchema>

export const LocalEntryOverrideSchema = z
  .object({
    id: z.string().min(1).optional(),
    label: z.string().min(1).optional(),
    provider: z.string().min(1).optional(),
    plan: SubAIWiseEntrySchema.shape.plan.deepPartial().optional(),
    model: SubAIWiseEntrySchema.shape.model.deepPartial().optional(),
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

export const SubAIWiseDatasetSchema = z.object({
  schemaVersion: z.literal(1),
  snapshot: z.string().min(1),
  source: z.object({
    repository: z.string().min(1),
    commit: z.string().regex(/^[0-9a-f]{40}$/i),
  }),
  workloadMix: WorkloadMixSchema,
  leaderboards: z.record(BoardMetaSchema),
  entries: z.array(SubAIWiseEntrySchema),
})
export type SubAIWiseDataset = z.infer<typeof SubAIWiseDatasetSchema>
