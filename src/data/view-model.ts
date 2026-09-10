import type { SubAIWiseDataset, SubAIWiseEntry } from './schema'
import { TOKENS_PER_YI } from './adapter'
import type { BoardKey, BoardMeta, PointsPayload, PricingPoint } from '../types'

/**
 * Compatibility view model for the migrated explorer UI.
 *
 * The explorer components are intentionally kept visually identical to the
 * reference website. This boundary translates the canonical SubAIWise model
 * into the small chart/table view model they need; it never reads upstream
 * JSON or exposes the upstream payload to the application.
 */
const BOARD_MAP: Record<BoardKey, keyof SubAIWiseEntry['benchmarks']> = {
  arena_code: 'codeArena',
  arena_agent_mode: 'agentArena',
  aa_intelligence_index: 'intelligence',
  aa_coding_agent_index: 'codingAgent',
}

function boardMeta(dataset: SubAIWiseDataset, key: BoardKey): BoardMeta {
  const metadata = dataset.leaderboards[key]
  if (!metadata) {
    return { name: key, metric: 'Score', url: 'https://example.com', snapshot: dataset.snapshot }
  }
  return metadata
}

function setBenchmarkFields(point: PricingPoint, board: BoardKey, entry: SubAIWiseEntry): void {
  const benchmark = entry.benchmarks[BOARD_MAP[board]]
  const target = point as unknown as Record<string, string | number | null>
  target[`${board}__score`] = benchmark?.score ?? null
  target[`${board}__variant`] = benchmark?.variant ?? null
  target[`${board}__score_low`] = benchmark?.scoreLow ?? null
  target[`${board}__score_high`] = benchmark?.scoreHigh ?? null
  target[`${board}__mean_cost_usd_per_task`] = benchmark?.meanCostUsdPerTask ?? null
  target[`${board}__median_cost_usd_per_task`] = benchmark?.medianCostUsdPerTask ?? null
  target[`${board}__source`] = benchmark?.source ?? null
  target[`${board}__mapping_confidence`] = benchmark?.mappingConfidence ?? null
  target[`${board}__mapping_note`] = benchmark?.mappingNote ?? null
  target[`${board}__agent_harness`] = benchmark?.agentHarness ?? null
  target[`${board}__reasoning_effort`] = benchmark?.reasoningEffort ?? null
  target[`${board}__service_mode`] = benchmark?.serviceMode ?? null
  target[`${board}__selection`] = benchmark?.selection ?? null
  target[`${board}__configuration_count`] = benchmark?.configurationCount ?? null
}

function toPoint(entry: SubAIWiseEntry): PricingPoint {
  const point = {
    id: entry.id,
    plan: entry.plan.name,
    billing: entry.plan.billing,
    model: entry.model.id,
    model_display: entry.model.name,
    vendor: entry.provider,
    label: entry.label ?? `${entry.model.name} · ${entry.plan.name}`,
    price_usd: entry.pricing.monthlyUsd,
    monthly_yi:
      entry.allowance.monthlyTokens == null
        ? null
        : entry.allowance.monthlyTokens / TOKENS_PER_YI,
    real_usd_per_mtok: entry.pricing.effectiveUsdPerMillionTokens,
    list_blended_usd_per_mtok: entry.pricing.listUsdPerMillionTokens,
    d: null,
    confidence: entry.quality.confidence,
    tier: entry.quality.tier,
    source: entry.source.label,
    note: entry.source.note,
  } as PricingPoint

  ;(['arena_code', 'arena_agent_mode', 'aa_intelligence_index', 'aa_coding_agent_index'] as BoardKey[]).forEach(
    (board) => setBenchmarkFields(point, board, entry),
  )
  return point
}

export function toPointsPayload(dataset: SubAIWiseDataset): PointsPayload {
  return {
    generatedAt: dataset.snapshot,
    mix: dataset.workloadMix,
    boards: {
      arena_code: boardMeta(dataset, 'arena_code'),
      arena_agent_mode: boardMeta(dataset, 'arena_agent_mode'),
      aa_intelligence_index: boardMeta(dataset, 'aa_intelligence_index'),
      aa_coding_agent_index: boardMeta(dataset, 'aa_coding_agent_index'),
    },
    points: dataset.entries.map(toPoint),
  }
}
