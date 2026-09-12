import { useMemo, useState } from 'react'
import type { SubAIWiseDataset } from '../data/schema'
import { useI18n } from '../lib/i18n'
import { filterEntries } from '../domain/selectors'
import { filterEntriesByAdvanced, type AdvancedFilters } from '../domain/advanced-filters'
import type { IdFilter } from '../lib/filters'
import { AllowanceChart } from './AllowanceChart'
import { IdentityFilters } from './ModelServiceFilters'
import { Pill, PillGroup } from './Pill'
import { PriceChart } from './PriceChart'

type OverviewTab = 'allowance' | 'price'

export function ChartsSection({
  dataset,
  models,
  channels,
  advanced,
  onModelsChange,
  onChannelsChange,
}: {
  dataset: SubAIWiseDataset
  models: IdFilter
  channels: IdFilter
  advanced: AdvancedFilters
  onModelsChange: (next: IdFilter) => void
  onChannelsChange: (next: IdFilter) => void
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState<OverviewTab>('allowance')
  const entries = useMemo(
    () =>
      filterEntriesByAdvanced(filterEntries(dataset.entries, { models, channels }), {
        ...advanced,
        harness: null,
        effort: null,
        mode: null,
      }),
    [dataset.entries, models, channels, advanced],
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
      <div className="mt-6">
        <PillGroup>
          <Pill active={tab === 'allowance'} onClick={() => setTab('allowance')}>
            {t('tabAllowance')}
          </Pill>
          <Pill active={tab === 'price'} onClick={() => setTab('price')}>
            {t('tabPrice')}
          </Pill>
        </PillGroup>
      </div>
      <div className="mt-5">
        {tab === 'allowance' ? (
          <AllowanceChart entries={entries} />
        ) : (
          <PriceChart entries={entries} />
        )}
      </div>
    </section>
  )
}
