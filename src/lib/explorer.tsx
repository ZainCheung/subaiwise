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
  compactExplorerState,
  defaultExplorerState,
  parseCompactState,
  restoreExplorerState,
  serializeExplorerState,
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

function liveCompact(state: ExplorerState, defaults: Pick<ExplorerState, 'board'>) {
  return compactExplorerState({ ...state, lang: undefined }, defaults)
}

function hasLiveState(state: ExplorerState, defaults: Pick<ExplorerState, 'board'>): boolean {
  const compact = liveCompact(state, defaults)
  return Object.keys(compact).some((key) => key !== 'v')
}

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
    restoreExplorerState(search.s ? parseCompactState(search.s) : null, dataset, lang),
  )

  const patch = useCallback((partial: Partial<ExplorerState>) => {
    setState((current) => ({ ...current, ...partial }))
  }, [])

  useEffect(() => {
    const compact = search.s ? parseCompactState(search.s) : null
    if (compact?.lang === 'en' || compact?.lang === 'zh') setLang(compact.lang)
    if (!search.s) return
    const incoming = restoreExplorerState(compact, dataset, lang)
    setState((current) =>
      serializeExplorerState({ ...current, lang: undefined }, defaults) ===
      serializeExplorerState({ ...incoming, lang: undefined }, defaults)
        ? current
        : incoming,
    )
  }, [search.s, dataset, defaults, setLang])

  useEffect(() => {
    const nextS = hasLiveState(state, defaults)
      ? serializeExplorerState({ ...state, lang: undefined }, defaults)
      : undefined
    if (search.s === nextS) return
    void navigate({
      search: nextS ? { s: nextS } : {},
      hash: hash || undefined,
      replace: true,
    })
  }, [state, defaults, navigate, search.s, hash])

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
