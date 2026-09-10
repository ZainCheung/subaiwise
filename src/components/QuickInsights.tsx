import type { QuickInsights as Insights } from '../lib/stats'
import { TOKENS_PER_YI } from '../data/adapter'
import { useI18n } from '../lib/i18n'
import { formatAllowanceYi, formatScore, formatSnapshotDate, formatUsdPerMtok } from '../lib/format'
import { vendorColor } from '../lib/vendors'

export function QuickInsights({
  insights,
  generatedAt,
}: {
  insights: Insights
  generatedAt: string
}) {
  const { t, lang } = useI18n()
  const { lowest, largest, frontier } = insights
  const frontierScore = frontier?.benchmarks.codeArena?.score ?? null
  const entryLabel = (entry: Insights['lowest']) =>
    entry?.label ?? (entry ? `${entry.model.name} · ${entry.plan.name}` : '—')

  const cards = [
    {
      key: 'lowest',
      label: t('insightLowest'),
      value: lowest
        ? formatUsdPerMtok(lowest.pricing.effectiveUsdPerMillionTokens)
        : '—',
      sub: entryLabel(lowest),
      color: lowest ? vendorColor(lowest.provider) : undefined,
    },
    {
      key: 'largest',
      label: t('insightLargest'),
      value: largest
        ? formatAllowanceYi(
            largest.allowance.monthlyTokens == null
              ? null
              : largest.allowance.monthlyTokens / TOKENS_PER_YI,
            lang,
          )
        : '—',
      sub: entryLabel(largest),
      color: largest ? vendorColor(largest.provider) : undefined,
    },
    {
      key: 'frontier',
      label: t('insightFrontier'),
      value: frontier ? formatScore(frontierScore) : '—',
      sub: frontier
        ? `${entryLabel(frontier)} · ${formatUsdPerMtok(frontier.pricing.effectiveUsdPerMillionTokens)}`
        : t('insightFrontierHint'),
      color: frontier ? vendorColor(frontier.provider) : undefined,
    },
    {
      key: 'snapshot',
      label: t('insightSnapshot'),
      value: formatSnapshotDate(generatedAt, lang),
      sub: '',
      color: undefined,
    },
  ]

  return (
    <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:min-w-[22rem] lg:max-w-[26rem]">
      {cards.map((card) => (
        <li key={card.key} className="card px-3.5 py-3">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-dim">
            {card.color ? (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: card.color }}
                aria-hidden
              />
            ) : null}
            {card.label}
          </div>
          <div className="num mt-1.5 text-[15px] font-semibold text-ink">{card.value}</div>
          {card.sub ? (
            <div className="mt-1 truncate text-[11px] leading-snug text-ink-muted" title={card.sub}>
              {card.sub}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
