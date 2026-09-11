import { useMemo } from 'react'
import type { PointsPayload } from '../types'
import { useI18n } from '../lib/i18n'
import { filterPricingPoints, type IdFilter } from '../lib/filters'
import { AllowanceChart } from './AllowanceChart'
import { IdentityFilters } from './ModelServiceFilters'
import { PriceChart } from './PriceChart'

export function ChartsSection({
  data,
  models,
  channels,
  onModelsChange,
  onChannelsChange,
}: {
  data: PointsPayload
  models: IdFilter
  channels: IdFilter
  onModelsChange: (next: IdFilter) => void
  onChannelsChange: (next: IdFilter) => void
}) {
  const { t } = useI18n()
  const points = useMemo(
    () => filterPricingPoints(data.points, { models, channels }),
    [data.points, models, channels],
  )

  return (
    <section id="overview" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {t('overviewTitle')}
        </h2>
        <IdentityFilters
          points={data.points}
          models={models}
          channels={channels}
          onModelsChange={onModelsChange}
          onChannelsChange={onChannelsChange}
        />
      </div>
      <div className="mt-8 space-y-5">
        <AllowanceChart points={points} />
        <PriceChart points={points} />
      </div>
    </section>
  )
}
