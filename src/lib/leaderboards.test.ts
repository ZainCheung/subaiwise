import { describe, expect, it } from 'vitest'
import {
  availableLeaderboardKeys,
  canonicalBenchmarkKey,
  defaultLeaderboardKey,
  inferLeaderboardFormatter,
  leaderboardFormatter,
  LEADERBOARD_KEYS,
  orderLeaderboardKeys,
  resolveLeaderboardPresentation,
} from './leaderboards'

describe('leaderboard discovery vs presentation', () => {
  it('keeps the original five boards in their curated order', () => {
    expect([...LEADERBOARD_KEYS].slice(0, 5)).toEqual([
      'arena_code',
      'arena_agent_mode',
      'aa_intelligence_index',
      'aa_coding_agent_index',
      'open_design_arena',
    ])
  })

  it('includes Terminal-Bench 4.0 as a known presentation', () => {
    const presentation = resolveLeaderboardPresentation('terminal_bench_4', {
      name: 'Terminal-Bench 4.0',
      metric: 'Resolution Rate %',
    })
    expect(presentation.fallback).toBe(false)
    expect(presentation.canonicalKey).toBe('terminalBench4')
    expect(presentation.formatter).toBe('percent')
    expect(presentation.title.en).toBe('Terminal-Bench 4.0')
    expect(presentation.title.zh).toBe('Terminal-Bench 4.0')
  })

  it('orders known boards before unknown boards, then alphabetically', () => {
    expect(
      orderLeaderboardKeys([
        'future_z',
        'terminal_bench_4',
        'open_design_arena',
        'future_a',
        'arena_code',
      ]),
    ).toEqual([
      'arena_code',
      'open_design_arena',
      'terminal_bench_4',
      'future_a',
      'future_z',
    ])
  })

  it('is deterministic for the same input regardless of object key order', () => {
    const first = availableLeaderboardKeys({
      terminal_bench_4: {},
      arena_code: {},
      aa_intelligence_index: {},
    })
    const second = availableLeaderboardKeys({
      aa_intelligence_index: {},
      arena_code: {},
      terminal_bench_4: {},
    })
    expect(first).toEqual(second)
    expect(first).toEqual(['arena_code', 'aa_intelligence_index', 'terminal_bench_4'])
  })

  it('falls back to upstream metadata for an unknown board instead of dropping it', () => {
    const presentation = resolveLeaderboardPresentation('brand_new_board', {
      name: 'Brand New Board',
      metric: 'Success Rate %',
    })
    expect(presentation.fallback).toBe(true)
    expect(presentation.title.en).toBe('Brand New Board')
    expect(presentation.title.zh).toBe('Brand New Board')
    expect(presentation.canonicalKey).toBe('brandNewBoard')
    expect(presentation.formatter).toBe('percent')
  })

  it('defaults unknown non-percent metrics to a generic score formatter', () => {
    const presentation = resolveLeaderboardPresentation('mystery_index', {
      name: 'Mystery Index',
      metric: 'Composite index',
    })
    expect(presentation.formatter).toBe('score')
    expect(inferLeaderboardFormatter('Composite index')).toBe('score')
    expect(inferLeaderboardFormatter('Resolution Rate %')).toBe('percent')
  })

  it('maps Terminal-Bench to the canonical camelCase benchmark key', () => {
    expect(canonicalBenchmarkKey('terminal_bench_4')).toBe('terminalBench4')
    expect(leaderboardFormatter('terminal_bench_4')).toBe('percent')
  })

  it('prefers Code Arena as the default board when present', () => {
    expect(defaultLeaderboardKey(['terminal_bench_4', 'arena_code'])).toBe('arena_code')
    expect(defaultLeaderboardKey(['terminal_bench_4'])).toBe('terminal_bench_4')
  })
})
