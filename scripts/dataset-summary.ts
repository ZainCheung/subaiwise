import { readFile } from 'node:fs/promises'

type Dataset = { entries: Array<{ id: string; [key: string]: unknown }> }

function flag(name: string): string {
  const index = process.argv.indexOf(name)
  const value = index >= 0 ? process.argv[index + 1] : undefined
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

async function readDataset(path: string): Promise<Dataset> {
  return JSON.parse(await readFile(path, 'utf8')) as Dataset
}

const before = await readDataset(flag('--before'))
const after = await readDataset(flag('--after'))
const beforeById = new Map(before.entries.map((entry) => [entry.id, entry]))
const afterById = new Map(after.entries.map((entry) => [entry.id, entry]))
const added = [...afterById.keys()].filter((id) => !beforeById.has(id)).sort()
const removed = [...beforeById.keys()].filter((id) => !afterById.has(id)).sort()
const changed = [...afterById.keys()]
  .filter((id) => beforeById.has(id) && JSON.stringify(beforeById.get(id)) !== JSON.stringify(afterById.get(id)))
  .sort()

console.log(`Source entries: ${before.entries.length} → ${after.entries.length}`)
console.log(`Added: ${added.length}`)
console.log(`Removed: ${removed.length}`)
console.log(`Changed: ${changed.length}`)
if (added.length) console.log(`\nAdded IDs\n${added.map((id) => `- ${id}`).join('\n')}`)
if (removed.length) console.log(`\nRemoved IDs\n${removed.map((id) => `- ${id}`).join('\n')}`)
if (changed.length) console.log(`\nChanged IDs\n${changed.map((id) => `- ${id}`).join('\n')}`)
