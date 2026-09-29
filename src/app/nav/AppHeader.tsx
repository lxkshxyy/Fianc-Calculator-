import { MoreVertical } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { AppButton } from '@/components/ui/AppButton'
import { Avatar } from '@/components/ui/Avatar'
import { TierBadge } from '@/components/ui/TierBadge'
import { useProfile } from '@/data/store/data'
import { useHtmlLang, useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { BRAND } from '@/config/brand'
import { APP_BASE, routeMetaFor } from './navigation'

/** Scroll (px) past the expanded header's own height before it collapses. */
const COLLAPSE_MARGIN = 16
/** Scroll (px) at or under which a collapsed header opens again. */
const EXPAND_AT = 8

/**
 * §5.3 — desktop shows title + subtitle left and actions right; mobile is a
 * compact sticky bar whose title collapses from 34px to 20px on scroll.
 *
 * §10.10 — the collapse exists so a sticky header does not eat a third of a
 * small screen. The scroll listener is passive and only flips a boolean, so it
 * never blocks scrolling.
 *
 * The collapse points are chosen so the header can never flicker. It used to
 * collapse past 24px and expand again at or under 24px. Collapsing makes the
 * page shorter by the height the header gives up, so on a page with little to
 * scroll (Budget with no limits set had 97px of room on a laptop) the browser
 * pulled the scroll back under 24px, the header grew back, the page grew, the
 * next wheel tick collapsed it again — the header blinked between 90px and 53px
 * for as long as you scrolled. Chrome's scroll anchoring does the same on long
 * pages: it moves the scroll back by whatever the header just gave up.
 *
 * Now it collapses only once the page has scrolled past the header's full
 * expanded height (plus a margin), and expands only back near the top. Whatever
 * the collapse takes away is less than that full height, so the scroll can
 * never fall back into the expand zone, and a page too short to scroll that far
 * simply keeps the full header — there is nothing for it to make room for.
 *
 * §10.3 — top padding clears the notch via `env(safe-area-inset-top)`.
 */
export function AppHeader({ onOpenMore }: { onOpenMore: () => void }) {
  const t = useT()
  const location = useLocation()
  const profile = useProfile()
  const tier = profile?.tier ?? 'silver'

  /* One place stamps <html lang>, and the header is on every private screen. */
  useHtmlLang()
  const [collapsed, setCollapsed] = useState(false)
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let isCollapsed = false
    /* The tallest the expanded header has been — see the note above. */
    let expandedHeight = 0

    const onScroll = (): void => {
      /*
       * Sheet.tsx's scroll lock sets body{position:fixed}, which clamps scrollY to
       * 0 and fires a scroll event. Without this the header un-collapses and the
       * page visibly grows behind the 70%-opaque scrim, then snaps back on close.
       */
      if (document.body.style.position === 'fixed') return

      const header = headerRef.current
      if (!isCollapsed && header !== null) {
        expandedHeight = Math.max(expandedHeight, header.offsetHeight)
      }

      const y = window.scrollY
      const next = isCollapsed ? y > EXPAND_AT : y > expandedHeight + COLLAPSE_MARGIN
      if (next === isCollapsed) return
      isCollapsed = next
      setCollapsed(next)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const meta = routeMetaFor(location.pathname, t, profile?.displayName)
  const title = meta?.title ?? BRAND.full
  const subtitle = meta?.subtitle ?? ''

  return (
    <header
      ref={headerRef}
      className={cn(
        /*
         * Solid, not 95% + blur. On the phone the blur let whatever scrolled
         * underneath — the Profile avatars, a coloured card — show through as
         * ghosted smudges behind the status bar and the title.
         */
        'border-border bg-bg-elevated sticky top-0 z-30 border-b',
        'pt-[env(safe-area-inset-top)]',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3 px-4 transition-all duration-150 sm:px-6',
          collapsed ? 'py-2' : 'py-3 lg:py-5',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          {/*
           * The greeting carries the person's picture, and the picture is the way
           * into their profile — the same place a phone's own apps put it.
           */}
          {meta?.greeting === true ? (
            <Link
              to={`${APP_BASE}/profile`}
              aria-label={t('header.openProfile')}
              className="focus-visible:outline-text-2 shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Avatar
                avatar={profile?.avatar}
                name={profile?.displayName ?? ''}
                size={collapsed ? 34 : 44}
                className="ring-border ring-1 transition-all duration-150"
              />
            </Link>
          ) : null}
          <div className="min-w-0">
            {meta?.greeting === true && meta.accent !== undefined ? (
              /*
               * The named greeting is set on two lines — the words small, the name
               * large — so the name is never the part that gets cut. With the
               * picture beside it, "Welcome back, Lakshay" no longer fits one line
               * of a phone header, and truncating it cuts off exactly the name.
               *
               * The words stay in sentence order, so Hindi (name first) reads
               * name-then-greeting and English greeting-then-name. Its leading
               * comma is dropped once it sits on a line of its own.
               */
              <h1
                className="text-text min-w-0 tracking-tight"
                /* Read as the one sentence it is, not as three separate lines. */
                aria-label={`${title}${meta.accent}${meta.titleTail ?? ''}`}
              >
                {title === '' ? null : (
                  <span className="text-caption text-text-2 block truncate font-medium">
                    {title}
                  </span>
                )}
                <span
                  className={cn(
                    'text-accent block truncate font-bold transition-all duration-150',
                    /*
                     * On its own line the name can be read at title size even in
                     * the app shell — the one-line sentence was what needed
                     * `.app-greeting` to shrink it, so that rule is not applied.
                     */
                    collapsed ? 'text-lead lg:text-title' : 'text-title lg:text-page',
                  )}
                >
                  {meta.accent}
                </span>
                {meta.titleTail === undefined || meta.titleTail === '' ? null : (
                  <span className="text-caption text-text-2 block truncate font-medium">
                    {' '}
                    {meta.titleTail.replace(/^,\s*/, '')}
                  </span>
                )}
              </h1>
            ) : (
              <h1
                className={cn(
                  'text-text font-bold tracking-tight transition-all duration-150',
                  /*
                   * Was `text-title : text-title lg:text-page`, which collapsed only at
                   * lg — the one breakpoint §5.3 does not ask for — and never on mobile,
                   * the one it does. It now collapses to 20px at every width.
                   *
                   * Expanded, a phone gets 22–28px (by screen width) over up to two
                   * lines rather than 34px on one: beside the tier pill and the menu
                   * button, 34px cut "Income Opportunities" to "Income …" and
                   * "Achievements" to "Achieve…". break-words is for large system
                   * font sizes, where one long word would otherwise be clipped.
                   */
                  collapsed
                    ? 'text-title truncate'
                    : 'lg:text-page line-clamp-2 text-[clamp(1.375rem,7vw,1.75rem)] leading-[1.15] text-balance break-words lg:truncate',
                  /* Sized down in the app shell only — see `.app-greeting` in index.css. */
                  meta?.greeting === true && 'app-greeting',
                )}
              >
                {title}
              </h1>
            )}
            {subtitle === '' || collapsed ? null : (
              <p className="text-meta text-text-2 hidden truncate lg:block">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* The tier pill is also the way to the plans (§9.5). */}
          <Link
            to={`${APP_BASE}/upgrade`}
            aria-label={t('header.membership', { tier: tier === 'diamond' ? 'Diamond' : 'Silver' })}
            className="focus-visible:outline-text-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <TierBadge tier={tier} size="sm" />
          </Link>
          <AppButton
            variant="ghost"
            size="icon"
            aria-label={t('header.openMore')}
            className="lg:hidden"
            onClick={onOpenMore}
          >
            <MoreVertical aria-hidden className="size-4" />
          </AppButton>
        </div>
      </div>
    </header>
  )
}
