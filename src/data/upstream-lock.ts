import { z } from 'zod'

export const DEFAULT_UPSTREAM_PATHS = [
  'derived/points.json',
  'derived/benchmark-configurations.json',
  'derived/benchmark-points.json',
] as const

export const UpstreamLockSchema = z.object({
  repository: z.string().min(1),
  ref: z.string().regex(/^[0-9a-f]{40}$/i),
  paths: z.array(z.string().min(1)).min(1),
})
export type UpstreamLock = z.infer<typeof UpstreamLockSchema>

export function parseUpstreamLock(value: unknown): UpstreamLock {
  return UpstreamLockSchema.parse(value)
}

export function monitoredPathsChanged(
  lockedHashes: Record<string, string>,
  latestHashes: Record<string, string>,
): boolean {
  const paths = new Set([...Object.keys(lockedHashes), ...Object.keys(latestHashes)])
  for (const path of paths) {
    if ((lockedHashes[path] ?? '') !== (latestHashes[path] ?? '')) return true
  }
  return false
}
