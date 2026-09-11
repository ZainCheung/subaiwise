import { useMemo, useState } from 'react'
import type { BoardKey, PointsPayload, PricingPoint } from '../../types'
import { useI18n } from '../../lib/i18n'
import { filterPricingPoints, type IdFilter } from '../../lib/filters'
import { BOARD_KEYS, boardTitle } from '../../lib/labels'
import { MAX_COMPARE } from '../../lib/compare'
import { AppDialog } from '../AppDialog'
import { IdentityFilters } from '../ModelServiceFilters'
import { MetricInfo } from '../MetricInfo'
import { Pill, PillGroup } from '../Pill'
import { HowToRead, RowDetail } from '../RowDetail'
import { ParetoChart } from './ParetoChart'
import { ParetoFullscreenDialog } from './ParetoFullscreenDialog'

export function Leaderboard({
  data,
  models,
  channels,
  onModelsChange,
  onChannelsChange,
}: {
  data: PointsPayload
  models: IdFilter
  channels: IdFilter
  onModelsChange: (next: IdFilter) => void
  onChannelsChange: (next: IdFilter) => void
}) {
  const { t, lang } = useI18n()
  const [board, setBoard] = useState<BoardKey>('arena_code')
  const [showAll, setShowAll] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [group, setGroup] = useState<PricingPoint[] | null>(null)
  const [detail, setDetail] = useState<PricingPoint | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [howto, setHowto] = useState(false)

  const points = useMemo(
    () => filterPricingPoints(data.points, { models, channels }),
    [data.points, models, channels],
  )

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((value) => value !== id)
      if (prev.length >= MAX_COMPARE) return prev
      return [...prev, id]
    })
  }

  const openGroup = (records: PricingPoint[]) => {
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
      meta={data.boards[activeBoard]}
      points={points}
      expanded={isExpanded}
      onSelect={openGroup}
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
            {t('leaderboardSub')}
          </p>
          <p className="mt-2 flex max-w-3xl items-center gap-1 text-[13px] text-ink-muted">
            {t('paretoWhatLabel')}
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
            points={data.points}
            models={models}
            channels={channels}
            onModelsChange={onModelsChange}
            onChannelsChange={onChannelsChange}
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
          {BOARD_KEYS.map((item) => (
            <div key={item}>{chart(item)}</div>
          ))}
        </div>
      ) : (
        <>
          <div className="mt-6">
            <PillGroup>
              {BOARD_KEYS.map((item) => (
                <Pill key={item} active={board === item} onClick={() => setBoard(item)}>
                  {boardTitle(item, lang)}
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
          <HowToRead scoreBoard={board} />
        </AppDialog>
      ) : null}

      {group ? (
        <AppDialog
          title={t('overlapPlans').replace('{n}', String(group.length))}
          onClose={() => setGroup(null)}
          closeLabel={t('closeDetail')}
        >
          <ul className="space-y-2">
            {group.map((point) => (
              <li key={point.id}>
                <button
                  type="button"
                  className="w-full rounded-md border border-border px-3 py-2 text-left hover:border-neutral-500"
                  onClick={() => {
                    setDetail(point)
                    setGroup(null)
                  }}
                >
                  <div className="text-[13px] font-medium text-ink">{point.model_display}</div>
                  <div className="text-[12px] text-ink-muted">
                    {point.channel} · {point.plan}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </AppDialog>
      ) : null}

      {detail ? (
        <AppDialog
          title={`${detail.model_display} · ${detail.plan}`}
          onClose={() => setDetail(null)}
          closeLabel={t('closeDetail')}
        >
          <RowDetail
            point={detail}
            scoreBoard={board}
            inCompare={compareIds.includes(detail.id)}
            compareFull={compareIds.length >= MAX_COMPARE}
            onToggleCompare={() => toggleCompare(detail.id)}
          />
        </AppDialog>
      ) : null}
    </section>
  )
}
