import { describe, expect, it } from 'vitest'
import type { SubAIWiseDataset, SubAIWiseEntry } from '../data/schema'
import { computeInsights, computeStats, subscriptionEntries } from './stats'

function entry(id: string, overrides: Partial<SubAIWiseEntry> = {}): SubAIWiseEntry {
  return {
    id,
    label: `${id} label`,
    provider: id.split('-')[0],
    channel: 'OpenCode',
    plan: { id: `${id}-plan`, name: 'OpenCode Go', billing: 'subscription' },
    model: { id, name: id },
    pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 0.1, listUsdPerMillionTokens: 1 },
    allowance: { monthlyTokens: 100_000_000 },
    quality: { confidence: 'high', tier: 'main' },
    benchmarks: { codeArena: { score: 1200 } },
    source: { label: 'fixture', note: '' },
    ...overrides,
  }
}

function dataset(entries: SubAIWiseEntry[]): SubAIWiseDataset {
  return {
    schemaVersion: 2,
    snapshot: '2026-01-01',
    source: { repository: 'fixture', commit: 'f'.repeat(40) },
    workloadMix: { cache: 0.975, input: 0.0215, output: 0.0035 },
    leaderboards: {},
    entries,
    benchmarkConfigurations: [],
    benchmarkMappings: [],
  }
}

describe('canonical stats', () => {
  it('computes snapshot counts without the legacy PricingPoint shape', () => {
    const data = dataset([
      entry('alpha-one'),
      entry('beta-two', {
        plan: { id: 'beta-plan', name: 'API baseline', billing: 'metered' },
        allowance: { monthlyTokens: null },
        benchmarks: { designArena: { score: 88 } },
      }),
    ])

    expect(computeStats(data)).toMatchObject({
      total: 2,
      subscription: 1,
      metered: 1,
      opencodeGo: 1,
      arenaCode: 1,
      designArena: 1,
      vendors: 2,
    })
    expect(subscriptionEntries(data.entries).map((item) => item.id)).toEqual(['alpha-one'])
  })

  it('selects canonical price, allowance, and Code Arena frontier insights', () => {
    const cheap = entry('cheap', {
      pricing: { monthlyUsd: 10, effectiveUsdPerMillionTokens: 0.01, listUsdPerMillionTokens: 1 },
      allowance: { monthlyTokens: 50_000_000 },
      benchmarks: { codeArena: { score: 1000 } },
    })
    const strong = entry('strong', {
      pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 0.02, listUsdPerMillionTokens: 1 },
      allowance: { monthlyTokens: 200_000_000 },
      benchmarks: { codeArena: { score: 1400 } },
    })
    const insights = computeInsights(dataset([strong, cheap]))

    expect(insights.lowest?.id).toBe('cheap')
    expect(insights.largest?.id).toBe('strong')
    expect(insights.frontier?.id).toBe('strong')
  })
})
