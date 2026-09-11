import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SubAIWiseDatasetSchema } from '../data/schema'
import {
  compactExplorerState,
  defaultExplorerState,
  parseCompactState,
  restoreExplorerState,
  serializeExplorerState,
} from './explorer-state'

const dataset = SubAIWiseDatasetSchema.parse(
  JSON.parse(readFileSync('data/dataset.json', 'utf8')),
)

describe('explorer share state', () => {
  it('round-trips a compact state', () => {
    const defaults = defaultExplorerState(dataset)
    const original = {
      ...defaultExplorerState(dataset, 'zh'),
      models: new Set(['gpt-5.6-luna']),
      channels: new Set(['OpenAI']),
      billing: 'subscription' as const,
      view: 'plans' as const,
      query: 'opus',
      sort: 'terminal_bench_4',
      scoreBoard: 'terminal_bench_4',
      board: 'aa_intelligence_index',
      compareIds: dataset.entries.slice(0, 2).map((entry) => entry.id),
      advanced: {
        makers: new Set(['OpenAI']),
        confidence: new Set(['high']),
        harness: new Set(['Codex']),
        effort: new Set(['max']),
        mode: null,
      },
    }
    const restored = restoreExplorerState(
      parseCompactState(serializeExplorerState(original, defaults)),
      dataset,
    )
    expect(restored.lang).toBe('zh')
    expect([...restored.models!]).toEqual(['gpt-5.6-luna'])
    expect([...restored.channels!]).toEqual(['OpenAI'])
    expect(restored.billing).toBe('subscription')
    expect(restored.view).toBe('plans')
    expect(restored.query).toBe('opus')
    expect(restored.sort).toBe('terminal_bench_4')
    expect(restored.board).toBe('aa_intelligence_index')
    expect(restored.compareIds).toEqual(original.compareIds)
    expect([...restored.advanced.harness!]).toEqual(['Codex'])
  })

  it('does not expand null = all into every model id', () => {
    const defaults = defaultExplorerState(dataset, 'en')
    const compact = compactExplorerState(defaults, defaults)
    expect(compact.models).toBeUndefined()
    expect(compact.channels).toBeUndefined()
    expect(compact.makers).toBeUndefined()
    expect(compact.board).toBeUndefined()
    expect(JSON.stringify(compact)).not.toContain(dataset.entries[0].model.id)
  })

  it('restores an empty selection as none, not all', () => {
    const restored = restoreExplorerState({ v: 1, models: [] }, dataset)
    expect(restored.models).toEqual(new Set())
    expect(restored.channels).toBeNull()
  })

  it('ignores removed model, channel, plan, and board ids', () => {
    const restored = restoreExplorerState(
      {
        v: 1,
        models: ['missing-model', dataset.entries[0].model.id],
        channels: ['NoSuchChannel'],
        board: 'not_a_board',
        compare: ['gone::id', dataset.entries[0].id],
        sort: 'not_a_board',
      },
      dataset,
    )
    expect([...restored.models!]).toEqual([dataset.entries[0].model.id])
    expect(restored.channels).toEqual(new Set())
    expect(restored.board).toBe('arena_code')
    expect(restored.sort).toBe('price')
    expect(restored.compareIds).toEqual([dataset.entries[0].id])
  })

  it('prefers an explicit language from the URL payload', () => {
    const restored = restoreExplorerState({ v: 1, lang: 'zh' }, dataset, 'en')
    expect(restored.lang).toBe('zh')
  })

  it('compacts against the runtime default board, not a hardcoded arena_code', () => {
    const leaderboards = { ...dataset.leaderboards }
    delete leaderboards.arena_code
    const withoutArena = { ...dataset, leaderboards }
    const defaults = defaultExplorerState(withoutArena)
    expect(defaults.board).not.toBe('arena_code')
    expect(defaults.board).toBeTruthy()

    const compactDefault = compactExplorerState(defaults, defaults)
    expect(compactDefault.board).toBeUndefined()
    expect(restoreExplorerState(compactDefault, withoutArena).board).toBe(defaults.board)

    const otherBoard = Object.keys(leaderboards).find((key) => key !== defaults.board)
    expect(otherBoard).toBeTruthy()
    const compactOther = compactExplorerState({ ...defaults, board: otherBoard! }, defaults)
    expect(compactOther.board).toBe(otherBoard)
    expect(restoreExplorerState(compactOther, withoutArena).board).toBe(otherBoard)

    const restoredUnknown = restoreExplorerState({ v: 1, board: 'arena_code' }, withoutArena)
    expect(restoredUnknown.board).toBe(defaults.board)
  })
})
