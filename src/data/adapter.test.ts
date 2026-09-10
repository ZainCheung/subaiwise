import { describe, expect, it } from 'vitest'
import { adaptPoint, buildDataset, serializeDataset, TOKENS_PER_YI } from './adapter'
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

const addition: SubAIWiseEntry = {
  id: 'local::model',
  provider: 'Local Labs',
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
})
