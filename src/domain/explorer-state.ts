import type { SubAIWiseDataset } from '../data/schema'
import type { Lang } from '../types'
import { MAX_COMPARE, type BillingFilter, type CompareView, type SortKey } from './comparison'
import { EMPTY_ADVANCED_FILTERS, type AdvancedFilters } from './advanced-filters'
import { availableLeaderboardKeys, defaultLeaderboardKey } from '../lib/leaderboards'
import type { IdFilter } from '../lib/filters'

export type ExplorerState = {
  lang?: Lang
  models: IdFilter
  channels: IdFilter
  advanced: AdvancedFilters
  billing: BillingFilter
  view: CompareView
  query: string
  sort: SortKey
  scoreBoard: string
  board: string
  compareIds: string[]
}

type CompactState = {
  v: 1
  lang?: Lang
  models?: string[]
  channels?: string[]
  makers?: string[]
  confidence?: string[]
  harness?: string[]
  effort?: string[]
  mode?: string[]
  billing?: BillingFilter
  view?: CompareView
  query?: string
  sort?: string
  scoreBoard?: string
  board?: string
  compare?: string[]
}

function encodeFilter(value: IdFilter): string[] | undefined {
  if (value == null) return undefined
  return [...value].sort()
}

function decodeFilter(value: unknown, valid: Set<string>): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.filter((id): id is string => typeof id === 'string' && valid.has(id))
}

function restoreFilter(value: string[] | undefined): IdFilter {
  if (value === undefined) return null
  return new Set(value)
}

export function defaultExplorerState(dataset: SubAIWiseDataset, lang?: Lang): ExplorerState {
  const board = defaultLeaderboardKey(availableLeaderboardKeys(dataset.leaderboards))
  return {
    lang,
    models: null,
    channels: null,
    advanced: EMPTY_ADVANCED_FILTERS,
    billing: 'all',
    view: 'models',
    query: '',
    sort: 'price',
    scoreBoard: board,
    board,
    compareIds: [],
  }
}

export function compactExplorerState(
  state: ExplorerState,
  defaults: Pick<ExplorerState, 'board'>,
): CompactState {
  const compact: CompactState = { v: 1 }
  if (state.lang) compact.lang = state.lang
  const models = encodeFilter(state.models)
  if (models) compact.models = models
  const channels = encodeFilter(state.channels)
  if (channels) compact.channels = channels
  const makers = encodeFilter(state.advanced.makers)
  if (makers) compact.makers = makers
  const confidence = encodeFilter(state.advanced.confidence)
  if (confidence) compact.confidence = confidence
  const harness = encodeFilter(state.advanced.harness)
  if (harness) compact.harness = harness
  const effort = encodeFilter(state.advanced.effort)
  if (effort) compact.effort = effort
  const mode = encodeFilter(state.advanced.mode)
  if (mode) compact.mode = mode
  if (state.billing !== 'all') compact.billing = state.billing
  if (state.view !== 'models') compact.view = state.view
  if (state.query.trim()) compact.query = state.query
  if (state.sort !== 'price') compact.sort = state.sort
  if (state.scoreBoard !== state.board) compact.scoreBoard = state.scoreBoard
  if (state.board && state.board !== defaults.board) compact.board = state.board
  if (state.compareIds.length) compact.compare = [...state.compareIds]
  return compact
}

export function serializeExplorerState(
  state: ExplorerState,
  defaults: Pick<ExplorerState, 'board'>,
): string {
  return encodeURIComponent(JSON.stringify(compactExplorerState(state, defaults)))
}

export function parseCompactState(raw: string): CompactState | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as CompactState
    if (!parsed || parsed.v !== 1) return null
    return parsed
  } catch {
    return null
  }
}

export const EXPLORER_STORAGE_KEY = 'subaiwise:explorer-state:v1'

/**
 * Regular explorer interactions persist to localStorage, not the URL.
 * Corrupted, foreign-version, or unavailable storage silently falls back to
 * defaults; `restoreExplorerState` still validates ids against the dataset.
 */
export function readStoredExplorerState(): CompactState | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(EXPLORER_STORAGE_KEY)
    return raw ? parseCompactState(raw) : null
  } catch {
    return null
  }
}

export function writeStoredExplorerState(
  state: ExplorerState,
  defaults: Pick<ExplorerState, 'board'>,
): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      EXPLORER_STORAGE_KEY,
      serializeExplorerState({ ...state, lang: undefined }, defaults),
    )
  } catch {
    // Storage may be unavailable (private mode, quota); the explorer keeps working in memory.
  }
}

export function restoreExplorerState(
  compact: CompactState | null | undefined,
  dataset: SubAIWiseDataset,
  fallbackLang?: Lang,
): ExplorerState {
  const defaults = defaultExplorerState(dataset, fallbackLang)
  if (!compact) return defaults

  const modelIds = new Set(dataset.entries.map((entry) => entry.model.id))
  const channelIds = new Set(dataset.entries.map((entry) => entry.channel))
  const makers = new Set(dataset.entries.map((entry) => entry.provider))
  const confidences = new Set(['high', 'medium', 'low'])
  const harnesses = new Set(
    dataset.benchmarkConfigurations.map((item) => item.agentHarness).filter((item): item is string => Boolean(item)),
  )
  const efforts = new Set(
    dataset.benchmarkConfigurations
      .map((item) => item.reasoningEffort)
      .filter((item): item is string => Boolean(item)),
  )
  const modes = new Set(
    dataset.benchmarkConfigurations
      .map((item) => item.serviceMode)
      .filter((item): item is string => Boolean(item)),
  )
  const boards = availableLeaderboardKeys(dataset.leaderboards)
  const boardSet = new Set(boards)
  const entryIds = new Set(dataset.entries.map((entry) => entry.id))

  const lang = compact.lang === 'en' || compact.lang === 'zh' ? compact.lang : defaults.lang
  const billing: BillingFilter =
    compact.billing === 'subscription' || compact.billing === 'metered' ? compact.billing : 'all'
  const view: CompareView = compact.view === 'plans' ? 'plans' : 'models'
  const sort: SortKey =
    compact.sort === 'price' || compact.sort === 'allowance' || (compact.sort && boardSet.has(compact.sort))
      ? compact.sort
      : 'price'
  const board = compact.board && boardSet.has(compact.board) ? compact.board : defaults.board
  const scoreBoard =
    compact.scoreBoard && boardSet.has(compact.scoreBoard)
      ? compact.scoreBoard
      : sort !== 'price' && sort !== 'allowance'
        ? sort
        : board
  const compareIds = Array.isArray(compact.compare)
    ? compact.compare.filter((id) => typeof id === 'string' && entryIds.has(id)).slice(0, MAX_COMPARE)
    : []

  return {
    lang,
    models: restoreFilter(decodeFilter(compact.models, modelIds)),
    channels: restoreFilter(decodeFilter(compact.channels, channelIds)),
    advanced: {
      makers: restoreFilter(decodeFilter(compact.makers, makers)),
      confidence: restoreFilter(decodeFilter(compact.confidence, confidences)),
      harness: restoreFilter(decodeFilter(compact.harness, harnesses)),
      effort: restoreFilter(decodeFilter(compact.effort, efforts)),
      mode: restoreFilter(decodeFilter(compact.mode, modes)),
    },
    billing,
    view,
    query: typeof compact.query === 'string' ? compact.query : '',
    sort,
    scoreBoard,
    board,
    compareIds,
  }
}

export function statesEqual(
  a: ExplorerState,
  b: ExplorerState,
  defaults: Pick<ExplorerState, 'board'>,
): boolean {
  return serializeExplorerState(a, defaults) === serializeExplorerState(b, defaults)
}
