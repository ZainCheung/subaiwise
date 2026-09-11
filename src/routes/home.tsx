import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { loadDataset } from '../data/load'
import type { SubAIWiseDataset } from '../data/schema'
import { useI18n } from '../lib/i18n'
import { ExplorerProvider, useExplorer } from '../lib/explorer'
import { computeInsights, computeStats } from '../lib/stats'
import { Nav } from '../components/Nav'
import { Hero } from '../components/Hero'
import { StatStrip } from '../components/StatStrip'
import { CompareSection } from '../components/CompareSection'
import { Method } from '../components/Method'
import { Downloads } from '../components/Downloads'
import { Footer } from '../components/Footer'

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

  return (
    <ExplorerProvider dataset={dataset}>
      <LoadedHome dataset={dataset} />
    </ExplorerProvider>
  )
}

function LoadedHome({ dataset }: { dataset: SubAIWiseDataset }) {
  const { state, patch } = useExplorer()
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
          models={state.models}
          channels={state.channels}
          advanced={state.advanced}
          query={state.query}
          view={state.view}
          sortKey={state.sort}
          scoreBoard={state.scoreBoard}
          billing={state.billing}
          compareIds={state.compareIds}
          onModelsChange={(next) => patch({ models: next })}
          onChannelsChange={(next) => patch({ channels: next })}
          onAdvancedChange={(next) => patch({ advanced: next })}
          onQueryChange={(next) => patch({ query: next })}
          onViewChange={(next) => patch({ view: next })}
          onSortChange={(next) =>
            patch({
              sort: next,
              scoreBoard: next === 'price' || next === 'allowance' ? state.scoreBoard : next,
            })
          }
          onBillingChange={(next) => patch({ billing: next })}
          onCompareIdsChange={(next) => patch({ compareIds: next })}
        />
        <Suspense fallback={<ChartLoading />}>
          <Leaderboard
            dataset={dataset}
            models={state.models}
            channels={state.channels}
            advanced={state.advanced}
            board={state.board}
            compareIds={state.compareIds}
            onModelsChange={(next) => patch({ models: next })}
            onChannelsChange={(next) => patch({ channels: next })}
            onAdvancedChange={(next) => patch({ advanced: next })}
            onBoardChange={(next) => patch({ board: next })}
            onCompareIdsChange={(next) => patch({ compareIds: next })}
          />
          <ChartsSection
            dataset={dataset}
            models={state.models}
            channels={state.channels}
            advanced={state.advanced}
            onModelsChange={(next) => patch({ models: next })}
            onChannelsChange={(next) => patch({ channels: next })}
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
