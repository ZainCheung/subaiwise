import { describe, expect, it } from 'vitest'
import type { SubAIWiseEntry } from '../data/schema'
import {
  filterCompareEntries,
  groupByModel,
  representativeForMetric,
  sortEntries,
} from '../domain/comparison'
import { selectBenchmarkScore } from '../domain/selectors'
import { formatScore } from './format'

function entry(partial: Partial<SubAIWiseEntry> & Pick<SubAIWiseEntry, 'id'>): SubAIWiseEntry {
  const plan = partial.plan ?? { id: 'plan', name: 'Plan', billing: 'subscription' }
  const model = partial.model ?? { id: 'model-a', name: 'Model A' }
  return {
    label: `${model.name} · ${plan.name}`,
    provider: 'Vendor',
    channel: 'Vendor',
    plan,
    model,
    pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 1, listUsdPerMillionTokens: 10 },
    allowance: { monthlyTokens: 100_000_000 },
    quality: { confidence: 'high', tier: 'main' },
    benchmarks: {},
    source: { label: '', note: '' },
    ...partial,
    id: partial.id,
  }
}

describe('representative selection', () => {
  const cheapSmall = entry({
    id: 'plan-a',
    plan: { id: 'plan-a', name: 'Plan A', billing: 'subscription' },
    pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 0.01, listUsdPerMillionTokens: 10 },
    allowance: { monthlyTokens: 2_000_000_000 },
  })
  const dearLarge = entry({
    id: 'plan-b',
    plan: { id: 'plan-b', name: 'Plan B', billing: 'subscription' },
    pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 0.02, listUsdPerMillionTokens: 10 },
    allowance: { monthlyTokens: 10_000_000_000 },
  })

  it('uses the lowest real price when sorting by price', () => {
    expect(representativeForMetric([cheapSmall, dearLarge], 'price').id).toBe('plan-a')
    expect(groupByModel([cheapSmall, dearLarge], 'price')[0].best.id).toBe('plan-a')
  })

  it('uses the largest monthly allowance when sorting by allowance', () => {
    expect(representativeForMetric([cheapSmall, dearLarge], 'allowance').id).toBe('plan-b')
    expect(groupByModel([cheapSmall, dearLarge], 'allowance')[0].best.id).toBe('plan-b')
  })

  it('uses the cheapest scored plan when sorting by a board', () => {
    const scoredCheap = entry({
      id: 'scored-cheap',
      plan: { id: 'scored-cheap', name: 'Scored cheap', billing: 'subscription' },
      pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 0.03, listUsdPerMillionTokens: 10 },
      benchmarks: { codeArena: { score: 1600 } },
    })
    const scoredDear = entry({
      id: 'scored-dear',
      plan: { id: 'scored-dear', name: 'Scored dear', billing: 'subscription' },
      pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 0.04, listUsdPerMillionTokens: 10 },
      benchmarks: { codeArena: { score: 1600 } },
    })
    const unscoredCheapest = entry({
      id: 'unscored',
      plan: { id: 'unscored', name: 'Unscored', billing: 'subscription' },
      pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 0.005, listUsdPerMillionTokens: 10 },
    })
    const best = representativeForMetric(
      [unscoredCheapest, scoredDear, scoredCheap],
      'arena_code',
    )
    expect(best.id).toBe('scored-cheap')
  })
})

describe('missing scores', () => {
  it('formats missing scores as a dash, not zero', () => {
    expect(formatScore(null)).toBe('—')
    expect(formatScore(undefined)).toBe('—')
    expect(formatScore(0)).toBe('0')
    expect(selectBenchmarkScore(entry({ id: 'none' }), 'arena_code')).toBeNull()
  })

  it('formats Terminal-Bench resolution rate as a percentage, not a bare score', () => {
    expect(formatScore(44.55, 'percent')).toBe('44.55%')
    expect(formatScore(45, 'percent')).toBe('45%')
    expect(formatScore(0, 'percent')).toBe('0%')
    expect(formatScore(null, 'percent')).toBe('—')
    expect(
      selectBenchmarkScore(
        entry({ id: 'tb', benchmarks: { terminalBench4: { score: 44.55 } } }),
        'terminal_bench_4',
      ),
    ).toBe(44.55)
  })

  it('sorts board-missing points after scored points', () => {
    const missing = entry({
      id: 'missing',
      benchmarks: { intelligence: { score: 50 } },
      pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 0.01, listUsdPerMillionTokens: 10 },
    })
    const scored = entry({
      id: 'scored',
      benchmarks: { codeArena: { score: 40 } },
      pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 0.5, listUsdPerMillionTokens: 10 },
    })
    const sorted = sortEntries([missing, scored], 'arena_code')
    expect(sorted.map((row) => row.id)).toEqual(['scored', 'missing'])
    expect(formatScore(selectBenchmarkScore(sorted[1], 'arena_code'))).toBe('—')
  })
})

describe('confidence filter', () => {
  it('filters pricing records and leaves benchmark scores untouched', () => {
    const high = entry({
      id: 'high',
      quality: { confidence: 'high', tier: 'main' },
      benchmarks: { codeArena: { score: 10 } },
    })
    const low = entry({
      id: 'low',
      quality: { confidence: 'low', tier: 'main' },
      benchmarks: { codeArena: { score: 90 } },
    })
    const filtered = filterCompareEntries([high, low], {
      query: '',
      billing: 'all',
      makers: null,
      confidence: new Set(['high']),
    })
    expect(filtered.map((row) => row.id)).toEqual(['high'])
    expect(selectBenchmarkScore(low, 'arena_code')).toBe(90)
  })
})
