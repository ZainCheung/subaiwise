import type { PricingPoint } from '../types'
import { useI18n } from '../lib/i18n'
import { uniqueChannelOptions, uniqueModelOptions, type IdFilter } from '../lib/filters'
import { brandMaker } from '../lib/provider-brands'
import { MultiSelectFilter } from './MultiSelectFilter'
import { ProviderLogo } from './ProviderLogo'

export function ModelFilter({
  points,
  value,
  onChange,
}: {
  points: PricingPoint[]
  value: IdFilter
  onChange: (next: IdFilter) => void
}) {
  const { t } = useI18n()
  const options = uniqueModelOptions(points)
  return (
    <MultiSelectFilter
      label={t('filterModels')}
      searchPlaceholder={t('filterSearchModels')}
      options={options}
      value={value}
      onChange={onChange}
      renderOption={(option) => (
        <>
          <ProviderLogo provider={brandMaker(option.vendor ?? option.id)} size="sm" />
          <span className="min-w-0 truncate">{option.label}</span>
        </>
      )}
    />
  )
}

export function ServiceFilter({
  points,
  value,
  onChange,
}: {
  points: PricingPoint[]
  value: IdFilter
  onChange: (next: IdFilter) => void
}) {
  const { t } = useI18n()
  const options = uniqueChannelOptions(points).map((channel) => ({
    id: channel,
    label: channel,
  }))
  return (
    <MultiSelectFilter
      label={t('filterServices')}
      searchPlaceholder={t('filterSearchServices')}
      options={options}
      value={value}
      onChange={onChange}
      renderOption={(option) => (
        <>
          <ProviderLogo provider={option.id} size="sm" />
          <span className="min-w-0 truncate">{option.label}</span>
        </>
      )}
    />
  )
}

export function IdentityFilters({
  points,
  models,
  channels,
  onModelsChange,
  onChannelsChange,
}: {
  points: PricingPoint[]
  models: IdFilter
  channels: IdFilter
  onModelsChange: (next: IdFilter) => void
  onChannelsChange: (next: IdFilter) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ModelFilter points={points} value={models} onChange={onModelsChange} />
      <ServiceFilter points={points} value={channels} onChange={onChannelsChange} />
    </div>
  )
}
