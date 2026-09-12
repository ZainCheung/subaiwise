import { useCallback, useEffect, useState } from 'react'
import { loadDataset } from './load'
import type { SubAIWiseDataset } from './schema'

/** Shared loader for routes that need the public dataset snapshot. */
export function useDataset(): {
  dataset: SubAIWiseDataset | null
  error: Error | null
  retry: () => void
} {
  const [dataset, setDataset] = useState<SubAIWiseDataset | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    let active = true
    setDataset(null)
    setError(null)
    loadDataset()
      .then((next) => {
        if (active) setDataset(next)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause : new Error(String(cause)))
      })
    return () => {
      active = false
    }
  }, [attempt])

  return { dataset, error, retry }
}
