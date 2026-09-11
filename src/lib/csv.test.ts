import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SubAIWiseDatasetSchema } from '../data/schema'
import { EMPTY_ADVANCED_FILTERS } from '../domain/advanced-filters'
import { csvCell, exportFilteredCsv, filteredEntriesForExport, toCsv } from './csv'
import { availableLeaderboardKeys } from './leaderboards'
import { boardTitle } from './labels'

const dataset = SubAIWiseDatasetSchema.parse(
  JSON.parse(readFileSync('data/dataset.json', 'utf8')),
)

function modelWithMultiplePlans(): string {
  const counts = new Map<string, number>()
  for (const entry of dataset.entries) {
    counts.set(entry.model.id, (counts.get(entry.model.id) ?? 0) + 1)
  }
  const modelId = [...counts.entries()].find(([, count]) => count > 1)?.[0]
  if (!modelId) throw new Error('live dataset needs a model with multiple plans')
  return modelId
}

function selectedBoard(): string {
  const boards = availableLeaderboardKeys(dataset.leaderboards)
  return boards.includes('terminal_bench_4') ? 'terminal_bench_4' : boards[0]
}

describe('csv export', () => {
  it('quotes commas and doubles quotes', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
  })

  it('escapes formula injection', () => {
    expect(csvCell('=1+1')).toBe('"\'=1+1"')
    expect(csvCell('+cmd')).toBe('"\'+cmd"')
    expect(csvCell('-1')).toBe('"\'-1"')
    expect(csvCell('@sum')).toBe('"\'@sum"')
    expect(toCsv([['x']]).startsWith('\uFEFF')).toBe(true)
  })

  it('exports every matching plan row, not grouped representatives', () => {
    const modelId = modelWithMultiplePlans()
    const rows = filteredEntriesForExport(dataset, {
      models: new Set([modelId]),
      channels: null,
      query: '',
      billing: 'all',
      advanced: EMPTY_ADVANCED_FILTERS,
      sort: 'price',
    })
    expect(rows.length).toBeGreaterThan(1)
    expect(rows.every((row) => row.model.id === modelId)).toBe(true)
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length)
  })

  it('includes dynamic leaderboard columns and uses current filters', () => {
    const modelId = modelWithMultiplePlans()
    const scoreBoard = selectedBoard()
    const title = boardTitle(scoreBoard, 'en', dataset.leaderboards[scoreBoard])
    const csv = exportFilteredCsv(dataset, {
      models: new Set([modelId]),
      channels: null,
      query: '',
      billing: 'subscription',
      advanced: EMPTY_ADVANCED_FILTERS,
      sort: 'price',
      scoreBoard,
      lang: 'en',
    })
    expect(csv).toContain(`${title} score`)
    expect(csv).toContain('Entry ID')
    expect(csv).toContain(modelId)
    expect(csv.split('\r\n').length).toBeGreaterThan(3)
  })

  it('labels harness/effort/mapping as belonging to the selected board', () => {
    const modelId = modelWithMultiplePlans()
    const scoreBoard = selectedBoard()
    const title = boardTitle(scoreBoard, 'en', dataset.leaderboards[scoreBoard])
    const csv = exportFilteredCsv(dataset, {
      models: new Set([modelId]),
      channels: null,
      query: '',
      billing: 'subscription',
      advanced: EMPTY_ADVANCED_FILTERS,
      sort: 'price',
      scoreBoard,
      lang: 'en',
    })
    const header = csv.split('\r\n')[0]
    expect(header).toContain('"Selected board"')
    expect(header).toContain('"Selected board harness"')
    expect(header).toContain('"Selected board effort"')
    expect(header).toContain('"Selected board mapping confidence"')
    expect(header).not.toMatch(/,"Harness",/)
    expect(csv).toContain(`"${title}"`)
  })

  it('uses board presentation for an unknown future selected board', () => {
    const modelId = modelWithMultiplePlans()
    const future = {
      ...dataset,
      leaderboards: {
        ...dataset.leaderboards,
        future_board: {
          name: 'Future Bench',
          metric: 'Score',
          url: 'https://example.com/future',
          snapshot: '2026-01-01',
        },
      },
    }
    const csv = exportFilteredCsv(future, {
      models: new Set([modelId]),
      channels: null,
      query: '',
      billing: 'all',
      advanced: EMPTY_ADVANCED_FILTERS,
      sort: 'price',
      scoreBoard: 'future_board',
      lang: 'en',
    })
    const header = csv.split('\r\n')[0]
    expect(header).toContain('"Future Bench score"')
    expect(header).toContain('"Selected board harness"')
    expect(csv).toContain('"Future Bench"')
  })
})
