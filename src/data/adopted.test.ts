import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { researchBlobUrl } from '../lib/safe-url'
import {
  adoptedEntryId,
  buildProvenance,
  extractResearchFilenames,
  joinAdoptedProvenance,
  parseAdoptedCsv,
} from './adopted'
import type { SubAIWiseEntry } from './schema'

const source = {
  repository: 'FeiZhuLulu/real-api-pricing',
  commit: 'a'.repeat(40),
}

const csv = `\ufeffplan_id,plan_name,billing,price,currency,price_usd,served_model,monthly_tokens,monthly_yi,real_usd_per_mtok,confidence,chart_tier,source,decision_note
kimi_moderato_cn,Kimi Moderato,subscription,199,CNY,29.36,kimi-k3,290000000,2.9,0.1,medium,main,"199档×官方4/20；kimi-adoption-round6-2026-09-08.json","汇率说明；https://www.example.com/fx javascript:alert(1) not-a-link"
demo_plus,Demo Plus,subscription,20,USD,20,demo-model,100000000,1,0.05,high,main,fixture,
`

function entry(id: string): SubAIWiseEntry {
  const [planId, modelId] = id.split('::')
  return {
    id,
    provider: 'Vendor',
    channel: 'Vendor',
    plan: { id: planId, name: planId, billing: 'subscription' },
    model: { id: modelId, name: modelId },
    pricing: { monthlyUsd: 20, effectiveUsdPerMillionTokens: 0.05, listUsdPerMillionTokens: null },
    allowance: { monthlyTokens: 100_000_000 },
    quality: { confidence: 'high', tier: 'main' },
    benchmarks: {},
    source: { label: 'fixture', note: '' },
  }
}

describe('adopted provenance', () => {
  it('joins adopted.csv onto canonical entry identity', () => {
    const rows = parseAdoptedCsv(csv)
    expect(rows).toHaveLength(2)
    expect(adoptedEntryId(rows[0])).toBe('kimi_moderato_cn::kimi-k3')
    const joined = joinAdoptedProvenance(
      [entry('kimi_moderato_cn::kimi-k3'), entry('missing::row')],
      csv,
      source,
    )
    expect(joined[0].provenance?.originalPrice).toBe(199)
    expect(joined[0].provenance?.currency).toBe('CNY')
    expect(joined[1].provenance).toBeUndefined()
  })

  it('keeps original price, currency, and decision note', () => {
    const provenance = buildProvenance(parseAdoptedCsv(csv)[0], source)
    expect(provenance.originalPrice).toBe(199)
    expect(provenance.currency).toBe('CNY')
    expect(provenance.decisionNote).toContain('汇率说明')
    expect(provenance.sourceText).toContain('kimi-adoption-round6-2026-09-08.json')
  })

  it('keeps direct http(s) URLs and rejects unsafe hrefs', () => {
    const provenance = buildProvenance(parseAdoptedCsv(csv)[0], source)
    expect(provenance.evidence.some((item) => item.url === 'https://www.example.com/fx')).toBe(true)
    expect(provenance.evidence.every((item) => item.url.startsWith('http'))).toBe(true)
    expect(provenance.evidence.some((item) => item.url.startsWith('javascript:'))).toBe(false)
  })

  it('maps research filenames to the locked snapshot, not main', () => {
    expect(extractResearchFilenames('see kimi-adoption-round6-2026-09-08.json and flat.json')).toEqual([
      'kimi-adoption-round6-2026-09-08.json',
    ])
    const provenance = buildProvenance(parseAdoptedCsv(csv)[0], source)
    const research = provenance.evidence.find((item) => item.type === 'upstream-research')
    expect(research?.url).toBe(
      researchBlobUrl(source.repository, source.commit, 'kimi-adoption-round6-2026-09-08.json'),
    )
    expect(research?.url).toContain(source.commit)
    expect(research?.url).not.toContain('/blob/main/')
  })

  it('falls back when an entry has no adopted row', () => {
    const joined = joinAdoptedProvenance([entry('none::model')], csv, source)
    expect(joined[0].provenance).toBeUndefined()
  })
})

describe('checked-in provenance snapshot', () => {
  it('joins adopted rows and points research evidence at the locked SHA', () => {
    const dataset = JSON.parse(readFileSync('data/dataset.json', 'utf8')) as {
      source: { commit: string }
      entries: Array<{ id: string; provenance?: { originalPrice: number | null; currency: string | null; evidence: Array<{ type: string; url: string }> } }>
    }
    const withEvidence = dataset.entries.filter((item) => item.provenance)
    expect(withEvidence.length).toBeGreaterThan(50)
    const cny = withEvidence.find((item) => item.provenance?.currency === 'CNY')
    expect(cny?.provenance?.originalPrice).not.toBeNull()
    const research = withEvidence.flatMap((item) => item.provenance?.evidence ?? []).find((item) => item.type === 'upstream-research')
    expect(research?.url).toContain(`/blob/${dataset.source.commit}/data/research/`)
    expect(research?.url).not.toContain('/blob/main/')
  })
})

