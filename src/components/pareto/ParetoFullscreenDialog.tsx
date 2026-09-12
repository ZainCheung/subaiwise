import type { ReactNode } from 'react'
import { AppDialog } from '../AppDialog'

export function ParetoFullscreenDialog({
  title,
  onClose,
  closeLabel,
  children,
}: {
  title: string
  onClose: () => void
  closeLabel: string
  children: ReactNode
}) {
  return (
    <AppDialog title={title} onClose={onClose} closeLabel={closeLabel} variant="fullscreen">
      {children}
    </AppDialog>
  )
}
