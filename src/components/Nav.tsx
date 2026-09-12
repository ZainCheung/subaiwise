import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useI18n } from '../lib/i18n'
import { copyText } from '../lib/clipboard'
import { useExplorerOptional } from '../lib/explorer'

const GH = 'https://github.com/ZainCheung/subaiwise'

export function Nav() {
  const { t, toggle } = useI18n()
  const explorer = useExplorerOptional()
  const [copied, setCopied] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-5">
        <Link to="/" hash="top" className="flex items-center gap-2.5">
          <span
            className="block h-4 w-4 rotate-12 border border-white/90"
            aria-hidden
          />
          <span className="text-[13px] font-semibold tracking-wide text-ink">
            {t('brand')}
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-[13px] text-ink-muted sm:gap-5">
          <Link className="hidden hover:text-ink sm:inline" to="/" hash="compare">
            {t('navCompare')}
          </Link>
          <Link className="hidden hover:text-ink sm:inline" to="/" hash="leaderboard">
            {t('navLeaderboard')}
          </Link>
          <Link className="hidden hover:text-ink md:inline" to="/" hash="overview">
            {t('navOverview')}
          </Link>
          <Link className="hidden hover:text-ink sm:inline" to="/methodology">
            {t('navMethodology')}
          </Link>
          {explorer ? (
            <button
              type="button"
              className="hover:text-ink"
              onClick={async () => {
                const ok = await copyText(explorer.shareUrl())
                if (!ok) {
                  window.prompt(t('copyFailed'), explorer.shareUrl())
                  return
                }
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1600)
              }}
            >
              {copied ? t('copied') : t('share')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={toggle}
            className="hover:text-ink"
          >
            {t('langToggle')}
          </button>
          <a
            href={GH}
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink"
          >
            {t('github')}
          </a>
        </nav>
      </div>
    </header>
  )
}
