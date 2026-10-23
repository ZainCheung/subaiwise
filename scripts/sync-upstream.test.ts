import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const execute = promisify(execFile)
const latestCommit = 'a'.repeat(40)
const lockedBody = '{"points":[]}'
const latestBody = '{"points":[{"id":"new-model"}]}'
const hash = (body: string) => createHash('sha256').update(body).digest('hex')
const workflow = await readFile(new URL('../.github/workflows/sync-upstream.yml', import.meta.url), 'utf8')

// Exercise the actual workflow requests with real HTTP redirects, without GitHub access.
const pipelines = Object.fromEntries(
  [...workflow.matchAll(/(default_branch|latest|locked_hash|latest_hash)=\$\((curl[\s\S]*?)\)\n/g)]
    .map((match) => [match[1], match[2]]),
)
const responses: Record<string, string> = {
  '/repos/new-owner/example': JSON.stringify({ default_branch: 'main' }),
  '/repos/new-owner/example/commits/main': JSON.stringify({ sha: latestCommit }),
  '/new-owner/example/locked/derived/points.json': lockedBody,
  '/new-owner/example/latest/derived/points.json': latestBody,
}
const server = createServer((request, response) => {
  const url = request.url ?? '/'
  if (url.includes('/old-owner/')) {
    response.writeHead(301, { Location: url.replace('/old-owner/', '/new-owner/') })
    response.end(JSON.stringify({ message: 'Moved Permanently' }))
    return
  }
  const body = responses[url]
  response.writeHead(body === undefined ? 404 : 200, { 'Content-Type': 'application/json' })
  response.end(body ?? JSON.stringify({ message: 'Not Found' }))
})
let origin: string

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing fixture server address')
  origin = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})

async function runPipeline(name: string, repository = 'old-owner/example') {
  const pipeline = pipelines[name]
  if (!pipeline) throw new Error(`Missing workflow request: ${name}`)
  return execute('bash', ['-e', '-o', 'pipefail', '-c', pipeline.replaceAll('https://api.github.com', origin)], {
    env: {
      ...process.env,
      GH_TOKEN: 'fixture-only',
      repository,
      default_branch: 'main',
      locked_url: `${origin}/old-owner/example/locked/derived/points.json`,
      latest_url: `${origin}/old-owner/example/latest/derived/points.json`,
    },
  })
}

describe('upstream workflow requests', () => {
  it.each([
    ['default_branch', 'main'],
    ['latest', latestCommit],
    ['locked_hash', hash(lockedBody)],
    ['latest_hash', hash(latestBody)],
  ])('follows repository redirects for %s', async (name, expected) => {
    const { stdout } = await runPipeline(name)
    expect(stdout.trim()).toBe(expected)
  })

  it('still fails on HTTP errors instead of accepting an error response', async () => {
    await expect(runPipeline('default_branch', 'missing/example')).rejects.toMatchObject({
      stderr: expect.stringContaining('404'),
    })
  })
})
