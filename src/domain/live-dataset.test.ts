import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { assertBenchmarkIntegrity } from '../data/adapter'
import { resolveChannel } from '../data/channel'
import { SubAIWiseDatasetSchema, type SubAIWiseEntry } from '../data/schema'
import { selectDefaultBenchmarkReference } from './benchmarks'
import { filterCompareEntries, sortEntries } from './comparison'
import { mostEfficientEntry, subscriptionFrontier } from './leaderboards'
import { selectAllowanceRows, selectPriceRows } from './pricing'
import { canonicalBenchmarkKey } from '../lib/leaderboards'
import {
  selectAvailableLeaderboards,
  selectBenchmarkScore,
  selectEntriesForLeaderboard,
  selectMakers,
} from './selectors'

const live = SubAIWiseDatasetSchema.parse(
  JSON.parse(readFileSync('data/dataset.json', 'utf8')),
)

function scoredSubscriptions(entries: readonly SubAIWiseEntry[], boardId: string): SubAIWiseEntry[] {
  return entries.filter(
    (entry) =>
      entry.plan.billing === 'subscription' &&
      selectBenchmarkScore(entry, boardId) != null &&
      entry.pricing.effectiveUsdPerMillionTokens > 0,
  )
}

function isStrictlyDominated(
  entry: SubAIWiseEntry,
  pool: readonly SubAIWiseEntry[],
  boardId: string,
): boolean {
  const price = entry.pricing.effectiveUsdPerMillionTokens
  const score = selectBenchmarkScore(entry, boardId)
  if (score == null) return true
  return pool.some((other) => {
    if (other.id === entry.id) return false
    const otherPrice = other.pricing.effectiveUsdPerMillionTokens
    const otherScore = selectBenchmarkScore(other, boardId)
    if (otherScore == null) return false
    return (otherPrice <= price && otherScore >= score) && (otherPrice < price || otherScore > score)
  })
}

describe('live dataset invariants', () => {
  it('keeps configuration/mapping referential integrity', () => {
    expect(() => assertBenchmarkIntegrity(live)).not.toThrow()
    expect(live.benchmarkConfigurations.length).toBeGreaterThan(0)
    expect(live.benchmarkMappings.length).toBeGreaterThan(0)
  })

  it('keeps derived entry.benchmarks aligned with highest_archived_reference', () => {
    for (const entry of live.entries) {
      for (const boardId of selectAvailableLeaderboards(live)) {
        const selected = selectDefaultBenchmarkReference(live, entry.id, boardId)
        const derived = entry.benchmarks[canonicalBenchmarkKey(boardId)]
        if (!selected) continue
        expect(derived?.score).toBe(selected.configuration.score)
        expect(derived?.selection).toBe('highest_archived_reference')
      }
    }
  })

  it('does not coerce a missing score to zero', () => {
    for (const entry of live.entries) {
      for (const boardId of selectAvailableLeaderboards(live)) {
        const score = selectBenchmarkScore(entry, boardId)
        if (entry.benchmarks[canonicalBenchmarkKey(boardId)] == null) {
          expect(score).toBeNull()
        }
        if (score === 0) {
          expect(entry.benchmarks[canonicalBenchmarkKey(boardId)]?.score).toBe(0)
        }
      }
    }
  })

  it('discovers every published board and only those boards', () => {
    const discovered = selectAvailableLeaderboards(live)
    expect(new Set(discovered)).toEqual(new Set(Object.keys(live.leaderboards)))
    expect(discovered.every((board) => board.length > 0)).toBe(true)
  })

  it('resolves every published plan prefix to a known channel', () => {
    const unknown: string[] = []
    for (const entry of live.entries) {
      const resolved = resolveChannel({
        id: entry.id,
        planId: entry.plan.id,
        manufacturer: entry.provider,
      })
      expect(entry.channel).toBe(resolved.channel)
      if (!resolved.known) unknown.push(entry.plan.id)
    }
    expect(unknown).toEqual([])
  })

  it('keeps makers as the sorted unique provider set', () => {
    expect(selectMakers(live.entries)).toEqual(
      [...new Set(live.entries.map((entry) => entry.provider))].sort((a, b) => a.localeCompare(b)),
    )
  })

  it('keeps price and allowance rows monotonic', () => {
    const prices = selectPriceRows(live.entries).map((row) => row.realUsdPerMtok)
    for (let i = 1; i < prices.length; i += 1) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1])
    }
    const allowances = selectAllowanceRows(live.entries).map((row) => row.monthlyYi)
    for (let i = 1; i < allowances.length; i += 1) {
      expect(allowances[i]).toBeLessThanOrEqual(allowances[i - 1])
    }
  })

  it('keeps compare sorts monotonic, with missing scores last', () => {
    const byPrice = sortEntries(live.entries, 'price')
    for (let i = 1; i < byPrice.length; i += 1) {
      expect(byPrice[i].pricing.effectiveUsdPerMillionTokens).toBeGreaterThanOrEqual(
        byPrice[i - 1].pricing.effectiveUsdPerMillionTokens,
      )
    }

    const board = selectAvailableLeaderboards(live)[0]
    const byBoard = sortEntries(live.entries, board)
    const firstMissing = byBoard.findIndex((entry) => selectBenchmarkScore(entry, board) == null)
    if (firstMissing >= 0) {
      expect(byBoard.slice(firstMissing).every((entry) => selectBenchmarkScore(entry, board) == null)).toBe(
        true,
      )
    }
    const scored = firstMissing === -1 ? byBoard : byBoard.slice(0, firstMissing)
    for (let i = 1; i < scored.length; i += 1) {
      expect(selectBenchmarkScore(scored[i], board)!).toBeLessThanOrEqual(
        selectBenchmarkScore(scored[i - 1], board)!,
      )
    }
  })

  it('keeps each board frontier nondominated, strictly improving, and complete at the cheap end', () => {
    for (const boardId of selectAvailableLeaderboards(live)) {
      const pool = scoredSubscriptions(live.entries, boardId)
      const frontier = subscriptionFrontier(live.entries, boardId)
      expect(frontier.every((entry) => !isStrictlyDominated(entry, pool, boardId))).toBe(true)

      for (let i = 1; i < frontier.length; i += 1) {
        expect(frontier[i].pricing.effectiveUsdPerMillionTokens).toBeGreaterThan(
          frontier[i - 1].pricing.effectiveUsdPerMillionTokens,
        )
        expect(selectBenchmarkScore(frontier[i], boardId)!).toBeGreaterThan(
          selectBenchmarkScore(frontier[i - 1], boardId)!,
        )
      }

      if (pool.length) {
        const cheapest = [...pool].sort(
          (a, b) =>
            a.pricing.effectiveUsdPerMillionTokens - b.pricing.effectiveUsdPerMillionTokens ||
            (selectBenchmarkScore(b, boardId) ?? 0) - (selectBenchmarkScore(a, boardId) ?? 0),
        )[0]
        expect(frontier[0]?.id).toBe(cheapest.id)
      }

      const scored = selectEntriesForLeaderboard(live.entries, boardId)
      expect(scored.every((entry) => selectBenchmarkScore(entry, boardId) != null)).toBe(true)
      expect(mostEfficientEntry(live.entries, boardId) == null || scored.length > 0).toBe(true)
    }
  })

  it('does not treat empty compare filters as a fixed snapshot size', () => {
    const high = filterCompareEntries(live.entries, {
      query: '',
      billing: 'all',
      vendor: 'all',
      confidence: 'high',
    })
    expect(high.every((entry) => entry.quality.confidence === 'high')).toBe(true)
    expect(high.length).toBe(
      live.entries.filter((entry) => entry.quality.confidence === 'high').length,
    )
  })
})
