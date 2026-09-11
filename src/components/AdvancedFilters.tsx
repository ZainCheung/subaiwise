import { useMemo, useState } from 'react'
import type { SubAIWiseDataset, SubAIWiseEntry } from '../data/schema'
import {
  EMPTY_ADVANCED_FILTERS,
  activeAdvancedFilterCount,
  uniqueConfigValues,
  type AdvancedFilters,
} from '../domain/advanced-filters'
import { selectMakers } from '../domain/selectors'
import { CONFIDENCE_LEVELS } from '../domain/comparison'
import { selectAllIds, selectNoIds, toggleId, type IdFilter } from '../lib/filters'
import { useI18n, type DictKey } from '../lib/i18n'
import { AppDialog } from './AppDialog'
import { MetricInfo } from './MetricInfo'

function confidenceLabel(level: string, t: (key: DictKey) => string): string {
  if (level === 'high') return t('confHigh')
  if (level === 'medium') return t('confMedium')
  if (level === 'low') return t('confLow')
  return level
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
  help,
}: {
  label: string
  options: { id: string; label: string }[]
  value: IdFilter
  onChange: (next: IdFilter) => void
  help?: { short: string; long?: string }
}) {
  const { t } = useI18n()
  const allIds = options.map((option) => option.id)
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-0.5 text-[11px] uppercase tracking-[0.08em] text-ink-dim">
          {label}
          {help ? (
            <MetricInfo
              label={t('metricInfoLabel').replace('{metric}', label)}
              short={help.short}
              long={help.long}
              align="start"
            />
          ) : null}
        </span>
        <span className="flex gap-2 text-[11px] text-ink-dim">
          <button type="button" onClick={() => onChange(selectAllIds())}>
            {t('filterSelectAll')}
          </button>
          <button type="button" onClick={() => onChange(selectNoIds())}>
            {t('filterClear')}
          </button>
        </span>
      </div>
      <ul className="mt-2 max-h-40 space-y-1 overflow-auto">
        {options.map((option) => {
          const checked = value == null || value.has(option.id)
          return (
            <li key={option.id}>
              <label className="filter-option">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(toggleId(value, option.id, allIds))}
                />
                <span className="truncate">{option.label}</span>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function chipLabels(
  filters: AdvancedFilters,
  makers: string[],
  harnesses: string[],
  efforts: string[],
  modes: string[],
  t: (key: DictKey) => string,
): string[] {
  const labels: string[] = []
  if (filters.makers) {
    for (const id of [...filters.makers].sort()) {
      if (makers.includes(id)) labels.push(id)
    }
  }
  if (filters.confidence) {
    for (const id of CONFIDENCE_LEVELS) {
      if (filters.confidence.has(id)) labels.push(confidenceLabel(id, t))
    }
  }
  if (filters.harness) {
    for (const id of [...filters.harness].sort()) {
      if (harnesses.includes(id)) labels.push(id)
    }
  }
  if (filters.effort) {
    for (const id of [...filters.effort].sort()) {
      if (efforts.includes(id)) labels.push(id)
    }
  }
  if (filters.mode) {
    for (const id of [...filters.mode].sort()) {
      if (modes.includes(id)) labels.push(id)
    }
  }
  return labels
}

export function AdvancedFiltersControl({
  dataset,
  entries,
  value,
  onChange,
}: {
  dataset: SubAIWiseDataset
  entries: readonly SubAIWiseEntry[]
  value: AdvancedFilters
  onChange: (next: AdvancedFilters) => void
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const count = activeAdvancedFilterCount(value)
  const makers = useMemo(() => selectMakers(entries), [entries])
  const harnesses = useMemo(() => uniqueConfigValues(dataset, 'agentHarness'), [dataset])
  const efforts = useMemo(() => uniqueConfigValues(dataset, 'reasoningEffort'), [dataset])
  const modes = useMemo(() => uniqueConfigValues(dataset, 'serviceMode'), [dataset])
  const chips = chipLabels(value, makers, harnesses, efforts, modes, t)
  const showChips = chips.length > 0 && chips.length <= 3
  const buttonLabel = count
    ? t('advancedFiltersCount').replace('{n}', String(count))
    : t('advancedFilters')

  const patch = (key: keyof AdvancedFilters, next: IdFilter) => {
    onChange({ ...value, [key]: next })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="howto-button" onClick={() => setOpen(true)}>
        {buttonLabel}
      </button>
      {showChips
        ? chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-border px-2 py-0.5 text-[11px] text-ink-muted"
            >
              {chip}
            </span>
          ))
        : null}
      {count > 0 ? (
        <button
          type="button"
          className="text-[12px] text-ink-dim hover:text-ink"
          onClick={() => onChange(EMPTY_ADVANCED_FILTERS)}
        >
          {t('clearAdvanced')}
        </button>
      ) : null}
      {open ? (
        <AppDialog title={t('advancedFilters')} onClose={() => setOpen(false)} closeLabel={t('closeDetail')}>
          <div className="space-y-5">
            <section>
              <h3 className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink-dim">
                {t('entryFilters')}
              </h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <FilterGroup
                  label={t('filterMaker')}
                  options={makers.map((maker) => ({ id: maker, label: maker }))}
                  value={value.makers}
                  onChange={(next) => patch('makers', next)}
                />
                <FilterGroup
                  label={t('filterConfidence')}
                  options={CONFIDENCE_LEVELS.map((level) => ({
                    id: level,
                    label: confidenceLabel(level, t),
                  }))}
                  value={value.confidence}
                  onChange={(next) => patch('confidence', next)}
                  help={{ short: t('confidenceHelpShort'), long: t('confidenceHelpLong') }}
                />
              </div>
            </section>
            <section>
              <h3 className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink-dim">
                {t('benchmarkFilters')}
              </h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <FilterGroup
                  label={t('filterHarness')}
                  options={harnesses.map((item) => ({ id: item, label: item }))}
                  value={value.harness}
                  onChange={(next) => patch('harness', next)}
                />
                <FilterGroup
                  label={t('filterEffort')}
                  options={efforts.map((item) => ({ id: item, label: item }))}
                  value={value.effort}
                  onChange={(next) => patch('effort', next)}
                />
                <FilterGroup
                  label={t('filterMode')}
                  options={modes.map((item) => ({ id: item, label: item }))}
                  value={value.mode}
                  onChange={(next) => patch('mode', next)}
                />
              </div>
            </section>
            {count > 0 ? (
              <button
                type="button"
                className="w-full rounded-md border border-border-strong px-3 py-2 text-[13px] text-ink"
                onClick={() => onChange(EMPTY_ADVANCED_FILTERS)}
              >
                {t('clearAdvanced')}
              </button>
            ) : null}
          </div>
        </AppDialog>
      ) : null}
    </div>
  )
}
