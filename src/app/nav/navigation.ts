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

import type { TranslationKey } from '@/i18n/en'
import { englishT, type Translate } from '@/i18n/translate'

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
  /** English, and the fallback wherever a translation has not been written yet. */
  label: string
  /**
   * The translation key for `label`.
   *
   * Spelled out rather than derived from `path` as `` `nav.${path}` ``: that
   * expression is `nav.${string}`, which TypeScript cannot check against the key
   * union, so a renamed route would silently start rendering its raw key. Written
   * out, adding a nav item without a translation is a compile error.
   */
  labelKey: TranslationKey
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
  labelKey: TranslationKey
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
    labelKey: 'nav.main',
    indexPath: null,
    icon: LayoutDashboard,
    items: [
      {
        path: 'dashboard',
        label: 'Dashboard',
        labelKey: 'nav.dashboard',
        icon: LayoutDashboard,
        phase: 4,
      },
    ],
  },
  {
    id: 'money',
    label: 'Money',
    labelKey: 'nav.money',
    indexPath: 'money',
    icon: Banknote,
    items: [
      { path: 'income', label: 'Income', labelKey: 'nav.income', icon: Banknote, phase: 5 },
      {
        path: 'income-opportunities',
        label: 'Income Opportunities',
        labelKey: 'nav.income-opportunities',
        icon: Sparkles,
        phase: 5,
      },
      { path: 'budget', label: 'Budget', labelKey: 'nav.budget', icon: Wallet, phase: 5 },
      {
        path: 'emi-credit',
        label: 'EMI & Credit',
        labelKey: 'nav.emi-credit',
        icon: CreditCard,
        phase: 5,
      },
      { path: 'tax', label: 'Tax Planning', labelKey: 'nav.tax', icon: Receipt, phase: 5 },
    ],
  },
  {
    id: 'wealth',
    label: 'Wealth',
    labelKey: 'nav.wealth',
    indexPath: 'wealth',
    icon: TrendingUp,
    items: [
      {
        path: 'investments',
        label: 'Investments',
        labelKey: 'nav.investments',
        icon: TrendingUp,
        phase: 6,
      },
      { path: 'goals', label: 'Goals', labelKey: 'nav.goals', icon: Target, phase: 6 },
      { path: 'assets', label: 'Assets', labelKey: 'nav.assets', icon: Landmark, phase: 6 },
      { path: 'insurance', label: 'Insurance', labelKey: 'nav.insurance', icon: Shield, phase: 6 },
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    labelKey: 'nav.growth',
    indexPath: 'growth',
    icon: GraduationCap,
    items: [
      {
        path: 'learning',
        label: 'My Learning',
        labelKey: 'nav.learning',
        icon: GraduationCap,
        phase: 7,
      },
      {
        path: 'morning-club',
        label: 'Morning Club',
        labelKey: 'nav.morning-club',
        icon: CalendarHeart,
        phase: 7,
      },
      {
        path: 'achievements',
        label: 'Achievements',
        labelKey: 'nav.achievements',
        icon: Award,
        phase: 7,
      },
      { path: 'referrals', label: 'Refer & Earn', labelKey: 'nav.referrals', icon: Gift, phase: 7 },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    labelKey: 'nav.tools',
    indexPath: null,
    icon: Settings,
    items: [
      { path: 'assistant', label: 'AI Assistant', labelKey: 'nav.assistant', icon: Bot, phase: 8 },
      {
        path: 'documents',
        label: 'Documents',
        labelKey: 'nav.documents',
        icon: FileText,
        phase: 8,
      },
      {
        path: 'expert-chat',
        label: 'Expert Chat',
        labelKey: 'nav.expert-chat',
        icon: MessagesSquare,
        phase: 8,
      },
      /*
       * §9.3 makes the request forms available without login, so there is exactly
       * one implementation and it lives on the public route. Marked external so
       * the nav can show that following it leaves the shell.
       */
      {
        path: '/request-centre',
        label: 'Request Centre',
        labelKey: 'nav.request-centre',
        icon: PiggyBank,
        external: true,
        phase: 9,
      },
      { path: 'family', label: 'Family', labelKey: 'nav.family', icon: Users, phase: 8 },
      { path: 'settings', label: 'Settings', labelKey: 'nav.settings', icon: Settings, phase: 8 },
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
  { path: 'onboarding', label: 'Onboarding', labelKey: 'nav.onboarding', icon: Sparkles, phase: 9 },
  { path: 'upgrade', label: 'Upgrade', labelKey: 'nav.upgrade', icon: Award, phase: 5 },
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
  labelKey: TranslationKey
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
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
    to: APP_BASE + '/dashboard',
    owns: ['dashboard', 'onboarding'],
  },
  {
    id: 'money',
    label: 'Money',
    labelKey: 'nav.money',
    icon: Banknote,
    to: APP_BASE + '/money',
    owns: ['money', 'income', 'income-opportunities', 'budget', 'emi-credit', 'tax'],
  },
  {
    id: 'wealth',
    label: 'Wealth',
    labelKey: 'nav.wealth',
    icon: TrendingUp,
    to: APP_BASE + '/wealth',
    owns: ['wealth', 'investments', 'goals', 'assets', 'insurance'],
  },
  {
    id: 'growth',
    label: 'Growth',
    labelKey: 'nav.growth',
    icon: GraduationCap,
    to: APP_BASE + '/growth',
    owns: ['growth', 'learning', 'morning-club', 'achievements', 'referrals'],
  },
  {
    id: 'more',
    label: 'More',
    labelKey: 'nav.more',
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

/**
 * Title and subtitle for the sticky header (§5.3), derived from the same table.
 *
 * `accent` is an optional trailing fragment rendered in the accent colour — the
 * brand word in a greeting, not decoration for its own sake.
 */
export type RouteMeta = {
  /** The part of the heading before the accent fragment. */
  title: string
  subtitle: string
  /** Rendered in the accent colour, between `title` and `titleTail`. */
  accent?: string
  /**
   * What follows the accent fragment.
   *
   * English ends on the name — "Welcome back, **Lakshay**" — so this is empty.
   * Hindi opens on it — "**लक्ष्य**, आपका फिर से स्वागत है" — and everything
   * after the name lives here. Without it the accent could only ever be the last
   * word, which quietly makes the whole mechanism English-shaped.
   */
  titleTail?: string
}

/**
 * The first word of a name, for greeting somebody by it.
 *
 * Splits on whitespace and takes the first word, so "Lakshay Sharma" greets
 * "Lakshay" and a single-word name is used whole. Deliberately not a name
 * parser: there is no rule that picks a given name out of every naming
 * convention in India, let alone everywhere else, and guessing wrong means
 * calling someone by their father's name on their own dashboard. The first word
 * a person typed is the one they expect to be called.
 *
 * Returns null for an empty or missing name so the caller can greet without one
 * rather than render "Welcome back, ".
 */
export function firstName(displayName: string | null | undefined): string | null {
  const [first] = (displayName ?? '').trim().split(/\s+/)
  return first === undefined || first === '' ? null : first
}

/**
 * `t` defaults to English so plain callers — tests, anything outside a component
 * tree — keep working unchanged. Screens pass `useT()` and get the user's
 * language.
 */
export function routeMetaFor(
  pathname: string,
  t: Translate = englishT,
  displayName?: string | null,
): RouteMeta | null {
  const segment = pathname.replace(APP_BASE, '').split('/').filter(Boolean)[0]
  if (segment === undefined) return null

  /*
   * The dashboard greets rather than labels itself. It used to render "Dashboard"
   * up here and a second, larger "Welcome…" heading immediately below it — two
   * headings saying different things about one screen. The greeting won; the
   * duplicate is gone from Dashboard.tsx.
   *
   * `accent` stays untranslated on purpose: it is the brand's short name, and a
   * brand name is the same word in every language.
   */
  if (segment === 'dashboard') {
    const name = firstName(displayName)
    const subtitle = t('header.greetingSubtitle')

    if (name === null) return { title: t('header.greeting'), subtitle }

    /*
     * Split the translated sentence on its placeholder rather than concatenating
     * around it. `'Welcome back, {name}'` gives ['Welcome back, ', ''] and
     * `'{name}, आपका फिर से स्वागत है'` gives ['', ', आपका फिर से स्वागत है'] —
     * same code, the name landing where each language wants it.
     */
    const [lead = '', tail = ''] = t('header.greetingNamed').split('{name}')
    return { title: lead, accent: name, titleTail: tail, subtitle }
  }

  for (const group of NAV_GROUPS) {
    if (group.indexPath === segment) {
      /*
       * `toLowerCase` on the English group name only. Devanagari has no case, so
       * calling it on the Hindi line would be a no-op that merely looked wrong to
       * read; the substitution keeps whichever form the language actually uses.
       */
      const name = t(group.labelKey)
      return {
        title: name,
        subtitle: t('header.groupSubtitle', { group: name.toLocaleLowerCase() }),
      }
    }
    const item = group.items.find((candidate) => candidate.path === segment)
    /* No subtitle. It used to read "Phase N builds this screen", which is a note
       to whoever was building the app, not something a user should ever see. */
    if (item) return { title: t(item.labelKey), subtitle: '' }
  }

  const unlisted = UNLISTED_PRIVATE_ROUTES.find((item) => item.path === segment)
  if (unlisted) {
    return { title: t(unlisted.labelKey), subtitle: '' }
  }

  return null
}
