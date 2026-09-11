import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildDataset, serializeDataset } from '../src/data/adapter.js'
import { parseUpstreamLock, type UpstreamLock } from '../src/data/upstream-lock.js'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const lockPath = resolve(root, 'data/upstream.lock.json')
const localPath = resolve(root, 'data/local.json')
const datasetPath = resolve(root, 'data/dataset.json')

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name)
}

function assertCommit(ref: string): void {
  if (!/^[0-9a-f]{40}$/i.test(ref)) {
    throw new Error(`Upstream ref must be a full 40-character commit SHA: ${ref}`)
  }
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown
}

async function fetchUpstreamFile(lock: UpstreamLock, path: string): Promise<unknown> {
  const url = `https://raw.githubusercontent.com/${lock.repository}/${lock.ref}/${path}`
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`Unable to fetch locked upstream (${response.status}): ${url}`)
  }
  return response.json()
}

async function fetchUpstreamBundle(lock: UpstreamLock): Promise<{
  points: unknown
  configurations: unknown
  mappings: unknown
}> {
  const files = await Promise.all(
    lock.paths.map(async (path) => [path, await fetchUpstreamFile(lock, path)] as const),
  )
  const byPath = Object.fromEntries(files)
  const points = byPath['derived/points.json']
  const configurations = byPath['derived/benchmark-configurations.json']
  const mappings = byPath['derived/benchmark-points.json']
  if (points === undefined || configurations === undefined || mappings === undefined) {
    throw new Error(
      `Upstream lock must include derived/points.json, derived/benchmark-configurations.json, and derived/benchmark-points.json. Got: ${lock.paths.join(', ')}`,
    )
  }
  return { points, configurations, mappings }
}

async function main(): Promise<void> {
  if (hasFlag('--help')) {
    console.log('Usage: npm run data:sync [-- --ref <FULL_SHA>] [--check]')
    return
  }

  const originalLock = parseUpstreamLock(await readJson(lockPath))
  assertCommit(originalLock.ref)
  const requestedRef = argument('--ref')
  if (requestedRef) assertCommit(requestedRef)

  const lock: UpstreamLock = {
    ...originalLock,
    ref: requestedRef ?? originalLock.ref,
  }
  const [bundle, local] = await Promise.all([fetchUpstreamBundle(lock), readJson(localPath)])
  const dataset = buildDataset(bundle, {
    repository: lock.repository,
    commit: lock.ref,
  }, local)
  const serialized = serializeDataset(dataset)

  if (hasFlag('--check')) {
    const current = await readFile(datasetPath, 'utf8')
    if (current !== serialized) {
      throw new Error('data/dataset.json is stale. Run npm run data:sync.')
    }
    console.log(
      `Data check passed (${dataset.entries.length} entries, ${dataset.benchmarkConfigurations.length} configurations, ${dataset.benchmarkMappings.length} mappings, ${lock.ref.slice(0, 7)}).`,
    )
    return
  }

  await writeFile(datasetPath, serialized, 'utf8')
  if (requestedRef) {
    await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8')
  }
  console.log(
    `Synced ${dataset.entries.length} entries, ${dataset.benchmarkConfigurations.length} configurations, ${dataset.benchmarkMappings.length} mappings from ${lock.repository}@${lock.ref}.`,
  )
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
