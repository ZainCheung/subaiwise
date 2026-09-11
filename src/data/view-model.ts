import type { SubAIWiseDataset, SubAIWiseEntry } from './schema'
import { TOKENS_PER_YI } from './adapter'
import type { BoardKey, BoardMeta, PointsPayload, PricingPoint } from '../types'
import {
  availableLeaderboardKeys,
  canonicalBenchmarkKey,
} from '../lib/leaderboards'

/**
 * @deprecated Compatibility view model for the migrated explorer UI.
 *
 * The explorer components are intentionally kept visually identical to the
 * reference website. This boundary translates the canonical SubAIWise model
 * into the small chart/table view model they need; it never reads upstream
 * JSON or exposes the upstream payload to the application.
 *
 * Leaderboard availability is taken from the canonical dataset. Presentation
 * metadata lives in `src/lib/leaderboards.ts` and must not drop unknown boards.
 *
 * @deprecated migration compatibility only; do not use for new features.
 */
function boardMeta(dataset: SubAIWiseDataset, key: BoardKey): BoardMeta {
  const metadata = dataset.leaderboards[key]
  if (!metadata) {
    return { name: key, metric: 'Score', url: 'https://example.com', snapshot: dataset.snapshot }
  }
  return metadata
}

function setBenchmarkFields(point: PricingPoint, board: BoardKey, entry: SubAIWiseEntry): void {
  const benchmark = entry.benchmarks[canonicalBenchmarkKey(board)]
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

function toPoint(entry: SubAIWiseEntry, boards: readonly string[]): PricingPoint {
  const point = {
    id: entry.id,
    plan: entry.plan.name,
    billing: entry.plan.billing,
    model: entry.model.id,
    model_display: entry.model.name,
    vendor: entry.provider,
    channel: entry.channel,
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

  boards.forEach((board) => setBenchmarkFields(point, board, entry))
  return point
}

export function toPointsPayload(dataset: SubAIWiseDataset): PointsPayload {
  const boards = availableLeaderboardKeys(dataset.leaderboards)
  return {
    generatedAt: dataset.snapshot,
    mix: dataset.workloadMix,
    boards: Object.fromEntries(
      boards.map((board) => [board, boardMeta(dataset, board)]),
    ),
    points: dataset.entries.map((entry) => toPoint(entry, boards)),
  }
}
