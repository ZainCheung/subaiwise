import type { ReactNode } from 'react'
import type { BoardMeta, SubAIWiseEntry } from '../data/schema'
import type { BoardKey } from '../types'
import { useI18n, type DictKey } from '../lib/i18n'
import {
  extractSourceUrl,
  formatAllowanceYi,
  formatMonthlyFee,
  formatScore,
  formatUsdPerMtok,
} from '../lib/format'
import { apiSavingRatio, formatApiSaving } from '../domain/pricing'
import { monthlyYi, selectBenchmarkScore, selectBenchmarkVariant } from '../domain/selectors'
import { isThirdParty } from '../data/channel'
import { availableLeaderboardKeys, boardTitle } from '../lib/labels'
import {
  leaderboardFormatter,
  resolveLeaderboardPresentation,
} from '../lib/leaderboards'
import { ALLOWANCE_METRIC, PRICE_METRIC, boardMetric } from '../lib/metrics'
import { MetricHelp, MetricInfo } from './MetricInfo'
import { BrandMarks } from './ProviderLogo'

function confidenceKey(value: string): DictKey | null {
  if (value === 'high') return 'confHigh'
  if (value === 'medium') return 'confMedium'
  if (value === 'low') return 'confLow'
  return null
}

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.75rem_minmax(0,1fr)] gap-2 py-1.5 text-[13px]">
      <dt className="flex items-start gap-0.5 text-ink-dim">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  )
}

function MetricLabel({ text, def }: { text: string; def: Parameters<typeof MetricHelp>[0]['def'] }) {
  return (
    <>
      <span>{text}</span>
      <MetricHelp def={def} align="start" />
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-dim">{title}</div>
      <dl className="mt-1">{children}</dl>
    </div>
  )
}

export function HowToRead({
  scoreBoard,
  boardMeta,
}: {
  scoreBoard: BoardKey
  boardMeta?: BoardMeta
}) {
  const { t, lang } = useI18n()
  const presentation = resolveLeaderboardPresentation(scoreBoard, boardMeta)
  const scoreHelp = presentation.howToReadKey
    ? t(presentation.howToReadKey as DictKey)
    : t('howToReadScore')
  return (
    <div className="text-[13px] text-ink-muted">
      <dl className="space-y-3">
        <div>
          <dt className="font-medium text-ink">{t('fieldRealPrice')}</dt>
          <dd className="mt-0.5 text-ink-dim">{t('howToReadPrice')}</dd>
        </div>
        <div>
          <dt className="font-medium text-ink">{boardTitle(scoreBoard, lang, boardMeta)}</dt>
          <dd className="mt-0.5 text-ink-dim">{scoreHelp}</dd>
        </div>
        <div>
          <dt className="font-medium text-ink">{t('fieldConfidence')}</dt>
          <dd className="mt-0.5 text-ink-dim">{t('howToReadEvidence')}</dd>
        </div>
        <div>
          <dt className="font-medium text-ink">{t('howToReadPlansTitle')}</dt>
          <dd className="mt-0.5 text-ink-dim">{t('howToReadPlans')}</dd>
        </div>
      </dl>
      <p className="mt-4 border-t border-border pt-3 leading-relaxed text-ink-dim">
        {t('howToReadFooter')}
      </p>
    </div>
  )
}

export function RowDetail({
  entry,
  scoreBoard,
  boards,
  boardMetas,
  inCompare,
  compareFull,
  onToggleCompare,
}: {
  entry: SubAIWiseEntry
  scoreBoard: BoardKey
  boards?: readonly string[]
  boardMetas?: Record<string, BoardMeta>
  inCompare: boolean
  compareFull: boolean
  onToggleCompare: () => void
}) {
  const { t, lang } = useI18n()
  const confKey = confidenceKey(entry.quality.confidence)
  const sourceUrl = extractSourceUrl(entry.source.label)
  const saving = apiSavingRatio(entry)
  const compareDisabled = !inCompare && compareFull
  const visibleBoards = boards ?? availableLeaderboardKeys(boardMetas ?? [])

  return (
    <div>
      <div className="flex items-start gap-2.5">
        <BrandMarks maker={entry.provider} channel={entry.channel} size="md" />
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-snug text-ink">{entry.model.name}</h3>
          <p className="mt-0.5 text-[13px] text-ink-muted">{entry.plan.name}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-muted">
        <span>{entry.channel}</span>
        {isThirdParty(entry.provider, entry.channel) ? (
          <>
            <span className="text-ink-dim">·</span>
            <span>{entry.provider}</span>
          </>
        ) : null}
        <span className="text-ink-dim">·</span>
        {entry.plan.billing === 'metered' ? t('billingApi') : t('billingSub')}
      </div>

      <Section title={t('sectionPricing')}>
        <Field label={<MetricLabel text={t('fieldRealPrice')} def={PRICE_METRIC} />}>
          <span className="num">
            {formatUsdPerMtok(entry.pricing.effectiveUsdPerMillionTokens)}
            <span className="text-ink-dim"> {t('perMtok')}</span>
          </span>
        </Field>
        <Field label={t('fieldMonthlyFee')}>
          <span className="num">{formatMonthlyFee(entry.pricing.monthlyUsd)}</span>
        </Field>
        <Field label={<MetricLabel text={t('fieldUsableTokens')} def={ALLOWANCE_METRIC} />}>
          <span className="num">{formatAllowanceYi(monthlyYi(entry), lang)}</span>
        </Field>
        {entry.pricing.listUsdPerMillionTokens != null ? (
          <Field label={t('fieldListPrice')}>
            <span className="num">
              {formatUsdPerMtok(entry.pricing.listUsdPerMillionTokens)}
              <span className="text-ink-dim"> {t('perMtok')}</span>
            </span>
          </Field>
        ) : null}
        {saving != null ? (
          <Field
            label={
              <>
                <span>{t('fieldApiSaving')}</span>
                <MetricInfo
                  label={t('metricInfoLabel').replace('{metric}', t('fieldApiSaving'))}
                  short={t('apiSavingQualifier')}
                  align="start"
                />
              </>
            }
          >
            <span className="num">
              {t(saving >= 0 ? 'apiSavingCheaper' : 'apiSavingCostlier').replace(
                '{pct}',
                formatApiSaving(Math.abs(saving)),
              )}
            </span>
          </Field>
        ) : null}
      </Section>

      <Section title={t('sectionBenchmarks')}>
        {visibleBoards.map((board) => {
          const value = selectBenchmarkScore(entry, board)
          const variant = selectBenchmarkVariant(entry, board)
          const meta = boardMetas?.[board]
          const formatter = leaderboardFormatter(board, meta)
          return (
            <Field
              key={board}
              label={<MetricLabel text={boardTitle(board, lang, meta)} def={boardMetric(board)} />}
            >
              <div>
                <span className="num" title={value == null ? t('missingScoreNote') : undefined}>
                  {formatScore(value, formatter)}
                </span>
                {value == null ? (
                  <div className="mt-0.5 text-[12px] leading-snug text-ink-dim">{t('missingScoreNote')}</div>
                ) : typeof variant === 'string' && variant ? (
                  <div className="mt-0.5 text-[12px] leading-snug text-ink-dim">{variant}</div>
                ) : null}
              </div>
            </Field>
          )
        })}
      </Section>

      <Section title={t('sectionEvidence')}>
        <Field
          label={
            <>
              <span>{t('fieldConfidence')}</span>
              <MetricInfo
                label={t('metricInfoLabel').replace('{metric}', t('fieldConfidence'))}
                short={t('confidenceHelpShort')}
                long={t('confidenceHelpLong')}
                align="start"
              />
            </>
          }
        >
          <span className="tracking-wide">{confKey ? t(confKey) : entry.quality.confidence}</span>
        </Field>
        <Field label={t('fieldSource')}>
          <div className="space-y-1">
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-ink underline decoration-border underline-offset-2 hover:decoration-ink"
              >
                {t('viewSource')} ↗
              </a>
            ) : null}
            <span className="block text-[12px] leading-snug text-ink-muted">
              {entry.source.label || '—'}
            </span>
          </div>
        </Field>
        {entry.source.note ? (
          <Field label={t('fieldNote')}>
            <span className="text-[12px] leading-snug text-ink-muted">{entry.source.note}</span>
          </Field>
        ) : null}
      </Section>

      <button
        type="button"
        onClick={onToggleCompare}
        disabled={compareDisabled}
        title={compareDisabled ? t('compareFull') : undefined}
        className="mt-4 w-full rounded-md border border-border-strong px-3 py-2 text-[13px] font-medium text-ink hover:border-neutral-500 disabled:cursor-not-allowed disabled:text-ink-dim"
      >
        {inCompare ? t('removeFromCompare') : t('addToCompare')}
      </button>
    </div>
  )
}
