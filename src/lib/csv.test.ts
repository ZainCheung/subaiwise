import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SubAIWiseDatasetSchema } from '../data/schema'
import { EMPTY_ADVANCED_FILTERS } from '../domain/advanced-filters'
import { csvCell, exportFilteredCsv, filteredEntriesForExport, toCsv } from './csv'

const dataset = SubAIWiseDatasetSchema.parse(
  JSON.parse(readFileSync('data/dataset.json', 'utf8')),
)

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
    const rows = filteredEntriesForExport(dataset, {
      models: new Set(['gpt-5.6-luna']),
      channels: null,
      query: '',
      billing: 'all',
      advanced: EMPTY_ADVANCED_FILTERS,
      sort: 'price',
    })
    expect(rows.length).toBeGreaterThan(1)
    expect(rows.every((row) => row.model.id === 'gpt-5.6-luna')).toBe(true)
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length)
  })

  it('includes dynamic leaderboard columns and uses current filters', () => {
    const csv = exportFilteredCsv(dataset, {
      models: new Set(['gpt-5.6-luna']),
      channels: null,
      query: '',
      billing: 'subscription',
      advanced: EMPTY_ADVANCED_FILTERS,
      sort: 'price',
      scoreBoard: 'terminal_bench_4',
      lang: 'en',
    })
    expect(csv).toContain('Terminal-Bench 4.0 score')
    expect(csv).toContain('Entry ID')
    expect(csv).toContain('gpt-5.6-luna')
    expect(csv.split('\r\n').length).toBeGreaterThan(3)
  })
})
