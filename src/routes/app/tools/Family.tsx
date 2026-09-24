import { differenceInYears, parseISO } from 'date-fns'
import {
  Baby,
  Heart,
  HeartHandshake,
  type LucideIcon,
  Plus,
  User,
  UserRound,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'

import { AppButton } from '@/components/ui/AppButton'
import { RecordForm, type FieldSpec, type FieldValues } from '@/components/ui/RecordForm'
import { RecordList } from '@/components/ui/RecordList'
import { Sheet } from '@/components/ui/Sheet'
import { FamilyMember, type FamilyRelation } from '@/data/schema'
import { IsoDate, todayIso } from '@/data/schema/common'
import { useData, useSnapshot } from '@/data/store/data'
import { ModuleScreen, ModuleSection } from '../ModuleScreen'

const RELATION_LABEL: Record<FamilyRelation, string> = {
  spouse: 'Spouse',
  child: 'Child',
  parent: 'Parent',
  sibling: 'Brother or sister',
  other: 'Other',
}

const RELATION_ICON: Record<FamilyRelation, LucideIcon> = {
  spouse: Heart,
  child: Baby,
  parent: HeartHandshake,
  sibling: UserRound,
  other: User,
}

const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
] as const

const FIELDS: readonly FieldSpec[] = [
  { kind: 'text', name: 'name', label: 'field.name', placeholder: 'Priya Sharma' },
  {
    kind: 'select',
    name: 'relation',
    label: 'field.relation',
    options: (Object.keys(RELATION_LABEL) as FamilyRelation[]).map((value) => ({
      value,
      label: RELATION_LABEL[value],
    })),
  },
  {
    kind: 'date',
    name: 'dateOfBirth',
    label: 'field.dateOfBirth',
    hint: 'Optional.',
  },
  {
    kind: 'select',
    name: 'dependent',
    label: 'field.dependent',
    hint: 'Do they rely on your income?',
    options: YES_NO,
  },
  {
    kind: 'select',
    name: 'includeInHousehold',
    label: 'field.inHousehold',
    options: YES_NO,
  },
  {
    kind: 'text',
    name: 'notes',
    label: 'field.notes',
    hint: 'Optional — school, their own cover, and so on.',
  },
]

/*
 * The form speaks in strings ("yes", "", "2014-06-02") and the record in
 * booleans and nulls. The translation lives in the schema, so the form still
 * cannot hand the repository anything the record would refuse.
 */
const yesNo = z.enum(['yes', 'no']).transform((value) => value === 'yes')

const FamilyDraftForm = FamilyMember.omit({ id: true, createdAt: true, updatedAt: true }).extend({
  name: z.string().trim().min(1).max(60),
  dateOfBirth: z
    .string()
    .transform((value) => (value.trim() === '' ? null : value.trim()))
    .pipe(
      IsoDate.refine(
        (value) => value <= todayIso(),
        'A birthday cannot be in the future.',
      ).nullable(),
    ),
  dependent: yesNo,
  includeInHousehold: yesNo,
  notes: z.string().trim().max(200, 'Keep it under 200 characters.'),
})

function valuesOf(member: FamilyMember): FieldValues {
  return {
    name: member.name,
    relation: member.relation,
    dateOfBirth: member.dateOfBirth ?? '',
    dependent: member.dependent ? 'yes' : 'no',
    includeInHousehold: member.includeInHousehold ? 'yes' : 'no',
    notes: member.notes,
  }
}

/* A new member defaults to what most people add first: someone who depends on them. */
const NEW_MEMBER: FieldValues = { relation: 'spouse', dependent: 'yes', includeInHousehold: 'yes' }

function age(dateOfBirth: string | null): string | null {
  if (dateOfBirth === null) return null
  const years = differenceInYears(new Date(), parseISO(dateOfBirth))
  if (!Number.isFinite(years) || years < 0) return null
  return years === 0 ? 'under 1' : `${String(years)} yrs`
}

export function Family() {
  const snapshot = useSnapshot()
  const createRecord = useData((state) => state.create)
  const updateRecord = useData((state) => state.update)
  const removeRecord = useData((state) => state.remove)
  /* null: closed · 'new': adding · an id: editing that member. */
  const [editing, setEditing] = useState<string | null>(null)
  if (snapshot === null) return null

  const members = snapshot.family
  const dependents = members.filter((member) => member.dependent).length
  const inHousehold = members.filter((member) => member.includeInHousehold).length
  const current =
    editing === null || editing === 'new' ? undefined : members.find((m) => m.id === editing)

  const addButton = (
    <AppButton
      variant="primary"
      onClick={() => {
        setEditing('new')
      }}
    >
      <Plus aria-hidden className="size-4" />
      Add member
    </AppButton>
  )

  return (
    <ModuleScreen
      title="Family"
      subtitle="Who else this plan has to work for."
      icon={Users}
      moduleId="family"
      unlockLine="household planning"
      action={addButton}
      summary={
        members.length === 0 ? undefined : (
          <dl className="rounded-card border-border bg-surface divide-border grid grid-cols-3 divide-x border">
            <Figure label="Members" value={members.length} />
            <Figure label="Dependants" value={dependents} />
            <Figure label="In household" value={inHousehold} />
          </dl>
        )
      }
    >
      <ModuleSection label="Members">
        <RecordList
          rows={members.map((member) => {
            const years = age(member.dateOfBirth)
            return {
              id: member.id,
              icon: RELATION_ICON[member.relation],
              title: member.name,
              subtitle: [
                RELATION_LABEL[member.relation],
                years,
                member.dependent ? 'depends on you' : null,
              ]
                .filter((part) => part !== null)
                .join(' · '),
              /* Only the exception is worth a word; most members are counted. */
              meta: member.includeInHousehold ? undefined : 'Not in totals',
              deleteLabel: member.name,
            }
          })}
          onSelect={setEditing}
          onDelete={(id) => {
            void removeRecord('family', id)
          }}
          empty={{
            icon: Users,
            title: 'Nobody added',
            description:
              'Add the people who depend on this money, so the plan is built around them.',
            action: (
              <AppButton
                onClick={() => {
                  setEditing('new')
                }}
              >
                <Plus aria-hidden className="size-4" />
                Add a family member
              </AppButton>
            ),
          }}
        />
      </ModuleSection>

      <Sheet
        open={editing !== null && (editing === 'new' || current !== undefined)}
        onClose={() => {
          setEditing(null)
        }}
        title={current === undefined ? 'Add a family member' : `Edit ${current.name}`}
        description="Only on this phone. Add as much or as little as you like."
      >
        <RecordForm
          key={editing ?? 'closed'}
          fields={FIELDS}
          schema={FamilyDraftForm}
          initial={current === undefined ? NEW_MEMBER : valuesOf(current)}
          submitLabel={current === undefined ? 'Add to family' : 'Save changes'}
          onCancel={() => {
            setEditing(null)
          }}
          onSubmit={async (draft) => {
            const typed = draft as z.output<typeof FamilyDraftForm>
            if (current === undefined) {
              const created = await createRecord('family', typed)
              if (created !== null) setEditing(null)
            } else {
              await updateRecord('family', current.id, typed)
              setEditing(null)
            }
          }}
        />
      </Sheet>
    </ModuleScreen>
  )
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2 py-3 text-center">
      <dt className="text-caption text-text-2">{label}</dt>
      <dd className="text-lead text-text tabular font-semibold">{value}</dd>
    </div>
  )
}
