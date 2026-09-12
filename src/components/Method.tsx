import { useI18n, type DictKey } from '../lib/i18n'

function MethodCard({ n, titleKey, bodyKey }: { n: string; titleKey: DictKey; bodyKey: DictKey }) {
  const { t } = useI18n()
  return (
    <article className="card p-5">
      <div className="num text-[11px] font-medium tracking-[0.16em] text-ink-dim">{n}</div>
      <h3 className="mt-2 text-[15px] font-semibold text-ink">{t(titleKey)}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{t(bodyKey)}</p>
    </article>
  )
}

/** Steps 01–02: how the real unit price is derived. */
export function PricingMethodCards() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <MethodCard n="01" titleKey="method1Title" bodyKey="method1Body" />
      <MethodCard n="02" titleKey="method2Title" bodyKey="method2Body" />
    </div>
  )
}

/** Steps 03–04: how benchmark boards and the frontier are treated. */
export function BoardMethodCards() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <MethodCard n="03" titleKey="method3Title" bodyKey="method3Body" />
      <MethodCard n="04" titleKey="method4Title" bodyKey="method4Body" />
    </div>
  )
}
