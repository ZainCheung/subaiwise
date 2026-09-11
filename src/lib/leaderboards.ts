import type { BoardMeta } from '../data/schema'

/**
 * Product presentation for leaderboards, independent of which boards the
 * canonical dataset currently contains.
 *
 * Runtime availability comes from `dataset.leaderboards`. This file only
 * answers how a known board should look, and how an unknown future board
 * should fall back instead of disappearing.
 */
export type LeaderboardMetricFormatter = 'score' | 'percent'

export type KnownLeaderboardKey =
  | 'arena_code'
  | 'arena_agent_mode'
  | 'aa_intelligence_index'
  | 'aa_coding_agent_index'
  | 'open_design_arena'
  | 'terminal_bench_4'

export type LeaderboardPresentation = {
  key: KnownLeaderboardKey
  canonicalKey: string
  title: { en: string; zh: string }
  titleKey: string
  shortKey: string
  longKey: string
  howToReadKey?: string
  sourceKey?: string
  direction: 'higher' | 'lower'
  color: string
  tags: readonly string[]
  formatter: LeaderboardMetricFormatter
  defaultVisible: boolean
}

export type ResolvedLeaderboardPresentation = {
  key: string
  canonicalKey: string
  title: { en: string; zh: string }
  titleKey?: string
  shortKey?: string
  longKey?: string
  howToReadKey?: string
  sourceKey?: string
  direction: 'higher' | 'lower'
  color: string
  tags: readonly string[]
  formatter: LeaderboardMetricFormatter
  defaultVisible: boolean
  fallback: boolean
}

const FALLBACK_COLORS = ['#94a3b8', '#fb7185', '#38bdf8', '#c084fc', '#fbbf24', '#34d399'] as const

export const LEADERBOARD_PRESENTATION = [
  {
    key: 'arena_code',
    canonicalKey: 'codeArena',
    title: { en: 'Code Arena · WebDev', zh: 'Code Arena · WebDev' },
    titleKey: 'boardArenaCode',
    shortKey: 'metricArenaCodeShort',
    longKey: 'metricArenaCodeLong',
    direction: 'higher',
    color: '#62e6b5',
    tags: ['coding', 'arena'],
    formatter: 'score',
    defaultVisible: true,
  },
  {
    key: 'arena_agent_mode',
    canonicalKey: 'agentArena',
    title: { en: 'Agent Arena', zh: 'Agent Arena' },
    titleKey: 'boardArenaAgent',
    shortKey: 'metricArenaAgentShort',
    longKey: 'metricArenaAgentLong',
    direction: 'higher',
    color: '#f0b35b',
    tags: ['agent', 'arena'],
    formatter: 'score',
    defaultVisible: true,
  },
  {
    key: 'aa_intelligence_index',
    canonicalKey: 'intelligence',
    title: { en: 'AA Intelligence', zh: 'AA 智力榜' },
    titleKey: 'boardAAIntel',
    shortKey: 'metricAAIntelShort',
    longKey: 'metricAAIntelLong',
    sourceKey: 'aaIntelFullName',
    direction: 'higher',
    color: '#9f8cff',
    tags: ['intelligence', 'artificial-analysis'],
    formatter: 'score',
    defaultVisible: true,
  },
  {
    key: 'aa_coding_agent_index',
    canonicalKey: 'codingAgent',
    title: { en: 'AA Coding Agent', zh: 'AA 编程 Agent' },
    titleKey: 'boardAACoding',
    shortKey: 'metricAACodingShort',
    longKey: 'metricAACodingLong',
    direction: 'higher',
    color: '#72b6ff',
    tags: ['coding', 'agent', 'artificial-analysis'],
    formatter: 'score',
    defaultVisible: true,
  },
  {
    key: 'open_design_arena',
    canonicalKey: 'designArena',
    title: { en: 'OpenDesign Arena', zh: 'OpenDesign Arena' },
    titleKey: 'boardOpenDesign',
    shortKey: 'metricOpenDesignShort',
    longKey: 'metricOpenDesignLong',
    direction: 'higher',
    color: '#ff7ab6',
    tags: ['design', 'arena'],
    formatter: 'score',
    defaultVisible: true,
  },
  {
    key: 'terminal_bench_4',
    canonicalKey: 'terminalBench4',
    title: { en: 'Terminal-Bench 4.0', zh: 'Terminal-Bench 4.0' },
    titleKey: 'boardTerminalBench',
    shortKey: 'metricTerminalBenchShort',
    longKey: 'metricTerminalBenchLong',
    howToReadKey: 'howToReadTerminalBench',
    direction: 'higher',
    color: '#5eead4',
    tags: ['agent', 'terminal'],
    formatter: 'percent',
    defaultVisible: true,
  },
] as const satisfies readonly LeaderboardPresentation[]

/** Friendly lower-case alias for consumers that treat config as data. */
export const LEADERBOARD_CONFIG = LEADERBOARD_PRESENTATION
export const leaderboardConfig = LEADERBOARD_PRESENTATION

export type LeaderboardKey = (typeof LEADERBOARD_PRESENTATION)[number]['key']

export const LEADERBOARD_KEYS: readonly LeaderboardKey[] = LEADERBOARD_PRESENTATION.map(
  (definition) => definition.key,
)

const PRESENTATION_BY_KEY = Object.fromEntries(
  LEADERBOARD_PRESENTATION.map((definition) => [definition.key, definition]),
) as Record<LeaderboardKey, (typeof LEADERBOARD_PRESENTATION)[number]>

const KNOWN_ORDER = new Map(LEADERBOARD_KEYS.map((key, index) => [key, index]))

function camelize(value: string): string {
  return value.replace(/[-_](\w)/g, (_, character: string) => character.toUpperCase())
}

function hashKey(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function warnMissingPresentation(key: string): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') return
  if (import.meta.env?.DEV) {
    console.warn(
      `[SubAIWise] No presentation config for leaderboard "${key}". Using a generic fallback.`,
    )
  }
}

export function inferLeaderboardFormatter(metric?: string | null): LeaderboardMetricFormatter {
  if (!metric) return 'score'
  return /%|\bpercent(?:age)?\b/i.test(metric) ? 'percent' : 'score'
}

export function resolveLeaderboardPresentation(
  key: string,
  meta?: Pick<BoardMeta, 'name' | 'metric'> | null,
): ResolvedLeaderboardPresentation {
  const known = PRESENTATION_BY_KEY[key as LeaderboardKey]
  if (known) {
    return { ...known, tags: [...known.tags], fallback: false }
  }

  warnMissingPresentation(key)
  const name = meta?.name?.trim() || key
  return {
    key,
    canonicalKey: camelize(key),
    title: { en: name, zh: name },
    direction: 'higher',
    color: FALLBACK_COLORS[hashKey(key) % FALLBACK_COLORS.length],
    tags: [],
    formatter: inferLeaderboardFormatter(meta?.metric),
    defaultVisible: true,
    fallback: true,
  }
}

export function getLeaderboardConfig(key: string, meta?: Pick<BoardMeta, 'name' | 'metric'> | null) {
  return resolveLeaderboardPresentation(key, meta)
}

export function canonicalBenchmarkKey(board: string): string {
  return resolveLeaderboardPresentation(board).canonicalKey
}

export function leaderboardFormatter(
  board: string,
  meta?: Pick<BoardMeta, 'name' | 'metric'> | null,
): LeaderboardMetricFormatter {
  return resolveLeaderboardPresentation(board, meta).formatter
}

/** Known boards keep their curated product order; unknown boards follow alphabetically. */
export function orderLeaderboardKeys(keys: Iterable<string>): string[] {
  const unique = [...new Set(keys)]
  return unique.sort((a, b) => {
    const ai = KNOWN_ORDER.get(a as LeaderboardKey)
    const bi = KNOWN_ORDER.get(b as LeaderboardKey)
    if (ai != null && bi != null) return ai - bi
    if (ai != null) return -1
    if (bi != null) return 1
    return a.localeCompare(b)
  })
}

export function availableLeaderboardKeys(
  boards: Record<string, unknown> | readonly string[],
): string[] {
  const keys = Array.isArray(boards) ? boards : Object.keys(boards)
  return orderLeaderboardKeys(keys)
}

export function defaultLeaderboardKey(boards: readonly string[]): string {
  if (boards.includes('arena_code')) return 'arena_code'
  return boards[0] ?? 'arena_code'
}
