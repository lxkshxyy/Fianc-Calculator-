import { ChevronRight, ExternalLink, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { AppButton } from '@/components/ui/AppButton'
import { Sheet } from '@/components/ui/Sheet'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useSession } from '@/data/store/session'
import { useT } from '@/i18n'
import { APP_BASE, NAV_GROUPS } from './navigation'

/**
 * §5.2 — "More" opens a sheet containing the Tools group and Settings.
 *
 * Settings is already the last item of the TOOLS group in `navigation.ts`, so
 * this renders that group verbatim rather than keeping a second list that could
 * drift from the sidebar.
 */
export function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  const signOut = useSession((state) => state.signOut)
  const tools = NAV_GROUPS.find((group) => group.id === 'tools')

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('more.title')}
      description={t('more.description')}
    >
      <ul className="space-y-2">
        {(tools?.items ?? []).map((item) => (
          <li key={item.path}>
            <button
              type="button"
              onClick={() => {
                onClose()
                void navigate(item.external === true ? item.path : APP_BASE + '/' + item.path)
              }}
              className="rounded-tile text-meta text-text hover:bg-surface-2 flex min-h-11 w-full items-center gap-3 px-3 transition-colors duration-150"
            >
              <item.icon aria-hidden className="text-text-2 size-4 shrink-0" />
              <span className="flex-1 truncate text-left">{t(item.labelKey)}</span>
              {item.external === true ? (
                <ExternalLink aria-label={t('header.leavesApp')} className="text-text-3 size-3.5" />
              ) : (
                <ChevronRight aria-hidden className="text-text-3 size-3.5" />
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* The sidebar is lg-only (§5.2), so without this the theme cannot be
          changed from any private route on a phone. */}
      <div className="border-border mt-5 flex items-center justify-between gap-3 border-t pt-4">
        <span className="text-meta text-text font-medium">{t('more.theme')}</span>
        <ThemeToggle />
      </div>

      <div className="border-border mt-4 border-t pt-4">
        <AppButton
          variant="danger"
          block
          onClick={() => {
            onClose()
            signOut()
          }}
        >
          <LogOut aria-hidden className="size-4" />
          {t('more.signOut')}
        </AppButton>
      </div>
    </Sheet>
  )
}
