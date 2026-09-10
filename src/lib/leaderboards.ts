/**
 * SubAIWise-owned presentation configuration for supported leaderboards.
 *
 * The adapter can preserve any upstream board, while the explorer only needs
 * to know how a board should be presented here. Adding a board therefore
 * happens in one place instead of being repeated across chart components.
 */
export type LeaderboardMetricFormatter = 'score'

export type LeaderboardDefinition = {
  key:
    | 'arena_code'
    | 'arena_agent_mode'
    | 'aa_intelligence_index'
    | 'aa_coding_agent_index'
    | 'open_design_arena'
  canonicalKey: string
  title: { en: string; zh: string }
  titleKey: string
  shortKey: string
  longKey: string
  sourceKey?: string
  direction: 'higher' | 'lower'
  color: string
  tags: readonly string[]
  formatter: LeaderboardMetricFormatter
  defaultVisible: boolean
}

export const LEADERBOARD_CONFIG = [
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
] as const satisfies readonly LeaderboardDefinition[]

/** Friendly lower-case alias for consumers that treat config as data. */
export const leaderboardConfig = LEADERBOARD_CONFIG

export type LeaderboardKey = (typeof LEADERBOARD_CONFIG)[number]['key']

export const LEADERBOARD_KEYS: readonly LeaderboardKey[] = LEADERBOARD_CONFIG.map(
  (definition) => definition.key,
)

export function getLeaderboardConfig(key: LeaderboardKey): LeaderboardDefinition {
  return LEADERBOARD_CONFIG.find((definition) => definition.key === key)!
}
