import type { PricingPoint } from '../types'

/** `null` means every id is included. An empty set means nothing is included. */
export type IdFilter = Set<string> | null

export function matchesIdFilter(value: string, selected: IdFilter): boolean {
  if (selected == null) return true
  return selected.has(value)
}

export function filterPricingPoints(
  points: PricingPoint[],
  opts: { models?: IdFilter; channels?: IdFilter } = {},
): PricingPoint[] {
  const models = opts.models === undefined ? null : opts.models
  const channels = opts.channels === undefined ? null : opts.channels
  if (models == null && channels == null) return points
  return points.filter(
    (point) =>
      matchesIdFilter(point.model, models) && matchesIdFilter(point.channel, channels),
  )
}

export type ModelOption = {
  id: string
  label: string
  vendor: string
}

export function uniqueModelOptions(points: PricingPoint[]): ModelOption[] {
  const map = new Map<string, ModelOption>()
  for (const point of points) {
    if (!map.has(point.model)) {
      map.set(point.model, {
        id: point.model,
        label: point.model_display,
        vendor: point.vendor,
      })
    }
  }
  return [...map.values()].sort(
    (a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id),
  )
}

export function uniqueChannelOptions(points: PricingPoint[]): string[] {
  return [...new Set(points.map((point) => point.channel))].sort((a, b) => a.localeCompare(b))
}

export function toggleId(selected: IdFilter, id: string, allIds: string[]): IdFilter {
  const current = selected == null ? new Set(allIds) : new Set(selected)
  if (current.has(id)) current.delete(id)
  else current.add(id)
  if (current.size === allIds.length) return null
  return current
}

export function selectAllIds(): IdFilter {
  return null
}

export function selectNoIds(): IdFilter {
  return new Set()
}

export function selectedCount(selected: IdFilter, total: number): number {
  if (selected == null) return total
  return selected.size
}
