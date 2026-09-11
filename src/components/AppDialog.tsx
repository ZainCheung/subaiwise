import { useEffect, useId, useRef, type ReactNode } from 'react'

export function AppDialog({
  title,
  children,
  onClose,
  wide = false,
  closeLabel = 'Close',
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
  closeLabel?: string
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const titleId = useId()

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow

    try {
      if (!el.open) el.showModal()
    } catch {
      // Strict mode remount or a dialog that is already closing.
    }
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
      if (el.isConnected && el.open) {
        try {
          el.close()
        } catch {
          // Ref already detached during unmount.
        }
      }
      previous?.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={wide ? 'app-dialog app-dialog-wide' : 'app-dialog'}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onCloseRef.current()
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        ) {
          onCloseRef.current()
        }
      }}
    >
      <div className="app-dialog-head">
        <h2 id={titleId} className="app-dialog-title">
          {title}
        </h2>
        <button
          type="button"
          className="app-dialog-close"
          onClick={onClose}
          aria-label={closeLabel}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <div className="app-dialog-body">{children}</div>
    </dialog>
  )
}
