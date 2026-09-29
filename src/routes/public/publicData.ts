import { NAV_GROUPS } from '@/app/nav/navigation'
import { formatCompact } from '@/lib/money'

/**
 * The words and figures behind the public pages' shared pieces
 * (publicContent.tsx). Kept apart from the components so the dev server can
 * hot-reload those without a full refresh.
 */

export function bandLabel(from: number | null, to: number | null): string {
  if (from === null && to === null) return 'Any balance'
  if (from === null) return `Up to ${formatCompact(to)}`
  if (to === null) return `${formatCompact(from)} and beyond`
  return `${formatCompact(from)} – ${formatCompact(to)}`
}

/** A module's name as the app's own menu spells it. */
export function moduleLabel(path: string): string {
  for (const group of NAV_GROUPS) {
    const item = group.items.find((candidate) => candidate.path === path)
    if (item !== undefined) return item.label
  }
  return path
}

export const PRICE_NOTE = 'Pricing is set by the advisory team and is not published here yet.'

export type Faq = { q: string; a: string }

export const FAQ_GROUPS: { id: string; heading: string; items: Faq[] }[] = [
  {
    id: 'start',
    heading: 'Getting started',
    items: [
      {
        q: 'Is it free to start?',
        a: 'Yes. Silver is free and stays free — it covers the first two stages and the tracking tools. Diamond opens the rest.',
      },
      {
        q: 'What do I need to begin?',
        a: 'A name, an email address and a password. Six short questions then place you on the first stage — about ten minutes in all.',
      },
      {
        q: 'Can I look around before signing up?',
        a: 'Yes. "Explore the demo" opens a sample household with every screen filled in. It runs exactly like the real thing, in your own browser.',
      },
      {
        q: 'Does it work on my phone and my laptop?',
        a: 'Yes. It is an Android app, and the same app runs in any up-to-date browser on a laptop, a desktop or a phone.',
      },
    ],
  },
  {
    id: 'data',
    heading: 'Your data',
    items: [
      {
        q: 'Where is my data kept?',
        a: 'On your own device, in your browser or the app. Nothing is sent to a server, which is also why it keeps working with no connection.',
      },
      {
        q: 'Does it work offline?',
        a: 'Yes. Your figures are on your device, so everything works without a connection except sending a request to the team.',
      },
      {
        q: 'I forgot my password. Can it be reset?',
        a: 'Not from a server — there is not one holding a copy. Your password locks the device you signed up on. If it is lost, you can start over on that device, which clears what was stored there.',
      },
      {
        q: 'What happens to my data if I stop using it?',
        a: 'It stays on your device until you clear it, which you can do from Settings at any time.',
      },
    ],
  },
  {
    id: 'membership',
    heading: 'Membership',
    items: [
      {
        q: 'What is the difference between Silver and Diamond?',
        a: 'Silver opens the first two stages and the everyday tracking tools. Diamond opens all six stages and the planning tools that go with them — Goals, Insurance, Tax planning, Investments and Family.',
      },
      {
        q: 'How do I move to Diamond?',
        a: 'Send an upgrade request from the app. The team confirms it with you on WhatsApp and sends an activation code to your registered mobile number, and Diamond opens as soon as you enter it.',
      },
      {
        q: 'How much does Diamond cost?',
        a: PRICE_NOTE,
      },
    ],
  },
  {
    id: 'advice',
    heading: 'Advice and support',
    items: [
      {
        q: 'Is this financial advice?',
        a: 'No. It organises your own numbers and explains common rules of thumb. What is right for you depends on your situation — talk to a licensed advisor before acting.',
      },
      {
        q: 'Can I talk to a real person?',
        a: 'Yes. Anyone can send a request through the Request Centre, no account needed, and the team replies within one working day. You can also reach the team from the Contact page.',
      },
      {
        q: 'Can I use it in Hindi?',
        a: 'Yes. Switch the language in Settings and the app changes to Hindi. A few longer texts are still being translated.',
      },
    ],
  },
]

export const ALL_FAQS: Faq[] = FAQ_GROUPS.flatMap((group) => group.items)
