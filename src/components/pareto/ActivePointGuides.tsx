import { formatUsdTick, formatYTick, guideEndpoints } from '../../lib/axis'

type AxisMap = Record<string, { scale?: (value: number) => number }>

export function ActivePointGuides({
  active,
  offset,
  xAxisMap,
  yAxisMap,
  yFormat = formatYTick,
}: {
  active: { x: number; y: number } | null
  offset?: { left: number; top: number; width: number; height: number }
  xAxisMap?: AxisMap
  yAxisMap?: AxisMap
  yFormat?: (value: number) => string
}) {
  if (!active || !offset) return null
  const xAxis = xAxisMap ? Object.values(xAxisMap)[0] : undefined
  const yAxis = yAxisMap ? Object.values(yAxisMap)[0] : undefined
  const cx = xAxis?.scale?.(active.x)
  const cy = yAxis?.scale?.(active.y)
  if (cx == null || cy == null || !Number.isFinite(cx) || !Number.isFinite(cy)) return null

  const { horizontal, vertical } = guideEndpoints(cx, cy, offset)
  return (
    <g className="pareto-guides" pointerEvents="none">
      <line
        x1={horizontal.x1}
        y1={horizontal.y1}
        x2={horizontal.x2}
        y2={horizontal.y2}
        stroke="rgba(255,255,255,0.45)"
        strokeDasharray="4 4"
      />
      <line
        x1={vertical.x1}
        y1={vertical.y1}
        x2={vertical.x2}
        y2={vertical.y2}
        stroke="rgba(255,255,255,0.45)"
        strokeDasharray="4 4"
      />
      <text
        x={cx}
        y={vertical.y2 - 6}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={11}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {formatUsdTick(active.x)}
      </text>
      <text
        x={offset.left + 8}
        y={cy - 8}
        textAnchor="start"
        fill="#ffffff"
        fontSize={11}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {yFormat(active.y)}
      </text>
    </g>
  )
}
