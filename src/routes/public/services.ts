import { PiggyBank, Shield, TrendingUp, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { RequestService } from '@/data/schema'

/**
 * The Request Centre's four services. Insurance Review has its own seven-step
 * form (§9.3's reference implementation); the other three share one shorter
 * form, driven by the questions listed here.
 */

export type ServiceQuestion = {
  id: string
  label: string
  kind: 'single' | 'multi' | 'text'
  options?: string[]
  /** Shown under the label. */
  hint?: string
  required: boolean
}

export type ServiceInfo = {
  slug: Exclude<RequestService, 'diamond-upgrade'>
  title: string
  line: string
  icon: LucideIcon
  /** The first letters of the reference a request is given, e.g. UL-12345678. */
  prefix: string
  questions: ServiceQuestion[]
}

export const SERVICES: ServiceInfo[] = [
  {
    slug: 'insurance-review',
    title: 'Insurance Review',
    line: 'An expert look at your term and health cover — new cover, top-ups, or a lower premium.',
    icon: Shield,
    prefix: 'IR',
    questions: [],
  },
  {
    slug: 'unlisted-shares',
    title: 'Unlisted Shares',
    line: 'Buy, sell, or get a valuation on unlisted and pre-IPO equity.',
    icon: TrendingUp,
    prefix: 'UL',
    questions: [
      {
        id: 'intent',
        label: 'What would you like to do?',
        kind: 'single',
        options: ['Buy shares', 'Sell shares I hold', 'Get a valuation', 'Just exploring'],
        required: true,
      },
      {
        id: 'companies',
        label: 'Which companies?',
        kind: 'text',
        hint: 'Names you have in mind, or leave blank if you would like suggestions.',
        required: false,
      },
      {
        id: 'amount',
        label: 'Roughly how much?',
        kind: 'single',
        options: ['Under ₹1 lakh', '₹1–5 lakh', '₹5–25 lakh', 'Above ₹25 lakh', 'Not sure yet'],
        required: true,
      },
    ],
  },
  {
    slug: 'msi-review',
    title: 'Multiple Income Review',
    line: 'Talk through second-income options that fit the time you actually have.',
    icon: Wallet,
    prefix: 'MI',
    questions: [
      {
        id: 'work',
        label: 'What do you do now?',
        kind: 'single',
        options: ['Salaried', 'Self-employed', 'Business owner', 'Student', 'Homemaker', 'Retired'],
        required: true,
      },
      {
        id: 'hours',
        label: 'Hours a week you could give it',
        kind: 'single',
        options: ['Under 5', '5–10', '10–20', 'More than 20'],
        required: true,
      },
      {
        id: 'interests',
        label: 'What interests you?',
        kind: 'multi',
        hint: 'Pick any that apply.',
        options: [
          'Freelancing',
          'Teaching or tutoring',
          'Rental income',
          'Content creation',
          'A small business',
          'Investing for income',
          'Something else',
        ],
        required: true,
      },
      {
        id: 'target',
        label: 'Extra income you are aiming for, each month',
        kind: 'single',
        options: ['Up to ₹10,000', '₹10,000–25,000', '₹25,000–50,000', 'More than ₹50,000'],
        required: false,
      },
    ],
  },
  {
    slug: 'pre-ipo',
    title: 'Pre-IPO Opportunities',
    line: 'Explore pre-IPO allocations with guidance from the team.',
    icon: PiggyBank,
    prefix: 'PI',
    questions: [
      {
        id: 'amount',
        label: 'How much are you looking to invest?',
        kind: 'single',
        options: ['Under ₹1 lakh', '₹1–5 lakh', '₹5–25 lakh', 'Above ₹25 lakh'],
        required: true,
      },
      {
        id: 'horizon',
        label: 'How long can the money stay invested?',
        kind: 'single',
        options: ['1–2 years', '3–5 years', 'More than 5 years'],
        required: true,
      },
      {
        id: 'experience',
        label: 'Have you invested in unlisted or pre-IPO shares before?',
        kind: 'single',
        options: ['No, this would be my first', 'Once or twice', 'Yes, regularly'],
        required: true,
      },
    ],
  },
]

export function serviceBySlug(slug: string | undefined): ServiceInfo | undefined {
  return SERVICES.find((service) => service.slug === slug)
}
