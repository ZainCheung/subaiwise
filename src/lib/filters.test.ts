import { describe, expect, it } from 'vitest'
import type { PricingPoint } from '../types'
import {
  filterPricingPoints,
  selectAllIds,
  selectNoIds,
  selectedCount,
  toggleId,
  uniqueChannelOptions,
  uniqueModelOptions,
} from './filters'

function point(partial: Partial<PricingPoint> & Pick<PricingPoint, 'id' | 'model' | 'channel'>): PricingPoint {
  const modelDisplay = partial.model_display ?? partial.model
  const plan = partial.plan ?? 'Plan'
  return {
    plan,
    billing: 'subscription',
    model_display: modelDisplay,
    vendor: 'Vendor',
    label: `${modelDisplay} · ${plan}`,
    price_usd: 20,
    monthly_yi: 1,
    real_usd_per_mtok: 1,
    list_blended_usd_per_mtok: 10,
    d: null,
    confidence: 'high',
    tier: 'main',
    source: '',
    note: '',
    arena_code__score: null,
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

describe('identity filters', () => {
  const deepseekOllama = point({
    id: 'ollama_pro::deepseek-v4-flash',
    model: 'deepseek-v4-flash',
    model_display: 'DeepSeek V4 Flash',
    vendor: 'DeepSeek',
    channel: 'Ollama',
    real_usd_per_mtok: 0.04,
  })
  const deepseekOpenCode = point({
    id: 'opencode_go::deepseek-v4-pro',
    model: 'deepseek-v4-pro',
    model_display: 'DeepSeek V4 Pro',
    vendor: 'DeepSeek',
    channel: 'OpenCode',
    real_usd_per_mtok: 0.03,
  })
  const gptOllama = point({
    id: 'ollama_pro::gpt-5.6-luna',
    model: 'gpt-5.6-luna',
    model_display: 'GPT 5.6 Luna',
    vendor: 'OpenAI',
    channel: 'Ollama',
    real_usd_per_mtok: 0.02,
  })
  const gptOpenAI = point({
    id: 'chatgpt_plus::gpt-5.6-luna',
    model: 'gpt-5.6-luna',
    model_display: 'GPT 5.6 Luna',
    vendor: 'OpenAI',
    channel: 'OpenAI',
    real_usd_per_mtok: 0.01,
  })
  const all = [deepseekOllama, deepseekOpenCode, gptOllama, gptOpenAI]

  it('treats null as all and an empty set as none', () => {
    expect(filterPricingPoints(all, { models: null, channels: null })).toEqual(all)
    expect(filterPricingPoints(all, { models: new Set(), channels: null })).toEqual([])
    expect(filterPricingPoints(all, { models: null, channels: new Set() })).toEqual([])
    expect(selectedCount(null, 4)).toBe(4)
    expect(selectedCount(new Set(), 4)).toBe(0)
    expect(selectAllIds()).toBeNull()
    expect(selectNoIds()?.size).toBe(0)
  })

  it('ORs within a group and ANDs across groups', () => {
    const filtered = filterPricingPoints(all, {
      models: new Set(['deepseek-v4-flash', 'gpt-5.6-luna']),
      channels: new Set(['Ollama', 'OpenCode']),
    })
    expect(filtered.map((row) => row.id).sort()).toEqual([
      'ollama_pro::deepseek-v4-flash',
      'ollama_pro::gpt-5.6-luna',
    ])
  })

  it('keys models by model id, not display name', () => {
    const options = uniqueModelOptions(all)
    expect(options.find((option) => option.label === 'GPT 5.6 Luna')?.id).toBe('gpt-5.6-luna')
    const filtered = filterPricingPoints(all, { models: new Set(['gpt-5.6-luna']) })
    expect(filtered).toHaveLength(2)
    expect(filtered.every((row) => row.model === 'gpt-5.6-luna')).toBe(true)
  })

  it('lists unique channels from the access provider field', () => {
    expect(uniqueChannelOptions(all)).toEqual(['Ollama', 'OpenAI', 'OpenCode'])
  })

  it('collapses a full selection back to all', () => {
    const ids = ['a', 'b', 'c']
    expect(toggleId(new Set(['a', 'b']), 'c', ids)).toBeNull()
    expect(toggleId(null, 'a', ids)).toEqual(new Set(['b', 'c']))
  })

  it('filters before sorting and limiting, not after', () => {
    const ranked = [...all].sort((a, b) => a.real_usd_per_mtok - b.real_usd_per_mtok)
    const wrong = ranked.slice(0, 1).filter((row) => row.channel === 'Ollama')
    const right = filterPricingPoints(ranked, { channels: new Set(['Ollama']) })
      .sort((a, b) => a.real_usd_per_mtok - b.real_usd_per_mtok)
      .slice(0, 1)
    expect(wrong.map((row) => row.id)).toEqual([])
    expect(right.map((row) => row.id)).toEqual(['ollama_pro::gpt-5.6-luna'])
  })
})
