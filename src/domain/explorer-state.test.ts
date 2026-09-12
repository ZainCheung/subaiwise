import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SubAIWiseDatasetSchema } from '../data/schema'
import { availableLeaderboardKeys } from '../lib/leaderboards'
import {
  compactExplorerState,
  defaultExplorerState,
  EXPLORER_STORAGE_KEY,
  parseCompactState,
  readStoredExplorerState,
  restoreExplorerState,
  serializeExplorerState,
  writeStoredExplorerState,
} from './explorer-state'

const dataset = SubAIWiseDatasetSchema.parse(
  JSON.parse(readFileSync('data/dataset.json', 'utf8')),
)

describe('explorer share state', () => {
  it('round-trips a compact state', () => {
    const defaults = defaultExplorerState(dataset)
    const boards = availableLeaderboardKeys(dataset.leaderboards)
    const otherBoard = boards.find((board) => board !== defaults.board) ?? boards[0]
    const harness = dataset.benchmarkConfigurations.find((item) => item.agentHarness)?.agentHarness
    const effort = dataset.benchmarkConfigurations.find((item) => item.reasoningEffort)?.reasoningEffort
    const original = {
      ...defaultExplorerState(dataset, 'zh'),
      models: new Set([dataset.entries[0].model.id]),
      channels: new Set([dataset.entries[0].channel]),
      billing: 'subscription' as const,
      view: 'plans' as const,
      query: 'opus',
      sort: otherBoard,
      scoreBoard: otherBoard,
      board: otherBoard,
      compareIds: dataset.entries.slice(0, 2).map((entry) => entry.id),
      advanced: {
        makers: new Set([dataset.entries[0].provider]),
        confidence: new Set(['high']),
        harness: harness ? new Set([harness]) : null,
        effort: effort ? new Set([effort]) : null,
        mode: null,
      },
    }
    const restored = restoreExplorerState(
      parseCompactState(serializeExplorerState(original, defaults)),
      dataset,
    )
    expect(restored.lang).toBe('zh')
    expect([...restored.models!]).toEqual([dataset.entries[0].model.id])
    expect([...restored.channels!]).toEqual([dataset.entries[0].channel])
    expect(restored.billing).toBe('subscription')
    expect(restored.view).toBe('plans')
    expect(restored.query).toBe('opus')
    expect(restored.sort).toBe(otherBoard)
    expect(restored.board).toBe(otherBoard)
    expect(restored.compareIds).toEqual(original.compareIds)
    if (harness) expect([...restored.advanced.harness!]).toEqual([harness])
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
    expect(restored.board).toBe(defaultExplorerState(dataset).board)
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

function stubStorage(map: Map<string, string>) {
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value)
      },
    },
  })
}

describe('explorer localStorage state', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips state through the storage payload without lang', () => {
    const defaults = defaultExplorerState(dataset)
    const boards = availableLeaderboardKeys(dataset.leaderboards)
    const otherBoard = boards.find((board) => board !== defaults.board) ?? boards[0]
    const original = {
      ...defaultExplorerState(dataset, 'zh'),
      board: otherBoard,
      query: 'opus',
    }
    const storage = new Map<string, string>()
    stubStorage(storage)

    writeStoredExplorerState(original, defaults)

    expect(storage.get(EXPLORER_STORAGE_KEY)).toBe(
      serializeExplorerState({ ...original, lang: undefined }, defaults),
    )
    const restored = restoreExplorerState(readStoredExplorerState(), dataset)
    expect(restored.board).toBe(otherBoard)
    expect(restored.query).toBe('opus')
  })

  it('falls back to defaults for corrupted storage payloads', () => {
    const storage = new Map<string, string>([
      [EXPLORER_STORAGE_KEY, 'not-json-at-all'],
    ])
    stubStorage(storage)
    expect(readStoredExplorerState()).toBeNull()
    const restored = restoreExplorerState(readStoredExplorerState(), dataset)
    expect(restored.board).toBe(defaultExplorerState(dataset).board)
    expect(restored.query).toBe('')
  })

  it('rejects a foreign storage version so future migrations can rewrite it', () => {
    const storage = new Map<string, string>([
      [EXPLORER_STORAGE_KEY, encodeURIComponent(JSON.stringify({ v: 99, board: 'arena_code' }))],
    ])
    stubStorage(storage)
    expect(readStoredExplorerState()).toBeNull()
  })

  it('survives an unavailable localStorage', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('denied')
        },
        setItem: () => {
          throw new Error('denied')
        },
      },
    })
    expect(() => readStoredExplorerState()).not.toThrow()
    expect(() =>
      writeStoredExplorerState(defaultExplorerState(dataset), defaultExplorerState(dataset)),
    ).not.toThrow()
    expect(readStoredExplorerState()).toBeNull()
  })
})
