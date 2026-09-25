# What is paid, and how to switch it back on

Preview mode is **on**. Every screen below opens right now regardless of tier, so
the whole app can be walked through and checked without buying anything.

Nothing was deleted. The rules are intact and under test — this file is the
record of them.

---

## To restore the paywall before publishing

One line, in `src/config/preview.ts`:

```ts
export const PREVIEW_ALL = false
```

That is the whole change. It restores every lock, removes the "Preview mode"
banner, and re-enables the test that proves a Diamond screen locks for a Silver
user (it is skipped while previewing, and runs again automatically).

Then run the gate:

```
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

---

## The 5 paid screens

Everything here needs **Diamond**. On Silver they show the upgrade wall instead
of their contents — the header and the screen itself stay visible, so a locked
screen is never a blank page.

| Section | Screen | Route |
|---|---|---|
| Money | Tax Planning | `/app/tax` |
| Wealth | Investments | `/app/investments` |
| Wealth | Goals | `/app/goals` |
| Wealth | Insurance | `/app/insurance` |
| Tools | Family | `/app/family` |

## The 17 free screens

| Section | Screen | Route |
|---|---|---|
| Main | Dashboard | `/app/dashboard` |
| Money | Income | `/app/income` |
| Money | Income Opportunities | `/app/income-opportunities` |
| Money | Budget | `/app/budget` |
| Money | EMI & Credit | `/app/emi-credit` |
| Wealth | Assets | `/app/assets` |
| Growth | My Learning | `/app/learning` |
| Growth | Morning Club | `/app/morning-club` |
| Growth | Achievements | `/app/achievements` |
| Growth | Refer & Earn | `/app/referrals` |
| Tools | AI Assistant | `/app/assistant` |
| Tools | Documents | `/app/documents` |
| Tools | Expert Chat | `/app/expert-chat` |
| Tools | Settings | `/app/settings` |
| — | Onboarding | `/app/onboarding` |
| — | Upgrade | `/app/upgrade` |
| — | Profile | `/app/profile` |

---

## How a member gets Diamond (no payment provider yet)

1. They tap **Upgrade to Diamond** (Profile → Membership, or the Silver pill in
   the header) and send a request. It gets a reference like `WRC-D7K3P9Q`.
2. The request reaches the WRC team: automatically on WhatsApp once the n8n
   automation is running (`automation/README.md`), otherwise through the
   member's "Send on WhatsApp" button to the number in `src/config/contact.ts`.
3. The team calls them, agrees the plan and takes payment.
4. The team replies `PAID WRC-D7K3P9Q` on WhatsApp and n8n sends the code to the
   member's mobile (WhatsApp, or SMS if that fails). Without the automation, run
   `node scripts/diamond-code.mjs WRC-D7K3P9Q` and read them the code.
5. They type it into the Upgrade screen; Diamond opens.

A code only works for its own reference. The signing key is in
`src/config/activation.json`; changing it invalidates every code handed out.
This is an interim step: once `src/config/server.ts` points at a real server,
the server should decide the tier instead.

---

## Where the tiers come from

No screen decides its own tier. A module is paid because the journey stage that
unlocks it is a Diamond stage — one source, so the paywall can never drift from
the ladder the user was shown.

| Stage | Name | Tier | Unlocks |
|---|---|---|---|
| 1 | Financial Clarity | silver | income, budget, assets, emi-credit |
| 2 | Leak Detection | silver | income-opportunities |
| 3 | Stability Mode | **diamond** | insurance, goals |
| 4 | Optimisation | **diamond** | tax |
| 5 | Wealth Build Mode | **diamond** | investments |
| 6 | Legacy | **diamond** | family |

To move a screen between free and paid, change which stage unlocks it in
`src/domain/journey.ts`. Both the paywall and the journey rail follow.

> Stage names, taglines and the wealth bands are still provisional — the client
> owes those. The app badges them as provisional until they arrive.

---

## How the app keeps track while previewing

`useEntitlement(moduleId)` answers four things, and only the first is affected by
preview mode:

| Field | Meaning |
|---|---|
| `allowed` | Does it open right now? Always `true` while previewing. |
| `earned` | **Has this user actually paid for it?** Never affected by preview. |
| `previewing` | True when it is open *only* because preview is on. |
| `required` | `silver` or `diamond` |

So the app always knows which screens are unpaid, even while it is letting you
into them. That is what makes flipping the switch back a one-line change rather
than an archaeology project.
