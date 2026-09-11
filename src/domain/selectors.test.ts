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
import { canonicalBenchmarkKey } from '../lib/leaderboards'
import { selectDefaultBenchmarkReference } from './benchmarks'
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

const checkedIn = SubAIWiseDatasetSchema.parse(
  JSON.parse(readFileSync('data/dataset.json', 'utf8')),
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

describe('migration goldens from the locked dataset', () => {
  it('keeps Pareto frontier membership identical for every current board', () => {
    expect(selectAvailableLeaderboards(checkedIn)).toEqual([
      'arena_code',
      'arena_agent_mode',
      'aa_intelligence_index',
      'aa_coding_agent_index',
      'open_design_arena',
      'terminal_bench_4',
    ])
    expect(subscriptionFrontier(checkedIn.entries, 'arena_code').map((row) => row.id)).toEqual([
      'chatgpt_pro_20x::gpt-5.6-luna',
      'glm_coding_pro_cn_old_offpeak::glm-5.3-flash',
      'glm_coding_pro_cn_old_offpeak::glm-5.3',
      'claude_max_20x::claude-opus-5',
    ])
    expect(subscriptionFrontier(checkedIn.entries, 'arena_agent_mode').map((row) => row.id)).toEqual([
      'chatgpt_pro_20x::gpt-5.6-luna',
      'glm_coding_pro_cn_old_offpeak::glm-5.3-flash',
      'claude_pro::claude-sonnet-5',
      'claude_pro::claude-opus-4.8',
      'claude_max_20x::claude-opus-5',
    ])
    expect(subscriptionFrontier(checkedIn.entries, 'aa_intelligence_index').map((row) => row.id)).toEqual([
      'stepfun_max_cn::step-3.5-flash',
      'stepfun_max_cn::step-3.7-flash',
      'opencode_go::mimo-v2.5',
      'chatgpt_pro_20x::gpt-5.6-luna',
      'glm_coding_pro_cn_old_offpeak::glm-5.3-flash',
      'chatgpt_pro_20x::gpt-5.6-terra',
      'glm_coding_pro_cn_old_offpeak::glm-5.3',
      'claude_max_20x::claude-opus-5',
    ])
    expect(subscriptionFrontier(checkedIn.entries, 'aa_coding_agent_index').map((row) => row.id)).toEqual([
      'chatgpt_pro_20x::gpt-5.6-luna',
      'chatgpt_pro_20x::gpt-5.6-terra',
      'claude_pro::claude-opus-4.8',
      'claude_max_20x::claude-opus-5',
    ])
    expect(subscriptionFrontier(checkedIn.entries, 'open_design_arena').map((row) => row.id)).toEqual([
      'command_code_goat::deepseek-v4.1-flash',
    ])
    expect(subscriptionFrontier(checkedIn.entries, 'terminal_bench_4').map((row) => row.id)).toEqual([
      'chatgpt_pro_20x::gpt-5.6-luna',
      'chatgpt_pro_20x::gpt-5.6-terra',
      'glm_coding_pro_cn_old_offpeak::glm-5.3',
      'claude_max_20x::claude-opus-5',
    ])
  })

  it('keeps scored counts, efficiency picks, price order, and allowance order', () => {
    expect(selectEntriesForLeaderboard(checkedIn.entries, 'arena_code')).toHaveLength(136)
    expect(selectEntriesForLeaderboard(checkedIn.entries, 'arena_agent_mode')).toHaveLength(140)
    expect(selectEntriesForLeaderboard(checkedIn.entries, 'aa_intelligence_index')).toHaveLength(173)
    expect(selectEntriesForLeaderboard(checkedIn.entries, 'aa_coding_agent_index')).toHaveLength(71)
    expect(selectEntriesForLeaderboard(checkedIn.entries, 'open_design_arena')).toHaveLength(65)
    expect(selectEntriesForLeaderboard(checkedIn.entries, 'terminal_bench_4')).toHaveLength(66)

    expect(mostEfficientEntry(checkedIn.entries, 'arena_code')?.id).toBe(
      'claude_max_20x::claude-opus-5',
    )
    expect(mostEfficientEntry(checkedIn.entries, 'open_design_arena')?.id).toBe(
      'command_code_goat::deepseek-v4.1-flash',
    )

    expect(selectPriceRows(checkedIn.entries).slice(0, 10).map((row) => row.id)).toEqual([
      'stepfun_max_cn::step-3.5-flash',
      'stepfun_pro_cn::step-3.5-flash',
      'opencode_go::muse-spark-1.2-contributor',
      'opencode_go::muse-spark-1.3-contributor',
      'stepfun_max_cn::step-3.7-flash',
      'opencode_go::mimo-v2.5',
      'stepfun_pro_cn::step-3.7-flash',
      'chatgpt_pro_20x::gpt-5.6-luna',
      'stepfun_plus_cn::step-3.5-flash',
      'command_code_goat::deepseek-v4.1-flash',
    ])
    expect(selectPriceRows(checkedIn.entries)[0].realUsdPerMtok).toBe(0.00041)

    expect(selectAllowanceRows(checkedIn.entries).slice(0, 10).map((row) => row.id)).toEqual([
      'stepfun_max_cn::step-3.5-flash',
      'chatgpt_pro_20x::gpt-5.6-luna',
      'stepfun_max_cn::step-3.7-flash',
      'stepfun_pro_cn::step-3.5-flash',
      'claude_max_20x::claude-sonnet-5',
      'chatgpt_pro_5x::gpt-5.6-luna',
      'stepfun_pro_cn::step-3.7-flash',
      'chatgpt_pro_20x::gpt-5.6-terra',
      'ollama_max::deepseek-v4-flash',
      'cursor_ultra::composer-2.5',
    ])
    expect(selectAllowanceRows(checkedIn.entries)[0].monthlyYi).toBe(2517.306)
  })

  it('keeps derived entry.benchmarks aligned with highest_archived_reference', () => {
    for (const entry of checkedIn.entries) {
      for (const boardId of selectAvailableLeaderboards(checkedIn)) {
        const selected = selectDefaultBenchmarkReference(checkedIn, entry.id, boardId)
        const derived = entry.benchmarks[canonicalBenchmarkKey(boardId)]
        if (!selected) continue
        expect(derived?.score).toBe(selected.configuration.score)
        expect(derived?.selection).toBe('highest_archived_reference')
      }
    }
    expect(checkedIn.benchmarkConfigurations.length).toBeGreaterThan(0)
    expect(checkedIn.benchmarkMappings.length).toBeGreaterThan(0)
  })

  it('keeps compare filter and board-sort output', () => {
    expect(selectMakers(checkedIn.entries)).toEqual([
      'Alibaba',
      'Anthropic',
      'Cursor',
      'DeepSeek',
      'Google',
      'Kimi',
      'Meituan',
      'MiniMax',
      'Muse',
      'OpenAI',
      'OpenCode',
      'other',
      'StepFun',
      'Tencent',
      'xAI',
      'Xiaomi',
      'Zhipu',
    ])
    expect(
      filterCompareEntries(checkedIn.entries, {
        query: '',
        billing: 'all',
        vendor: 'all',
        confidence: 'high',
      }),
    ).toHaveLength(59)
    expect(
      filterCompareEntries(checkedIn.entries, {
        query: '',
        billing: 'subscription',
        vendor: 'all',
        confidence: 'all',
      }),
    ).toHaveLength(183)
    expect(sortEntries(checkedIn.entries, 'arena_code').slice(0, 10).map((row) => row.id)).toEqual([
      'claude_max_20x::claude-opus-5',
      'claude_max_5x::claude-opus-5',
      'anthropic_opus5_api::claude-opus-5',
      'kimi_allegretto_cn::kimi-k3',
      'kimi_allegro_cn::kimi-k3',
      'kimi_moderato_cn::kimi-k3',
      'ollama_max::kimi-k3',
      'ollama_pro::kimi-k3',
      'command_code_goat::kimi-k3',
      'opencode_go::kimi-k3',
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
