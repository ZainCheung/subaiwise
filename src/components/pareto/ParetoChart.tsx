import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  ComposedChart,
  Customized,
  Line,
  ResponsiveContainer,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import type { BoardMeta, SubAIWiseEntry } from '../../data/schema'
import type { BoardKey } from '../../types'
import { useI18n } from '../../lib/i18n'
import { formatUsdTick, formatYTick, logPriceAxis, niceLinearTicks } from '../../lib/axis'
import { leaderboardFormatter } from '../../lib/leaderboards'
import {
  groupByExactCoords,
  mostEfficientEntry,
  sameModelEntries,
  subscriptionFrontier,
} from '../../domain/leaderboards'
import { selectBenchmarkScore } from '../../domain/selectors'
import { vendorColor } from '../../lib/vendors'
import { scatterLabel } from '../../lib/labels'
import { UsdAxisTick } from '../UsdAxisTick'
import { ActivePointGuides } from './ActivePointGuides'
import { FrontierPoint, RegularPoint, type PlotRow } from './ParetoPoint'
import { ParetoTooltip } from './ParetoTooltip'

export function ParetoChart({
  board,
  meta,
  entries,
  expanded = false,
  onSelect,
  scoreOf,
}: {
  board: BoardKey
  meta: BoardMeta
  entries: SubAIWiseEntry[]
  expanded?: boolean
  onSelect?: (entries: SubAIWiseEntry[]) => void
  scoreOf?: (entry: SubAIWiseEntry) => number | null
}) {
  const { t } = useI18n()
  const formatter = leaderboardFormatter(board, meta)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const getScore = scoreOf ?? ((entry: SubAIWiseEntry) => selectBenchmarkScore(entry, board))

  const { regular, frontier, domain, xTicks, yTicks, scored, active, modelLine } = useMemo(() => {
    const scoredPts = entries.filter(
      (entry) => getScore(entry) != null && entry.pricing.effectiveUsdPerMillionTokens > 0,
    )
    const frontierPts = subscriptionFrontier(entries, board, getScore)
    const frontierIds = new Set(frontierPts.map((entry) => entry.id))
    const efficient = mostEfficientEntry(entries, board, getScore)
    const groups = groupByExactCoords(scoredPts, board, getScore)

    const labeledModels = new Set<string>()
    const toRow = (group: (typeof groups)[number]): PlotRow => {
      const isFrontier = group.entries.some((entry) => frontierIds.has(entry.id))
      const representative =
        group.entries.find((entry) => frontierIds.has(entry.id)) ?? group.entries[0]
      const kind: PlotRow['kind'] = isFrontier
        ? 'frontier'
        : representative.plan.billing === 'metered'
          ? 'api'
          : 'sub'
      const showLabel = isFrontier && !labeledModels.has(representative.model.id)
      if (showLabel) labeledModels.add(representative.model.id)
      return {
        key: group.key,
        x: group.x,
        y: group.y,
        kind,
        count: group.entries.length,
        entries: group.entries,
        showLabel,
        efficient: Boolean(efficient && group.entries.some((entry) => entry.id === efficient.id)),
        color: vendorColor(representative.provider),
        short: scatterLabel(representative.model.name, 22),
      }
    }

    const rows = groups.map(toRow)
    const xs = scoredPts.map((entry) => entry.pricing.effectiveUsdPerMillionTokens)
    const ys = scoredPts.map((entry) => getScore(entry) ?? 0)
    const xAxis = logPriceAxis(xs.length ? xs : [0.01, 1])
    const ymin = ys.length ? Math.min(...ys) : 0
    const ymax = ys.length ? Math.max(...ys) : 1
    const pad = (ymax - ymin) * 0.12 || 1
    const yDomain: [number, number] = [ymin - pad * 0.35, ymax + pad]
    const activeRow = rows.find((row) => row.key === activeKey) ?? null
    const related =
      activeRow && activeRow.entries[0]
        ? sameModelEntries(scoredPts, activeRow.entries[0].model.id)
            .map((entry) => ({
              x: entry.pricing.effectiveUsdPerMillionTokens,
              y: getScore(entry) ?? 0,
            }))
            .sort((a, b) => a.x - b.x)
        : []

    return {
      regular: rows.filter((row) => row.kind !== 'frontier'),
      frontier: [...rows.filter((row) => row.kind === 'frontier')].sort((a, b) => b.x - a.x),
      domain: { x: xAxis.domain, y: yDomain },
      xTicks: xAxis.ticks,
      yTicks: niceLinearTicks(yDomain[0], yDomain[1], 5),
      scored: scoredPts,
      active: activeRow,
      modelLine: related.length >= 2 ? related : null,
    }
  }, [entries, board, activeKey, getScore])

  const relatedIds = new Set(
    active?.entries[0]
      ? sameModelEntries(scored, active.entries[0].model.id).map((entry) => entry.id)
      : [],
  )
  const tickStyle = { fill: '#a3a3a3', fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif' }

  return (
    <div
      className={
        expanded
          ? 'card chart-panel flex min-h-0 flex-1 flex-col p-5 sm:p-6'
          : 'card chart-panel p-5 sm:p-6'
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink">{meta.name}</h3>
          <p className="mt-1 text-[13px] text-ink-muted">
            {meta.metric} · {meta.snapshot}
          </p>
        </div>
        <a
          href={meta.url}
          target="_blank"
          rel="noreferrer"
          className="text-[12px] text-ink-muted hover:text-ink"
        >
          {meta.name} ↗
        </a>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-[5px] bg-[#f4f4f5]" /> {t('frontierLegend')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-ink-muted/70" /> {t('subLegend')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-ink-muted" /> {t('apiLegend')}
        </span>
        <span className="inline-flex items-center gap-1.5 text-amber-300">★ {t('bestEfficiency')}</span>
        <span className="ml-auto text-ink-dim">{t('cheaperRight')}</span>
      </div>

      <div
        className={`relative mt-4 overflow-visible ${expanded ? 'min-h-0 flex-1' : 'h-[520px] min-h-[420px] sm:h-[560px]'}`}
      >
        <div className="pointer-events-none absolute left-16 top-1 z-10 text-[12px] text-ink-muted">
          {meta.metric}
        </div>
        {active ? (
          <div className="pointer-events-none absolute right-4 top-10 z-10 max-w-xs">
            <ParetoTooltip active entries={active.entries} score={active.y} formatter={formatter} />
          </div>
        ) : null}
        <ResponsiveContainer width="100%" height="100%" minHeight={expanded ? 0 : 420}>
          <ComposedChart margin={{ top: 36, right: 120, bottom: 40, left: 16 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="0" vertical={false} />
            <XAxis
              type="number"
              dataKey="x"
              scale="log"
              domain={domain.x}
              ticks={xTicks}
              interval={0}
              minTickGap={28}
              reversed
              axisLine={false}
              tickLine={false}
              tick={(props) => <UsdAxisTick {...props} allowed={xTicks} />}
              tickFormatter={formatUsdTick}
              name={t('tooltipPrice')}
              label={{
                value: t('tooltipPrice'),
                position: 'insideBottom',
                offset: -18,
                fill: '#737373',
                fontSize: 12,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={domain.y}
              ticks={yTicks}
              interval={0}
              axisLine={false}
              tickLine={false}
              tick={tickStyle}
              tickFormatter={(value) => formatYTick(value, formatter)}
              name={meta.metric}
              width={56}
            />
            <ZAxis range={[60, 60]} />
            {modelLine ? (
              <Line
                data={modelLine}
                type="linear"
                dataKey="y"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth={1.25}
                dot={false}
                isAnimationActive={false}
                legendType="none"
                tooltipType="none"
                activeDot={false}
              />
            ) : null}
            <Line
              data={frontier}
              type="linear"
              dataKey="y"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              legendType="none"
              tooltipType="none"
              activeDot={false}
            />
            <Scatter
              name="regular"
              data={regular}
              isAnimationActive={false}
              shape={(props: { cx?: number; cy?: number; payload?: PlotRow }) => (
                <RegularPoint
                  {...props}
                  active={props.payload?.key === activeKey}
                  related={props.payload?.entries.some((entry) => relatedIds.has(entry.id))}
                  onHover={(row) => setActiveKey(row.key)}
                  onLeave={() => setActiveKey(null)}
                  onSelect={(row) => onSelect?.(row.entries)}
                />
              )}
            />
            <Scatter
              name="frontier"
              data={frontier}
              isAnimationActive={false}
              shape={(props: { cx?: number; cy?: number; payload?: PlotRow }) => (
                <FrontierPoint
                  {...props}
                  efficientLabel={t('bestEfficiency')}
                  onHover={(row) => setActiveKey(row.key)}
                  onLeave={() => setActiveKey(null)}
                  onSelect={(row) => onSelect?.(row.entries)}
                />
              )}
            />
            <Customized
              component={(frame: {
                offset?: { left: number; top: number; width: number; height: number }
                xAxisMap?: Record<string, { scale?: (value: number) => number }>
                yAxisMap?: Record<string, { scale?: (value: number) => number }>
              }) => (
                <ActivePointGuides
                  active={active ? { x: active.x, y: active.y } : null}
                  offset={frame.offset}
                  xAxisMap={frame.xAxisMap}
                  yAxisMap={frame.yAxisMap}
                  yFormat={(value) => formatYTick(value, formatter)}
                />
              )}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-dim">{t('bestEfficiencyNote')}</p>
    </div>
  )
}
