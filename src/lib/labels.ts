import type { BoardKey, Lang } from '../types'
import { LEADERBOARD_KEYS, getLeaderboardConfig } from './leaderboards'
export { scatterLabel } from './text'

/** @deprecated Legacy chart helpers; order comes from SubAIWise config. */
export const BOARD_KEYS: BoardKey[] = [...LEADERBOARD_KEYS]

export function boardTitle(board: BoardKey, lang: Lang): string {
  const definition = getLeaderboardConfig(board)
  return definition.title[lang]
}

/** Shorten long "Model · Plan" labels for axes / dense charts. Full name stays in tooltip. */
export function shortLabel(label: string, max = 34): string {
  const cleaned = label.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= max) return cleaned

  const parts = cleaned.split(' · ')
  if (parts.length >= 2) {
    const model = parts[0]
    let plan = parts.slice(1).join(' · ')
    // Drop parenthetical noise first
    plan = plan.replace(/\s*\([^)]*\)/g, '').trim()
    const candidate = `${model} · ${plan}`
    if (candidate.length <= max) return candidate
    if (model.length <= max - 2) {
      const room = max - model.length - 3
      if (room >= 6) return `${model} · ${plan.slice(0, room)}…`
      return model.length > max ? `${model.slice(0, max - 1)}…` : model
    }
  }
  return `${cleaned.slice(0, max - 1)}…`
}
