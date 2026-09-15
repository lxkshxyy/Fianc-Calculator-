import {
  Award,
  Banknote,
  Bot,
  CalendarHeart,
  CreditCard,
  FileText,
  Gift,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
  MessagesSquare,
  PiggyBank,
  Receipt,
  Settings,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'

/**
 * The single source of truth for navigation.
 *
 * §5.1 lists 20 sidebar items and §6 lists 21 private routes, of which only 19
 * are common — they had already drifted apart on paper. Everything that needs to
 * know about navigation (the desktop sidebar, the mobile tab bar, the More
 * sheet, active-state derivation and the router's private branch) reads this one
 * table, so the two lists cannot drift again.
 */

export type NavGroupId = 'main' | 'money' | 'wealth' | 'growth' | 'tools'

export type NavItem = {
  /** Path segment under /app, or an absolute path when the destination is public. */
  path: string
  label: string
  icon: LucideIcon
  /** True when following this leaves the app shell for a public page (§9.3). */
  external?: boolean
  /** The §11 phase that replaces the stub with the real screen. */
  phase: number
}

export type NavGroup = {
  id: NavGroupId
  /** The §4.2 uppercase section label. */
  label: string
  /** The group index route (§5.2 tab destination), or null for MAIN and TOOLS. */
  indexPath: string | null
  icon: LucideIcon
  items: NavItem[]
}

export const APP_BASE = '/app'

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'main',
    label: 'Main',
    indexPath: null,
    icon: LayoutDashboard,
    items: [{ path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, phase: 4 }],
  },
  {
    id: 'money',
    label: 'Money',
    indexPath: 'money',
    icon: Banknote,
    items: [
      { path: 'income', label: 'Income', icon: Banknote, phase: 5 },
      { path: 'income-opportunities', label: 'Income Opportunities', icon: Sparkles, phase: 5 },
      { path: 'budget', label: 'Budget', icon: Wallet, phase: 5 },
      { path: 'emi-credit', label: 'EMI & Credit', icon: CreditCard, phase: 5 },
      { path: 'tax', label: 'Tax Planning', icon: Receipt, phase: 5 },
    ],
  },
  {
    id: 'wealth',
    label: 'Wealth',
    indexPath: 'wealth',
    icon: TrendingUp,
    items: [
      { path: 'investments', label: 'Investments', icon: TrendingUp, phase: 6 },
      { path: 'goals', label: 'Goals', icon: Target, phase: 6 },
      { path: 'assets', label: 'Assets', icon: Landmark, phase: 6 },
      { path: 'insurance', label: 'Insurance', icon: Shield, phase: 6 },
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    indexPath: 'growth',
    icon: GraduationCap,
    items: [
      { path: 'learning', label: 'My Learning', icon: GraduationCap, phase: 7 },
      { path: 'morning-club', label: 'Morning Club', icon: CalendarHeart, phase: 7 },
      { path: 'achievements', label: 'Achievements', icon: Award, phase: 7 },
      { path: 'referrals', label: 'Refer & Earn', icon: Gift, phase: 7 },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    indexPath: null,
    icon: Settings,
    items: [
      { path: 'assistant', label: 'AI Assistant', icon: Bot, phase: 8 },
      { path: 'documents', label: 'Documents', icon: FileText, phase: 8 },
      { path: 'expert-chat', label: 'Expert Chat', icon: MessagesSquare, phase: 8 },
      /*
       * §9.3 makes the request forms available without login, so there is exactly
       * one implementation and it lives on the public route. Marked external so
       * the nav can show that following it leaves the shell.
       */
      { path: '/request-centre', label: 'Request Centre', icon: PiggyBank, external: true, phase: 9 },
      { path: 'family', label: 'Family', icon: Users, phase: 8 },
      { path: 'settings', label: 'Settings', icon: Settings, phase: 8 },
    ],
  },
]

/**
 * Private routes that exist but never appear in navigation.
 *
 * `onboarding` is reached programmatically after signup; `upgrade` is reached
 * from LockedOverlay and the tier pill (§9.5). Neither has a §9 screen spec yet.
 */
export const UNLISTED_PRIVATE_ROUTES: NavItem[] = [
  { path: 'onboarding', label: 'Onboarding', icon: Sparkles, phase: 9 },
  { path: 'upgrade', label: 'Upgrade', icon: Award, phase: 5 },
]

/** Every private route segment under /app — the 24 the route map settles on. */
export function allPrivateRouteSegments(): string[] {
  const fromGroups = NAV_GROUPS.flatMap((group) => [
    ...(group.indexPath === null ? [] : [group.indexPath]),
    ...group.items.filter((item) => item.external !== true).map((item) => item.path),
  ])
  return [...fromGroups, ...UNLISTED_PRIVATE_ROUTES.map((item) => item.path)]
}

/**
 * §5.2 — the five mobile tabs. MAIN and TOOLS have no group index: Dashboard is
 * a direct destination and TOOLS opens the More sheet.
 */
export type TabId = 'dashboard' | 'money' | 'wealth' | 'growth' | 'more'

export type Tab = {
  id: TabId
  label: string
  icon: LucideIcon
  /** null means the tab opens the More sheet rather than navigating. */
  to: string | null
  /** Path segments that mark this tab active (§5.2 leaves this undefined). */
  owns: string[]
}

export const TABS: Tab[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    to: APP_BASE + '/dashboard',
    owns: ['dashboard', 'onboarding'],
  },
  {
    id: 'money',
    label: 'Money',
    icon: Banknote,
    to: APP_BASE + '/money',
    owns: ['money', 'income', 'income-opportunities', 'budget', 'emi-credit', 'tax'],
  },
  {
    id: 'wealth',
    label: 'Wealth',
    icon: TrendingUp,
    to: APP_BASE + '/wealth',
    owns: ['wealth', 'investments', 'goals', 'assets', 'insurance'],
  },
  {
    id: 'growth',
    label: 'Growth',
    icon: GraduationCap,
    to: APP_BASE + '/growth',
    owns: ['growth', 'learning', 'morning-club', 'achievements', 'referrals'],
  },
  {
    id: 'more',
    label: 'More',
    icon: Settings,
    to: null,
    owns: ['assistant', 'documents', 'expert-chat', 'family', 'settings', 'upgrade'],
  },
]

/** The active tab for a pathname, or null when nothing in /app matches. */
export function activeTabFor(pathname: string): TabId | null {
  const segment = pathname.replace(APP_BASE, '').split('/').filter(Boolean)[0]
  if (segment === undefined) return null
  return TABS.find((tab) => tab.owns.includes(segment))?.id ?? null
}

/** Title and subtitle for the sticky header (§5.3), derived from the same table. */
export function routeMetaFor(pathname: string): { title: string; subtitle: string } | null {
  const segment = pathname.replace(APP_BASE, '').split('/').filter(Boolean)[0]
  if (segment === undefined) return null

  for (const group of NAV_GROUPS) {
    if (group.indexPath === segment) {
      return { title: group.label, subtitle: 'Everything in your ' + group.label.toLowerCase() }
    }
    const item = group.items.find((candidate) => candidate.path === segment)
    if (item) return { title: item.label, subtitle: 'Phase ' + item.phase + ' builds this screen' }
  }

  const unlisted = UNLISTED_PRIVATE_ROUTES.find((item) => item.path === segment)
  if (unlisted) {
    return { title: unlisted.label, subtitle: 'Phase ' + unlisted.phase + ' builds this screen' }
  }

  return null
}
