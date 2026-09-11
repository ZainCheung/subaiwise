import type { BoardKey } from '../types'
import type { DictKey } from './i18n'
import type { SortKey } from '../domain/comparison'
import {
  LEADERBOARD_PRESENTATION,
  resolveLeaderboardPresentation,
  type LeaderboardMetricFormatter,
} from './leaderboards'

export type MetricDirection = 'higher' | 'lower'

export type MetricDefinition = {
  key: SortKey
  titleKey: DictKey
  shortKey: DictKey
  longKey: DictKey
  direction: MetricDirection
  sourceKey?: DictKey
  formatter?: LeaderboardMetricFormatter
}

export const PRICE_METRIC: MetricDefinition = {
  key: 'price',
  titleKey: 'sortPrice',
  shortKey: 'metricPriceShort',
  longKey: 'metricPriceLong',
  direction: 'lower',
}

export const ALLOWANCE_METRIC: MetricDefinition = {
  key: 'allowance',
  titleKey: 'sortAllowance',
  shortKey: 'metricAllowanceShort',
  longKey: 'metricAllowanceLong',
  direction: 'higher',
}

export const BOARD_METRICS = Object.fromEntries(
  LEADERBOARD_PRESENTATION.map((definition) => [
    definition.key,
    {
      key: definition.key,
      titleKey: definition.titleKey as DictKey,
      shortKey: definition.shortKey as DictKey,
      longKey: definition.longKey as DictKey,
      direction: definition.direction,
      sourceKey: ('sourceKey' in definition
        ? definition.sourceKey
        : undefined) as DictKey | undefined,
      formatter: definition.formatter,
    },
  ]),
) as Record<string, MetricDefinition>

export const SORT_METRICS: Record<string, MetricDefinition> = {
  price: PRICE_METRIC,
  allowance: ALLOWANCE_METRIC,
  ...BOARD_METRICS,
}

export function metricDef(key: SortKey): MetricDefinition {
  if (key === 'price') return PRICE_METRIC
  if (key === 'allowance') return ALLOWANCE_METRIC
  return boardMetric(key)
}

export function boardMetric(board: BoardKey): MetricDefinition {
  const known = BOARD_METRICS[board]
  if (known) return known

  const presentation = resolveLeaderboardPresentation(board)
  return {
    key: board,
    titleKey: 'boardGeneric',
    shortKey: 'metricGenericShort',
    longKey: 'metricGenericLong',
    direction: presentation.direction,
    formatter: presentation.formatter,
  }
}

export const ALL_BOARD_METRICS: MetricDefinition[] = LEADERBOARD_PRESENTATION.map(
  (definition) => BOARD_METRICS[definition.key],
)
