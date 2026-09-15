import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { AppButton } from './AppButton'

/**
 * A bottom sheet on mobile, a centred panel from `sm` up.
 *
 * §10.4 — `overscroll-behavior: contain` on the scrollable body, so reaching the
 * end does not start dragging the page behind it.
 * §10.5 — the body is scroll-locked while open and the **exact** scroll position
 * is restored on close. `position: fixed` on the body is what actually stops iOS
 * Safari scrolling underneath; the cost is that it resets scrollTop, which is why
 * the offset is stashed and re-applied rather than trusted to survive.
 * §10.3 — bottom padding clears the home indicator.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const { body } = document
    const scrollY = window.scrollY
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    }

    body.style.position = 'fixed'
    body.style.top = -scrollY + 'px'
    body.style.width = '100%'
    body.style.overflow = 'hidden'

    return () => {
      body.style.position = previous.position
      body.style.top = previous.top
      body.style.width = previous.width
      body.style.overflow = previous.overflow
      window.scrollTo({ top: scrollY, behavior: 'instant' })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    /* Stash the opener so closing returns focus there instead of dropping to <body>. */
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panelRef.current?.focus()
    return () => {
      opener?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/*
        * A div, not a button: as a button this full-screen backdrop was a focusable
        * tab stop that sits outside the aria-modal subtree, so assistive tech is told
        * to ignore it — a silent, invisible stop — and it duplicated the header X's
        * "Close" name. The X at the top of the panel is the one labelled control.
        */}
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-bg/70" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[85dvh] w-full flex-col border border-border bg-bg-elevated',
          'rounded-t-card sm:max-w-lg sm:rounded-card',
          /*
           * §10.3 — a bottom-anchored sheet with no footer (MoreSheet) otherwise ends
           * flush with the viewport, putting its last control inside the home-indicator
           * strip. The inset is inside max-h, so the scroll region just shortens.
           */
          'pb-[env(safe-area-inset-bottom)] sm:pb-0',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
          <div className="space-y-1">
            <h2 className="text-title font-semibold text-text">{title}</h2>
            {description === undefined ? null : (
              <p className="text-meta text-text-2">{description}</p>
            )}
          </div>
          <AppButton variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X aria-hidden className="size-4" />
          </AppButton>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">{children}</div>

        {footer === undefined ? null : (
          <div className="border-t border-border p-4 sm:p-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
