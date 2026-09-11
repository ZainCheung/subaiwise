import type { ReactNode } from 'react'

/** Shared sticky, internally scrolling table shell. */
export function TableViewport({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className ? `table-viewport ${className}` : 'table-viewport'}>
      {children}
    </div>
  )
}
