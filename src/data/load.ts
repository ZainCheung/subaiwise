import rawDataset from '../../data/dataset.json'
import { SubAIWiseDatasetSchema, type SubAIWiseDataset } from './schema'

/** The reviewed, repository-tracked dataset used by the production bundle. */
export const dataset: SubAIWiseDataset = SubAIWiseDatasetSchema.parse(rawDataset)

export function loadDataset(): SubAIWiseDataset {
  return dataset
}
