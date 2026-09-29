import { beforeEach, describe, expect, it } from 'vitest'

import { planImport } from '@/domain/docimport'
import { suggestFromText } from '@/domain/docscan'
import { repo } from '../repo'
import { useData } from './data'

/*
 * The whole round trip through the real store: save a document with what it
 * adds, then delete it and check the app is back where it was.
 */

const POLICY = `Demo Life Insurance Co. Ltd. Policy Schedule
Individual pure term plan
Policy Number DL-TP-2024-58217
Date of Commencement 15 Mar 2024
Next Premium Due Date 15 Mar 2027
Policy Holder's Name Mr. Aarav Mehta
Sum Assured ₹50,00,000
Annual Premium ₹14,200`

const STATEMENT = `Demo Bank Ltd. Statement of Account
Account Number XXXXXX4821
Statement Period 01 Sep 2026 to 30 Sep 2026
Date Narration Withdrawal Deposit Balance
01-09-2026 Opening Balance 42,310.00
01-09-2026 NEFT SALARY DEMO TECH SOLUTIONS 90,550.00 1,32,860.00
03-09-2026 UPI SWIGGY FOOD ORDER 486.00 1,32,374.00
05-09-2026 NETFLIX.COM SUBSCRIPTION 649.00 1,31,725.00
07-09-2026 POS DMART NOIDA SECTOR 62 3,872.25 1,27,852.75
30-09-2026 Closing Balance 1,27,852.75`

function slip(gross: string): string {
  return `D Demo Tech Solutions Pvt. Ltd. Salary Slip
Salary slip for the month of September 2026
Employee Name Mr. Aarav Mehta
Basic 50,000.00 Provident Fund (EPF) 6,000.00
House Rent Allowance (HRA) 20,000.00 Income Tax (TDS) 8,250.00
Gross Earnings ${gross} Total Deductions 14,450.00
Net Pay ₹90,550.00`
}

/** What the upload sheet does on Save: store the document, then what it adds. */
async function upload(text: string, name: string): Promise<string> {
  const store = useData.getState()
  const suggestion = suggestFromText(text)
  const snapshot = store.snapshot
  if (snapshot === null) throw new Error('No data')
  const plan = planImport(
    { text, kind: suggestion.kind, fields: suggestion.fields, today: '2026-09-29' },
    snapshot,
  )
  const created = await store.addDocument(new Blob(['%PDF']), {
    name,
    kind: suggestion.kind,
    sizeBytes: 4,
    uploadedOn: '2026-09-29',
    tags: [],
    mimeType: 'application/pdf',
    scan: null,
    delivery: 'local',
    imported: [],
  })
  if (created === null) throw new Error('Not saved')
  await useData.getState().applyImport(
    created.id,
    plan.flatMap((item) => item.actions),
  )
  return created.id
}

function snapshot() {
  const current = useData.getState().snapshot
  if (current === null) throw new Error('No data')
  return current
}

beforeEach(async () => {
  useData.setState({ status: 'idle', snapshot: null, error: null })
  await useData.getState().clearEverything()
})

describe('a document and what it added', () => {
  it('takes its policy with it when it is deleted', async () => {
    const id = await upload(POLICY, 'Policy')
    expect(snapshot().policies).toHaveLength(1)
    expect(snapshot().policies[0]?.fromDocument).toBe(id)
    expect(snapshot().documents[0]?.imported).toEqual([
      expect.objectContaining({ target: 'policies', created: true }),
    ])

    await useData.getState().removeDocument(id)
    expect(snapshot().documents).toHaveLength(0)
    expect(snapshot().policies).toHaveLength(0)
  })

  it('puts a salary back to what it was before the slip changed it', async () => {
    await useData.getState().create('incomeSources', {
      name: 'Salary',
      kind: 'salary',
      amount: 85_000,
      cadence: 'monthly',
      active: true,
    })
    const id = await upload(slip('1,05,000.00'), 'September slip')
    expect(snapshot().incomeSources.map((source) => source.amount)).toEqual([105_000])

    await useData.getState().removeDocument(id)
    expect(snapshot().incomeSources.map((source) => source.amount)).toEqual([85_000])
  })

  it('keeps a salary two slips brought in until the second slip goes too', async () => {
    const september = await upload(slip('1,05,000.00'), 'September slip')
    const october = await upload(slip('1,10,000.00'), 'October slip')
    expect(snapshot().incomeSources.map((source) => source.amount)).toEqual([110_000])

    /* The first slip created it, but the second still stands behind it. */
    await useData.getState().removeDocument(september)
    expect(snapshot().incomeSources.map((source) => source.amount)).toEqual([110_000])

    await useData.getState().removeDocument(october)
    expect(snapshot().incomeSources).toHaveLength(0)
  })

  it('leaves records a document saved before this change did not list', async () => {
    const store = useData.getState()
    await store.create('policies', {
      name: 'Old cover',
      kind: 'term',
      insurer: 'Demo Life',
      cover: 1,
      annualPremium: 1,
      renewsOn: '2027-01-01',
    })
    const old = await store.addDocument(new Blob(['%PDF']), {
      name: 'Old',
      kind: 'insurance-policy',
      sizeBytes: 4,
      uploadedOn: '2026-09-01',
      tags: [],
      mimeType: 'application/pdf',
      scan: null,
      delivery: 'local',
      imported: [],
    })
    await useData.getState().removeDocument(old?.id ?? '')
    expect(snapshot().policies).toHaveLength(1)
  })

  it('takes a whole statement with it and leaves what was typed in by hand', async () => {
    const store = useData.getState()
    await store.create('transactions', {
      date: '2026-09-02',
      kind: 'expense',
      amount: 450,
      categoryId: null,
      note: 'Typed in by hand',
      fromQuickAdd: true,
      recurring: false,
    })
    await store.create('policies', {
      name: 'Hand-typed health cover',
      kind: 'health',
      insurer: 'Other Insurer',
      cover: 500_000,
      annualPremium: 9_000,
      renewsOn: '2027-01-01',
    })
    const statement = await upload(STATEMENT, 'Statement')
    const policy = await upload(POLICY, 'Policy')
    expect(snapshot().transactions.length).toBeGreaterThan(3)
    expect(snapshot().policies).toHaveLength(2)

    await useData.getState().removeDocument(statement)
    await useData.getState().removeDocument(policy)
    expect(snapshot().transactions.map((txn) => txn.note)).toEqual(['Typed in by hand'])
    expect(snapshot().policies.map((entry) => entry.name)).toEqual(['Hand-typed health cover'])
    expect(snapshot().incomeSources).toHaveLength(0)
  })

  it('clears data a document left behind when the app opens again', async () => {
    const id = await upload(POLICY, 'Policy')
    /* As if the app closed after the document went but before its policy did. */
    await repo.remove('documents', id)
    useData.setState({ status: 'idle', snapshot: null, error: null })
    await useData.getState().load()
    expect(snapshot().documents).toHaveLength(0)
    expect(snapshot().policies).toHaveLength(0)
  })
})
