import { BoardMethodCards, PricingMethodCards } from '../components/Method'
import { DatasetStatus } from '../components/DatasetStatus'
import { Downloads } from '../components/Downloads'
import { Footer } from '../components/Footer'
import { Nav } from '../components/Nav'
import { useDataset } from '../data/use-dataset'
import { useI18n } from '../lib/i18n'
import type { SubAIWiseDataset } from '../data/schema'

const UPSTREAM = 'https://github.com/FeiZhuLulu/real-api-pricing'

export function MethodologyPage() {
  const { dataset, error, retry } = useDataset()

  return (
    <div className="min-h-screen bg-bg">
      <Nav />
      <main>
        {dataset ? (
          <MethodologyContent dataset={dataset} />
        ) : (
          <div className="mx-auto flex min-h-[24rem] max-w-6xl items-center px-5 py-20">
            <DatasetStatus error={error} onRetry={retry} />
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

function SectionShell({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h2>
      {children}
    </section>
  )
}

function MethodologyContent({ dataset }: { dataset: SubAIWiseDataset }) {
  const { t } = useI18n()
  const mix = dataset.workloadMix
  const pct = (value: number) => `${(value * 100).toFixed(2)}%`

  return (
    <>
      <header className="mx-auto max-w-6xl px-5 pt-14 sm:pt-20">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-dim">
          {t('brand')}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {t('methodologyTitle')}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
          {t('methodologyIntro')}
        </p>
        <p className="mt-3 text-[13px] text-ink-muted">
          {t('snapshotAsOf')}:{' '}
          <span className="num text-ink">{dataset.snapshot}</span> · {t('statTotal')}:{' '}
          <span className="num text-ink">{dataset.entries.length}</span>
        </p>
      </header>

      <SectionShell id="method-source" title={t('methodSourceTitle')}>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <article className="card p-5">
            <h3 className="text-[15px] font-semibold text-ink">{t('methodSourceUpstreamTitle')}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              {t('methodSourceUpstreamBody')}{' '}
              <a
                className="text-ink underline decoration-border underline-offset-2 hover:decoration-ink"
                href={UPSTREAM}
                target="_blank"
                rel="noreferrer"
              >
                github.com/FeiZhuLulu/real-api-pricing
              </a>
            </p>
          </article>
          <article className="card p-5">
            <h3 className="text-[15px] font-semibold text-ink">
              {t('methodSourceCanonicalTitle')}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              {t('methodSourceCanonicalBody')}
            </p>
          </article>
        </div>
        <p className="mt-4 text-[13px] text-ink-muted">
          {t('snapshotAsOf')}: <span className="num text-ink">{dataset.snapshot}</span> ·{' '}
          {t('methodUpstreamCommit')}:{' '}
          <a
            className="num text-ink underline decoration-border underline-offset-2 hover:decoration-ink"
            href={`${UPSTREAM}/commit/${dataset.source.commit}`}
            target="_blank"
            rel="noreferrer"
          >
            {dataset.source.commit.slice(0, 12)}
          </a>
        </p>
      </SectionShell>

      <SectionShell id="method-pricing" title={t('methodPricingTitle')}>
        <div className="card mt-6 p-5">
          <p className="num text-lg font-semibold text-ink">{t('methodFormula')}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
            {t('methodFormulaNote')}
          </p>
        </div>
        <div className="mt-5">
          <PricingMethodCards />
        </div>
        <p className="mt-4 text-[13px] text-ink-muted">
          {t('mixLabel')}:{' '}
          <span className="num text-ink">
            {t('mixCache')} {pct(mix.cache)} · {t('mixInput')} {pct(mix.input)} ·{' '}
            {t('mixOutput')} {pct(mix.output)}
          </span>
        </p>
      </SectionShell>

      <SectionShell id="method-boards" title={t('methodBoardsTitle')}>
        <div className="mt-6">
          <BoardMethodCards />
        </div>
        <p className="mt-4 max-w-3xl text-[13px] leading-relaxed text-ink-muted">
          {t('paretoWhatBody')}
        </p>
      </SectionShell>

      <SectionShell id="method-limits" title={t('methodLimitsTitle')}>
        <ul className="mt-6 max-w-3xl space-y-2.5">
          {(
            [
              'methodLimitPlans',
              'methodLimitFairUse',
              'methodLimitBenchmarks',
              'methodLimitCurrency',
            ] as const
          ).map((key) => (
            <li key={key} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-muted">
              <span aria-hidden className="mt-[0.45rem] h-1 w-1 flex-none rounded-full bg-ink-dim" />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
      </SectionShell>

      <Downloads />
    </>
  )
}
