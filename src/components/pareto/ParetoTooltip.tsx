import type { SubAIWiseEntry } from '../../data/schema'
import { useI18n } from '../../lib/i18n'
import { formatScore, type ScoreFormat } from '../../lib/format'
import { ChartTooltipShell } from '../ChartTooltip'
import { BrandMarks } from '../ProviderLogo'

export function ParetoTooltip({
  active,
  entries,
  score,
  formatter = 'score',
}: {
  active?: boolean
  entries: SubAIWiseEntry[]
  score: number
  formatter?: ScoreFormat
}) {
  const { t } = useI18n()
  if (!entries.length) return null
  return (
    <ChartTooltipShell active={active}>
      {entries.map((entry) => (
        <div key={entry.id} className="border-b border-border py-1.5 last:border-b-0 last:pb-0 first:pt-0">
          <div className="flex items-start gap-2">
            <BrandMarks maker={entry.provider} channel={entry.channel} size="sm" />
            <div className="min-w-0">
              <div className="font-medium text-ink">{entry.model.name}</div>
              <div className="text-ink-muted">
                {entry.channel} · {entry.plan.name}
              </div>
            </div>
          </div>
        </div>
      ))}
      <div className="mt-1 text-ink-muted">
        {entries[0].plan.billing === 'metered' ? t('billingApi') : t('billingSub')}
      </div>
      <div className="num mt-1.5 text-ink">
        {t('tooltipPrice')}: ${entries[0].pricing.effectiveUsdPerMillionTokens.toPrecision(4)}
      </div>
      <div className="num text-ink">
        {t('tooltipScore')}: {formatScore(score, formatter)}
      </div>
    </ChartTooltipShell>
  )
}
