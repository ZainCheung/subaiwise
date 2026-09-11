import type { BoardKey, PricingPoint } from '../types'
import { scoreKey } from './pareto'

export type CoordGroup = {
  key: string
  x: number
  y: number
  points: PricingPoint[]
}

/** Group records that share an exact (real price, score) pair. Never jitter. */
export function groupByExactCoords(points: PricingPoint[], board: BoardKey): CoordGroup[] {
  const key = scoreKey(board)
  const groups = new Map<string, CoordGroup>()
  for (const point of points) {
    const score = point[key]
    if (typeof score !== 'number' || !(point.real_usd_per_mtok > 0)) continue
    const groupKey = `${point.real_usd_per_mtok}|${score}`
    const existing = groups.get(groupKey)
    if (existing) {
      existing.points.push(point)
    } else {
      groups.set(groupKey, {
        key: groupKey,
        x: point.real_usd_per_mtok,
        y: score,
        points: [point],
      })
    }
  }
  return [...groups.values()]
}
