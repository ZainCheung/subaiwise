import { describe, expect, it } from 'vitest'
import { adaptPoint, buildDataset, serializeDataset, TOKENS_PER_YI } from './adapter'
import { LocalEntryOverrideSchema } from './schema'
import type { SubAIWiseEntry } from './schema'

const source = {
  repository: 'FeiZhuLulu/real-api-pricing',
  commit: 'd'.repeat(40),
}

function upstreamPoint(overrides: Record<string, unknown> = {}) {
  return {
    id: 'demo_plus::demo-model',
    plan: 'Demo Plus',
    billing: 'subscription' as const,
    model: 'demo-model',
    model_display: 'Demo Model',
    vendor: 'Demo Labs',
    label: 'Demo Model · Demo Plus',
    price_usd: 20,
    monthly_yi: 2,
    real_usd_per_mtok: 0.05,
    list_blended_usd_per_mtok: 0.2,
    confidence: 'high',
    tier: 'main',
    source: 'fixture',
    note: '',
    arena_code__score: 1400,
    arena_code__variant: 'demo',
    ...overrides,
  }
}

function payload(points = [upstreamPoint()]) {
  return {
    generatedAt: '2026-01-01',
    mix: { cache: 0.975, input: 0.0215, output: 0.0035 },
    boards: {
      arena_code: {
        name: 'Code Arena',
        metric: 'Arena score',
        url: 'https://arena.ai/leaderboard/code',
        snapshot: '2026-01-01',
      },
    },
    points,
  }
}

function payloadWithBoards(boards: string[], points = [upstreamPoint()]) {
  return {
    generatedAt: '2026-01-01',
    mix: { cache: 0.975, input: 0.0215, output: 0.0035 },
    boards: Object.fromEntries(
      boards.map((board) => [
        board,
        {
          name: board,
          metric: 'Score',
          url: `https://example.com/${board}`,
          snapshot: '2026-01-01',
        },
      ]),
    ),
    points: points.map((point) => {
      const next: Record<string, unknown> = { ...point }
      for (const board of boards) {
        const scoreField = `${board}__score`
        if (!Object.prototype.hasOwnProperty.call(next, scoreField)) {
          next[scoreField] = null
        }
      }
      return next
    }),
  }
}

const addition: SubAIWiseEntry = {
  id: 'local::model',
  provider: 'Local Labs',
  channel: 'Local Labs',
  plan: { id: 'local', name: 'Local Plan', billing: 'subscription' },
  model: { id: 'model', name: 'Local Model' },
  pricing: { monthlyUsd: 10, effectiveUsdPerMillionTokens: 0.01, listUsdPerMillionTokens: null },
  allowance: { monthlyTokens: 100_000_000 },
  quality: { confidence: 'low', tier: 'local' },
  benchmarks: {},
  source: { label: 'local fixture', note: '' },
}

describe('SubAIWise adapter', () => {
  it('maps upstream fields to canonical fields and preserves stable IDs', () => {
    const entry = adaptPoint(upstreamPoint(), ['arena_code'])
    expect(entry.id).toBe('demo_plus::demo-model')
    expect(entry.provider).toBe('Demo Labs')
    expect(entry.channel).toBe('Demo Labs')
    expect(entry.allowance.monthlyTokens).toBe(2 * TOKENS_PER_YI)
    expect(entry.pricing.effectiveUsdPerMillionTokens).toBe(0.05)
    expect(entry.benchmarks.codeArena?.score).toBe(1400)

    const renamed = adaptPoint(upstreamPoint({ model_display: 'Renamed Demo' }), ['arena_code'])
    expect(renamed.id).toBe(entry.id)
    expect(renamed.model.name).toBe('Renamed Demo')
  })

  it('applies overrides, additions, and exclusions in deterministic precedence order', () => {
    const overridden = buildDataset(payload(), source, {
      additions: [addition],
      overrides: { 'demo_plus::demo-model': { pricing: { monthlyUsd: 15 } } },
      exclusions: [],
    })
    expect(overridden.entries.map((entry) => entry.id)).toEqual(['demo_plus::demo-model', 'local::model'])
    expect(overridden.entries[0].pricing.monthlyUsd).toBe(15)

    const excluded = buildDataset(payload(), source, {
      additions: [addition],
      overrides: {},
      exclusions: ['demo_plus::demo-model'],
    })
    expect(excluded.entries.map((entry) => entry.id)).toEqual(['local::model'])
  })

  it('produces byte-identical output for the same source and local patches', () => {
    const first = serializeDataset(buildDataset(payload(), source, { additions: [addition] }))
    const second = serializeDataset(buildDataset(payload(), source, { additions: [addition] }))
    expect(first).toBe(second)
  })

  it('allows a local channel override without changing identity or pricing', () => {
    const overridden = buildDataset(payload([upstreamPoint({
      id: 'ollama_pro::deepseek-v4-flash',
      plan: 'Ollama Pro',
      vendor: 'DeepSeek',
    })]), source, {
      overrides: {
        'ollama_pro::deepseek-v4-flash': { channel: 'OpenCode' },
      },
    })
    expect(overridden.entries[0].id).toBe('ollama_pro::deepseek-v4-flash')
    expect(overridden.entries[0].provider).toBe('DeepSeek')
    expect(overridden.entries[0].channel).toBe('OpenCode')
    expect(overridden.entries[0].pricing.effectiveUsdPerMillionTokens).toBe(0.05)
  })

  it('rejects local attempts to change canonical identity', () => {
    expect(() => LocalEntryOverrideSchema.parse({ id: 'new-id' })).toThrow()
    expect(() => LocalEntryOverrideSchema.parse({ plan: { id: 'new-plan' } })).toThrow()
    expect(() => LocalEntryOverrideSchema.parse({ model: { id: 'new-model' } })).toThrow()
  })

  it('rejects local overrides of derived benchmark summaries', () => {
    expect(() =>
      LocalEntryOverrideSchema.parse({
        benchmarks: { codeArena: { score: 999 } },
      }),
    ).toThrow()
    expect(() =>
      buildDataset(payload(), source, {
        overrides: {
          'demo_plus::demo-model': {
            benchmarks: { codeArena: { score: 999 } },
          },
        },
      }),
    ).toThrow()
  })

  it('still applies supported entry overrides without touching derived benchmarks', () => {
    const before = buildDataset(payload(), source)
    const after = buildDataset(payload(), source, {
      overrides: {
        'demo_plus::demo-model': {
          pricing: { monthlyUsd: 15 },
          allowance: { monthlyTokens: 50_000_000 },
          quality: { confidence: 'medium' },
          source: { note: 'local note' },
          channel: 'Local Channel',
          provider: 'Local Maker',
        },
      },
    })
    expect(after.entries[0].pricing.monthlyUsd).toBe(15)
    expect(after.entries[0].allowance.monthlyTokens).toBe(50_000_000)
    expect(after.entries[0].quality.confidence).toBe('medium')
    expect(after.entries[0].source.note).toBe('local note')
    expect(after.entries[0].channel).toBe('Local Channel')
    expect(after.entries[0].provider).toBe('Local Maker')
    expect(after.entries[0].id).toBe(before.entries[0].id)
    expect(after.entries[0].benchmarks).toEqual(before.entries[0].benchmarks)
  })

  it('fails loudly when an upstream board loses its score field', () => {
    const point = upstreamPoint()
    delete (point as Record<string, unknown>).arena_code__score
    expect(() => buildDataset(payload([point]), source)).toThrow(
      'Upstream schema drift detected: board "arena_code" exists but no arena_code__score field was found.',
    )
  })

  it('does not emit empty benchmark placeholders', () => {
    const entry = adaptPoint(
      upstreamPoint({
        terminal_bench_4__score: null,
        terminal_bench_4__variant: null,
        terminal_bench_4__configuration_count: 0,
      }),
      ['terminal_bench_4'],
    )

    expect(entry.benchmarks.terminalBench4).toBeUndefined()
  })

  it('keeps benchmark entries with scores', () => {
    const entry = adaptPoint(
      upstreamPoint({
        terminal_bench_4__score: 42,
      }),
      ['terminal_bench_4'],
    )

    expect(entry.benchmarks.terminalBench4?.score).toBe(42)
  })

  it('keeps meaningful benchmark metadata without a score', () => {
    const entry = adaptPoint(
      upstreamPoint({
        terminal_bench_4__score: null,
        terminal_bench_4__mapping_note: 'Mapped manually',
      }),
      ['terminal_bench_4'],
    )

    expect(entry.benchmarks.terminalBench4).toBeDefined()
    expect(entry.benchmarks.terminalBench4?.mappingNote).toBe('Mapped manually')
  })

  it('treats zero score as meaningful', () => {
    const entry = adaptPoint(
      upstreamPoint({
        terminal_bench_4__score: 0,
      }),
      ['terminal_bench_4'],
    )

    expect(entry.benchmarks.terminalBench4?.score).toBe(0)
  })

  it('does not rewrite unrelated entries when a new empty board is introduced', () => {
    const before = buildDataset(payloadWithBoards(['arena_code']), source)
    const after = buildDataset(
      payloadWithBoards(['arena_code', 'terminal_bench_4']),
      source,
    )

    expect(after.entries).toEqual(before.entries)
    expect(after.leaderboards.terminal_bench_4).toBeDefined()
  })

  it('keeps multiple Terminal-Bench harness/effort configurations and mappings', () => {
    const dataset = buildDataset(
      {
        points: payloadWithBoards(
          ['terminal_bench_4'],
          [upstreamPoint({ terminal_bench_4__score: 44.55 })],
        ),
        configurations: [
          {
            configuration_id: 'terminal_bench_4:low',
            board: 'terminal_bench_4',
            model: 'demo-model',
            variant: 'Claude Code (low)',
            score: 40,
            agent_harness: 'Claude Code',
            reasoning_effort: 'low',
            archive: 'tb.json',
          },
          {
            configuration_id: 'terminal_bench_4:max',
            board: 'terminal_bench_4',
            model: 'demo-model',
            variant: 'Claude Code (max)',
            score: 44.55,
            agent_harness: 'Claude Code',
            reasoning_effort: 'max',
            archive: 'tb.json',
          },
          {
            configuration_id: 'terminal_bench_4:codex',
            board: 'terminal_bench_4',
            model: 'demo-model',
            variant: 'Codex (max)',
            score: 50,
            agent_harness: 'Codex',
            reasoning_effort: 'max',
            archive: 'tb.json',
          },
        ],
        mappings: [
          {
            point_id: 'demo_plus::demo-model',
            configuration_id: 'terminal_bench_4:low',
            mapping_kind: 'agent_configuration_reference',
            mapping_confidence: 'low',
          },
          {
            point_id: 'demo_plus::demo-model',
            configuration_id: 'terminal_bench_4:max',
            mapping_kind: 'agent_configuration_reference',
            mapping_confidence: 'medium',
          },
        ],
      },
      source,
    )

    expect(dataset.schemaVersion).toBe(2)
    expect(dataset.benchmarkConfigurations).toHaveLength(3)
    expect(dataset.benchmarkMappings).toHaveLength(2)
    expect(dataset.entries[0].benchmarks.terminalBench4?.score).toBe(44.55)
    expect(dataset.entries[0].benchmarks.terminalBench4?.reasoningEffort).toBe('max')
    expect(dataset.entries[0].benchmarks.terminalBench4?.selection).toBe(
      'highest_archived_reference',
    )
    expect(dataset.entries[0].benchmarks.terminalBench4?.configurationCount).toBe(2)
  })

  it('fails on orphan mappings and duplicate configuration ids', () => {
    const points = payloadWithBoards(['arena_code'])
    expect(() =>
      buildDataset(
        {
          points,
          configurations: [
            {
              configuration_id: 'arena_code:one',
              board: 'arena_code',
              model: 'demo-model',
              score: 10,
            },
          ],
          mappings: [
            {
              point_id: 'missing::entry',
              configuration_id: 'arena_code:one',
            },
          ],
        },
        source,
      ),
    ).toThrow(/unknown entry/)

    expect(() =>
      buildDataset(
        {
          points,
          configurations: [
            { configuration_id: 'arena_code:one', board: 'arena_code', model: 'demo-model', score: 1 },
            { configuration_id: 'arena_code:one', board: 'arena_code', model: 'demo-model', score: 2 },
          ],
          mappings: [],
        },
        source,
      ),
    ).toThrow(/Duplicate benchmark configuration/)
  })

  it('drops mappings for locally excluded entries without failing integrity', () => {
    const dataset = buildDataset(
      {
        points: payloadWithBoards(['arena_code']),
        configurations: [
          {
            configuration_id: 'arena_code:one',
            board: 'arena_code',
            model: 'demo-model',
            score: 1400,
          },
        ],
        mappings: [
          {
            point_id: 'demo_plus::demo-model',
            configuration_id: 'arena_code:one',
          },
        ],
      },
      source,
      { exclusions: ['demo_plus::demo-model'] },
    )
    expect(dataset.entries).toEqual([])
    expect(dataset.benchmarkMappings).toEqual([])
    expect(dataset.benchmarkConfigurations).toHaveLength(1)
  })
})

