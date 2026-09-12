/** Bar width on a log scale, floored so the smallest value stays visible. */
export function logWidthPct(value: number, min: number, max: number, floor = 1.5): number {
  const lv = Math.log10(Math.max(value, 1e-9))
  const lmin = Math.log10(Math.max(min, 1e-9))
  const lmax = Math.log10(Math.max(max, 1e-9))
  const span = lmax - lmin
  if (!Number.isFinite(span) || span <= 0) return 50
  return Math.max(floor, ((lv - lmin) / span) * 100)
}
