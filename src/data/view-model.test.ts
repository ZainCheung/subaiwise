import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { toPointsPayload } from './view-model'
import { SubAIWiseDatasetSchema, type SubAIWiseDataset, type SubAIWiseEntry } from './schema'
import { availableLeaderboardKeys } from '../lib/leaderboards'
import { pointScore } from '../lib/compare'
import { formatScore } from '../lib/format'
import { subscriptionFrontier } from '../lib/pareto'

function entry(id: string, overrides: Partial<SubAIWiseEntry> = {}): SubAIWiseEntry {
  return {
    id,
    label: `${id} label`,
    provider: 'Vendor',
    channel: 'Vendor',
    plan: { id: `${id}-plan`, name: 'Plan', billing: 'subscription' },
    model: { id, name: id },
    pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 0.1, listUsdPerMillionTokens: 1 },
    allowance: { monthlyTokens: 100_000_000 },
    quality: { confidence: 'high', tier: 'main' },
    benchmarks: {},
    source: { label: 'fixture', note: '' },
    ...overrides,
  }
}

function board(name: string, metric = 'Score') {
  return {
    name,
    metric,
    url: `https://example.com/${name}`,
    snapshot: '2026-01-01',
  }
}

function dataset(partial: Partial<SubAIWiseDataset> & Pick<SubAIWiseDataset, 'entries' | 'leaderboards'>): SubAIWiseDataset {
  return SubAIWiseDatasetSchema.parse({
    schemaVersion: 1,
    snapshot: '2026-01-01',
    source: { repository: 'fixture', commit: 'a'.repeat(40) },
    workloadMix: { cache: 0.975, input: 0.0215, output: 0.0035 },
    ...partial,
  })
}

describe('dynamic leaderboard view model', () => {
  it('exposes Terminal-Bench 4.0 from the canonical dataset instead of dropping it', () => {
    const data = dataset({
      leaderboards: {
        arena_code: board('Code Arena'),
        terminal_bench_4: board('Terminal-Bench 4.0', 'Resolution Rate %'),
      },
      entries: [
        entry('scored', {
          benchmarks: {
            codeArena: { score: 1400, variant: 'webdev' },
            terminalBench4: { score: 44.55, variant: 'Claude Code' },
          },
        }),
      ],
    })

    const payload = toPointsPayload(data)
    expect(Object.keys(payload.boards)).toEqual(['arena_code', 'terminal_bench_4'])
    expect(payload.boards.terminal_bench_4.name).toBe('Terminal-Bench 4.0')
    expect(pointScore(payload.points[0], 'arena_code')).toBe(1400)
    expect(pointScore(payload.points[0], 'terminal_bench_4')).toBe(44.55)
    expect(formatScore(pointScore(payload.points[0], 'terminal_bench_4'), 'percent')).toBe('44.55%')
  })

  it('keeps a generic fallback board visible when presentation config is missing', () => {
    const data = dataset({
      leaderboards: {
        arena_code: board('Code Arena'),
        future_lab_index: board('Future Lab Index', 'Accuracy %'),
      },
      entries: [
        entry('one', {
          benchmarks: {
            codeArena: { score: 1200 },
            futureLabIndex: { score: 81.2 },
          },
        }),
      ],
    })

    const payload = toPointsPayload(data)
    expect(availableLeaderboardKeys(payload.boards)).toEqual(['arena_code', 'future_lab_index'])
    expect(payload.boards.future_lab_index.name).toBe('Future Lab Index')
    expect(pointScore(payload.points[0], 'future_lab_index')).toBe(81.2)
    expect(pointScore(payload.points[0], 'arena_code')).toBe(1200)
  })

  it('does not invent a zero when a board score is missing', () => {
    const data = dataset({
      leaderboards: {
        arena_code: board('Code Arena'),
        terminal_bench_4: board('Terminal-Bench 4.0', 'Resolution Rate %'),
      },
      entries: [
        entry('missing', {
          benchmarks: {
            codeArena: { score: 1300 },
          },
        }),
      ],
    })

    const payload = toPointsPayload(data)
    expect(pointScore(payload.points[0], 'terminal_bench_4')).toBeNull()
    expect(formatScore(pointScore(payload.points[0], 'terminal_bench_4'), 'percent')).toBe('—')
    expect(payload.points[0].terminal_bench_4__score).toBeNull()
  })

  it('computes a Terminal-Bench Pareto frontier from mapped scores', () => {
    const data = dataset({
      leaderboards: {
        terminal_bench_4: board('Terminal-Bench 4.0', 'Resolution Rate %'),
      },
      entries: [
        entry('cheap', {
          pricing: { monthlyUsd: 10, effectiveUsdPerMillionTokens: 0.01, listUsdPerMillionTokens: 1 },
          benchmarks: { terminalBench4: { score: 20 } },
        }),
        entry('mid', {
          pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 0.02, listUsdPerMillionTokens: 1 },
          benchmarks: { terminalBench4: { score: 40 } },
        }),
        entry('dominated', {
          pricing: { monthlyUsd: 15, effectiveUsdPerMillionTokens: 0.015, listUsdPerMillionTokens: 1 },
          benchmarks: { terminalBench4: { score: 15 } },
        }),
      ],
    })

    const payload = toPointsPayload(data)
    expect(subscriptionFrontier(payload.points, 'terminal_bench_4').map((row) => row.id)).toEqual([
      'cheap',
      'mid',
    ])
  })

  it('preserves the original five boards when the checked-in dataset adds Terminal-Bench 4.0', () => {
    const checkedIn = SubAIWiseDatasetSchema.parse(
      JSON.parse(readFileSync('data/dataset.json', 'utf8')),
    )
    const payload = toPointsPayload(checkedIn)
    const keys = availableLeaderboardKeys(payload.boards)

    expect(keys).toContain('terminal_bench_4')
    expect(keys.slice(0, 5)).toEqual([
      'arena_code',
      'arena_agent_mode',
      'aa_intelligence_index',
      'aa_coding_agent_index',
      'open_design_arena',
    ])
    expect(payload.boards.terminal_bench_4.metric).toBe('Resolution Rate %')

    const scored = payload.points.find((point) => pointScore(point, 'terminal_bench_4') != null)
    expect(scored).toBeDefined()
    expect(typeof pointScore(scored!, 'terminal_bench_4')).toBe('number')
  })
})
