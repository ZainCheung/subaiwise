import type { BoardKey, PricingPoint } from '../types'

export function scoreKey(board: BoardKey): string {
  return `${board}__score`
}

export function variantKey(board: BoardKey): string {
  return `${board}__variant`
}

/** Classic maximize-score / minimize-price frontier (subscription only). */
export function subscriptionFrontier(
  points: PricingPoint[],
  board: BoardKey,
): PricingPoint[] {
  const key = scoreKey(board)
  const scored = points.filter(
    (p) =>
      p.billing === 'subscription' &&
      p[key] != null &&
      p.real_usd_per_mtok > 0,
  )

  const sorted = [...scored].sort(
    (a, b) =>
      a.real_usd_per_mtok - b.real_usd_per_mtok ||
      Number(b[key]) - Number(a[key]),
  )

  let best = -Infinity
  const frontier: PricingPoint[] = []
  for (const p of sorted) {
    const s = Number(p[key])
    if (s > best) {
      best = s
      frontier.push(p)
    }
  }
  return frontier
}

export function boardPoints(points: PricingPoint[], board: BoardKey): PricingPoint[] {
  const key = scoreKey(board)
  return points.filter((p) => p[key] != null && p.real_usd_per_mtok > 0)
}

function uniqueByPrice(points: PricingPoint[]): PricingPoint[] {
  const byPrice = new Map<number, PricingPoint>()
  for (const point of points) {
    const previous = byPrice.get(point.real_usd_per_mtok)
    if (!previous || (previous.billing === 'metered' && point.billing === 'subscription')) {
      byPrice.set(point.real_usd_per_mtok, point)
    }
  }
  return [...byPrice.values()]
}

/** Cheapest observed plan for each model. Used by the efficiency heuristic. */
export function cheapestPerModel(points: PricingPoint[]): PricingPoint[] {
  const byModel = new Map<string, PricingPoint[]>()
  for (const point of points) {
    const group = byModel.get(point.model) ?? []
    group.push(point)
    byModel.set(point.model, group)
  }
  const cheapest: PricingPoint[] = []
  for (const group of byModel.values()) {
    const sorted = [...uniqueByPrice(group)].sort(
      (a, b) => a.real_usd_per_mtok - b.real_usd_per_mtok,
    )
    if (sorted[0]) cheapest.push(sorted[0])
  }
  return cheapest
}

/**
 * Ranking heuristic, not the Pareto definition: among each model's cheapest
 * plan, pick the lowest real price in the top 15% of that score range.
 */
export function mostEfficientPoint(
  points: PricingPoint[],
  board: BoardKey,
): PricingPoint | null {
  const cheapest = cheapestPerModel(boardPoints(points, board))
  if (!cheapest.length) return null
  const key = scoreKey(board)
  const scores = cheapest.map((point) => Number(point[key]))
  const maxY = Math.max(...scores)
  const minY = Math.min(...scores)
  const cutoff = maxY - 0.15 * (maxY - minY || 1)
  const nearTop = cheapest.filter((point) => Number(point[key]) >= cutoff)
  return nearTop.reduce((a, b) =>
    a.real_usd_per_mtok <= b.real_usd_per_mtok ? a : b,
  )
}

export function sameModelPoints(points: PricingPoint[], model: string): PricingPoint[] {
  return points.filter((point) => point.model === model)
}
