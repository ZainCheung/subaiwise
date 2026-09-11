import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SubAIWiseDatasetSchema } from '../data/schema'
import { subscriptionFrontier } from './leaderboards'
import { selectPriceRows } from './pricing'
import {
  EMPTY_ADVANCED_FILTERS,
  activeAdvancedFilterCount,
  benchmarkScoreFor,
  filterEntriesByAdvanced,
} from './advanced-filters'

const dataset = SubAIWiseDatasetSchema.parse(
  JSON.parse(readFileSync('data/dataset.json', 'utf8')),
)

describe('advanced filters', () => {
  it('treats model maker as an entry filter', () => {
    const filtered = filterEntriesByAdvanced(dataset.entries, {
      ...EMPTY_ADVANCED_FILTERS,
      makers: new Set(['OpenAI']),
    })
    expect(filtered.length).toBeGreaterThan(0)
    expect(filtered.every((entry) => entry.provider === 'OpenAI')).toBe(true)
  })

  it('ORs within a group and ANDs across groups', () => {
    const filtered = filterEntriesByAdvanced(dataset.entries, {
      ...EMPTY_ADVANCED_FILTERS,
      makers: new Set(['OpenAI', 'Anthropic']),
      confidence: new Set(['high']),
    })
    expect(filtered.every((entry) => entry.provider === 'OpenAI' || entry.provider === 'Anthropic')).toBe(
      true,
    )
    expect(filtered.every((entry) => entry.quality.confidence === 'high')).toBe(true)
  })

  it('does not drop price rows when a harness filter is active', () => {
    const allPrices = selectPriceRows(dataset.entries)
    const filteredEntries = filterEntriesByAdvanced(dataset.entries, {
      ...EMPTY_ADVANCED_FILTERS,
      harness: new Set(['Claude Code']),
    })
    expect(selectPriceRows(filteredEntries)).toHaveLength(allPrices.length)
  })

  it('clears the compare/leaderboard score when no configuration matches', () => {
    const entry = dataset.entries.find((item) =>
      dataset.benchmarkMappings.some((mapping) => mapping.entryId === item.id),
    )
    expect(entry).toBeDefined()
    const unfiltered = benchmarkScoreFor(dataset, entry!, 'terminal_bench_4', EMPTY_ADVANCED_FILTERS)
    const filtered = benchmarkScoreFor(dataset, entry!, 'terminal_bench_4', {
      ...EMPTY_ADVANCED_FILTERS,
      harness: new Set(['__no_such_harness__']),
    })
    expect(filtered).toBeNull()
    if (unfiltered != null) {
      expect(unfiltered).not.toBeNull()
    }
  })

  it('recomputes the frontier after benchmark filters', () => {
    const before = subscriptionFrontier(dataset.entries, 'aa_coding_agent_index').map((row) => row.id)
    const after = subscriptionFrontier(dataset.entries, 'aa_coding_agent_index', (entry) =>
      benchmarkScoreFor(dataset, entry, 'aa_coding_agent_index', {
        ...EMPTY_ADVANCED_FILTERS,
        harness: new Set(['Claude Code']),
      }),
    ).map((row) => row.id)
    expect(before.length).toBeGreaterThan(0)
    expect(after).not.toEqual(before)
    expect(activeAdvancedFilterCount(EMPTY_ADVANCED_FILTERS)).toBe(0)
    expect(
      activeAdvancedFilterCount({
        ...EMPTY_ADVANCED_FILTERS,
        harness: new Set(['Claude Code']),
        effort: new Set(['max']),
      }),
    ).toBe(2)
  })
})
