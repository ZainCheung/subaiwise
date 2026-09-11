import { describe, expect, it } from 'vitest'
import type { SubAIWiseEntry } from '../data/schema'
import { filterEntries, selectChannels, selectModels } from '../domain/selectors'
import { selectAllIds, selectNoIds, selectedCount, toggleId } from './filters'

function entry({
  id,
  modelId,
  channel,
  modelName,
  maker,
  pricing,
}: {
  id: string
  modelId: string
  channel: string
  modelName?: string
  maker?: string
  pricing?: SubAIWiseEntry['pricing']
}): SubAIWiseEntry {
  return {
    id,
    label: `${modelName ?? modelId} · Plan`,
    provider: maker ?? 'Vendor',
    channel,
    plan: { id: id.split('::')[0] ?? 'plan', name: 'Plan', billing: 'subscription' },
    model: { id: modelId, name: modelName ?? modelId },
    pricing: pricing ?? { monthlyUsd: 20, effectiveUsdPerMillionTokens: 1, listUsdPerMillionTokens: 10 },
    allowance: { monthlyTokens: 100_000_000 },
    quality: { confidence: 'high', tier: 'main' },
    benchmarks: {},
    source: { label: '', note: '' },
  }
}

describe('identity filters', () => {
  const deepseekOllama = entry({
    id: 'ollama_pro::deepseek-v4-flash',
    modelId: 'deepseek-v4-flash',
    modelName: 'DeepSeek V4 Flash',
    maker: 'DeepSeek',
    channel: 'Ollama',
    pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 0.04, listUsdPerMillionTokens: 10 },
  })
  const deepseekOpenCode = entry({
    id: 'opencode_go::deepseek-v4-pro',
    modelId: 'deepseek-v4-pro',
    modelName: 'DeepSeek V4 Pro',
    maker: 'DeepSeek',
    channel: 'OpenCode',
    pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 0.03, listUsdPerMillionTokens: 10 },
  })
  const gptOllama = entry({
    id: 'ollama_pro::gpt-5.6-luna',
    modelId: 'gpt-5.6-luna',
    modelName: 'GPT 5.6 Luna',
    maker: 'OpenAI',
    channel: 'Ollama',
    pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 0.02, listUsdPerMillionTokens: 10 },
  })
  const gptOpenAI = entry({
    id: 'chatgpt_plus::gpt-5.6-luna',
    modelId: 'gpt-5.6-luna',
    modelName: 'GPT 5.6 Luna',
    maker: 'OpenAI',
    channel: 'OpenAI',
    pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 0.01, listUsdPerMillionTokens: 10 },
  })
  const all = [deepseekOllama, deepseekOpenCode, gptOllama, gptOpenAI]

  it('treats null as all and an empty set as none', () => {
    expect(filterEntries(all, { models: null, channels: null })).toEqual(all)
    expect(filterEntries(all, { models: new Set(), channels: null })).toEqual([])
    expect(filterEntries(all, { models: null, channels: new Set() })).toEqual([])
    expect(selectedCount(null, 4)).toBe(4)
    expect(selectedCount(new Set(), 4)).toBe(0)
    expect(selectAllIds()).toBeNull()
    expect(selectNoIds()?.size).toBe(0)
  })

  it('ORs within a group and ANDs across groups', () => {
    const filtered = filterEntries(all, {
      models: new Set(['deepseek-v4-flash', 'gpt-5.6-luna']),
      channels: new Set(['Ollama', 'OpenCode']),
    })
    expect(filtered.map((row) => row.id).sort()).toEqual([
      'ollama_pro::deepseek-v4-flash',
      'ollama_pro::gpt-5.6-luna',
    ])
  })

  it('keys models by model id, not display name', () => {
    const options = selectModels(all)
    expect(options.find((option) => option.label === 'GPT 5.6 Luna')?.id).toBe('gpt-5.6-luna')
    const filtered = filterEntries(all, { models: new Set(['gpt-5.6-luna']) })
    expect(filtered).toHaveLength(2)
    expect(filtered.every((row) => row.model.id === 'gpt-5.6-luna')).toBe(true)
  })

  it('lists unique channels from the access provider field', () => {
    expect(selectChannels(all)).toEqual(['Ollama', 'OpenAI', 'OpenCode'])
  })

  it('collapses a full selection back to all', () => {
    const ids = ['a', 'b', 'c']
    expect(toggleId(new Set(['a', 'b']), 'c', ids)).toBeNull()
    expect(toggleId(null, 'a', ids)).toEqual(new Set(['b', 'c']))
  })

  it('filters before sorting and limiting, not after', () => {
    const ranked = [...all].sort(
      (a, b) => a.pricing.effectiveUsdPerMillionTokens - b.pricing.effectiveUsdPerMillionTokens,
    )
    const wrong = ranked.slice(0, 1).filter((row) => row.channel === 'Ollama')
    const right = filterEntries(ranked, { channels: new Set(['Ollama']) })
      .sort((a, b) => a.pricing.effectiveUsdPerMillionTokens - b.pricing.effectiveUsdPerMillionTokens)
      .slice(0, 1)
    expect(wrong.map((row) => row.id)).toEqual([])
    expect(right.map((row) => row.id)).toEqual(['ollama_pro::gpt-5.6-luna'])
  })
})
