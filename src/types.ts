export type { Billing, BoardMeta } from './data/schema'

/**
 * Runtime leaderboard id. Availability comes from the canonical dataset;
 * presentation config may or may not know the key in advance.
 */
export type BoardKey = string

export type Lang = 'en' | 'zh'
