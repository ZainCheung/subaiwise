/** `null` means every id is included. An empty set means nothing is included. */
export type IdFilter = Set<string> | null

export function matchesIdFilter(value: string, selected: IdFilter): boolean {
  if (selected == null) return true
  return selected.has(value)
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
