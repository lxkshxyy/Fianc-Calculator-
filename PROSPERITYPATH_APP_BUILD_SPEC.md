# ProsperityPath — Full App Build Spec

**Read this file top to bottom before writing a single line of code.**

| | |
|---|---|
| **Model** | Fable 5.1 (keep it selected for the whole build — the detail level in this spec assumes it) |
| **Editor** | VS Code + Claude Code |
| **Target** | Installable PWA web app, mobile-first, dark theme |
| **Source of truth** | This file. If anything here conflicts with your own judgement, this file wins. |
| **Hard rule** | The app must never be left in a broken state. See §2. |

---

## 0. How to use this spec

1. Create a new empty folder and open it in VS Code.
2. Run Claude Code in that folder with the Fable 5.1 model selected.
3. Paste the short kickoff prompt (§14), which points Claude Code at this file.
4. Work through §11 **one phase at a time**. Do not let the agent skip ahead.
5. After every phase, the two gate commands in §2.3 must pass before moving on.

---

## 1. What we are building

ProsperityPath is a personal-finance and wealth-building product for salaried Indians aged 25–45. It already exists as a website. We are rebuilding it as a **detailed, installable web application** — same features, better UI, and a mobile experience that actually works.

**Why an app and not the site:** the current site has real mobile problems — broken scroll behaviour, nested scroll containers fighting each other, viewport-height bugs, tap targets that are too small, and a desktop sidebar that does not translate to a phone. The app fixes all of these (§10) and adds offline capability and home-screen install.

The product has two halves:

- **Public (logged out)** — marketing pages, a feature catalogue, a request centre with real lead-capture forms, auth, legal pages.
- **Private (logged in)** — the dashboard and roughly 20 finance modules, gated by membership tier.

**Branding:** use the client's own name, logo, colours and copy. Do not copy the reference site's logo files, testimonial text or marketing paragraphs verbatim — rewrite the copy and swap the assets. The layout patterns and information architecture in this spec are what we are reusing.

---

## 2. Non-negotiables — the app must not break

This is the most important section in the file. The previous build was fragile. Read it twice.

### 2.1 Rules

1. **TypeScript strict mode on.** `strict: true`, `noUncheckedIndexedAccess: true`. No `any`. No `@ts-ignore`. If a type is hard, model it properly. `tsc` flags neither of those two — explicit `any` is legal under `strict`, and `@ts-ignore` is by construction the thing that makes `tsc` pass — so **ESLint enforces them**: `@typescript-eslint/no-explicit-any` and `@typescript-eslint/ban-ts-comment` are set to `error`, not `warn`.
2. **Pin every dependency to an exact version.** No `^`, no `~`, no `latest`, no alpha/beta/canary/rc packages.
3. **No network calls in v1.** Every screen reads from a local data layer (§8). The app must run fully offline with the dev server off-network.
4. **Every route is lazy-loaded and wrapped** in `<ErrorBoundary>` + `<Suspense fallback={<RouteSkeleton />}>`. A crash in one module must never blank the whole app.
5. **One global error boundary** at the app root with a readable fallback: what happened, a "Reload" button, and a "Reset local data" button. Never a white screen.
6. **Validate everything read from storage with Zod.** On parse failure, log it, reset *that slice only* to its seeded default, and carry on. Never throw on boot.
7. **No unguarded maths.** Any division guards its denominator. Savings rate with zero income renders `—`, not `NaN` or `Infinity`. Any `.toFixed()` is called on a number you have already narrowed.
8. **Every list has an empty state.** Every async surface has a loading skeleton with a fixed height (prevents layout shift). Every failure has an inline retry.
9. **Read config only via `import.meta.env.VITE_*`, always with `??`.** Vite does not shim `process`, so `process.env.FOO ?? 'x'` throws a `ReferenceError` on `process` *before* the fallback ever runs. Only `VITE_`-prefixed variables are inlined — and anything so prefixed ships in the client bundle, so never put a secret behind one.
10. **Every interactive element is reachable by keyboard** and has a visible focus ring. `prefers-reduced-motion` is respected everywhere.
11. **Locked (tier-gated) content renders a lock state.** It never renders an empty page, and it never throws.
12. **Do not refactor a working phase while building the next one.** Finish, gate, then move.

### 2.2 Forbidden

- `dangerouslySetInnerHTML`
- `window.location.reload()` as error handling
- Deleting or rewriting files from a previously gated phase without saying so first
- Adding a dependency that is not listed in §3 without asking
- Committing code that does not typecheck

### 2.3 Phase gate — run all four, all must be clean

```bash
npx tsc --noEmit     # types
npm run lint         # the rules tsc cannot see (§2.1.1)
npm test             # "test": "vitest run --passWithNoTests"
npm run build        # production build
```

Two commands are not enough: `tsc` cannot see explicit `any` or `@ts-ignore`, which are the two loudest rules in §2.1. Lint is scaffolded in Phase 0 and run at every gate from Phase 0 onward, so an empty app passes identically.

Then start the dev server and confirm: the app loads, the dashboard renders, and the browser console has **zero errors**. Only then start the next phase.

---

## 3. Stack

Exact versions are set at scaffold time; pin whatever resolves on day one — with one standing exception.

**TypeScript is pinned to whatever `typescript-eslint` declares as its supported peer range, not to the newest release.** Lint is load-bearing for §2.1.1, so the linter's range wins over a newer compiler. Phase 0 pinned TypeScript **6.0.3** on this basis (`typescript-eslint@8.70.0` declares `typescript: ">=4.8.4 <6.1.0"`). Revisit only when typescript-eslint ships TS 7 support. Do not bump TypeScript past that range as a tidy-up — it silently disarms the gate.

**`baseUrl` is deliberately absent from `tsconfig.json`.** TS 6 deprecates it and offers `"ignoreDeprecations": "6.0"` as a silencer; `paths` resolves relative to the tsconfig without it, so the `@/*` alias works unchanged and nothing is suppressed. Do not add either back.

| Concern | Choice | Notes |
|---|---|---|
| Build | Vite + React 18 + TypeScript | |
| Routing | React Router (data router) | |
| Styling | Tailwind CSS | Tokens in §4, defined as CSS variables |
| Components | shadcn/ui | Copy in only the components used; no barrel imports |
| Icons | lucide-react | One icon set for the whole app |
| Motion | Framer Motion | Used sparingly — see §4.6 |
| Charts | Recharts | |
| State | Zustand | One store per domain slice. `persist` on the prefs/UI slice **only** — see §8.1 |
| Forms | React Hook Form + Zod | Same Zod schemas as the data layer |
| Dates | date-fns | |
| Storage | IndexedDB via Dexie, `localStorage` for prefs | |
| PWA | vite-plugin-pwa | Phase 9 |
| Tests | Vitest + Testing Library | Money maths and the parser only — see §12 |

**Not allowed without asking:** a backend, an auth provider, an analytics SDK, a UI kit other than shadcn, a second icon set, a CSS-in-JS library.

---

## 4. Design system

Clean, dense, dark, with a single gold accent. The accent is expensive — spend it only on primary actions, the current stage, progress fills, tier badges and the hero currency figure. Everything else is neutral.

### 4.1 Colour tokens

Define as CSS variables on `:root`, consume through Tailwind. Dark is the default and the design's home; light is supported but secondary.

```css
/* dark (default) */
--bg:            #0A0B0C;  /* app background */
--bg-elevated:   #101214;  /* sidebar, sticky bars */
--surface:       #14171A;  /* cards */
--surface-2:     #1A1E22;  /* nested tiles inside a card */
--border:        #22272C;  /* 1px hairline, all cards */
--border-strong: #2E353B;  /* hover / focus outline */

--text:          #F2F4F5;  /* primary */
--text-2:        #A3ACB2;  /* secondary, captions; also the focus outline */
--text-label:    #868F96;  /* section labels — 5.99:1 on --bg, 5.47:1 on --surface */
--text-3:        #6B757C;  /* DISABLED TEXT ONLY — 4.19:1, under AA, exempt only because disabled */

--gold:          #E8B448;  /* accent */
--gold-strong:   #F3C766;  /* hover */
--gold-dim:      #7A5E24;  /* accent borders at low emphasis */
--on-gold:       #0A0B0C;  /* text on gold fills */

--danger:        #F15050;  /* 4.79:1 on --surface-2 — #EF4444 was 4.45:1, under AA */
--warn:          #F59E0B;
--success:       #22C55E;
--info:          #60A5FA;
```

Light theme redefines the same variable names. Never hardcode a hex in a component.

**Semantic colour is separate from the accent.** Gold means "primary action / current / progress". Red/amber/green mean "financial health". Do not mix them.

### 4.2 Type

- One sans family throughout (Inter or the system stack). Tabular numerals **everywhere a rupee amount or percentage appears** — `font-variant-numeric: tabular-nums`.
- Scale: `11 / 12 / 13 / 14 / 16 / 20 / 24 / 34 / 44`.
- Page title 34px bold, tight tracking. The second word may take the gold accent (e.g. "Welcome back, **Champion**").
- **Section labels** — `KEY METRICS`, `YOUR JOURNEY`, `MONEY` — are 11px, uppercase, `letter-spacing: 0.1em`, `--text-label`. This is a signature of the design, so it ships on every screen; use it consistently. Never `--text-3` here — at 11px it fails AA on `--bg`, `--surface` and `--surface-2` alike.
- Hero currency figures are 34–44px, tabular, and coloured by sign: positive `--text`, negative `--danger`.

### 4.3 Shape and spacing

- Radii: cards `14px`, tiles `10px`, buttons `10px`, pills `999px`.
- Cards: `--surface` fill, `1px solid --border`, no drop shadow. Depth comes from the fill step, not shadow.
- Spacing scale `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40`. Card padding 20px desktop, 16px mobile.
- Grid gap 16px. Content max width 1440px.

**Not everything is a card.** Nested tiles inside a card (Assets / Liabilities under Net Worth) use `--surface-2` with no border. Only the outer card gets the hairline.

### 4.4 Core components to build first

`Card` · `SectionLabel` · `MetricTile` · `CurrencyText` · `ProgressRing` · `StatusDot` · `TierBadge` · `StageCard` · `LockedOverlay` · `EmptyState` · `Skeleton` · `Sheet` · `AppButton` · `NumberField`

### 4.5 Indian number formatting — one utility, no exceptions

This is the single most common source of bugs in this product. Build `src/lib/money.ts` in Phase 1 and route **every** rupee through it.

- Grouping is Indian: `₹15,70,000` — use `Intl.NumberFormat('en-IN')`, never the default locale.
- Compact form: `< 1,000` → `₹850`; `< 1,00,000` → `₹15,400`; `< 1,00,00,000` → `₹15.7 L`; above that → `₹1.57 Cr`. **One decimal on L, two on Cr**, trailing zeros dropped — `₹1.5 L` not `₹1.50 L`, `₹2 Cr` not `₹2.00 Cr`. The asymmetry is deliberate: one decimal on lakh is precision to ₹10,000, while one decimal on crore would be precision to ₹10 lakh — far too coarse for a net-worth headline. (This is equivalent to three significant figures everywhere below ₹100 Cr, which is outside this product's range.)
- **Round first, then pick the unit.** Bucketing on the raw value and rounding afterwards renders ₹99,97,000 as `₹100 L` (sub-crore bucket → 99.97 → 100.0 → `.0` dropped) and never promotes ₹999.96 to `₹1,000`. If the rounded value reaches the next unit, promote it: ₹99,97,000 → `₹1 Cr`. §12 names both as required test cases.
- `Math.round` alone is not enough at the boundary: 99.95 is stored as `99.9499999999999957…`, so a naive round gives `₹99.9 L` where the convention wants `₹1 Cr`. Round half-up with a `1e-9` epsilon.
- Negative values render as `-₹15.7 L` in `--danger`.
- Input parsing accepts `15k`, `15K`, `1.5l`, `1.5L`, `2cr`, `2 Cr`, `15,000`, `₹15000`.
- Write unit tests for this file. It is one of only two tested areas (§12).

### 4.6 Motion

Restrained. Three things move, nothing else:

1. Route transitions — 150ms opacity.
2. The journey rail — stage nodes fade and rise in sequence on first view only.
3. Progress rings and bars — animate from 0 to value once on mount, 400ms ease-out.

Cards do not float on hover; they shift their border to `--border-strong` **and** step their fill to `--surface-2`. The border alone is 1.45:1 against `--surface` — too weak to carry a state on its own.

**Focus is never a border swap.** Keyboard focus is a `2px solid var(--text-2)` outline at `2px` offset, on every interactive element. `--border-strong` is 1.45:1, against the 3:1 WCAG 1.4.11 asks of a focus indicator, and §4.3 bans shadow and lift — so the outline is the only signal available, and it has to be a real one.

All of it behind `prefers-reduced-motion`.

---

## 5. App shell and navigation

### 5.1 Desktop — left sidebar, 260px, fixed

Top: wordmark + theme toggle. Below: user card — avatar, display name, tier badge. Then grouped nav with the uppercase section labels:

```
MAIN     Dashboard
MONEY    Income · Income Opportunities · Budget · EMI & Credit · Tax Planning
WEALTH   Investments · Goals · Assets · Insurance
GROWTH   My Learning · Morning Club · Achievements · Refer & Earn
TOOLS    AI Assistant · Documents · Expert Chat · Request Centre · Family · Settings
```

Active item: gold text, gold left indicator bar, `--surface` fill, trailing chevron. The sidebar scrolls independently of the page and has its own `overscroll-behavior: contain`.

### 5.2 Mobile — bottom tab bar, not a sidebar

Five tabs: **Dashboard · Money · Wealth · Growth · More**. "More" opens a sheet containing the Tools group and Settings. The desktop sidebar is never rendered below `lg`.

- Tab bar height 56px + `env(safe-area-inset-bottom)`.
- Tap targets ≥ 44×44.
- The bar is fixed; the scroll container gets `padding-bottom` equal to the bar height so nothing hides behind it.

### 5.3 Header

Desktop: page title + subtitle left, actions right (`Edit Dashboard`, tier pill).
Mobile: compact sticky bar — page title, tier pill, overflow menu. Title collapses to 20px on scroll.

---

## 6. Route map

### Public

| Route | Screen |
|---|---|
| `/` | Landing — hero, how it works, tool grid, journey ladder, differentiators, pricing, testimonials, FAQ, CTA, footer |
| `/features` | Feature catalogue — category anchors, tier filter (All / Silver / Diamond), feature cards |
| `/request-centre` | Service index — four cards |
| `/request-centre/:service` | Multi-step request form (§9.3) |
| `/about` · `/contact` | Static |
| `/auth` (`?mode=signup`) | Sign in / create account, one route, two modes |
| `/forgot-password` | Reset request |
| `/legal/:doc` | Privacy · Terms · Refund & Cancellation · Disclaimer · Shipping |
| `*` | 404 |

### Private — all under `/app`, behind a route guard

`dashboard` · `income` · `income-opportunities` · `budget` · `emi-credit` · `tax` · `investments` · `goals` · `assets` · `insurance` · `learning` · `morning-club` · `achievements` · `referrals` · `assistant` · `documents` · `expert-chat` · `family` · `settings` · `onboarding` · `upgrade`

Guard behaviour: unauthenticated → redirect to `/auth` with a `redirectTo` param. Never render a private screen in a half-authenticated state.

---

## 7. The journey model — fix the inconsistency first

The reference product ships **two different ladders**, which is a bug to resolve, not to copy:

- Marketing site: 6 levels — Visionary, Pioneer, Achiever, Progressive, Prosperous, Abundance.
- Logged-in dashboard: 5 stages — Financial Clarity, Leak Detection, Stability Mode, Optimisation 💎, Wealth Build Mode 💎.

**Decision: use one canonical ladder of six stages, used identically on the marketing page and in the app.** Define it once in `src/domain/journey.ts` and import everywhere. No screen may hardcode a stage name.

```ts
type Stage = {
  id: string
  index: number              // 1..6
  name: string
  tagline: string            // "Know where you stand"
  wealthBand: string         // "₹1L–₹3L Foundation"
  icon: LucideIcon
  tier: 'silver' | 'diamond' // diamond stages show the badge and lock
  checklist: StageTask[]     // completion drives stage progress %
  unlocks: string[]          // module ids
}
```

Stage card states: **locked** (dimmed + lock glyph + tier badge), **available**, **current** (gold border, `CURRENT` tab badge on the top edge), **complete** (check, muted gold).

Locked is conveyed by glyph *and* label — never by opacity alone.

**Supply these before Phase 4** — the build cannot invent them, and every stage screen depends on them: the six stage names, each one's tagline and wealth band, which of them are Diamond, and the `StageTask` checklist per stage. `Profile.stageId` is assigned from the checklist, not from net worth: a user's stage is the highest one whose tasks are all complete. Tasks are recorded per user, so §8.2 needs a `StageTaskCompletion` entity — without it §9.1's Stage % ring has nothing to read.

---

## 8. Data layer

### 8.1 Shape

```
src/data/
  schema/        Zod schemas — one file per entity
  repo/          Repository interface + LocalRepository (Dexie)
  seed/          Seeded demo dataset
  store/         Zustand slices, each backed by the repo
```

Screens talk **only** to Zustand selectors. Zustand talks **only** to the repository interface. No component imports Dexie. When a real backend arrives later, only `repo/` changes.

**Dexie is the only store of record.** Do not put `persist` on a domain slice. It writes a second copy to localStorage and rehydrates *synchronously* while Dexie resolves async, so every cold boot paints stale data and then flips. Worse, §8.3's **Clear everything** would wipe Dexie and leave the localStorage copy intact, resurrecting deleted records on the next reload — and §2.1.12 forbids refactoring Phase 3 by the time §12 catches it at Phase 11. `persist` goes on the prefs/UI slice only (theme, language, dashboard layout). Domain slices hydrate from `repo/` on boot; §11 Phase 3's "reload preserves state" is already satisfied by Dexie alone.

### 8.2 Entities

`User` · `Profile` (tier, stageId, streak, language) · `IncomeSource` · `Transaction` · `Category` · `Budget` · `Liability` (EMI: principal, rate, tenure, EMI, remaining) · `CreditScore` · `Asset` · `Investment` (type, units, NAV/price, invested, current) · `Goal` (target, saved, deadline, milestones) · `InsurancePolicy` (type, cover, premium, renewal) · `TaxProfile` (regime, 80C/80D entries) · `LearningModule` · `Achievement` · `Referral` · `DocumentRecord` · `RequestTicket` · `Notification`

Every entity: `id`, `createdAt`, `updatedAt`, and a Zod schema exported alongside the type.

### 8.3 Seeded demo data

On first run, seed a realistic Indian household so **no screen is ever empty on a fresh install**: monthly income ₹85,000; 6 categories of spend; a ₹15.7 L home loan and a ₹2.4 L car loan; 3 SIPs; 2 goals; 1 term policy; CIBIL 742. Mark it clearly as demo data, and put a **Reset to demo data** and a **Clear everything** control in Settings.

### 8.4 Derived metrics — computed, never stored

```
netWorth      = Σ assets − Σ liabilities
savingsRate   = income > 0 ? (income − expenses) / income : null   // null renders "—"
debtToIncome  = income > 0 ? emiTotal / income : null
emergencyFund = liquidAssets / avgMonthlyExpense                    // in months
```

**Health score, 0–100**, weighted: emergency fund 25 · savings rate 25 · debt-to-income 20 · insurance adequacy 15 · investment diversification 15.
Bands: `0–39` Needs Work (`--danger`) · `40–69` Getting There (`--warn`) · `70–84` Strong (`--success`) · `85–100` Excellent (`--success`, distinguished by a filled dot and a check, not by hue). Excellent is **not** gold — §4.1 keeps semantic colour separate from the accent, and the accent is reserved for actions and progress.
Each band shows a one-line next action — "Focus on fundamentals first".

---

## 9. Screen specs

### 9.1 Dashboard — build this one first and get it right

Top to bottom:

1. **Header** — "Welcome back, {firstName}" with the name in gold; subtitle "Here's your performance overview". Right: `Edit Dashboard` (outline button, pencil icon) and the tier pill.
2. **Quick-add bar** — full-width input, sparkle icon, placeholder `Type anything… e.g. 'paid 15k rent' or 'invested 10k in mutual funds'`, gold `Add` button. Behaviour in §9.2.
3. **Net Worth card** — wallet icon, `Details →` link. Centred figure, large, tabular, red when negative. Caption "Everything you own – everything you owe". Two `--surface-2` tiles below: Assets, Liabilities.
4. **`YOUR JOURNEY`** — horizontal rail of stage cards. Desktop: all six visible. Mobile: horizontal scroll with `scroll-snap-type: x mandatory`, snap-centre on the current stage at mount, and a visible scroll affordance. This rail is the only horizontally scrolling element in the app.
5. **Two-column row** — `FINANCIAL HEALTH` (status dot, band name, one-line action) and `PROGRESS` (two progress rings: Goals %, Stage %). Stacks on mobile.
6. **`KEY METRICS`** — four tiles: Monthly Income, Active Goals, Savings Rate, Health Score. Each: label, icon top-right, value, and a small delta or sparkline. Grid `4 / 2 / 1` at desktop / tablet / mobile.

**Edit Dashboard** toggles a reorder mode: drag to reorder sections, toggle visibility, reset to default. Persisted per user. Read-only mode is the default; entering edit mode must never lose data.

### 9.2 Natural-language quick add

Deterministic and rule-based. **No LLM call in v1** — it must work offline and must never hang.

- Parse an amount (`15k`, `1.5L`, `₹15,000`), an intent verb (`paid`/`spent`/`bought` → expense; `received`/`got`/`salary` → income; `invested`/`sip` → investment), and a keyword → category match from a lookup table.
- Always show a **confirm sheet** with the parsed fields editable before writing. Never write straight from the input.
- On a failed parse, open the sheet pre-filled with whatever was understood and focus the first empty field. Never show an error toast and discard the text.

### 9.3 Request Centre forms

Four services: Insurance Review · Unlisted Shares · MSI Review · Pre-IPO Opportunities. Available **without login**.

The Insurance Review form is the reference implementation — seven steps:

1. Contact — Full Name\*, Email\*, WhatsApp Number\* (+91 prefix), City
2. What do you need help with? — 10 checkboxes (New Term, Additional Term, Health, Family Health, Critical Illness, Accident, Existing Policy Review, Premium Reduction, Claim Support, Other)
3. Existing cover — Term: Yes / No / Not Sure · Health: Yes / No / Family Floater / Individual / Not Sure
4. Reason — 10 options including life events (income increased, married, child, bought a home)
5. Preferred contact — method (WhatsApp / Phone / Email) and time (Morning / Afternoon / Evening)
6. Additional comments — textarea
7. Optional documents — four typed slots; PDF or image; max 8 files, 10MB each, 18MB total

Requirements: step state survives a refresh (draft persisted); validation is per-step, not only on submit; file-size limits are enforced client-side with a clear message; submit writes a `RequestTicket` locally and shows a confirmation screen with a reference number.

**Consent is part of step 1, not an afterthought.** These forms take a name, email, phone number and uploaded insurance documents from a visitor who has not signed in and has no account to manage them from. Step 1 carries an unticked consent checkbox, a one-line purpose-and-retention notice, and a link to the Privacy page from §6. The draft is persisted, so there is also a **Discard draft** control that clears it without an account — Settings' data controls sit behind the auth guard and are unreachable here.

### 9.4 Module screens — shared pattern

Every module screen follows the same skeleton, which is why they are quick to build once the first is right:

**Header** (title, subtitle, primary action) → **summary row** (2–4 metric tiles) → **primary visual** (chart or ring) → **list or table** (with empty state) → **detail sheet** on row tap.

Module specifics:

- **Income** — sources with active/inactive status, monthly trend, category split.
- **Income Opportunities** — curated side-income ideas; effort/return tags; some Diamond-gated.
- **Budget** — 12 categories, set limits, spent-vs-limit bars, overspend alerts, recurring detection.
- **EMI & Credit** — loan list with EMI, remaining tenure, interest paid to date; a prepayment calculator showing interest saved; CIBIL gauge with history.
- **Tax Planning** — old vs new regime side-by-side comparison, 80C/80D tracker with headroom remaining, estimated liability. Slabs, rates, standard deduction, rebate and cess live in a **dated config file stamped with its assessment year**, surfaced in the UI as a visible "rates as of" line. Do not write these numbers from memory — they change at every Budget, this is a financial product, and a wrong slab is a wrong answer shown to a real person with confidence. They come from the client or an official source. The 80C/80D tracker renders only when the old regime is selected.
- **Investments** — portfolio value, XIRR, allocation donut, holdings table, fee/expense-ratio flags.
- **Goals** — goal cards with progress ring, target date, monthly contribution needed, milestone chips.
- **Assets** — asset register by type, feeding net worth.
- **Insurance** — policy list, renewal calendar, cover-gap analysis against an income multiple.
- **My Learning** — modules mapped to stages, progress bars, video player placeholder.
- **Morning Club** — daily check-in, streak counter, affirmation, leaderboard.
- **Achievements** — badge grid, earned vs locked, progress toward next.
- **Refer & Earn** — referral link, copy button, referral list, rewards earned.
- **AI Assistant** — chat UI shell with canned deterministic responses in v1. Wire to a model later behind a feature flag, never on by default.
- **Documents** — upload, tag, AI-parse placeholder, search.
- **Expert Chat** — thread list, chat view, booking; Diamond-gated.
- **Family** — member list, per-member view, shared goals.
- **Settings** — profile, language (Hindi / English), theme, notifications, data controls (§8.3), membership.

### 9.5 Tier gating

`silver` sees stages 1–2 and the education modules. `diamond` sees everything. A gated surface renders `LockedOverlay`: blurred preview behind, lock glyph, one line naming **the specific thing being unlocked** (not the whole plan feature list), and an `Upgrade` button opening `/app/upgrade`. Gating is enforced in one `useEntitlement(moduleId)` hook — never scattered through components.

---

## 10. Mobile fixes — the reason this app exists

Implement all of these. Each one maps to a defect in the current site.

1. **One scroll owner.** The document scrolls. No `overflow-y: auto` on a wrapper containing another scrollable wrapper. The only exceptions are the sidebar (desktop) and the journey rail (horizontal).
2. **`100dvh`, never `100vh`.** Mobile browser chrome changes viewport height; `100vh` causes the cut-off-content bug.
3. **Safe-area insets** on the fixed header and the bottom tab bar via `env(safe-area-inset-*)`. These resolve to `0px` unless the viewport meta tag carries `viewport-fit=cover`, which Vite's scaffold does not ship — add it in Phase 0 or this item silently no-ops and the tab bar sits under the home indicator. §12's 360×640 desktop check cannot catch this; verify on a real device or a notched emulator.
4. **`overscroll-behavior: contain`** on sheets, modals and the sidebar so a scroll at the end does not drag the page behind it.
5. **Body scroll lock when a sheet is open**, restoring the exact scroll position on close.
6. **No horizontal page scroll, ever.** Tables, wide charts and the journey rail each scroll inside their own container. Add a dev-mode check that warns when `document.body.scrollWidth > clientWidth`.
7. **Fixed-height skeletons** so content loading does not shift the page under the user's thumb.
8. **Tap targets ≥ 44×44** with at least 8px between adjacent targets.
9. **`inputMode="decimal"`** on every amount field so the numeric keypad opens; `autocomplete` set correctly on auth and contact fields.
10. **Sticky header collapses** on scroll rather than eating a third of a small screen.
11. **Charts are responsive by container**, not by window width, and re-measure on resize and orientation change.
12. **Test at 360×640.** If it works there, it works.

---

## 11. Build order — one phase at a time, gate after each

Run the §2.3 gate after every phase. Do not start a phase before the previous one is green.

| # | Phase | Done when |
|---|---|---|
| 0 | Scaffold — Vite + TS strict, Tailwind, ESLint with the §2.1.1 rules as errors, Prettier, Vitest, `lint` and `test` scripts, `viewport-fit=cover` on the viewport meta tag, folder structure, pinned deps | All four §2.3 gate commands pass on an empty app, and `npm run dev` shows a styled placeholder |
| 1 | Design system — tokens, `money.ts` + its tests, the §4.4 components in a kitchen sink | Kitchen sink renders every component in light, dark **and** the un-stamped system state. It renders from `App.tsx` in this phase — routing is Phase 2, and wiring a router here would pre-empt it; Phase 2 moves it to `/dev/kitchen-sink` |
| 2 | App shell — routing, guard, sidebar, bottom tabs, header, error boundary, 404 | Every route in §6 resolves to a stub without a console error |
| 3 | Data layer — schemas, repository, Dexie, Zustand slices, seed data, reset controls | Seed loads on first run; reset works; reload preserves state |
| 4 | Dashboard — all six blocks, real seeded numbers, quick-add with confirm sheet | Matches §9.1 at 1440px and 360px |
| 5 | Money — Income, Income Opportunities, Budget, EMI & Credit, Tax | Each screen follows the §9.4 pattern with empty states |
| 6 | Wealth — Investments, Goals, Assets, Insurance | Net worth on the dashboard updates from these |
| 7 | Growth — Learning, Morning Club, Achievements, Referrals | Streak and badge logic works across a date change |
| 8 | Tools — Assistant, Documents, Expert Chat, Family, Settings | Tier gating verified on Silver and Diamond |
| 9 | Public site — landing, features, request centre + forms, auth, legal, 404 | Forms validate per step and survive refresh |
| 10 | PWA + mobile pass — manifest, icons, service worker, offline shell, every §10 item | Installs on Android; works offline; 360px clean |
| 11 | QA pass — §12 | All checks pass |

---

## 12. Definition of done

- `npx tsc --noEmit` clean. `npm run build` clean. Zero console errors on every route.
- Unit tests pass for the two areas that carry real risk: **`money.ts`** (formatting, parsing, L/Cr boundaries, negatives, zero) and **the quick-add parser** (each verb class, each amount form, the unparseable case).
- Manual pass at **360×640**, **768×1024** and **1440×900**: no horizontal scroll, nothing hidden behind the tab bar, no `100vh` cut-off.
- Fresh install → seed data visible on every screen. `Clear everything` → every screen shows a usable empty state, no crash.
- Silver account: gated modules show the lock state, never a blank or an error.
- Keyboard: tab through the dashboard and open a sheet without touching the mouse.
- Every rupee figure on screen uses `money.ts`. Search the codebase for `₹` and for `toLocaleString` — the only hits should be inside `money.ts`.
- Theme toggle works on every route without a flash of the wrong theme.

---

## 13. What not to do

- Do not build a backend, auth server or database in v1.
- Do not call an LLM from the app. The AI Assistant is a deterministic shell.
- Do not add a second icon set, a second UI kit or a second charting library.
- Do not hardcode a rupee string, a stage name or a tier name in a component.
- Do not use opacity alone to signal a locked state.
- Do not leave a phase half-finished to start the next.
- Do not rewrite an earlier phase's files without saying what and why first.
- Do not copy the reference site's logo, testimonial text or marketing copy verbatim.

---

## 14. Kickoff prompt

Paste this into Claude Code in the new empty folder, with Fable 5.1 selected:

> Read `PROSPERITYPATH_APP_BUILD_SPEC.md` in this folder from top to bottom before writing any code. Extract from it: the non-negotiable stability rules (§2), the exact stack and pinned versions (§3), the full design token set and the Indian currency formatting rules (§4), the navigation model for desktop and mobile (§5), the complete route map (§6), the canonical six-stage journey model (§7), the data layer and derived-metric formulas (§8), every screen spec (§9), all twelve mobile fixes (§10), and the phased build order (§11).
>
> Then restate the plan back to me as a numbered phase list with a one-line deliverable per phase, and tell me which decisions in the spec you think are wrong before we start. Do not write any code until I reply "go".
>
> Once I say go, build **Phase 0 only**, then stop and run `npx tsc --noEmit` and `npm run build`. Report both results and wait for me before starting Phase 1. Repeat that gate after every phase. The design must be clean, dense and highly detailed — treat §4 as binding, not as a suggestion. Never leave the app in a state where `npm run dev` fails.

---

*Spec version 1 · written for a Vite + React + TypeScript PWA build in VS Code with Claude Code (Fable 5.1).*
