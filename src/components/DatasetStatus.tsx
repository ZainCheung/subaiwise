import { useI18n } from '../lib/i18n'

/** Loading / error card shared by routes that fetch the dataset. */
export function DatasetStatus({
  error,
  onRetry,
}: {
  error: Error | null
  onRetry: () => void
}) {
  const { t } = useI18n()
  return (
    <div
      className={`card w-full p-6 text-center text-[13px] ${error ? 'text-red-300' : 'text-ink-muted'}`}
      role={error ? 'alert' : 'status'}
    >
      <p>{error ? t('error') : t('loading')}</p>
      {error ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-md border border-border-strong px-3.5 py-2 text-ink hover:border-neutral-500"
        >
          {t('retry')}
        </button>
      ) : null}
    </div>
  )
}
