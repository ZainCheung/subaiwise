import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assertKnownChannel,
  CHANNEL_BY_PLAN_PREFIX,
  isFirstParty,
  isThirdParty,
  KNOWN_CHANNELS,
  manufacturer,
  resolveChannel,
} from './channel'
import { adaptPoint, buildDataset } from './adapter'
import { SubAIWiseDatasetSchema } from './schema'

const REQUIRED_BRANDS = [
  'OpenAI',
  'Anthropic',
  'Cursor',
  'Kimi',
  'Zhipu',
  'MiniMax',
  'Alibaba',
  'OpenCode',
  'Command Code',
  'Devin',
  'Ollama',
  'DeepSeek',
  'Google',
  'Xiaomi',
  'Tencent',
  'Meta',
  'StepFun',
] as const

const source = {
  repository: 'FeiZhuLulu/real-api-pricing',
  commit: 'd'.repeat(40),
}

function upstreamPoint(overrides: Record<string, unknown> = {}) {
  return {
    id: 'demo_plus::demo-model',
    plan: 'Demo Plus',
    billing: 'subscription' as const,
    model: 'demo-model',
    model_display: 'Demo Model',
    vendor: 'Demo Labs',
    label: 'Demo Model · Demo Plus',
    price_usd: 20,
    monthly_yi: 2,
    real_usd_per_mtok: 0.05,
    list_blended_usd_per_mtok: 0.2,
    confidence: 'high',
    tier: 'main',
    source: 'fixture',
    note: '',
    arena_code__score: 1400,
    arena_code__variant: 'demo',
    ...overrides,
  }
}

function payload(points = [upstreamPoint()]) {
  return {
    generatedAt: '2026-01-01',
    mix: { cache: 0.975, input: 0.0215, output: 0.0035 },
    boards: {
      arena_code: {
        name: 'Code Arena',
        metric: 'Arena score',
        url: 'https://arena.ai/leaderboard/code',
        snapshot: '2026-01-01',
      },
    },
    points,
  }
}

describe('channel resolver', () => {
  it('maps DeepSeek models on Ollama, OpenCode, and Command Code', () => {
    const ollama = resolveChannel({
      id: 'ollama_pro::deepseek-v4-flash',
      manufacturer: 'DeepSeek',
    })
    const opencode = resolveChannel({
      id: 'opencode_go::deepseek-v4-pro',
      manufacturer: 'DeepSeek',
    })
    const commandCode = resolveChannel({
      id: 'command_code_goat::deepseek-v4-flash-fast',
      manufacturer: 'DeepSeek',
    })

    expect(ollama).toMatchObject({ channel: 'Ollama', known: true, matchedPrefix: 'ollama' })
    expect(opencode).toMatchObject({ channel: 'OpenCode', known: true, matchedPrefix: 'opencode' })
    expect(commandCode).toMatchObject({
      channel: 'Command Code',
      known: true,
      matchedPrefix: 'command_code',
    })
    expect(isThirdParty('DeepSeek', ollama.channel)).toBe(true)
    expect(isThirdParty('DeepSeek', opencode.channel)).toBe(true)
    expect(isThirdParty('DeepSeek', commandCode.channel)).toBe(true)
  })

  it('maps Devin plans as a third-party OpenAI access channel', () => {
    const resolved = resolveChannel({
      planId: 'devin_max',
      manufacturer: 'OpenAI',
    })
    expect(resolved).toMatchObject({
      channel: 'Devin',
      known: true,
      matchedPrefix: 'devin',
    })
    expect(isThirdParty('OpenAI', resolved.channel)).toBe(true)
    expect(isFirstParty('OpenAI', resolved.channel)).toBe(false)
  })

  it('maps OpenAI first-party ChatGPT and API plans to the OpenAI channel', () => {
    const plus = resolveChannel({
      id: 'chatgpt_plus::gpt-5.6-luna',
      manufacturer: 'OpenAI',
    })
    const api = resolveChannel({
      id: 'openai_luna_api::gpt-5.6-luna',
      manufacturer: 'OpenAI',
    })

    expect(plus).toMatchObject({ channel: 'OpenAI', known: true })
    expect(api).toMatchObject({ channel: 'OpenAI', known: true })
    expect(isFirstParty('OpenAI', plus.channel)).toBe(true)
    expect(isFirstParty('OpenAI', api.channel)).toBe(true)
    expect(isThirdParty('OpenAI', plus.channel)).toBe(false)
  })

  it('covers the required brand set as a mapped channel', () => {
    const mappedChannels = new Set(KNOWN_CHANNELS)
    for (const brand of REQUIRED_BRANDS) {
      expect(mappedChannels.has(brand), `${brand} missing from channel map`).toBe(true)
    }
    expect(manufacturer('Muse')).toBe('Meta')
    expect(manufacturer('GLM')).toBe('Zhipu')
    expect(CHANNEL_BY_PLAN_PREFIX.some(([, channel]) => channel === 'StepFun')).toBe(true)
  })

  it('falls back to the manufacturer for unknown prefixes and stays discoverable', () => {
    const unknown = resolveChannel({
      id: 'mystery_plan::some-model',
      manufacturer: 'DeepSeek',
    })
    expect(unknown).toEqual({
      channel: 'DeepSeek',
      known: false,
      matchedPrefix: null,
      planId: 'mystery_plan',
    })
    expect(() => assertKnownChannel(unknown)).toThrow(/Unknown access channel/)
    expect(isFirstParty('DeepSeek', unknown.channel)).toBe(true)
  })

  it('does not silently assign an unknown plan to a third-party brand', () => {
    const unknown = resolveChannel({
      id: 'brand_new_host::glm-5.3',
      manufacturer: 'Zhipu',
    })
    expect(unknown.channel).toBe('Zhipu')
    expect(unknown.channel).not.toBe('OpenCode')
    expect(unknown.channel).not.toBe('Ollama')
    expect(unknown.known).toBe(false)
  })

  it('matches plan-id prefixes, not display names', () => {
    const byNameWouldLie = resolveChannel({
      planId: 'chatgpt_plus',
      manufacturer: 'OpenAI',
    })
    expect(byNameWouldLie.channel).toBe('OpenAI')
    const ollamaNamedLikeVendor = resolveChannel({
      planId: 'ollama_max',
      manufacturer: 'MiniMax',
    })
    expect(ollamaNamedLikeVendor.channel).toBe('Ollama')
  })
})

describe('adapter channel contract', () => {
  it('writes vendor and channel onto canonical entries and the compatibility view', () => {
    const dataset = buildDataset(
      payload([
        upstreamPoint({
          id: 'ollama_pro::deepseek-v4-flash',
          plan: 'Ollama Pro',
          vendor: 'DeepSeek',
          model: 'deepseek-v4-flash',
          model_display: 'DeepSeek V4 Flash',
          label: 'DeepSeek V4 Flash · Ollama Pro',
        }),
        upstreamPoint({
          id: 'chatgpt_plus::gpt-5.6-luna',
          plan: 'ChatGPT Plus',
          vendor: 'OpenAI',
          model: 'gpt-5.6-luna',
          model_display: 'GPT 5.6 Luna',
          label: 'GPT 5.6 Luna · ChatGPT Plus',
        }),
        upstreamPoint({
          id: 'devin_max::gpt-6-astra',
          plan: 'Devin Max',
          vendor: 'OpenAI',
          model: 'gpt-6-astra',
          model_display: 'GPT-6 Astra',
          label: 'GPT-6 Astra · Devin Max',
        }),
      ]),
      source,
    )

    const byId = Object.fromEntries(dataset.entries.map((entry) => [entry.id, entry]))
    expect(byId['ollama_pro::deepseek-v4-flash']).toMatchObject({
      provider: 'DeepSeek',
      channel: 'Ollama',
    })
    expect(byId['chatgpt_plus::gpt-5.6-luna']).toMatchObject({
      provider: 'OpenAI',
      channel: 'OpenAI',
    })
    expect(byId['devin_max::gpt-6-astra']).toMatchObject({
      provider: 'OpenAI',
      channel: 'Devin',
    })
  })

  it('does not change pricing, allowance, benchmark, or entry id when adding channel', () => {
    const point = upstreamPoint({
      id: 'opencode_go::deepseek-v4-pro',
      plan: 'OpenCode Go',
      vendor: 'DeepSeek',
    })
    const entry = adaptPoint(point, ['arena_code'])
    expect(entry.id).toBe('opencode_go::deepseek-v4-pro')
    expect(entry.pricing).toEqual({
      monthlyUsd: 20,
      effectiveUsdPerMillionTokens: 0.05,
      listUsdPerMillionTokens: 0.2,
    })
    expect(entry.allowance.monthlyTokens).toBe(200_000_000)
    expect(entry.benchmarks.codeArena?.score).toBe(1400)
    expect(entry.channel).toBe('OpenCode')
    expect(entry.provider).toBe('DeepSeek')
  })
})

describe('checked-in dataset channel coverage', () => {
  it('resolves every published plan prefix to a known channel', () => {
    const dataset = SubAIWiseDatasetSchema.parse(
      JSON.parse(readFileSync(resolve(process.cwd(), 'data/dataset.json'), 'utf8')),
    )
    const unknown: string[] = []
    for (const entry of dataset.entries) {
      const resolved = resolveChannel({
        id: entry.id,
        planId: entry.plan.id,
        manufacturer: entry.provider,
      })
      expect(entry.channel).toBe(resolved.channel)
      if (!resolved.known) unknown.push(entry.plan.id)
    }
    expect(unknown).toEqual([])
  })
})
