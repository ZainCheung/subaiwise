import type { SubAIWiseDataset, SubAIWiseEntry } from '../data/schema'
import { availableLeaderboardKeys } from './leaderboards'
import { boardTitle } from './labels'
import { selectDefaultBenchmarkReference } from '../domain/benchmarks'
import {
  benchmarkScoreFor,
  toBenchmarkConfigFilter,
  type AdvancedFilters,
} from '../domain/advanced-filters'
import type { SortKey } from '../domain/comparison'
import { filterCompareEntries, sortEntries } from '../domain/comparison'
import { filterEntries } from '../domain/selectors'
import type { IdFilter } from './filters'
import type { BillingFilter } from '../domain/comparison'

const FORMULA_PREFIX = /^[=+\-@\t\r]/

export function csvCell(value: unknown): string {
  const raw = value == null ? '' : String(value)
  const safe = FORMULA_PREFIX.test(raw) ? `'${raw}` : raw
  return `"${safe.replace(/"/g, '""')}"`
}

export function toCsv(rows: string[][]): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`
}

export function filteredEntriesForExport(
  dataset: SubAIWiseDataset,
  opts: {
    models: IdFilter
    channels: IdFilter
    query: string
    billing: BillingFilter
    advanced: AdvancedFilters
    sort: SortKey
  },
): SubAIWiseEntry[] {
  const identity = filterEntries(dataset.entries, { models: opts.models, channels: opts.channels })
  const filtered = filterCompareEntries(identity, {
    query: opts.query,
    billing: opts.billing,
    makers: opts.advanced.makers,
    confidence: opts.advanced.confidence,
  })
  const getScore = (entry: SubAIWiseEntry, board: string) =>
    benchmarkScoreFor(dataset, entry, board, opts.advanced)
  return sortEntries(filtered, opts.sort, getScore)
}

export function exportFilteredCsv(
  dataset: SubAIWiseDataset,
  opts: {
    models: IdFilter
    channels: IdFilter
    query: string
    billing: BillingFilter
    advanced: AdvancedFilters
    sort: SortKey
    scoreBoard: string
    lang: 'en' | 'zh'
  },
): string {
  const boards = availableLeaderboardKeys(dataset.leaderboards)
  const rows = filteredEntriesForExport(dataset, opts)
  const headers = [
    'Entry ID',
    'Model',
    'Model maker',
    'Service',
    'Plan',
    'Billing',
    'Monthly fee USD',
    'Monthly tokens',
    'Real price USD/MTok',
    'Confidence',
  ]
  for (const board of boards) {
    const title = boardTitle(board, opts.lang, dataset.leaderboards[board])
    headers.push(`${title} score`, `${title} variant`)
  }
  headers.push('Harness', 'Effort', 'Mapping confidence')

  const body = rows.map((entry) => {
    const filter = toBenchmarkConfigFilter(opts.advanced)
    const selected = selectDefaultBenchmarkReference(dataset, entry.id, opts.scoreBoard, filter)
    const cells: unknown[] = [
      entry.id,
      entry.model.name,
      entry.provider,
      entry.channel,
      entry.plan.name,
      entry.plan.billing,
      entry.pricing.monthlyUsd,
      entry.allowance.monthlyTokens,
      entry.pricing.effectiveUsdPerMillionTokens,
      entry.quality.confidence,
    ]
    for (const board of boards) {
      const score = benchmarkScoreFor(dataset, entry, board, opts.advanced)
      const variant =
        selectDefaultBenchmarkReference(dataset, entry.id, board, filter)?.configuration.variant ?? ''
      cells.push(score ?? '', score == null ? '' : variant)
    }
    cells.push(
      selected?.configuration.agentHarness ?? '',
      selected?.configuration.reasoningEffort ?? '',
      selected?.mapping.mappingConfidence ?? '',
    )
    return cells.map((cell) => (cell == null ? '' : String(cell)))
  })

  return toCsv([headers, ...body])
}

export function downloadTextFile(filename: string, contents: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([contents], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
