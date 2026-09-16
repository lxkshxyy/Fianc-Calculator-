/**
 * English — the source of truth for every translatable key.
 *
 * Its shape *is* the contract: `hi.ts` is typed as a partial of this object, so
 * a key that does not exist here is a compile error there, and a key missing
 * there falls back to the English line rather than showing a raw key on screen.
 * Adding copy means adding it here first.
 *
 * Keys are grouped by where the text appears, not by what it says. `nav.income`
 * and `screen.income.title` are different strings for good reason — the tab is
 * short by necessity and the heading is not.
 */
export const en = {
  /* ── Navigation groups and items ─────────────────────────────────────── */
  'nav.main': 'Main',
  'nav.money': 'Money',
  'nav.wealth': 'Wealth',
  'nav.growth': 'Growth',
  'nav.tools': 'Tools',
  'nav.more': 'More',

  'nav.dashboard': 'Dashboard',
  'nav.income': 'Income',
  'nav.income-opportunities': 'Income Opportunities',
  'nav.budget': 'Budget',
  'nav.emi-credit': 'EMI & Credit',
  'nav.tax': 'Tax Planning',
  'nav.investments': 'Investments',
  'nav.goals': 'Goals',
  'nav.assets': 'Assets',
  'nav.insurance': 'Insurance',
  'nav.learning': 'My Learning',
  'nav.morning-club': 'Morning Club',
  'nav.achievements': 'Achievements',
  'nav.referrals': 'Refer & Earn',
  'nav.assistant': 'AI Assistant',
  'nav.documents': 'Documents',
  'nav.expert-chat': 'Expert Chat',
  'nav.request-centre': 'Request Centre',
  'nav.family': 'Family',
  'nav.settings': 'Settings',
  'nav.onboarding': 'Onboarding',
  'nav.upgrade': 'Upgrade',

  /* ── Sticky header ───────────────────────────────────────────────────── */
  /*
   * Two greetings, because the name is not always there. The profile loads
   * asynchronously and a brand-new account is written a moment after sign-up, so
   * there is a real window with no name to use — and "Welcome back, ." is worse
   * than no name at all.
   *
   * `{name}` is a placeholder the header splits on, so the accent colour lands on
   * the name wherever the sentence puts it. Hindi puts it first; English last.
   */
  'header.greeting': 'Welcome back',
  'header.greetingNamed': 'Welcome back, {name}',
  'header.greetingSubtitle': 'Here is where your money stands today.',
  'header.groupSubtitle': 'Everything in your {group}',
  'header.openMore': 'More',
  'header.leavesApp': '(leaves the app)',

  /* ── More sheet ──────────────────────────────────────────────────────── */
  'more.title': 'More',
  'more.description': 'Tools and settings',
  'more.theme': 'Theme',
  'more.signOut': 'Sign out',

  /* ── Common actions, used on every screen ────────────────────────────── */
  'action.add': 'Add',
  'action.save': 'Save',
  'action.cancel': 'Cancel',
  'action.saving': 'Saving…',
  'action.close': 'Close',
  'action.details': 'Details →',
  'action.done': 'Done',
  'action.edit': 'Edit',
  'action.reset': 'Reset',

  /* ── Dashboard ───────────────────────────────────────────────────────── */
  'dashboard.netWorth': 'Net worth',
  'dashboard.journey': 'Your journey',
  'dashboard.health': 'Health and progress',
  'dashboard.metrics': 'Key metrics',
  'dashboard.edit': 'Edit dashboard',
  'dashboard.editDone': 'Done',
  'dashboard.resetLayout': 'Reset to default',
  'dashboard.arrange': 'Arrange your dashboard',
  'dashboard.moveUpOf': 'Move {section} up',
  'dashboard.moveDownOf': 'Move {section} down',
  'dashboard.hideOf': 'Hide {section}',
  'dashboard.showOf': 'Show {section}',
  'dashboard.moveUp': 'Move up',
  'dashboard.moveDown': 'Move down',
  'dashboard.hide': 'Hide',
  'dashboard.show': 'Show',
  'netWorth.title': 'Net Worth',
  'netWorth.caption': 'Everything you own minus everything you owe',
  'netWorth.assets': 'Assets',
  'netWorth.liabilities': 'Liabilities',

  /* ── Screen headings ─────────────────────────────────────────────────── */
  'screen.income.subtitle':
    'Every rupee coming in, normalised to a monthly figure so the totals compare.',
  'screen.emi-credit.subtitle': 'What you owe, what it costs you, and what paying early would buy.',
  'screen.settings.subtitle': 'Your profile, how the app looks, and what happens to your data.',

  /* ── Income screen ───────────────────────────────────────────────────── */
  'income.monthlyTotal': 'Monthly total',
  'income.activeSources': 'Active sources',
  'income.annualised': 'Annualised',
  'income.sources': 'Sources',
  'income.add': 'Add income',
  'income.addTitle': 'Add an income source',
  'income.addDescription': 'Anything that pays you — salary, freelance work, rent, interest.',
  'income.save': 'Save income source',
  'income.emptyTitle': 'No income recorded',
  'income.emptyBody':
    'Add a salary or a side income and your savings rate, tax estimate and stage all start working.',
  'cadence.monthly': 'every month',
  'cadence.quarterly': 'every quarter',
  'cadence.annual': 'once a year',
  'cadence.irregular': 'irregular',
  'cadence.paused': ' · paused',

  /* ── EMI & Credit screen ─────────────────────────────────────────────── */
  'emi.monthlyEmi': 'Monthly EMI',
  'emi.shareOfIncome': 'Share of income',
  'emi.creditScore': 'Credit score',
  'emi.aboveMark': 'above the 20% mark',
  'emi.safeRange': 'within a safe range',
  'emi.loans': 'Loans',
  'emi.add': 'Add loan',
  'emi.addTitle': 'Add a loan or card',
  'emi.addDescription': 'Anything you owe. The EMI and rate drive the payoff and prepayment maths.',
  'emi.save': 'Save liability',
  'emi.emptyTitle': 'No loans recorded',
  'emi.emptyBody': 'Add a loan to see what it is really costing you over its remaining life.',
  'emi.monthsLeft': '{count} months left',
  'emi.interestToCome': 'interest to come',
  'emi.notClearing': 'Interest not clearing',
  'emi.prepayment': 'Prepayment calculator',
  'emi.prepaymentLead': 'If you paid a lump sum off {name} today:',
  'emi.lumpSum': 'Lump sum',
  'emi.interestSaved': 'Interest saved',
  'emi.monthsSaved': 'Months saved',
  'emi.noSaving': 'This EMI does not currently clear the loan, so a saving cannot be worked out.',
  'emi.creditHistory': 'Credit history',
  'emi.noScoreTitle': 'No score recorded',
  'emi.noScoreBody': 'Add your score when you check it, and the trend builds itself.',

  /* ── Settings ────────────────────────────────────────────────────────── */
  'settings.membership': 'Membership',
  'settings.allStages': 'All six stages open',
  'settings.twoStages': 'Stages one and two open',
  'settings.appearance': 'Appearance',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.theme.system': 'Match my device',
  'settings.language': 'Language',
  'settings.languageNote': 'The app switches over straight away. Your data is never translated.',
  'settings.yourData': 'Your data',
  'settings.storedLocally': 'Everything is stored on this device only. Nothing is sent anywhere.',
  'settings.deleteMyData': 'Delete my data',
  'settings.signOut': 'Sign out',
  'settings.confirmTitle': 'Delete my data?',
  'settings.confirmDescription': 'Every record on this device is deleted. This cannot be undone.',
  'settings.confirmBody':
    'Your income, spending, loans, holdings, goals and policies are all removed. The app keeps working — every screen falls back to its empty state.',
  'settings.keepMyData': 'Keep my data',
  'settings.deleteEverything': 'Delete everything',

  /* ── Record forms ────────────────────────────────────────────────────── */
  'field.name': 'Name',
  'field.type': 'Type',
  'field.amount': 'Amount',
  'field.howOften': 'How often',
  'field.currentValue': 'Current value',
  'field.nominee': 'Nominee',
  'field.originalAmount': 'Original amount',
  'field.stillOwed': 'Still owed',
  'field.interestRate': 'Interest rate',
  'field.monthlyEmi': 'Monthly EMI',
  'field.monthsLeft': 'Months left',
  'field.startedOn': 'Started on',
  'field.goal': 'Goal',
  'field.targetAmount': 'Target amount',
  'field.savedSoFar': 'Saved so far',
  'field.targetDate': 'Target date',
  'form.isNeeded': '{label} is needed.',
  'form.enterNumber': 'Enter a number.',
  'form.unreadableAmount': 'Not a recognisable amount. Try 15k, 1.5L or 15,000.',

  /* ── Empty and loading states ────────────────────────────────────────── */
  'state.loading': 'Loading…',
  'state.nothingYet': 'Nothing here yet',
} as const

export type TranslationKey = keyof typeof en

/**
 * The shape a translation file must have.
 *
 * `Partial<Record<…, string>>`, not `Partial<typeof en>` — `as const` above
 * narrows every English value to its own literal type, which would demand that
 * the Hindi for 'Income' be the string "Income". Keys are still checked exactly:
 * a typo in a key name is a compile error, which is the half that matters.
 */
export type Dictionary = Partial<Record<TranslationKey, string>>
