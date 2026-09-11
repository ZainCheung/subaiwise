import { extractHttpUrls, isSafeHttpUrl, researchBlobUrl } from '../lib/safe-url'
import type { EntryProvenance, EvidenceRef, SubAIWiseEntry } from './schema'

export type AdoptedRow = {
  planId: string
  servedModel: string
  price: number | null
  currency: string | null
  monthlyTokens: number | null
  source: string
  decisionNote: string
}

function parseNumber(value: string | undefined): number | null {
  if (value == null || value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
      continue
    }
    if (char === ',') {
      cells.push(current)
      current = ''
      continue
    }
    current += char
  }
  cells.push(current)
  return cells
}

export function adoptedEntryId(row: AdoptedRow): string {
  return `${row.planId}::${row.servedModel}`
}

export function parseAdoptedCsv(csvText: string): AdoptedRow[] {
  const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.length > 0)
  if (lines.length < 2) return []
  const header = parseCsvLine(lines[0]).map((cell) => cell.trim())
  const index = Object.fromEntries(header.map((name, i) => [name, i]))
  const rows: AdoptedRow[] = []
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line)
    const planId = cells[index.plan_id] ?? ''
    const servedModel = cells[index.served_model] ?? ''
    if (!planId || !servedModel) continue
    rows.push({
      planId,
      servedModel,
      price: parseNumber(cells[index.price]),
      currency: cells[index.currency]?.trim() || null,
      monthlyTokens: parseNumber(cells[index.monthly_tokens]),
      source: cells[index.source] ?? '',
      decisionNote: cells[index.decision_note] ?? '',
    })
  }
  return rows
}

const RESEARCH_FILE = /\b([A-Za-z0-9][A-Za-z0-9._-]*\.json)\b/g
const DENYLIST = new Set(['flat.json', 'package.json', 'tsconfig.json', 'points.json'])

export function isResearchFilename(name: string): boolean {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/.test(name)) return false
  if (DENYLIST.has(name)) return false
  return /(?:20\d{2}|round|adoption|quota|audit|research)/i.test(name)
}

export function extractResearchFilenames(text: string): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  for (const match of text.matchAll(RESEARCH_FILE)) {
    const name = match[1]
    if (!isResearchFilename(name) || seen.has(name)) continue
    seen.add(name)
    names.push(name)
  }
  return names
}

export function buildProvenance(
  row: AdoptedRow,
  source: { repository: string; commit: string },
): EntryProvenance {
  const text = `${row.source}\n${row.decisionNote}`
  const evidence: EvidenceRef[] = []
  const seen = new Set<string>()

  for (const url of extractHttpUrls(text)) {
    if (seen.has(url)) continue
    seen.add(url)
    evidence.push({ type: 'url', label: url, url })
  }

  for (const filename of extractResearchFilenames(text)) {
    const url = researchBlobUrl(source.repository, source.commit, filename)
    if (!isSafeHttpUrl(url) || seen.has(url)) continue
    seen.add(url)
    evidence.push({ type: 'upstream-research', label: filename, url })
  }

  return {
    originalPrice: row.price,
    currency: row.currency,
    monthlyTokens: row.monthlyTokens,
    decisionNote: row.decisionNote.trim() ? row.decisionNote : null,
    sourceText: row.source.trim() ? row.source : null,
    evidence,
  }
}

export function joinAdoptedProvenance(
  entries: SubAIWiseEntry[],
  csvText: string | undefined,
  source: { repository: string; commit: string },
): SubAIWiseEntry[] {
  if (!csvText) return entries
  const byId = new Map(parseAdoptedCsv(csvText).map((row) => [adoptedEntryId(row), row]))
  return entries.map((entry) => {
    const row = byId.get(entry.id)
    if (!row) return entry
    return { ...entry, provenance: buildProvenance(row, source) }
  })
}
