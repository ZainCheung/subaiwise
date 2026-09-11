import { describe, expect, it } from 'vitest'
import type { SubAIWiseEntry } from '../data/schema'
import { filterEntries } from '../domain/selectors'
import { groupByExactCoords, mostEfficientEntry, sameModelEntries, subscriptionFrontier } from '../domain/leaderboards'
import { formatYTick, guideEndpoints } from './axis'

function entry({
  id,
  modelId,
  price,
  score,
  plan,
  channel,
}: {
  id: string
  modelId: string
  price: number
  score: number
  plan?: SubAIWiseEntry['plan']
  channel?: string
}): SubAIWiseEntry {
  const resolvedPlan = plan ?? { id: 'plan', name: 'Plan', billing: 'subscription' }
  return {
    id,
    label: `${modelId} · ${resolvedPlan.name}`,
    provider: 'Vendor',
    channel: channel ?? 'Vendor',
    plan: resolvedPlan,
    model: { id: modelId, name: modelId },
    pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: price, listUsdPerMillionTokens: 10 },
    allowance: { monthlyTokens: 100_000_000 },
    quality: { confidence: 'high', tier: 'main' },
    benchmarks: { codeArena: { score } },
    source: { label: '', note: '' },
  }
}

describe('subscription frontier', () => {
  const cheapWeak = entry({ id: 'a', modelId: 'a', price: 0.01, score: 10 })
  const mid = entry({ id: 'b', modelId: 'b', price: 0.02, score: 20 })
  const dearStrong = entry({ id: 'c', modelId: 'c', price: 0.03, score: 30 })
  const dominated = entry({ id: 'd', modelId: 'd', price: 0.025, score: 15 })
  const api = entry({
    id: 'api',
    modelId: 'e',
    price: 0.005,
    score: 40,
    plan: { id: 'api', name: 'API', billing: 'metered' },
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
    const filtered = filterEntries(points, { models: new Set(['c', 'd']) })
    expect(subscriptionFrontier(filtered, 'arena_code').map((row) => row.id)).toEqual(['d', 'c'])
  })
})

describe('most efficient heuristic', () => {
  it('picks the cheapest high-score model representative, not every frontier point', () => {
    const low = entry({
      id: 'cheap-high',
      modelId: 'hero',
      price: 0.01,
      score: 100,
    })
    const highPriceSameModel = entry({
      id: 'dear-high',
      modelId: 'hero',
      price: 0.04,
      score: 100,
      plan: { id: 'pro', name: 'Pro', billing: 'subscription' },
    })
    const weakCheap = entry({
      id: 'weak',
      modelId: 'weak',
      price: 0.008,
      score: 10,
    })
    const picked = mostEfficientEntry([low, highPriceSameModel, weakCheap], 'arena_code')
    expect(picked?.id).toBe('cheap-high')
  })
})

describe('point grouping', () => {
  it('groups exact overlaps without changing coordinates', () => {
    const a = entry({ id: 'one', modelId: 'm1', price: 0.02, score: 50 })
    const b = entry({
      id: 'two',
      modelId: 'm2',
      price: 0.02,
      score: 50,
      channel: 'Ollama',
    })
    const c = entry({ id: 'three', modelId: 'm3', price: 0.03, score: 50 })
    const groups = groupByExactCoords([a, b, c], 'arena_code')
    const overlap = groups.find((group) => group.entries.length > 1)
    expect(overlap?.x).toBe(0.02)
    expect(overlap?.y).toBe(50)
    expect(overlap?.entries.map((row) => row.id).sort()).toEqual(['one', 'two'])
    expect(groups).toHaveLength(2)
  })

  it('lists same-model points across services', () => {
    const ollama = entry({
      id: 'ollama',
      modelId: 'deepseek-v4-flash',
      price: 0.02,
      score: 40,
      channel: 'Ollama',
    })
    const opencode = entry({
      id: 'opencode',
      modelId: 'deepseek-v4-flash',
      price: 0.03,
      score: 40,
      channel: 'OpenCode',
    })
    const other = entry({ id: 'other', modelId: 'gpt', price: 0.01, score: 50 })
    expect(sameModelEntries([ollama, opencode, other], 'deepseek-v4-flash').map((row) => row.id)).toEqual([
      'ollama',
      'opencode',
    ])
  })
})

describe('percent axis ticks', () => {
  it('labels Terminal-Bench style rates with a percent sign', () => {
    expect(formatYTick(45, 'percent')).toBe('45%')
    expect(formatYTick(44.5, 'percent')).toBe('44.5%')
    expect(formatYTick(1400, 'score')).toBe('1400')
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
