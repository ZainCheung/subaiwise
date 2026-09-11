import { z } from 'zod'

/**
 * The upstream payload is intentionally isolated in this module.  Nothing in
 * the UI imports these types; the adapter is the only boundary crossing.
 */
export const UpstreamBoardSchema = z.object({
  name: z.string(),
  metric: z.string(),
  url: z.string().url(),
  snapshot: z.string(),
})

export const UpstreamPointSchema = z
  .object({
    id: z.string().min(1),
    plan: z.string().min(1),
    billing: z.enum(['subscription', 'metered']),
    model: z.string().min(1),
    model_display: z.string().min(1),
    vendor: z.string().min(1),
    label: z.string().optional().default(''),
    price_usd: z.number().nullable(),
    monthly_yi: z.number().nullable(),
    real_usd_per_mtok: z.number().finite(),
    list_blended_usd_per_mtok: z.number().nullable(),
    d: z.number().nullable().optional(),
    confidence: z.string(),
    tier: z.string(),
    source: z.string(),
    note: z.string().optional().default(''),
  })
  .passthrough()

export const UpstreamPayloadSchema = z.object({
  generatedAt: z.string().min(1),
  mix: z.object({
    cache: z.number().finite(),
    input: z.number().finite(),
    output: z.number().finite(),
  }),
  boards: z.record(UpstreamBoardSchema),
  points: z.array(UpstreamPointSchema),
})

export const UpstreamPointsPayloadSchema = UpstreamPayloadSchema

export const UpstreamConfigurationSchema = z
  .object({
    configuration_id: z.string().min(1),
    board: z.string().min(1),
    model: z.string().min(1),
    variant: z.string().nullable().optional(),
    score: z.number().finite().nullable().optional(),
    score_is_estimated: z.boolean().nullable().optional(),
    score_low: z.number().finite().nullable().optional(),
    score_high: z.number().finite().nullable().optional(),
    agent_harness: z.string().nullable().optional(),
    reasoning_effort: z.string().nullable().optional(),
    service_mode: z.string().nullable().optional(),
    mean_cost_usd_per_task: z.number().finite().nullable().optional(),
    median_cost_usd_per_task: z.number().finite().nullable().optional(),
    source: z.string().nullable().optional(),
    archive: z.string().nullable().optional(),
    checked_at: z.string().nullable().optional(),
  })
  .passthrough()

export const UpstreamMappingSchema = z
  .object({
    point_id: z.string().min(1),
    configuration_id: z.string().min(1),
    mapping_kind: z.string().nullable().optional(),
    mapping_confidence: z.string().nullable().optional(),
    mapping_note: z.string().nullable().optional(),
    quota_effort_matched: z.boolean().nullable().optional(),
  })
  .passthrough()

export type UpstreamBoard = z.infer<typeof UpstreamBoardSchema>
export type UpstreamPoint = z.infer<typeof UpstreamPointSchema>
export type UpstreamPayload = z.infer<typeof UpstreamPayloadSchema>
export type UpstreamConfiguration = z.infer<typeof UpstreamConfigurationSchema>
export type UpstreamMapping = z.infer<typeof UpstreamMappingSchema>

/**
 * Guard the dynamic benchmark boundary against silent field renames.  A
 * declared leaderboard must have its conventional score field on at least one
 * row; otherwise the adapter would quietly turn a populated board into nulls.
 */
export function validateUpstreamBenchmarkFields(payload: UpstreamPayload): void {
  for (const board of Object.keys(payload.boards)) {
    const scoreField = `${board}__score`
    const hasScoreField = payload.points.some((point) =>
      Object.prototype.hasOwnProperty.call(point, scoreField),
    )
    if (!hasScoreField) {
      throw new Error(
        `Upstream schema drift detected: board "${board}" exists but no ${scoreField} field was found.`,
      )
    }
  }
}
