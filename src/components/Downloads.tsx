import { useI18n } from '../lib/i18n'

const base = import.meta.env.BASE_URL

const DATASET = `${base.endsWith('/') ? base : `${base}/`}data/dataset.json`
const GITHUB = 'https://github.com/ZainCheung/subaiwise'
const UPSTREAM = 'https://github.com/FeiZhuLulu/real-api-pricing'

export function Downloads() {
  const { t } = useI18n()

  return (
    <section id="data" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-xl font-semibold tracking-tight text-ink">{t('downloadTitle')}</h2>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <a
            href={DATASET}
            download
            className="rounded-md border border-border-strong bg-bg-elevated px-3.5 py-2 text-[13px] font-medium text-ink hover:border-neutral-500"
          >
            {t('downloadDataset')}
          </a>
          <a
            href={GITHUB}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-transparent px-3.5 py-2 text-[13px] text-ink-muted hover:text-ink"
          >
            {t('github')} ↗
          </a>
          <a
            href={UPSTREAM}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-transparent px-3.5 py-2 text-[13px] text-ink-muted hover:text-ink"
          >
            {t('dataSource')} ↗ {t('dataSourceUpstream')}
          </a>
        </div>
      </div>
    </section>
  )
}
