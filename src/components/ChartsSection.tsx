import { useMemo } from 'react'
import type { SubAIWiseDataset } from '../data/schema'
import { useI18n } from '../lib/i18n'
import { filterEntries } from '../domain/selectors'
import type { IdFilter } from '../lib/filters'
import { AllowanceChart } from './AllowanceChart'
import { IdentityFilters } from './ModelServiceFilters'
import { PriceChart } from './PriceChart'

export function ChartsSection({
  dataset,
  models,
  channels,
  onModelsChange,
  onChannelsChange,
}: {
  dataset: SubAIWiseDataset
  models: IdFilter
  channels: IdFilter
  onModelsChange: (next: IdFilter) => void
  onChannelsChange: (next: IdFilter) => void
}) {
  const { t } = useI18n()
  const entries = useMemo(
    () => filterEntries(dataset.entries, { models, channels }),
    [dataset.entries, models, channels],
  )

  return (
    <section id="overview" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {t('overviewTitle')}
        </h2>
        <IdentityFilters
          entries={dataset.entries}
          models={models}
          channels={channels}
          onModelsChange={onModelsChange}
          onChannelsChange={onChannelsChange}
        />
      </div>
      <div className="mt-8 space-y-5">
        <AllowanceChart entries={entries} />
        <PriceChart entries={entries} />
      </div>
    </section>
  )
}
