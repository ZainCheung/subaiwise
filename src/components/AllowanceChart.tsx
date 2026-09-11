import { useMemo, useState } from 'react'
import type { SubAIWiseEntry } from '../data/schema'
import { useI18n } from '../lib/i18n'
import { vendorColor } from '../lib/vendors'
import { shortLabel } from '../lib/labels'
import { applyLimit, CHART_LIMITS, chartLimitKey, logWidthPct, type ChartLimit } from '../lib/limits'
import { selectAllowanceRows } from '../domain/pricing'
import { Pill, PillGroup } from './Pill'
import { CompactBrandIdentity } from './ProviderLogo'
import { TableViewport } from './TableViewport'

export function AllowanceChart({ entries }: { entries: readonly SubAIWiseEntry[] }) {
  const { t, lang } = useI18n()
  const [limit, setLimit] = useState<ChartLimit>(15)
  const [hoverId, setHoverId] = useState<string | null>(null)

  const data = useMemo(() => {
    const sorted = selectAllowanceRows(entries)
    return applyLimit(sorted, limit).map((row) => {
      const display = lang === 'en' ? row.monthlyYi / 10 : row.monthlyYi
      return {
        ...row,
        short: shortLabel(row.label, 42),
        display,
        color: vendorColor(row.maker),
      }
    })
  }, [entries, limit, lang])

  const displayVals = data.map((d) => d.display).filter((v) => v > 0)
  const max = Math.max(...displayVals, 1e-9)
  const min = Math.min(...displayVals, max)

  const formatVal = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: n >= 10 ? 1 : 3 })

  return (
    <div className="card chart-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink">{t('allowanceTitle')}</h3>
          <p className="mt-1 max-w-2xl text-[13px] text-ink-muted">{t('allowanceSub')}</p>
        </div>
        <PillGroup>
          {CHART_LIMITS.map((n) => (
            <Pill key={String(n)} active={limit === n} onClick={() => setLimit(n)}>
              {t(chartLimitKey(n))}
            </Pill>
          ))}
        </PillGroup>
      </div>

      <TableViewport className="mt-6">
        <table className="bar-table min-w-[640px]">
          <thead>
            <tr>
              <th className="w-[38%]">{t('colPlanModel')}</th>
              <th className="w-[42%]">{t('tooltipAllowance')}</th>
              <th className="w-[20%] !pr-0 !text-right">{t('colValue')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const pct = logWidthPct(row.display, min, max)
              const active = hoverId === row.id
              return (
                <tr
                  key={row.id}
                  onMouseEnter={() => setHoverId(row.id)}
                  onMouseLeave={() => setHoverId(null)}
                  className={active ? 'bg-white/[0.02]' : undefined}
                  title={`${row.label}\n${row.channel} · ${row.maker} · ${formatVal(row.display)}`}
                >
                  <td>
                    <CompactBrandIdentity maker={row.maker} channel={row.channel}>
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {row.short}
                      </span>
                      <span className="block truncate text-[11px] text-ink-dim">
                        {row.channel === row.maker ? row.maker : `${row.channel} · ${row.maker}`}
                      </span>
                    </CompactBrandIdentity>
                  </td>
                  <td>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: row.color,
                          opacity: active ? 1 : 0.88,
                        }}
                      />
                    </div>
                  </td>
                  <td className="!pr-0 !text-right">
                    <span className="num text-[13px] text-ink">{formatVal(row.display)}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </TableViewport>
    </div>
  )
}
