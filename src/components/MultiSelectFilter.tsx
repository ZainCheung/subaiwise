import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../lib/i18n'
import {
  selectAllIds,
  selectNoIds,
  selectedCount,
  toggleId,
  type IdFilter,
} from '../lib/filters'
import { AppDialog } from './AppDialog'

export type MultiSelectOption = {
  id: string
  label: string
  vendor?: string
}

function useNarrow(query = '(max-width: 639px)') {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setNarrow(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])
  return narrow
}

export function MultiSelectFilter({
  label,
  options,
  value,
  onChange,
  searchPlaceholder,
  renderOption,
}: {
  label: string
  options: MultiSelectOption[]
  value: IdFilter
  onChange: (next: IdFilter) => void
  searchPlaceholder: string
  renderOption?: (option: MultiSelectOption) => ReactNode
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const narrow = useNarrow()
  const allIds = useMemo(() => options.map((option) => option.id), [options])
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((option) => `${option.label} ${option.id}`.toLowerCase().includes(q))
  }, [options, query])
  const selected = selectedCount(value, options.length)
  const triggerLabel =
    value == null ? label : `${label} ${selected}/${options.length}`

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    const focus = window.setTimeout(() => searchRef.current?.focus(), 0)
    const onDoc = (event: PointerEvent) => {
      if (narrow) return
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !narrow) {
        event.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(focus)
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, narrow])

  const body = (
    <>
      <div className="filter-panel-toolbar">
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="filter-search"
          aria-label={searchPlaceholder}
        />
        <div className="filter-panel-actions">
          <button type="button" onClick={() => onChange(selectAllIds())}>
            {t('filterSelectAll')}
          </button>
          <button type="button" onClick={() => onChange(selectNoIds())}>
            {t('filterClear')}
          </button>
        </div>
      </div>
      <ul id={listId} className="filter-options" role="listbox" aria-multiselectable="true">
        {visible.length === 0 ? (
          <li className="filter-empty">{t('noResults')}</li>
        ) : (
          visible.map((option) => {
            const checked = value == null || value.has(option.id)
            return (
              <li key={option.id} role="option" aria-selected={checked}>
                <label className="filter-option">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onChange(toggleId(value, option.id, allIds))}
                  />
                  {renderOption ? renderOption(option) : <span className="truncate">{option.label}</span>}
                </label>
              </li>
            )
          })
        )}
      </ul>
    </>
  )

  return (
    <div className="filter-root" ref={rootRef}>
      <button
        type="button"
        className="filter-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        {triggerLabel}
        <span aria-hidden="true">▾</span>
      </button>
      {open && narrow ? (
        <AppDialog title={label} onClose={() => setOpen(false)} closeLabel={t('closeDetail')}>
          {body}
        </AppDialog>
      ) : null}
      {open && !narrow ? <div className="filter-panel">{body}</div> : null}
    </div>
  )
}
