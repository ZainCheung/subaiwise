import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import type { IdFilter } from '../lib/filters'
import { loadDataset } from '../data/load'
import type { SubAIWiseDataset } from '../data/schema'
import { useI18n } from '../lib/i18n'
import { computeInsights, computeStats } from '../lib/stats'
import { Nav } from '../components/Nav'
import { Hero } from '../components/Hero'
import { StatStrip } from '../components/StatStrip'
import { CompareSection } from '../components/CompareSection'
import { Method } from '../components/Method'
import { Downloads } from '../components/Downloads'
import { Footer } from '../components/Footer'

// Recharts is intentionally kept out of the initial shell; these sections are
// loaded after the canonical dataset has arrived.
const ChartsSection = lazy(async () => {
  const module = await import('../components/ChartsSection')
  return { default: module.ChartsSection }
})
const Leaderboard = lazy(async () => {
  const module = await import('../components/pareto/Leaderboard')
  return { default: module.Leaderboard }
})

export function HomePage() {
  const { t } = useI18n()
  const [dataset, setDataset] = useState<SubAIWiseDataset | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [models, setModels] = useState<IdFilter>(null)
  const [channels, setChannels] = useState<IdFilter>(null)

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

  if (!dataset) {
    return (
      <div className="min-h-screen bg-bg">
        <Nav />
        <main className="mx-auto flex min-h-[24rem] max-w-6xl items-center px-5 py-20">
          <div
            className={`card w-full p-6 text-center text-[13px] ${error ? 'text-red-300' : 'text-ink-muted'}`}
            role={error ? 'alert' : 'status'}
          >
            <p>{error ? t('error') : t('loading')}</p>
            {error ? (
              <button
                type="button"
                onClick={retry}
                className="mt-4 rounded-md border border-border-strong px-3.5 py-2 text-ink hover:border-neutral-500"
              >
                {t('retry')}
              </button>
            ) : null}
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const stats = computeStats(dataset)
  const insights = computeInsights(dataset)

  return (
    <div className="min-h-screen bg-bg">
      <Nav />
      <main>
        <Hero stats={stats} insights={insights} />
        <StatStrip stats={stats} />
        <CompareSection
          dataset={dataset}
          models={models}
          channels={channels}
          onModelsChange={setModels}
          onChannelsChange={setChannels}
        />
        <Suspense fallback={<ChartLoading />}>
          <Leaderboard
            dataset={dataset}
            models={models}
            channels={channels}
            onModelsChange={setModels}
            onChannelsChange={setChannels}
          />
          <ChartsSection
            dataset={dataset}
            models={models}
            channels={channels}
            onModelsChange={setModels}
            onChannelsChange={setChannels}
          />
        </Suspense>
        <Method mix={dataset.workloadMix} />
        <Downloads />
      </main>
      <Footer />
    </div>
  )
}

function ChartLoading() {
  const { t } = useI18n()
  return (
    <div className="mx-auto max-w-6xl px-5 py-16 text-[13px] text-ink-dim" role="status">
      {t('loading')}
    </div>
  )
}
