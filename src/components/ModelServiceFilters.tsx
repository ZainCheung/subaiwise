import type { SubAIWiseEntry } from '../data/schema'
import { useI18n } from '../lib/i18n'
import type { IdFilter } from '../lib/filters'
import { selectChannels, selectModels } from '../domain/selectors'
import { brandMaker } from '../lib/provider-brands'
import { MultiSelectFilter } from './MultiSelectFilter'
import { ProviderLogo } from './ProviderLogo'

export function ModelFilter({
  entries,
  value,
  onChange,
}: {
  entries: readonly SubAIWiseEntry[]
  value: IdFilter
  onChange: (next: IdFilter) => void
}) {
  const { t } = useI18n()
  const options = selectModels(entries)
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
  entries,
  value,
  onChange,
}: {
  entries: readonly SubAIWiseEntry[]
  value: IdFilter
  onChange: (next: IdFilter) => void
}) {
  const { t } = useI18n()
  const options = selectChannels(entries).map((channel) => ({
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
  entries,
  models,
  channels,
  onModelsChange,
  onChannelsChange,
}: {
  entries: readonly SubAIWiseEntry[]
  models: IdFilter
  channels: IdFilter
  onModelsChange: (next: IdFilter) => void
  onChannelsChange: (next: IdFilter) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ModelFilter entries={entries} value={models} onChange={onModelsChange} />
      <ServiceFilter entries={entries} value={channels} onChange={onChannelsChange} />
    </div>
  )
}
