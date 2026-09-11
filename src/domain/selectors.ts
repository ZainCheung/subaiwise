import { TOKENS_PER_YI } from '../data/adapter'
import type {
  Benchmark,
  BoardMeta,
  SubAIWiseDataset,
  SubAIWiseEntry,
} from '../data/schema'
import type { IdFilter } from '../lib/filters'
import { matchesIdFilter } from '../lib/filters'
import {
  availableLeaderboardKeys,
  canonicalBenchmarkKey,
} from '../lib/leaderboards'

export function selectEntries(dataset: SubAIWiseDataset): SubAIWiseEntry[] {
  return dataset.entries
}

export function selectEntryById(
  dataset: SubAIWiseDataset,
  id: string,
): SubAIWiseEntry | undefined {
  return dataset.entries.find((entry) => entry.id === id)
}

export function selectAvailableLeaderboards(dataset: SubAIWiseDataset): string[] {
  return availableLeaderboardKeys(dataset.leaderboards)
}

export function selectLeaderboardMeta(
  dataset: SubAIWiseDataset,
  boardId: string,
): BoardMeta | undefined {
  return dataset.leaderboards[boardId]
}

export function selectBenchmark(
  entry: SubAIWiseEntry,
  boardId: string,
): Benchmark | undefined {
  return entry.benchmarks[canonicalBenchmarkKey(boardId)]
}

export function selectBenchmarkScore(entry: SubAIWiseEntry, boardId: string): number | null {
  const score = selectBenchmark(entry, boardId)?.score
  return typeof score === 'number' && Number.isFinite(score) ? score : null
}

export function selectBenchmarkVariant(entry: SubAIWiseEntry, boardId: string): string | null {
  return selectBenchmark(entry, boardId)?.variant ?? null
}

export function entryLabel(entry: SubAIWiseEntry): string {
  return entry.label ?? `${entry.model.name} · ${entry.plan.name}`
}

export function monthlyYi(entry: SubAIWiseEntry): number | null {
  const tokens = entry.allowance.monthlyTokens
  if (tokens == null) return null
  return tokens / TOKENS_PER_YI
}

export function selectEntriesForLeaderboard(
  entries: readonly SubAIWiseEntry[],
  boardId: string,
): SubAIWiseEntry[] {
  return entries.filter(
    (entry) =>
      selectBenchmarkScore(entry, boardId) != null &&
      entry.pricing.effectiveUsdPerMillionTokens > 0,
  )
}

export type ModelOption = {
  id: string
  label: string
  vendor: string
}

export function selectModels(entries: readonly SubAIWiseEntry[]): ModelOption[] {
  const map = new Map<string, ModelOption>()
  for (const entry of entries) {
    if (!map.has(entry.model.id)) {
      map.set(entry.model.id, {
        id: entry.model.id,
        label: entry.model.name,
        vendor: entry.provider,
      })
    }
  }
  return [...map.values()].sort(
    (a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id),
  )
}

export function selectChannels(entries: readonly SubAIWiseEntry[]): string[] {
  return [...new Set(entries.map((entry) => entry.channel))].sort((a, b) => a.localeCompare(b))
}

export function selectMakers(entries: readonly SubAIWiseEntry[]): string[] {
  return [...new Set(entries.map((entry) => entry.provider))].sort((a, b) => a.localeCompare(b))
}

export function filterEntries(
  entries: readonly SubAIWiseEntry[],
  opts: { models?: IdFilter; channels?: IdFilter } = {},
): SubAIWiseEntry[] {
  const models = opts.models === undefined ? null : opts.models
  const channels = opts.channels === undefined ? null : opts.channels
  if (models == null && channels == null) return [...entries]
  return entries.filter(
    (entry) =>
      matchesIdFilter(entry.model.id, models) && matchesIdFilter(entry.channel, channels),
  )
}
