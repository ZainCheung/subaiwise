import type { PricingPoint } from '../../types'
import { brandMaker, providerInitials } from '../../lib/provider-brands'
import { scatterLabel } from '../../lib/labels'
import { providerLogoUrl } from '../ProviderLogo'

export type PlotRow = {
  key: string
  x: number
  y: number
  kind: 'sub' | 'api' | 'frontier'
  count: number
  points: PricingPoint[]
  showLabel: boolean
  efficient: boolean
  color: string
  short: string
}

function hitTarget(
  cx: number,
  cy: number,
  r: number,
  onHover: (row: PlotRow) => void,
  onLeave: () => void,
  onSelect: (row: PlotRow) => void,
  row: PlotRow,
) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="transparent"
      onMouseEnter={() => onHover(row)}
      onMouseLeave={onLeave}
      onClick={() => onSelect(row)}
      style={{ cursor: 'pointer' }}
    />
  )
}

export function RegularPoint({
  cx = 0,
  cy = 0,
  payload,
  active,
  related,
  onHover,
  onLeave,
  onSelect,
}: {
  cx?: number
  cy?: number
  payload?: PlotRow
  active?: boolean
  related?: boolean
  onHover: (row: PlotRow) => void
  onLeave: () => void
  onSelect: (row: PlotRow) => void
}) {
  if (!payload) return null
  const opacity = active ? 1 : related ? 0.85 : 0.38
  const visualR = active ? 5.5 : 4
  const isApi = payload.kind === 'api'
  return (
    <g>
      {hitTarget(cx, cy, 12, onHover, onLeave, onSelect, payload)}
      <circle
        cx={cx}
        cy={cy}
        r={visualR}
        fill={isApi ? 'transparent' : payload.color}
        stroke={payload.color}
        strokeWidth={isApi ? 1.35 : active ? 1 : 0}
        fillOpacity={isApi ? 0 : opacity}
        strokeOpacity={opacity}
        pointerEvents="none"
      />
      {payload.count > 1 ? (
        <text
          x={cx + 8}
          y={cy + 3}
          fill="#a3a3a3"
          fontSize={10}
          pointerEvents="none"
        >
          {payload.count}
        </text>
      ) : null}
    </g>
  )
}

export function FrontierPoint({
  cx = 0,
  cy = 0,
  payload,
  efficientLabel,
  onHover,
  onLeave,
  onSelect,
}: {
  cx?: number
  cy?: number
  payload?: PlotRow
  efficientLabel: string
  onHover: (row: PlotRow) => void
  onLeave: () => void
  onSelect: (row: PlotRow) => void
}) {
  if (!payload) return null
  const maker = brandMaker(payload.points[0]?.vendor ?? '')
  const src = providerLogoUrl(maker)
  const size = 28
  const x = cx - size / 2
  const y = cy - size / 2
  return (
    <g>
      {hitTarget(cx, cy, 18, onHover, onLeave, onSelect, payload)}
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        rx={6}
        fill="#f4f4f5"
        pointerEvents="none"
      />
      {src ? (
        <image href={src} x={x + 3} y={y + 3} width={size - 6} height={size - 6} pointerEvents="none" />
      ) : (
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fill="#3f3f46"
          fontSize={9}
          fontWeight={700}
          pointerEvents="none"
        >
          {providerInitials(maker)}
        </text>
      )}
      {payload.showLabel ? (
        <text
          x={cx + size / 2 + 8}
          y={cy - (payload.efficient ? 4 : 0)}
          fill="#ffffff"
          fontSize={12}
          fontWeight={500}
          fontFamily="Inter, system-ui, sans-serif"
          pointerEvents="none"
        >
          {scatterLabel(payload.short, 22)}
        </text>
      ) : null}
      {payload.efficient ? (
        <text
          x={cx + size / 2 + 8}
          y={cy + 12}
          fill="#fbbf24"
          fontSize={10}
          fontFamily="Inter, system-ui, sans-serif"
          pointerEvents="none"
        >
          ★ {efficientLabel}
        </text>
      ) : null}
    </g>
  )
}
