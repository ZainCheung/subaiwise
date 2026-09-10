import { SubAIWiseDatasetSchema, type SubAIWiseDataset } from './schema'

/** Public dataset path. Keeping this outside the JS bundle also makes an R2 move trivial. */
export function datasetUrl(baseUrl = import.meta.env.BASE_URL): string {
  const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${prefix}data/dataset.json`
}

/** Fetch and validate the build-time public canonical dataset. */
export async function loadDataset(url = datasetUrl()): Promise<SubAIWiseDataset> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`Dataset request failed (${response.status})`)
  }
  return SubAIWiseDatasetSchema.parse(await response.json())
}
