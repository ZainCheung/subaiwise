import type { BoardKey } from '../types'
import type { SortKey } from './compare'
import type { DictKey } from './i18n'
import { BOARD_KEYS } from './labels'
import { LEADERBOARD_CONFIG } from './leaderboards'

export type MetricDirection = 'higher' | 'lower'

export type MetricDefinition = {
  key: SortKey
  titleKey: DictKey
  shortKey: DictKey
  longKey: DictKey
  direction: MetricDirection
  sourceKey?: DictKey
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
  LEADERBOARD_CONFIG.map((definition) => [
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
    },
  ]),
) as Record<BoardKey, MetricDefinition>

export const SORT_METRICS: Record<SortKey, MetricDefinition> = {
  price: PRICE_METRIC,
  allowance: ALLOWANCE_METRIC,
  ...BOARD_METRICS,
}

export function metricDef(key: SortKey): MetricDefinition {
  return SORT_METRICS[key]
}

export function boardMetric(board: BoardKey): MetricDefinition {
  return BOARD_METRICS[board]
}

export const ALL_BOARD_METRICS: MetricDefinition[] = BOARD_KEYS.map((k) => BOARD_METRICS[k])
