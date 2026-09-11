import { useMemo, useState, type KeyboardEvent } from 'react'
import type { SubAIWiseDataset, SubAIWiseEntry } from '../data/schema'
import type { BoardKey } from '../types'
import { useI18n, type DictKey } from '../lib/i18n'
import {
  CONFIDENCE_LEVELS,
  MAX_COMPARE,
  filterCompareEntries,
  groupByModel,
  isBoardSort,
  sortEntries,
  sortGroups,
  type BillingFilter,
  type CompareView,
  type ConfidenceFilter,
  type SortKey,
} from '../domain/comparison'
import {
  entryLabel,
  filterEntries,
  monthlyYi,
  selectBenchmarkScore,
  selectMakers,
} from '../domain/selectors'
import type { IdFilter } from '../lib/filters'
import {
  availableLeaderboardKeys,
  boardTitle,
  defaultLeaderboardKey,
} from '../lib/labels'
import { leaderboardFormatter } from '../lib/leaderboards'
import { ALLOWANCE_METRIC, PRICE_METRIC, boardMetric } from '../lib/metrics'
import { formatAllowanceYi, formatScore, formatUsdPerMtok } from '../lib/format'
import { Pill, PillGroup } from './Pill'
import { HeaderMetric, MetricInfo, SortMetricPill } from './MetricInfo'
import { AppDialog } from './AppDialog'
import { IdentityFilters } from './ModelServiceFilters'
import { ModelIdentity, PlanIdentity } from './ProviderLogo'
import { HowToRead, RowDetail } from './RowDetail'
import { TableViewport } from './TableViewport'

function confidenceKey(value: string): DictKey | null {
  if (value === 'high') return 'confHigh'
  if (value === 'medium') return 'confMedium'
  if (value === 'low') return 'confLow'
  return null
}

function activateOnKey(e: KeyboardEvent, fn: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    fn()
  }
}

function CompareRow({
  entry,
  nested,
  selected,
  scoreBoard,
  scoreFormat,
  variantCount,
  expanded,
  onSelect,
  onToggleExpand,
}: {
  entry: SubAIWiseEntry
  nested?: boolean
  selected: boolean
  scoreBoard: BoardKey
  scoreFormat: 'score' | 'percent'
  variantCount?: number
  expanded?: boolean
  onSelect: () => void
  onToggleExpand?: () => void
}) {
  const { t, lang } = useI18n()
  const score = selectBenchmarkScore(entry, scoreBoard)
  const confKey = confidenceKey(entry.quality.confidence)
  const isApi = entry.plan.billing === 'metered'
  const showExpand = (variantCount ?? 0) > 1 && onToggleExpand

  return (
    <div
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      aria-expanded={showExpand ? Boolean(expanded) : undefined}
      title={entryLabel(entry)}
      onClick={onSelect}
      onKeyDown={(e) => activateOnKey(e, onSelect)}
      className={`compare-row ${selected ? 'compare-row-active' : ''} ${nested ? 'compare-row-nested' : ''}`}
    >
      <div className="min-w-0">
        {nested ? (
          <PlanIdentity
            maker={entry.provider}
            channel={entry.channel}
            planName={entry.plan.name}
            logo="always"
          />
        ) : (
          <ModelIdentity maker={entry.provider} modelName={entry.model.name} />
        )}
        <div className="truncate pl-7 text-[11px] text-ink-dim lg:hidden">
          {nested ? `${isApi ? t('billingApi') : t('billingSub')} · ${entry.channel}` : entry.plan.name}
        </div>
      </div>
      <div className="hidden min-w-0 sm:block">
        {nested ? (
          <div className="truncate text-[13px] text-ink">{entry.channel}</div>
        ) : (
          <PlanIdentity
            maker={entry.provider}
            channel={entry.channel}
            planName={entry.plan.name}
          />
        )}
        <div className="truncate text-[11px] text-ink-dim">
          {isApi ? t('billingApi') : t('billingSub')}
          {nested ? '' : ` · ${entry.channel}`}
        </div>
      </div>
      <div className="num text-right text-[13px] text-ink">
        {formatUsdPerMtok(entry.pricing.effectiveUsdPerMillionTokens)}
      </div>
      <div className="num hidden text-right text-[13px] text-ink lg:block">
        {formatAllowanceYi(monthlyYi(entry), lang, true)}
      </div>
      <div
        className="num hidden text-right text-[13px] text-ink lg:block"
        title={score == null ? t('missingScoreNote') : undefined}
      >
        {formatScore(score, scoreFormat)}
      </div>
      <div className="hidden text-right text-[10px] font-medium uppercase tracking-[0.08em] text-ink-dim lg:block">
        {confKey ? t(confKey) : entry.quality.confidence}
      </div>
      <div className="flex justify-end">
        {showExpand ? (
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-[11px] text-ink-dim hover:text-ink"
            aria-label={t('expandPlansHint').replace('{n}', String(variantCount))}
            title={t('expandPlansHint').replace('{n}', String(variantCount))}
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand?.()
            }}
          >
            {variantCount} {expanded ? '▴' : '▾'}
          </button>
        ) : (
          <span className="w-6" />
        )}
      </div>
    </div>
  )
}

export function CompareSection({
  dataset,
  models,
  channels,
  onModelsChange,
  onChannelsChange,
}: {
  dataset: SubAIWiseDataset
  models: IdFilter
  channels: IdFilter
  onModelsChange: (next: IdFilter) => void
  onChannelsChange: (next: IdFilter) => void
}) {
  const { t, lang } = useI18n()
  const boards = useMemo(
    () => availableLeaderboardKeys(dataset.leaderboards),
    [dataset.leaderboards],
  )
  const [query, setQuery] = useState('')
  const [view, setView] = useState<CompareView>('models')
  const [sortKey, setSortKey] = useState<SortKey>('price')
  const [scoreBoard, setScoreBoard] = useState<BoardKey>(() => defaultLeaderboardKey(boards))
  const [billing, setBilling] = useState<BillingFilter>('all')
  const [vendor, setVendor] = useState('all')
  const [confidence, setConfidence] = useState<ConfidenceFilter>('all')
  const [detail, setDetail] = useState<string | 'howto' | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  const vendors = useMemo(() => selectMakers(dataset.entries), [dataset.entries])

  const identityFiltered = useMemo(
    () => filterEntries(dataset.entries, { models, channels }),
    [dataset.entries, models, channels],
  )

  const filtered = useMemo(
    () =>
      filterCompareEntries(identityFiltered, {
        query,
        billing,
        vendor,
        confidence,
      }),
    [identityFiltered, query, billing, vendor, confidence],
  )

  const planRows = useMemo(() => sortEntries(filtered, sortKey), [filtered, sortKey])
  const modelGroups = useMemo(
    () => sortGroups(groupByModel(filtered, sortKey), sortKey),
    [filtered, sortKey],
  )

  const selected =
    detail && detail !== 'howto' ? (dataset.entries.find((p) => p.id === detail) ?? null) : null

  const openRow = (id: string) => {
    setDetail((current) => (current === id ? null : id))
  }
  const comparePts = compareIds
    .map((id) => dataset.entries.find((p) => p.id === id))
    .filter((p): p is SubAIWiseEntry => p != null)

  const onSort = (key: SortKey) => {
    setSortKey(key)
    if (isBoardSort(key)) setScoreBoard(key)
  }

  const toggleExpand = (model: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(model)) next.delete(model)
      else next.add(model)
      return next
    })
  }

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_COMPARE) return prev
      return [...prev, id]
    })
  }

  const visibleCount = view === 'models' ? modelGroups.length : planRows.length
  const scoreFormat = leaderboardFormatter(scoreBoard, dataset.leaderboards[scoreBoard])
  const scoreTitle = boardTitle(scoreBoard, lang, dataset.leaderboards[scoreBoard])

  return (
    <section
      id="compare"
      className={`mx-auto max-w-6xl px-5 py-16 sm:py-20 ${comparePts.length ? 'pb-48' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {t('compareTitle')}
          </h2>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-muted">
            {t('compareSub')}
          </p>
          <p className="mt-1.5 flex max-w-3xl items-center gap-1 text-[12px] text-ink-dim">
            {t('workloadCompare')}
            <MetricInfo
              label={t('metricInfoLabel').replace('{metric}', t('workloadCompare'))}
              short={t('workloadHelp')}
              align="start"
            />
          </p>
        </div>
        <button
          type="button"
          className="howto-button"
          onClick={() => setDetail('howto')}
        >
          ? {t('howToRead')}
        </button>
      </div>

      <div className="mt-6">
        <label className="sr-only" htmlFor="compare-search">
          {t('searchPlaceholder')}
        </label>
        <input
          id="compare-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="search-input"
        />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <PillGroup>
            <Pill active={view === 'models'} onClick={() => setView('models')}>
              {t('viewModels')}
            </Pill>
            <Pill active={view === 'plans'} onClick={() => setView('plans')}>
              {t('viewPlans')}
            </Pill>
          </PillGroup>
          <PillGroup>
            <Pill active={billing === 'all'} onClick={() => setBilling('all')}>
              {t('filterAll')}
            </Pill>
            <Pill active={billing === 'subscription'} onClick={() => setBilling('subscription')}>
              {t('billingSub')}
            </Pill>
            <Pill active={billing === 'metered'} onClick={() => setBilling('metered')}>
              {t('billingApi')}
            </Pill>
          </PillGroup>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <PillGroup>
            <SortMetricPill active={sortKey === 'price'} metricKey="price" onClick={() => onSort('price')} />
            <SortMetricPill
              active={sortKey === 'allowance'}
              metricKey="allowance"
              onClick={() => onSort('allowance')}
            />
            {boards.map((b) => (
              <SortMetricPill key={b} active={sortKey === b} metricKey={b} onClick={() => onSort(b)}>
                {boardTitle(b, lang, dataset.leaderboards[b])}
              </SortMetricPill>
            ))}
          </PillGroup>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <IdentityFilters
            entries={dataset.entries}
            models={models}
            channels={channels}
            onModelsChange={onModelsChange}
            onChannelsChange={onChannelsChange}
          />
          <label className="flex items-center gap-2 text-[13px] text-ink-muted">
            <span className="text-[11px] uppercase tracking-[0.08em] text-ink-dim">
              {t('filterVendor')}
            </span>
            <select
              aria-label={t('filterVendor')}
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="rounded-full border border-border-strong bg-bg px-3 py-1.5 text-[13px] text-ink"
            >
              <option value="all">{t('filterAll')}</option>
              {vendors.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <PillGroup>
            <span className="inline-flex items-center gap-0.5 self-center px-1 text-[11px] uppercase tracking-[0.08em] text-ink-dim">
              {t('filterConfidence')}
              <MetricInfo
                label={t('metricInfoLabel').replace('{metric}', t('filterConfidence'))}
                short={t('confidenceHelpShort')}
                long={t('confidenceHelpLong')}
                align="start"
              />
            </span>
            <Pill active={confidence === 'all'} onClick={() => setConfidence('all')}>
              {t('filterAll')}
            </Pill>
            {CONFIDENCE_LEVELS.map((c) => {
              const key = confidenceKey(c)
              return (
                <Pill key={c} active={confidence === c} onClick={() => setConfidence(c)}>
                  {key ? t(key) : c}
                </Pill>
              )
            })}
          </PillGroup>
        </div>
      </div>

      <div className="mt-6">
        <div className="card px-3 py-2 sm:px-4">
          <TableViewport>
          <div className="compare-head">
            <div>{t('colModel')}</div>
            <div>{t('colPlan')}</div>
            <div className="text-right">
              <HeaderMetric def={PRICE_METRIC} />
            </div>
            <div className="text-right">
              <HeaderMetric def={ALLOWANCE_METRIC} />
            </div>
            <div className="text-right">
              <HeaderMetric def={boardMetric(scoreBoard)} title={scoreTitle} />
            </div>
            <div className="text-right">
              <span className="inline-flex items-center justify-end gap-0.5">
                {t('colConfidence')}
                <MetricInfo
                  label={t('metricInfoLabel').replace('{metric}', t('filterConfidence'))}
                  short={t('confidenceHelpShort')}
                  long={t('confidenceHelpLong')}
                  align="end"
                />
              </span>
            </div>
            <div className="text-right">{t('colPlans')}</div>
          </div>
          {visibleCount === 0 ? (
            <p className="px-1 py-8 text-center text-[13px] text-ink-dim">{t('noResults')}</p>
          ) : view === 'models' ? (
            modelGroups.map((g) => {
              const open = expanded.has(g.model)
              const rest = g.plans.filter((p) => p.id !== g.best.id)
              return (
                <div key={g.model}>
                  <CompareRow
                    entry={g.best}
                    selected={detail === g.best.id}
                    scoreBoard={scoreBoard}
                    scoreFormat={scoreFormat}
                    variantCount={g.plans.length}
                    expanded={open}
                    onSelect={() => openRow(g.best.id)}
                    onToggleExpand={() => toggleExpand(g.model)}
                  />
                  {open
                    ? rest.map((p) => (
                        <CompareRow
                          key={p.id}
                          entry={p}
                          nested
                          selected={detail === p.id}
                          scoreBoard={scoreBoard}
                          scoreFormat={scoreFormat}
                          onSelect={() => openRow(p.id)}
                        />
                      ))
                    : null}
                </div>
              )
            })
          ) : (
            planRows.map((p) => (
              <CompareRow
                key={p.id}
                entry={p}
                selected={detail === p.id}
                scoreBoard={scoreBoard}
                scoreFormat={scoreFormat}
                onSelect={() => openRow(p.id)}
              />
            ))
          )}
          </TableViewport>
        </div>
      </div>

      {detail != null ? (
        <AppDialog
          title={
            detail === 'howto' || !selected
              ? t('howToRead')
              : `${selected.model.name} · ${selected.plan.name}`
          }
          onClose={() => setDetail(null)}
          closeLabel={t('closeDetail')}
        >
          {detail === 'howto' || !selected ? (
            <HowToRead scoreBoard={scoreBoard} boardMeta={dataset.leaderboards[scoreBoard]} />
          ) : (
            <RowDetail
              entry={selected}
              scoreBoard={scoreBoard}
              boards={boards}
              boardMetas={dataset.leaderboards}
              inCompare={compareIds.includes(selected.id)}
              compareFull={compareIds.length >= MAX_COMPARE}
              onToggleCompare={() => toggleCompare(selected.id)}
            />
          )}
        </AppDialog>
      ) : null}

      {comparePts.length > 0 ? (
        <div className="compare-tray" role="region" aria-label={t('compareTray')}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-2.5">
            <div className="text-[13px] text-ink-muted">
              <span className="num text-ink">{comparePts.length}</span> {t('compareSelected')}
            </div>
            <button
              type="button"
              onClick={() => setCompareIds([])}
              className="text-[13px] text-ink-dim hover:text-ink"
            >
              {t('clearCompare')}
            </button>
          </div>
          <div className="mx-auto grid max-w-6xl gap-2 px-5 pb-3 sm:grid-cols-2 lg:grid-cols-4">
            {comparePts.map((p) => (
              <div key={p.id} className="rounded-md border border-border px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-ink">{p.model.name}</div>
                    <div className="truncate text-[11px] text-ink-dim">{p.plan.name}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCompare(p.id)}
                    className="shrink-0 text-[11px] text-ink-dim hover:text-ink"
                  >
                    {t('removeFromCompare')}
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                  <span className="text-ink-dim">{t('colPrice')}</span>
                  <span className="num text-right text-ink">
                    {formatUsdPerMtok(p.pricing.effectiveUsdPerMillionTokens)}
                  </span>
                  <span className="text-ink-dim">{t('colAllowance')}</span>
                  <span className="num text-right text-ink">
                    {formatAllowanceYi(monthlyYi(p), lang, true)}
                  </span>
                  <span className="text-ink-dim">{t('colScore')}</span>
                  <span
                    className="num text-right text-ink"
                    title={selectBenchmarkScore(p, scoreBoard) == null ? t('missingScoreNote') : undefined}
                  >
                    {formatScore(selectBenchmarkScore(p, scoreBoard), scoreFormat)}
                  </span>
                  <span className="text-ink-dim">{t('colConfidence')}</span>
                  <span className="text-right uppercase tracking-wide text-ink">
                    {confidenceKey(p.quality.confidence)
                      ? t(confidenceKey(p.quality.confidence)!)
                      : p.quality.confidence}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
