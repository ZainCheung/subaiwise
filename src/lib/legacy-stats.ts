import type { PricingPoint } from '../types'

/** @deprecated Legacy compatibility helper for the unchanged chart components. */
export function subscriptionPoints(points: PricingPoint[]): PricingPoint[] {
  return points.filter(
    (point) =>
      point.billing === 'subscription' &&
      point.monthly_yi != null &&
      point.monthly_yi > 0,
  )
}
