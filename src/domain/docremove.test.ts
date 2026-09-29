import { describe, expect, it } from 'vitest'

import { emptySnapshot } from '@/data/seed/demo'
import type { DocumentRecord, ImportedRecord } from '@/data/schema'
import { describeRemoval, planRemoval, planSweep, type RemovalContext } from './docremove'

function document(id: string, createdAt: number, imported: ImportedRecord[]): DocumentRecord {
  return {
    id,
    createdAt,
    updatedAt: createdAt,
    name: id,
    kind: 'insurance-policy',
    sizeBytes: 1,
    uploadedOn: '2026-09-29',
    tags: [],
    mimeType: 'application/pdf',
    fileId: null,
    scan: null,
    delivery: 'local',
    imported,
  }
}

function context(documents: DocumentRecord[]): RemovalContext {
  const base = emptySnapshot()
  base.documents = documents
  base.policies = [
    {
      id: 'pol_1',
      createdAt: 1,
      updatedAt: 1,
      name: 'Demo Life term cover',
      kind: 'term',
      insurer: 'Demo Life',
      cover: 5_000_000,
      annualPremium: 14_200,
      renewsOn: '2027-03-15',
    },
  ]
  base.incomeSources = [
    {
      id: 'inc_1',
      createdAt: 1,
      updatedAt: 1,
      name: 'Salary',
      kind: 'salary',
      amount: 105_000,
      cadence: 'monthly',
      active: true,
    },
  ]
  base.taxProfile = { ...base.taxProfile, annualGrossIncome: 1_260_000 }
  return base
}

const createdPolicy: ImportedRecord = {
  target: 'policies',
  id: 'pol_1',
  created: true,
  wrote: {},
  before: null,
}
const changedSalary: ImportedRecord = {
  target: 'incomeSources',
  id: 'inc_1',
  created: false,
  wrote: { amount: 105_000, cadence: 'monthly', active: true },
  before: { amount: 85_000, cadence: 'monthly', active: true },
}

describe('deleting a document', () => {
  it('removes what it created and puts back what it changed', () => {
    const plan = planRemoval(
      'doc_a',
      context([document('doc_a', 1, [createdPolicy, changedSalary])]),
    )
    expect(plan.steps).toEqual([
      { op: 'remove', collection: 'policies', id: 'pol_1' },
      {
        op: 'restore',
        collection: 'incomeSources',
        id: 'inc_1',
        patch: { amount: 85_000, cadence: 'monthly', active: true },
      },
    ])
    expect(describeRemoval(plan)).toBe(
      'Also removes 1 policy from Insurance, and undoes its changes to 1 income source on Income.',
    )
  })

  it('leaves a changed record alone once it has been edited since', () => {
    const edited = context([document('doc_a', 1, [changedSalary])])
    edited.incomeSources = edited.incomeSources.map((source) => ({ ...source, amount: 110_000 }))
    expect(planRemoval('doc_a', edited).steps).toEqual([])
  })

  it('keeps a record another document also brought in, and hands it over', () => {
    const later: ImportedRecord = { ...createdPolicy, created: false, wrote: { cover: 5_000_000 } }
    const plan = planRemoval(
      'doc_a',
      context([document('doc_a', 1, [createdPolicy]), document('doc_b', 2, [later])]),
    )
    expect(plan.steps).toEqual([
      { op: 'hand-over', documentId: 'doc_b', index: 0, collection: 'policies', id: 'pol_1' },
    ])
    expect(describeRemoval(plan)).toBeNull()
  })

  it('leaves a change alone while another document still vouches for it', () => {
    const plan = planRemoval(
      'doc_a',
      context([document('doc_a', 1, [changedSalary]), document('doc_b', 2, [changedSalary])]),
    )
    expect(plan.steps).toEqual([])
  })

  it('puts the yearly income for tax back', () => {
    const tax: ImportedRecord = {
      target: 'taxProfile',
      id: 'taxProfile',
      created: false,
      wrote: { annualGrossIncome: 1_260_000 },
      before: { annualGrossIncome: 1_020_000 },
    }
    const plan = planRemoval('doc_a', context([document('doc_a', 1, [tax])]))
    expect(plan.steps).toEqual([
      { op: 'restore-tax-profile', patch: { annualGrossIncome: 1_020_000 } },
    ])
  })

  it('skips what is already gone, and says nothing for a document that added nothing', () => {
    const gone: ImportedRecord = { ...createdPolicy, id: 'pol_deleted_by_hand' }
    expect(planRemoval('doc_a', context([document('doc_a', 1, [gone])])).steps).toEqual([])
    const plan = planRemoval('doc_a', context([document('doc_a', 1, [])]))
    expect(describeRemoval(plan)).toBeNull()
  })

  it('counts a whole statement in one line', () => {
    const base = context([])
    base.transactions = Array.from({ length: 3 }, (_, index) => ({
      id: `txn_${String(index)}`,
      createdAt: 1,
      updatedAt: 1,
      date: '2026-09-01',
      kind: 'expense' as const,
      amount: 100,
      categoryId: null,
      note: 'UPI',
      fromQuickAdd: false,
      recurring: false,
    }))
    base.documents = [
      document(
        'doc_a',
        1,
        base.transactions.map((txn) => ({
          target: 'transactions' as const,
          id: txn.id,
          created: true,
          wrote: {},
          before: null,
        })),
      ),
    ]
    expect(describeRemoval(planRemoval('doc_a', base))).toBe(
      'Also removes 3 transactions from Budget.',
    )
  })

  it('takes what is marked as its own even when its list missed it', () => {
    const base = context([document('doc_a', 1, [])])
    base.policies = base.policies.map((policy) => ({ ...policy, fromDocument: 'doc_a' }))
    expect(planRemoval('doc_a', base).steps).toEqual([
      { op: 'remove', collection: 'policies', id: 'pol_1' },
    ])
  })

  it('never takes a record typed in by hand', () => {
    /* The policy and salary carry no mark and are not on the document's list. */
    const plan = planRemoval('doc_a', context([document('doc_a', 1, [])]))
    expect(plan.steps).toEqual([])
  })

  it('leaves a record marked as another kept document’s', () => {
    const base = context([document('doc_a', 1, [createdPolicy]), document('doc_b', 2, [])])
    base.policies = base.policies.map((policy) => ({ ...policy, fromDocument: 'doc_b' }))
    expect(planRemoval('doc_a', base).steps).toEqual([])
  })
})

describe('data whose document is already gone', () => {
  it('goes, while hand-typed records stay', () => {
    const base = context([])
    base.policies = [
      ...base.policies,
      {
        id: 'pol_orphan',
        createdAt: 2,
        updatedAt: 2,
        name: 'Read from a deleted policy',
        kind: 'health',
        insurer: 'Demo Health',
        cover: 500_000,
        annualPremium: 9_000,
        renewsOn: '2027-01-01',
        fromDocument: 'doc_gone',
      },
    ]
    expect(planSweep(base)).toEqual([{ op: 'remove', collection: 'policies', id: 'pol_orphan' }])
  })

  it('passes to a kept document that also brought it in', () => {
    const later: ImportedRecord = { ...createdPolicy, created: false, wrote: { cover: 5_000_000 } }
    const base = context([document('doc_b', 2, [later])])
    base.policies = base.policies.map((policy) => ({ ...policy, fromDocument: 'doc_gone' }))
    expect(planSweep(base)).toEqual([
      { op: 'hand-over', documentId: 'doc_b', index: 0, collection: 'policies', id: 'pol_1' },
    ])
  })

  it('has nothing to do when every mark points at a kept document', () => {
    const base = context([document('doc_a', 1, [createdPolicy])])
    base.policies = base.policies.map((policy) => ({ ...policy, fromDocument: 'doc_a' }))
    expect(planSweep(base)).toEqual([])
  })
})
