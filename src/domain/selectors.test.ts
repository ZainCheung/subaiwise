import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SubAIWiseDatasetSchema, type SubAIWiseDataset, type SubAIWiseEntry } from '../data/schema'
import {
  filterCompareEntries,
  representativeForMetric,
  sortEntries,
} from './comparison'
import { mostEfficientEntry, subscriptionFrontier } from './leaderboards'
import { apiSavingRatio, formatApiSaving, selectAllowanceRows, selectPriceRows } from './pricing'
import {
  filterEntries,
  monthlyYi,
  selectAvailableLeaderboards,
  selectBenchmark,
  selectBenchmarkScore,
  selectChannels,
  selectEntriesForLeaderboard,
  selectMakers,
  selectModels,
} from './selectors'

function entry(id: string, overrides: Partial<SubAIWiseEntry> = {}): SubAIWiseEntry {
  const [planId, modelId] = id.includes('::') ? id.split('::') : [`${id}-plan`, id]
  return {
    id,
    label: `${id} label`,
    provider: 'Vendor',
    channel: 'Vendor',
    plan: { id: planId, name: 'Plan', billing: 'subscription' },
    model: { id: modelId ?? id, name: modelId ?? id },
    pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 0.1, listUsdPerMillionTokens: 1 },
    allowance: { monthlyTokens: 100_000_000 },
    quality: { confidence: 'high', tier: 'main' },
    benchmarks: {},
    source: { label: 'fixture', note: '' },
    ...overrides,
  }
}

function dataset(
  partial: Partial<SubAIWiseDataset> & Pick<SubAIWiseDataset, 'entries' | 'leaderboards'>,
): SubAIWiseDataset {
  return SubAIWiseDatasetSchema.parse({
    schemaVersion: 2,
    snapshot: '2026-01-01',
    source: { repository: 'fixture', commit: 'a'.repeat(40) },
    workloadMix: { cache: 0.975, input: 0.0215, output: 0.0035 },
    benchmarkConfigurations: [],
    benchmarkMappings: [],
    ...partial,
  })
}

function board(name: string, metric = 'Score') {
  return {
    name,
    metric,
    url: `https://example.com/${name}`,
    snapshot: '2026-01-01',
  }
}

const known = SubAIWiseDatasetSchema.parse(
  JSON.parse(readFileSync('tests/fixtures/known-dataset.json', 'utf8')),
)

describe('canonical selectors', () => {
  it('maps a canonical entry to compare-relevant fields without flattened board scores', () => {
    const row = entry('plan::model', {
      provider: 'DeepSeek',
      channel: 'Ollama',
      benchmarks: { codeArena: { score: 1400, variant: 'webdev' } },
    })
    expect(row.pricing.effectiveUsdPerMillionTokens).toBe(0.1)
    expect(selectBenchmark(row, 'arena_code')?.score).toBe(1400)
    expect(selectBenchmarkScore(row, 'arena_code')).toBe(1400)
    expect((row as Record<string, unknown>).arena_code__score).toBeUndefined()
  })

  it('returns null for a missing benchmark instead of zero', () => {
    const row = entry('missing', { benchmarks: { codeArena: { score: 1300 } } })
    expect(selectBenchmarkScore(row, 'terminal_bench_4')).toBeNull()
    expect(selectBenchmark(row, 'terminal_bench_4')).toBeUndefined()
  })

  it('discovers Terminal-Bench and unknown boards from the dataset', () => {
    const data = dataset({
      leaderboards: {
        arena_code: board('Code Arena'),
        terminal_bench_4: board('Terminal-Bench 4.0', 'Resolution Rate %'),
        future_lab_index: board('Future Lab Index', 'Accuracy %'),
      },
      entries: [
        entry('one', {
          benchmarks: {
            codeArena: { score: 1200 },
            terminalBench4: { score: 44.55 },
            futureLabIndex: { score: 81.2 },
          },
        }),
      ],
    })
    expect(selectAvailableLeaderboards(data)).toEqual([
      'arena_code',
      'terminal_bench_4',
      'future_lab_index',
    ])
    expect(selectBenchmarkScore(data.entries[0], 'terminal_bench_4')).toBe(44.55)
    expect(selectBenchmarkScore(data.entries[0], 'future_lab_index')).toBe(81.2)
  })

  it('filters first-party and third-party identities by model id and channel', () => {
    const rows = [
      entry('ollama_pro::deepseek-v4-flash', {
        provider: 'DeepSeek',
        channel: 'Ollama',
        model: { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash' },
      }),
      entry('chatgpt_plus::gpt-5.6-luna', {
        provider: 'OpenAI',
        channel: 'OpenAI',
        model: { id: 'gpt-5.6-luna', name: 'GPT 5.6 Luna' },
      }),
    ]
    expect(selectModels(rows).map((option) => option.id)).toEqual([
      'deepseek-v4-flash',
      'gpt-5.6-luna',
    ])
    expect(selectChannels(rows)).toEqual(['Ollama', 'OpenAI'])
    expect(
      filterEntries(rows, { models: new Set(['gpt-5.6-luna']), channels: null }).map((row) => row.id),
    ).toEqual(['chatgpt_plus::gpt-5.6-luna'])
  })
})

describe('algorithm goldens from the frozen fixture', () => {
  it('keeps Pareto frontier membership identical on a known set', () => {
    expect(selectAvailableLeaderboards(known)).toEqual(['arena_code', 'terminal_bench_4'])
    expect(subscriptionFrontier(known.entries, 'arena_code').map((row) => row.id)).toEqual([
      'cheap::model-a',
      'mid::model-b',
      'strong::model-c',
    ])
    expect(subscriptionFrontier(known.entries, 'terminal_bench_4').map((row) => row.id)).toEqual([
      'cheap::model-a',
      'mid::model-b',
      'strong::model-c',
    ])
  })

  it('keeps scored counts, efficiency picks, price order, and allowance order', () => {
    expect(selectEntriesForLeaderboard(known.entries, 'arena_code')).toHaveLength(7)
    expect(selectEntriesForLeaderboard(known.entries, 'terminal_bench_4')).toHaveLength(4)
    expect(mostEfficientEntry(known.entries, 'arena_code')?.id).toBe('api::model-e')
    expect(selectPriceRows(known.entries).map((row) => row.id)).toEqual([
      'api::model-e',
      'unscored::model-f',
      'cheap::model-a',
      'mid::model-b',
      'dominated::model-d',
      'strong::model-c',
      'big::model-g',
      'dear::model-a',
    ])
    expect(selectPriceRows(known.entries)[0].realUsdPerMtok).toBe(0.005)
    expect(selectAllowanceRows(known.entries).map((row) => row.id)).toEqual([
      'big::model-g',
      'strong::model-c',
      'mid::model-b',
      'dominated::model-d',
      'cheap::model-a',
      'dear::model-a',
      'unscored::model-f',
    ])
    expect(selectAllowanceRows(known.entries)[0].monthlyYi).toBe(20)
  })

  it('keeps compare filter and board-sort output', () => {
    expect(selectMakers(known.entries)).toEqual(['Anthropic', 'DeepSeek', 'OpenAI'])
    expect(
      filterCompareEntries(known.entries, {
        query: '',
        billing: 'all',
        vendor: 'all',
        confidence: 'high',
      }),
    ).toHaveLength(7)
    expect(
      filterCompareEntries(known.entries, {
        query: '',
        billing: 'subscription',
        vendor: 'all',
        confidence: 'all',
      }),
    ).toHaveLength(7)
    expect(sortEntries(known.entries, 'arena_code').map((row) => row.id)).toEqual([
      'api::model-e',
      'strong::model-c',
      'mid::model-b',
      'dominated::model-d',
      'big::model-g',
      'cheap::model-a',
      'dear::model-a',
      'unscored::model-f',
    ])
  })
})

describe('compare representatives', () => {
  it('uses the lowest real price when sorting by price', () => {
    const cheap = entry('plan-a', {
      pricing: { monthlyUsd: 10, effectiveUsdPerMillionTokens: 0.01, listUsdPerMillionTokens: 1 },
      allowance: { monthlyTokens: 2_000_000_000 },
    })
    const dear = entry('plan-b', {
      pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 0.02, listUsdPerMillionTokens: 1 },
      allowance: { monthlyTokens: 10_000_000_000 },
    })
    expect(representativeForMetric([cheap, dear], 'price').id).toBe('plan-a')
    expect(representativeForMetric([cheap, dear], 'allowance').id).toBe('plan-b')
  })

  it('uses the cheapest scored plan when sorting by a board', () => {
    const scoredCheap = entry('scored-cheap', {
      pricing: { monthlyUsd: 10, effectiveUsdPerMillionTokens: 0.03, listUsdPerMillionTokens: 1 },
      benchmarks: { codeArena: { score: 1600 } },
    })
    const scoredDear = entry('scored-dear', {
      pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 0.04, listUsdPerMillionTokens: 1 },
      benchmarks: { codeArena: { score: 1600 } },
    })
    const unscored = entry('unscored', {
      pricing: { monthlyUsd: 5, effectiveUsdPerMillionTokens: 0.005, listUsdPerMillionTokens: 1 },
    })
    expect(representativeForMetric([unscored, scoredDear, scoredCheap], 'arena_code').id).toBe(
      'scored-cheap',
    )
  })
})

describe('derived pricing', () => {
  it('reports 96% when real is 0.02 and list is 0.5', () => {
    const sub = entry('sub', {
      pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 0.02, listUsdPerMillionTokens: 0.5 },
    })
    const ratio = apiSavingRatio(sub)
    expect(ratio).toBeCloseTo(0.96)
    expect(formatApiSaving(ratio!)).toBe('96%')
  })

  it('does not compute savings for API baseline points', () => {
    const api = entry('api', {
      plan: { id: 'api', name: 'API', billing: 'metered' },
      pricing: { monthlyUsd: null, effectiveUsdPerMillionTokens: 0.02, listUsdPerMillionTokens: 0.5 },
    })
    expect(apiSavingRatio(api)).toBeNull()
  })

  it('converts monthly tokens to yi without changing the token count', () => {
    const row = entry('tokens', { allowance: { monthlyTokens: 200_000_000 } })
    expect(monthlyYi(row)).toBe(2)
  })
})
