import type { Billing, SubAIWiseEntry } from '../data/schema'
import { entryLabel, monthlyYi } from './selectors'

export type PriceRow = {
  id: string
  label: string
  planName: string
  modelId: string
  modelName: string
  maker: string
  channel: string
  billing: Billing
  realUsdPerMtok: number
}

export type AllowanceRow = {
  id: string
  label: string
  planName: string
  modelId: string
  modelName: string
  maker: string
  channel: string
  monthlyYi: number
}

export function selectPriceRows(entries: readonly SubAIWiseEntry[]): PriceRow[] {
  return [...entries]
    .map((entry) => ({
      id: entry.id,
      label: entryLabel(entry),
      planName: entry.plan.name,
      modelId: entry.model.id,
      modelName: entry.model.name,
      maker: entry.provider,
      channel: entry.channel,
      billing: entry.plan.billing,
      realUsdPerMtok: entry.pricing.effectiveUsdPerMillionTokens,
    }))
    .sort(
      (a, b) => a.realUsdPerMtok - b.realUsdPerMtok || a.id.localeCompare(b.id),
    )
}

export function selectAllowanceRows(entries: readonly SubAIWiseEntry[]): AllowanceRow[] {
  const rows: AllowanceRow[] = []
  for (const entry of entries) {
    if (entry.plan.billing !== 'subscription') continue
    const yi = monthlyYi(entry)
    if (yi == null || yi <= 0) continue
    rows.push({
      id: entry.id,
      label: entryLabel(entry),
      planName: entry.plan.name,
      modelId: entry.model.id,
      modelName: entry.model.name,
      maker: entry.provider,
      channel: entry.channel,
      monthlyYi: yi,
    })
  }
  return rows.sort((a, b) => b.monthlyYi - a.monthlyYi || a.id.localeCompare(b.id))
}

/** Subscription saving vs list blended API price. Null for API points or missing list price. */
export function apiSavingRatio(entry: SubAIWiseEntry): number | null {
  if (entry.plan.billing === 'metered') return null
  const list = entry.pricing.listUsdPerMillionTokens
  const real = entry.pricing.effectiveUsdPerMillionTokens
  if (list == null || !(list > 0) || !Number.isFinite(real)) return null
  return 1 - real / list
}

export function formatApiSaving(ratio: number): string {
  const pct = Math.round(ratio * 1000) / 10
  if (Number.isInteger(pct)) return `${pct}%`
  return `${pct.toFixed(1)}%`
}
