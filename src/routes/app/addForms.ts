import { z } from 'zod'

import type { FieldSpec } from '@/components/ui/RecordForm'
import { Asset, Goal, IncomeSource, Liability } from '@/data/schema'
import { todayIso } from '@/data/schema/common'

/**
 * What each Add form asks for.
 *
 * The schemas are the record schemas with `id`, `createdAt` and `updatedAt`
 * stripped — the repository assigns those. Deriving them with `.omit()` rather
 * than hand-writing a parallel shape means a change to a record schema reaches
 * the form automatically instead of drifting away from it.
 *
 * `constants` covers fields a record needs but nobody should be asked for on the
 * way in: a new income source is active, a new goal has the usual four
 * milestones. They stay editable later.
 */

export const IncomeDraft = IncomeSource.omit({ id: true, createdAt: true, updatedAt: true })
export const AssetDraft = Asset.omit({ id: true, createdAt: true, updatedAt: true })
export const LiabilityDraft = Liability.omit({ id: true, createdAt: true, updatedAt: true })
export const GoalDraft = Goal.omit({ id: true, createdAt: true, updatedAt: true })

export const INCOME_FIELDS: readonly FieldSpec[] = [
  { kind: 'text', name: 'name', label: 'field.name', placeholder: 'Salary — Acme Pvt Ltd' },
  {
    kind: 'select',
    name: 'kind',
    label: 'field.type',
    options: [
      { value: 'salary', label: 'Salary' },
      { value: 'freelance', label: 'Freelance' },
      { value: 'business', label: 'Business' },
      { value: 'rental', label: 'Rent received' },
      { value: 'interest', label: 'Interest' },
      { value: 'other', label: 'Other' },
    ],
  },
  { kind: 'money', name: 'amount', label: 'field.amount', hint: 'Per payment, before tax.' },
  {
    kind: 'select',
    name: 'cadence',
    label: 'field.howOften',
    hint: 'Everything is normalised to a monthly figure so totals compare.',
    options: [
      { value: 'monthly', label: 'Every month' },
      { value: 'quarterly', label: 'Every quarter' },
      { value: 'annual', label: 'Once a year' },
      { value: 'irregular', label: 'Irregular' },
    ],
  },
]

export const INCOME_CONSTANTS = { active: true }

export const ASSET_FIELDS: readonly FieldSpec[] = [
  { kind: 'text', name: 'name', label: 'field.name', placeholder: 'HDFC savings' },
  {
    kind: 'select',
    name: 'kind',
    label: 'field.type',
    hint: 'Cash, bank and fixed deposits count towards your emergency fund.',
    options: [
      { value: 'bank', label: 'Bank account' },
      { value: 'cash', label: 'Cash' },
      { value: 'fixed-deposit', label: 'Fixed deposit' },
      { value: 'gold', label: 'Gold' },
      { value: 'property', label: 'Property' },
      { value: 'vehicle', label: 'Vehicle' },
      { value: 'epf', label: 'EPF / PF' },
      { value: 'other', label: 'Other' },
    ],
  },
  { kind: 'money', name: 'value', label: 'field.currentValue' },
  {
    kind: 'text',
    name: 'nominee',
    label: 'field.nominee',
    hint: 'Optional. Needed at the Legacy stage.',
  },
]

export const LIABILITY_FIELDS: readonly FieldSpec[] = [
  { kind: 'text', name: 'name', label: 'field.name', placeholder: 'Home loan — SBI' },
  {
    kind: 'select',
    name: 'kind',
    label: 'field.type',
    options: [
      { value: 'home', label: 'Home loan' },
      { value: 'car', label: 'Car loan' },
      { value: 'personal', label: 'Personal loan' },
      { value: 'education', label: 'Education loan' },
      { value: 'credit-card', label: 'Credit card' },
      { value: 'other', label: 'Other' },
    ],
  },
  { kind: 'money', name: 'principal', label: 'field.originalAmount' },
  { kind: 'money', name: 'outstanding', label: 'field.stillOwed' },
  {
    kind: 'number',
    name: 'annualRate',
    label: 'field.interestRate',
    hint: '% per year, e.g. 8.65',
  },
  { kind: 'money', name: 'emi', label: 'field.monthlyEmi' },
  { kind: 'number', name: 'tenureRemaining', label: 'field.monthsLeft' },
  { kind: 'date', name: 'startedOn', label: 'field.startedOn' },
]

export const GOAL_FIELDS: readonly FieldSpec[] = [
  { kind: 'text', name: 'name', label: 'field.goal', placeholder: 'Emergency fund' },
  { kind: 'money', name: 'target', label: 'field.targetAmount' },
  {
    kind: 'money',
    name: 'saved',
    label: 'field.savedSoFar',
    hint: 'Enter 0 if you are starting now.',
  },
  { kind: 'date', name: 'targetDate', label: 'field.targetDate' },
]

export const GOAL_CONSTANTS = { milestones: [0.25, 0.5, 0.75, 1], active: true }

/** Today, for date fields that should default to now rather than empty. */
export const TODAY = todayIso()

/** Today plus `months`, as YYYY-MM-DD, for a date that should sit in the future. */
function isoInMonths(months: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() + months)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/*
 * Starting values for the date fields.
 *
 * A date input left empty is the one field a person cannot guess is required:
 * it shows no placeholder, reads as "nothing to do here", and then silently
 * blocks the save. Seeding it with a sensible date means the form saves on the
 * first press and the date is corrected only if it is wrong — which is the way
 * round it should be. The liability started in the past, so today is the nearest
 * safe guess; a goal is aimed at the future, so a year out is.
 */
export const LIABILITY_INITIAL = { startedOn: TODAY }
export const GOAL_INITIAL = { targetDate: isoInMonths(12) }

/* A nominee left blank is null, not an empty string — the schema says nullable. */
export const AssetDraftForm = AssetDraft.extend({
  nominee: z
    .string()
    .transform((value) => (value.trim() === '' ? null : value.trim()))
    .nullable(),
})
