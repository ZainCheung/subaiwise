import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate, useSearch } from '@tanstack/react-router'
import type { SubAIWiseDataset } from '../data/schema'
import {
  defaultExplorerState,
  parseCompactState,
  readStoredExplorerState,
  restoreExplorerState,
  serializeExplorerState,
  writeStoredExplorerState,
  type ExplorerState,
} from '../domain/explorer-state'
import { useI18n } from './i18n'

type ExplorerContextValue = {
  dataset: SubAIWiseDataset
  state: ExplorerState
  patch: (partial: Partial<ExplorerState>) => void
  shareUrl: () => string
}

const ExplorerContext = createContext<ExplorerContextValue | null>(null)

export function ExplorerProvider({
  dataset,
  children,
}: {
  dataset: SubAIWiseDataset
  children: ReactNode
}) {
  const { lang, setLang } = useI18n()
  const search = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const hash = useLocation({ select: (location) => location.hash })
  const defaults = useMemo(() => defaultExplorerState(dataset), [dataset])
  const [state, setState] = useState<ExplorerState>(() =>
    restoreExplorerState(
      search.s ? parseCompactState(search.s) : readStoredExplorerState(),
      dataset,
      lang,
    ),
  )

  // An explicit share link (?s=...) wins over localStorage. It is applied
  // once, persisted, and then cleaned from the address bar without scrolling.
  useEffect(() => {
    const compact = search.s ? parseCompactState(search.s) : null
    if (!compact) return
    if (compact.lang === 'en' || compact.lang === 'zh') setLang(compact.lang)
    setState((current) => {
      const incoming = restoreExplorerState(compact, dataset, lang)
      return serializeExplorerState({ ...current, lang: undefined }, defaults) ===
        serializeExplorerState({ ...incoming, lang: undefined }, defaults)
        ? current
        : incoming
    })
    void navigate({ search: {}, hash: hash || undefined, replace: true, resetScroll: false })
  }, [search.s, dataset, defaults, lang, setLang, navigate, hash])

  const patch = useCallback((partial: Partial<ExplorerState>) => {
    setState((current) => ({ ...current, ...partial }))
  }, [])

  // Regular interactions never touch the router; state only lands in localStorage.
  useEffect(() => {
    writeStoredExplorerState(state, defaults)
  }, [state, defaults])

  const shareUrl = useCallback(() => {
    const encoded = serializeExplorerState({ ...state, lang }, defaults)
    const url = new URL(window.location.href)
    url.searchParams.set('s', encoded)
    return url.toString()
  }, [state, lang, defaults])

  const value = useMemo(
    () => ({ dataset, state, patch, shareUrl }),
    [dataset, state, patch, shareUrl],
  )

  return <ExplorerContext.Provider value={value}>{children}</ExplorerContext.Provider>
}

export function useExplorer() {
  const ctx = useContext(ExplorerContext)
  if (!ctx) throw new Error('useExplorer outside provider')
  return ctx
}

export function useExplorerOptional() {
  return useContext(ExplorerContext)
}
