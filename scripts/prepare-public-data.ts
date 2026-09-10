import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SubAIWiseDatasetSchema } from '../src/data/schema.js'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourcePath = resolve(root, 'data/dataset.json')
const publicPath = resolve(root, 'public/data/dataset.json')

async function main(): Promise<void> {
  // Validate before copying so a local build can never publish malformed data.
  const raw = await readFile(sourcePath, 'utf8')
  SubAIWiseDatasetSchema.parse(JSON.parse(raw))
  await mkdir(dirname(publicPath), { recursive: true })
  await copyFile(sourcePath, publicPath)
  console.log(`Prepared public dataset (${publicPath}).`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
