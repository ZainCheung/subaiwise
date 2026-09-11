import { describe, expect, it } from 'vitest'
import type { PricingPoint } from '../types'
import { guideEndpoints } from './axis'
import { filterPricingPoints } from './filters'
import { groupByExactCoords } from './pointGrouping'
import { mostEfficientPoint, sameModelPoints, subscriptionFrontier } from './pareto'

function point(
  partial: Partial<PricingPoint> &
    Pick<PricingPoint, 'id' | 'model' | 'real_usd_per_mtok'> & { score: number },
): PricingPoint {
  const modelDisplay = partial.model_display ?? partial.model
  const plan = partial.plan ?? 'Plan'
  return {
    plan,
    billing: 'subscription',
    model_display: modelDisplay,
    vendor: 'Vendor',
    channel: 'Vendor',
    label: `${modelDisplay} · ${plan}`,
    price_usd: 20,
    monthly_yi: 1,
    list_blended_usd_per_mtok: 10,
    d: null,
    confidence: 'high',
    tier: 'main',
    source: '',
    note: '',
    arena_code__score: partial.score,
    arena_code__variant: null,
    arena_agent_mode__score: null,
    arena_agent_mode__variant: null,
    aa_intelligence_index__score: null,
    aa_intelligence_index__variant: null,
    aa_coding_agent_index__score: null,
    aa_coding_agent_index__variant: null,
    ...partial,
  }
}

describe('subscription frontier', () => {
  const cheapWeak = point({
    id: 'a',
    model: 'a',
    real_usd_per_mtok: 0.01,
    score: 10,
  })
  const mid = point({ id: 'b', model: 'b', real_usd_per_mtok: 0.02, score: 20 })
  const dearStrong = point({
    id: 'c',
    model: 'c',
    real_usd_per_mtok: 0.03,
    score: 30,
  })
  const dominated = point({
    id: 'd',
    model: 'd',
    real_usd_per_mtok: 0.025,
    score: 15,
  })
  const api = point({
    id: 'api',
    model: 'e',
    billing: 'metered',
    real_usd_per_mtok: 0.005,
    score: 40,
  })

  it('keeps subscription-only maximize-score / minimize-price points', () => {
    const frontier = subscriptionFrontier(
      [dominated, dearStrong, api, cheapWeak, mid],
      'arena_code',
    )
    expect(frontier.map((row) => row.id)).toEqual(['a', 'b', 'c'])
  })

  it('recomputes the frontier after identity filters', () => {
    const points = [cheapWeak, mid, dearStrong, dominated]
    const filtered = filterPricingPoints(points, { models: new Set(['c', 'd']) })
    expect(subscriptionFrontier(filtered, 'arena_code').map((row) => row.id)).toEqual(['d', 'c'])
  })
})

describe('most efficient heuristic', () => {
  it('picks the cheapest high-score model representative, not every frontier point', () => {
    const low = point({
      id: 'cheap-high',
      model: 'hero',
      real_usd_per_mtok: 0.01,
      score: 100,
    })
    const highPriceSameModel = point({
      id: 'dear-high',
      model: 'hero',
      plan: 'Pro',
      real_usd_per_mtok: 0.04,
      score: 100,
    })
    const weakCheap = point({
      id: 'weak',
      model: 'weak',
      real_usd_per_mtok: 0.008,
      score: 10,
    })
    const picked = mostEfficientPoint([low, highPriceSameModel, weakCheap], 'arena_code')
    expect(picked?.id).toBe('cheap-high')
  })
})

describe('point grouping', () => {
  it('groups exact overlaps without changing coordinates', () => {
    const a = point({
      id: 'one',
      model: 'm1',
      real_usd_per_mtok: 0.02,
      score: 50,
    })
    const b = point({
      id: 'two',
      model: 'm2',
      channel: 'Ollama',
      real_usd_per_mtok: 0.02,
      score: 50,
    })
    const c = point({
      id: 'three',
      model: 'm3',
      real_usd_per_mtok: 0.03,
      score: 50,
    })
    const groups = groupByExactCoords([a, b, c], 'arena_code')
    const overlap = groups.find((group) => group.points.length > 1)
    expect(overlap?.x).toBe(0.02)
    expect(overlap?.y).toBe(50)
    expect(overlap?.points.map((row) => row.id).sort()).toEqual(['one', 'two'])
    expect(groups).toHaveLength(2)
  })

  it('lists same-model points across services', () => {
    const ollama = point({
      id: 'ollama',
      model: 'deepseek-v4-flash',
      channel: 'Ollama',
      real_usd_per_mtok: 0.02,
      score: 40,
    })
    const opencode = point({
      id: 'opencode',
      model: 'deepseek-v4-flash',
      channel: 'OpenCode',
      real_usd_per_mtok: 0.03,
      score: 40,
    })
    const other = point({
      id: 'other',
      model: 'gpt',
      real_usd_per_mtok: 0.01,
      score: 50,
    })
    expect(sameModelPoints([ollama, opencode, other], 'deepseek-v4-flash').map((row) => row.id)).toEqual([
      'ollama',
      'opencode',
    ])
  })
})

describe('active point guides', () => {
  it('connects the axes to the point instead of drawing a full crosshair', () => {
    const plot = { left: 40, top: 20, width: 400, height: 300 }
    const guides = guideEndpoints(200, 80, plot)
    expect(guides.horizontal).toEqual({ x1: 40, y1: 80, x2: 200, y2: 80 })
    expect(guides.vertical).toEqual({ x1: 200, y1: 80, x2: 200, y2: 320 })
    expect(guides.horizontal.x2).toBeLessThan(plot.left + plot.width)
    expect(guides.vertical.y1).toBeGreaterThan(plot.top)
  })
})
