import type { PricingPoint } from '../../types'
import { useI18n } from '../../lib/i18n'
import { ChartTooltipShell } from '../ChartTooltip'
import { BrandMarks } from '../ProviderLogo'

export function ParetoTooltip({
  active,
  points,
  score,
}: {
  active?: boolean
  points: PricingPoint[]
  score: number
}) {
  const { t } = useI18n()
  if (!points.length) return null
  return (
    <ChartTooltipShell active={active}>
      {points.map((point) => (
        <div key={point.id} className="border-b border-border py-1.5 last:border-b-0 last:pb-0 first:pt-0">
          <div className="flex items-start gap-2">
            <BrandMarks maker={point.vendor} channel={point.channel} size="sm" />
            <div className="min-w-0">
              <div className="font-medium text-ink">{point.model_display}</div>
              <div className="text-ink-muted">
                {point.channel} · {point.plan}
              </div>
            </div>
          </div>
        </div>
      ))}
      <div className="mt-1 text-ink-muted">
        {points[0].billing === 'metered' ? t('billingApi') : t('billingSub')}
      </div>
      <div className="num mt-1.5 text-ink">
        {t('tooltipPrice')}: ${points[0].real_usd_per_mtok.toPrecision(4)}
      </div>
      <div className="num text-ink">
        {t('tooltipScore')}: {score}
      </div>
    </ChartTooltipShell>
  )
}
