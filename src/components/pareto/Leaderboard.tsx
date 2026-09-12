import { useMemo, useState } from 'react'
import type { SubAIWiseDataset, SubAIWiseEntry } from '../../data/schema'
import type { BoardKey } from '../../types'
import { useI18n } from '../../lib/i18n'
import { filterEntries } from '../../domain/selectors'
import { benchmarkScoreFor, filterEntriesByAdvanced, type AdvancedFilters } from '../../domain/advanced-filters'
import type { IdFilter } from '../../lib/filters'
import { AdvancedFiltersControl } from '../AdvancedFilters'
import {
  availableLeaderboardKeys,
  boardTitle,
} from '../../lib/labels'
import { MAX_COMPARE, toggleCompareId } from '../../domain/comparison'
import { AppDialog } from '../AppDialog'
import { IdentityFilters } from '../ModelServiceFilters'
import { MetricInfo } from '../MetricInfo'
import { Pill, PillGroup } from '../Pill'
import { HowToRead, RowDetail } from '../RowDetail'
import { ParetoChart } from './ParetoChart'
import { ParetoFullscreenDialog } from './ParetoFullscreenDialog'

export function Leaderboard({
  dataset,
  models,
  channels,
  advanced,
  board,
  compareIds,
  onModelsChange,
  onChannelsChange,
  onAdvancedChange,
  onBoardChange,
  onCompareIdsChange,
}: {
  dataset: SubAIWiseDataset
  models: IdFilter
  channels: IdFilter
  advanced: AdvancedFilters
  board: BoardKey
  compareIds: string[]
  onModelsChange: (next: IdFilter) => void
  onChannelsChange: (next: IdFilter) => void
  onAdvancedChange: (next: AdvancedFilters) => void
  onBoardChange: (next: BoardKey) => void
  onCompareIdsChange: (next: string[]) => void
}) {
  const { t, lang } = useI18n()
  const boards = useMemo(
    () => availableLeaderboardKeys(dataset.leaderboards),
    [dataset.leaderboards],
  )
  const [showAll, setShowAll] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [group, setGroup] = useState<SubAIWiseEntry[] | null>(null)
  const [detail, setDetail] = useState<SubAIWiseEntry | null>(null)
  const [howto, setHowto] = useState(false)

  const entries = useMemo(
    () =>
      filterEntriesByAdvanced(filterEntries(dataset.entries, { models, channels }), advanced),
    [dataset.entries, models, channels, advanced],
  )

  const toggleCompare = (id: string) => {
    onCompareIdsChange(toggleCompareId(compareIds, id))
  }

  const openGroup = (records: SubAIWiseEntry[]) => {
    if (records.length === 1) {
      setDetail(records[0])
      setGroup(null)
      return
    }
    setGroup(records)
    setDetail(null)
  }

  const chart = (activeBoard: BoardKey, isExpanded = false) => (
    <ParetoChart
      board={activeBoard}
      meta={dataset.leaderboards[activeBoard]}
      entries={entries}
      expanded={isExpanded}
      onSelect={openGroup}
      scoreOf={(entry) => benchmarkScoreFor(dataset, entry, activeBoard, advanced)}
    />
  )

  return (
    <section id="leaderboard" className="mx-auto max-w-[1400px] px-5 py-16 sm:py-20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {t('leaderboardTitle')}
          </h2>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-muted">
            {t('leaderboardSub')}{' '}
            <MetricInfo
              label={t('paretoWhatLabel')}
              short={t('paretoHowToRead')}
              long={t('paretoWhatBody')}
              align="start"
            />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <IdentityFilters
            entries={dataset.entries}
            models={models}
            channels={channels}
            onModelsChange={onModelsChange}
            onChannelsChange={onChannelsChange}
          />
          <AdvancedFiltersControl
            dataset={dataset}
            entries={dataset.entries}
            value={advanced}
            onChange={onAdvancedChange}
          />
          <button type="button" className="howto-button" onClick={() => setHowto(true)}>
            ? {t('howToRead')}
          </button>
          <button type="button" className="howto-button" onClick={() => setExpanded(true)}>
            ⛶ {t('expandChart')}
          </button>
          <Pill active={showAll} onClick={() => setShowAll((value) => !value)}>
            {showAll ? t('showOneBoard') : t('showAllBoards')}
          </Pill>
        </div>
      </div>

      {showAll ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {boards.map((item) => (
            <div key={item}>{chart(item)}</div>
          ))}
        </div>
      ) : (
        <>
          <div className="mt-6">
            <PillGroup>
              {boards.map((item) => (
                <Pill key={item} active={board === item} onClick={() => onBoardChange(item)}>
                  {boardTitle(item, lang, dataset.leaderboards[item])}
                </Pill>
              ))}
            </PillGroup>
          </div>
          <div className="mt-5">{chart(board)}</div>
        </>
      )}

      {expanded ? (
        <ParetoFullscreenDialog
          title={t('leaderboardTitle')}
          onClose={() => setExpanded(false)}
          closeLabel={t('closeDetail')}
        >
          {chart(board, true)}
        </ParetoFullscreenDialog>
      ) : null}

      {howto ? (
        <AppDialog title={t('howToRead')} onClose={() => setHowto(false)} closeLabel={t('closeDetail')}>
          <HowToRead scoreBoard={board} boardMeta={dataset.leaderboards[board]} />
        </AppDialog>
      ) : null}

      {group ? (
        <AppDialog
          title={t('overlapPlans').replace('{n}', String(group.length))}
          onClose={() => setGroup(null)}
          closeLabel={t('closeDetail')}
        >
          <ul className="space-y-2">
            {group.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className="w-full rounded-md border border-border px-3 py-2 text-left hover:border-neutral-500"
                  onClick={() => {
                    setDetail(entry)
                    setGroup(null)
                  }}
                >
                  <div className="text-[13px] font-medium text-ink">{entry.model.name}</div>
                  <div className="text-[12px] text-ink-muted">
                    {entry.channel} · {entry.plan.name}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </AppDialog>
      ) : null}

      {detail ? (
        <AppDialog
          title={`${detail.model.name} · ${detail.plan.name}`}
          onClose={() => setDetail(null)}
          closeLabel={t('closeDetail')}
        >
          <RowDetail
            entry={detail}
            dataset={dataset}
            scoreBoard={board}
            boards={boards}
            boardMetas={dataset.leaderboards}
            inCompare={compareIds.includes(detail.id)}
            compareFull={compareIds.length >= MAX_COMPARE}
            onToggleCompare={() => toggleCompare(detail.id)}
          />
        </AppDialog>
      ) : null}
    </section>
  )
}
