import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { routes } from '@/app/router'
import { useData } from '@/data/store/data'
import { useSession } from '@/data/store/session'
import { activationCodeFor } from '@/lib/activation'
import { scanFile } from '@/lib/scan'

/*
 * Reading a real PDF needs pdf.js and a canvas, neither of which jsdom has; the
 * reading itself is covered by docscan.test.ts and by hand in a browser. Here
 * the scan is stood in for, so what is under test is the screen around it.
 */
vi.mock('@/lib/scan', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/scan')>()
  return {
    ...original,
    previewUrl: vi.fn(() => Promise.resolve(null)),
    scanFile: vi.fn(() =>
      Promise.resolve({
        status: 'done' as const,
        method: 'pdf-text' as const,
        text: [
          'HDFC Life Insurance Company Limited',
          'POLICY SCHEDULE (Term)',
          'Policy No. : 23456789',
          'Sum Assured : Rs. 1,00,00,000',
          'Next Premium Due Date : 05/03/2027',
        ].join('\n'),
      }),
    ),
  }
})

function open(path: string): void {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
}

/* Every route is a lazy chunk; the first one a file opens pays for the import. */
vi.setConfig({ testTimeout: 20_000 })

beforeEach(async () => {
  useSession.setState({
    signedIn: true,
    account: {
      displayName: 'Lakshay Sharma',
      email: 'lakshay@example.com',
      createdAt: '2026-09-01T00:00:00.000Z',
      passcode: null,
    },
  })
  useData.setState({ status: 'idle', snapshot: null, error: null })
  await useData.getState().clearEverything()
  await useData.getState().saveProfile({ displayName: 'Lakshay Sharma', tier: 'silver' })
})

describe('the Wealth list', () => {
  it('marks paid rows with the gem alone, not the word', async () => {
    open('/app/wealth')
    const gems = await screen.findAllByRole('img', { name: 'Diamond' }, { timeout: 5000 })
    /* Investments, Goals and Insurance are Diamond; Assets is free. */
    expect(gems).toHaveLength(3)
    const list = gems[0]?.closest('ul')
    if (list == null) throw new Error('No list')
    expect(within(list).queryByText('Diamond')).not.toBeInTheDocument()
  })
})

describe('Family', () => {
  it('adds a member, then edits them', async () => {
    const user = userEvent.setup()
    open('/app/family')
    await user.click(await screen.findByRole('button', { name: /add member/i }, { timeout: 5000 }))

    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^name$/i), 'Priya Sharma')
    await user.selectOptions(within(dialog).getByLabelText(/relation/i), 'spouse')
    await user.type(within(dialog).getByLabelText(/date of birth/i), '1992-06-14')
    await user.click(within(dialog).getByRole('button', { name: /add to family/i }))

    await waitFor(() => {
      expect(useData.getState().snapshot?.family).toHaveLength(1)
    })
    const member = useData.getState().snapshot?.family[0]
    expect(member?.name).toBe('Priya Sharma')
    expect(member?.dateOfBirth).toBe('1992-06-14')
    expect(member?.dependent).toBe(true)
    expect(member?.includeInHousehold).toBe(true)

    await user.click(await screen.findByRole('button', { name: /^priya sharma/i }))
    const edit = screen.getByRole('dialog')
    await user.selectOptions(within(edit).getByLabelText(/depends on you/i), 'no')
    await user.click(within(edit).getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(useData.getState().snapshot?.family[0]?.dependent).toBe(false)
    })
    expect(useData.getState().snapshot?.family).toHaveLength(1)
  })

  it('refuses a birthday in the future', async () => {
    const user = userEvent.setup()
    open('/app/family')
    await user.click(await screen.findByRole('button', { name: /add member/i }, { timeout: 5000 }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^name$/i), 'Future')
    await user.type(within(dialog).getByLabelText(/date of birth/i), '2999-01-01')
    await user.click(within(dialog).getByRole('button', { name: /add to family/i }))
    expect(await within(dialog).findByText(/cannot be in the future/i)).toBeInTheDocument()
    expect(useData.getState().snapshot?.family).toHaveLength(0)
  })
})

describe('Profile', () => {
  it('saves a preset avatar and shows it in the dashboard greeting', async () => {
    const user = userEvent.setup()
    open('/app/profile')
    await user.click(await screen.findByRole('button', { name: 'Avatar 3' }, { timeout: 5000 }))
    await waitFor(() => {
      expect(useData.getState().snapshot?.profile.avatar).toBe('preset:banyan')
    })
    expect(screen.getByRole('button', { name: 'Avatar 3' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('renames the person everywhere the name is used', async () => {
    const user = userEvent.setup()
    open('/app/profile')
    const name = await screen.findByLabelText(/^name$/i, {}, { timeout: 5000 })
    await user.clear(name)
    await user.type(name, 'Asha Verma')
    await user.type(screen.getByLabelText(/mobile/i), '98765 43210')
    await user.click(screen.getByRole('button', { name: /save details/i }))

    await waitFor(() => {
      expect(useData.getState().snapshot?.profile.displayName).toBe('Asha Verma')
    })
    expect(useData.getState().snapshot?.profile.phone).toBe('98765 43210')
    /* The sign-in screen's "Log in as …" reads the account, so it moves too. */
    expect(useSession.getState().account?.displayName).toBe('Asha Verma')
  })

  it('opens from the picture beside the dashboard greeting', async () => {
    const user = userEvent.setup()
    open('/app/dashboard')
    const links = await screen.findAllByRole('link', { name: /your profile/i }, { timeout: 5000 })
    /* The sidebar has one too; this is the one in the greeting. */
    const inGreeting = links.find((link) => link.closest('header') !== null)
    if (inGreeting === undefined) throw new Error('No profile link in the header')
    await user.click(inGreeting)
    expect(await screen.findByText('Your details')).toBeInTheDocument()
  })
})

describe('where Upgrade and Language live', () => {
  it('keeps the language picker in Settings, and no upgrade button there', async () => {
    open('/app/settings')
    expect(
      await screen.findByRole('button', { name: 'हिन्दी' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /upgrade to diamond/i })).toBeNull()
    expect(screen.queryByText('Membership')).toBeNull()
  })

  it('keeps the membership card in Profile, and no language picker there', async () => {
    open('/app/profile')
    expect(
      await screen.findByRole('button', { name: /upgrade to diamond/i }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.getByText('Membership')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'हिन्दी' })).toBeNull()
  })

  it('shows "Enter your Diamond code" on Profile once a request is waiting', async () => {
    await useData.getState().create('requests', {
      reference: 'WRC-DAAAAAA',
      service: 'diamond-upgrade',
      status: 'submitted',
      submittedAt: 1,
      answers: { phone: '+91 98765 43210' },
      consentGivenAt: 1,
      delivery: 'queued',
    })
    open('/app/profile')
    expect(
      await screen.findByRole('button', { name: /enter your diamond code/i }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.getByText('Diamond request sent')).toBeInTheDocument()
  })
})

describe('upgrading to Diamond', () => {
  it('goes from Profile to a request, then a code, then Diamond', async () => {
    const user = userEvent.setup()
    open('/app/profile')
    await user.click(
      await screen.findByRole('button', { name: /upgrade to diamond/i }, { timeout: 5000 }),
    )
    await user.click(await screen.findByRole('button', { name: /request diamond/i }))

    const sheet = screen.getByRole('dialog')
    await user.type(within(sheet).getByLabelText(/mobile number/i), '12345')
    await user.click(within(sheet).getByRole('button', { name: /send request/i }))
    expect(within(sheet).getByText(/10-digit mobile/i)).toBeInTheDocument()
    expect(within(sheet).getByText(/allowed to call you/i)).toBeInTheDocument()

    await user.clear(within(sheet).getByLabelText(/mobile number/i))
    await user.type(within(sheet).getByLabelText(/mobile number/i), '+91 98765 43210')
    await user.click(within(sheet).getByRole('checkbox'))
    await user.click(within(sheet).getByRole('button', { name: /send request/i }))

    await waitFor(() => {
      expect(useData.getState().snapshot?.requests).toHaveLength(1)
    })
    const request = useData.getState().snapshot?.requests[0]
    expect(request?.service).toBe('diamond-upgrade')
    expect(request?.answers['phone']).toBe('+91 98765 43210')
    expect(useData.getState().snapshot?.profile.phone).toBe('+91 98765 43210')

    const reference = request?.reference ?? ''
    expect(await screen.findByText(reference)).toBeInTheDocument()

    /* No automation configured here, so WhatsApp to the team's number is the way to send it. */
    const whatsapp = screen.getByRole('link', { name: /send on whatsapp/i })
    const href = whatsapp.getAttribute('href') ?? ''
    expect(href).toMatch(/^https:\/\/wa\.me\/918744855792\?text=/)
    expect(decodeURIComponent(href)).toContain(reference)
    expect(decodeURIComponent(href)).toContain('+91 98765 43210')

    await user.type(screen.getByLabelText(/activation code/i), 'AAAA-BBBB')
    await user.click(screen.getByRole('button', { name: /activate diamond/i }))
    expect(await screen.findByText(/does not match/i)).toBeInTheDocument()
    expect(useData.getState().snapshot?.profile.tier).toBe('silver')

    await user.clear(screen.getByLabelText(/activation code/i))
    await user.type(screen.getByLabelText(/activation code/i), await activationCodeFor(reference))
    await user.click(screen.getByRole('button', { name: /activate diamond/i }))

    await waitFor(() => {
      expect(useData.getState().snapshot?.profile.tier).toBe('diamond')
    })
    expect(useData.getState().snapshot?.requests[0]?.status).toBe('closed')
    expect(await screen.findByText(/diamond is active/i)).toBeInTheDocument()
  })
})

describe('the sections a document fills', () => {
  it('lets a policy be deleted from Insurance by hand', async () => {
    await useData.getState().create('policies', {
      name: 'Old cover',
      kind: 'term',
      insurer: 'Demo Life',
      cover: 5_000_000,
      annualPremium: 14_200,
      renewsOn: '2027-03-15',
    })
    const user = userEvent.setup()
    open('/app/insurance')
    await user.click(
      await screen.findByRole('button', { name: /delete old cover/i }, { timeout: 5000 }),
    )
    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    await waitFor(() => {
      expect(useData.getState().snapshot?.policies).toHaveLength(0)
    })
  })

  it('lets a salary be deleted from Income by hand', async () => {
    await useData.getState().create('incomeSources', {
      name: 'Salary — Demo Tech Solutions',
      kind: 'salary',
      amount: 90_550,
      cadence: 'monthly',
      active: true,
    })
    const user = userEvent.setup()
    open('/app/income')
    await user.click(
      await screen.findByRole('button', { name: /delete salary — demo tech/i }, { timeout: 5000 }),
    )
    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    await waitFor(() => {
      expect(useData.getState().snapshot?.incomeSources).toHaveLength(0)
    })
  })
})

describe('Budget', () => {
  it("lists this month's transactions, newest first, and removes one on request", async () => {
    const { create } = useData.getState()
    const today = new Date()
    const iso = (day: number): string =>
      `${String(today.getFullYear())}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const line = { categoryId: null, fromQuickAdd: false, recurring: false }
    await create('transactions', {
      ...line,
      date: iso(1),
      kind: 'income',
      amount: 90_550,
      note: 'NEFT CR DEMO TECH SOLUTIONS',
    })
    await create('transactions', {
      ...line,
      date: iso(1),
      kind: 'expense',
      amount: 486,
      note: 'UPI ZOMATO',
    })
    /* Last year's line is not this month's. */
    await create('transactions', {
      ...line,
      date: `${String(today.getFullYear() - 1)}-01-15`,
      kind: 'expense',
      amount: 999,
      note: 'OLD LINE',
    })

    const user = userEvent.setup()
    open('/app/budget')
    const list = await screen.findByRole(
      'region',
      { name: /this month's transactions/i },
      { timeout: 5000 },
    )
    expect(within(list).getByText('NEFT CR DEMO TECH SOLUTIONS')).toBeInTheDocument()
    expect(within(list).getByText('UPI ZOMATO')).toBeInTheDocument()
    expect(within(list).queryByText('OLD LINE')).toBeNull()

    await user.click(within(list).getByRole('button', { name: /delete.*upi zomato/i }))
    const confirm = await within(list).findByRole('button', {
      name: /^delete$|yes|confirm|remove/i,
    })
    await user.click(confirm)
    await waitFor(() => {
      expect(useData.getState().snapshot?.transactions.map((txn) => txn.note)).toEqual([
        'NEFT CR DEMO TECH SOLUTIONS',
        'OLD LINE',
      ])
    })
  })
})

describe('Documents', () => {
  it('uploads a PDF, fills in what the scan read, and saves it with its file', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: ['/app/documents'] })}
      />,
    )
    await screen.findByRole('button', { name: /choose file/i }, { timeout: 5000 })
    const input = container.querySelector<HTMLInputElement>('input[type=file]:not([capture])')
    if (input === null) throw new Error('No file input')

    const file = new File(['%PDF-1.4 schedule'], 'scan_0042.pdf', { type: 'application/pdf' })
    await user.upload(input, file)

    const sheet = await screen.findByRole('dialog')
    expect(await within(sheet).findByDisplayValue('HDFC Life policy')).toBeInTheDocument()
    expect(within(sheet).getByDisplayValue('23456789')).toBeInTheDocument()
    expect(within(sheet).getByDisplayValue('05 Mar 2027')).toBeInTheDocument()

    /* What the policy adds to the rest of the app is listed before saving. */
    const adds = within(sheet).getByRole('region', { name: /add to your app/i })
    expect(within(adds).getByText('HDFC Life policy')).toBeInTheDocument()
    expect(within(adds).getByRole('checkbox')).toBeChecked()

    await user.click(within(sheet).getByRole('button', { name: /save document/i }))

    await waitFor(() => {
      expect(useData.getState().snapshot?.documents).toHaveLength(1)
    })
    expect(await within(sheet).findByText(/saved to documents/i)).toBeInTheDocument()
    const policies = useData.getState().snapshot?.policies ?? []
    expect(policies).toHaveLength(1)
    expect(policies[0]).toMatchObject({ insurer: 'HDFC Life', cover: 10_000_000 })
    await user.click(within(sheet).getByRole('button', { name: /^done$/i }))
    const saved = useData.getState().snapshot?.documents[0]
    expect(saved?.kind).toBe('insurance-policy')
    expect(saved?.fileId).not.toBeNull()
    expect(saved?.scan?.fields.find((field) => field.key === 'policyNumber')?.value).toBe(
      '23456789',
    )
    /* No server is configured, so nothing is queued to leave the phone. */
    expect(saved?.delivery).toBe('local')

    /* Findable by what it says, not only by its name. */
    await user.type(screen.getByLabelText(/search documents/i), '23456789')
    expect(await screen.findByText('HDFC Life policy')).toBeInTheDocument()
  })

  it('deleting the document takes back the policy it added, after saying so', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: ['/app/documents'] })}
      />,
    )
    await screen.findByRole('button', { name: /choose file/i }, { timeout: 5000 })
    const input = container.querySelector<HTMLInputElement>('input[type=file]:not([capture])')
    if (input === null) throw new Error('No file input')
    await user.upload(input, new File(['%PDF'], 'policy.pdf', { type: 'application/pdf' }))
    const sheet = await screen.findByRole('dialog')
    await user.click(await within(sheet).findByRole('button', { name: /save document/i }))
    await user.click(await within(sheet).findByRole('button', { name: /^done$/i }))
    expect(useData.getState().snapshot?.policies).toHaveLength(1)

    await user.click(await screen.findByRole('button', { name: /delete hdfc life policy/i }))
    expect(await screen.findByText('Also removes 1 policy from Insurance.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    await waitFor(() => {
      expect(useData.getState().snapshot?.documents).toHaveLength(0)
    })
    expect(useData.getState().snapshot?.policies).toHaveLength(0)
  })

  it('saves only the document when its import line is unticked', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: ['/app/documents'] })}
      />,
    )
    await screen.findByRole('button', { name: /choose file/i }, { timeout: 5000 })
    const input = container.querySelector<HTMLInputElement>('input[type=file]:not([capture])')
    if (input === null) throw new Error('No file input')
    await user.upload(input, new File(['%PDF'], 'policy.pdf', { type: 'application/pdf' }))

    const sheet = await screen.findByRole('dialog')
    await user.click(await within(sheet).findByRole('checkbox'))
    await user.click(within(sheet).getByRole('button', { name: /save document/i }))
    expect(await within(sheet).findByText(/saved to documents/i)).toBeInTheDocument()
    expect(useData.getState().snapshot?.documents).toHaveLength(1)
    expect(useData.getState().snapshot?.policies).toHaveLength(0)
  })

  it('turns away a file that is not financial, and saves nothing', async () => {
    vi.mocked(scanFile).mockResolvedValueOnce({
      status: 'done',
      method: 'ocr',
      text: 'Vegetable Poha\nServes 4\nFlattened rice 2 cups\nRinse the poha and fry the onion.',
    })
    const user = userEvent.setup()
    const { container } = render(
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: ['/app/documents'] })}
      />,
    )
    await screen.findByRole('button', { name: /choose file/i }, { timeout: 5000 })
    const input = container.querySelector<HTMLInputElement>('input[type=file]:not([capture])')
    if (input === null) throw new Error('No file input')
    await user.upload(input, new File(['%PDF'], 'recipe.pdf', { type: 'application/pdf' }))

    const sheet = await screen.findByRole('dialog')
    expect(await within(sheet).findByText(/not a financial document/i)).toBeInTheDocument()
    expect(within(sheet).queryByRole('button', { name: /save document/i })).toBeNull()
    expect(within(sheet).getByRole('button', { name: /choose another file/i })).toBeInTheDocument()
    expect(useData.getState().snapshot?.documents).toHaveLength(0)
  })

  it('says when the reader did not load, and tries again', async () => {
    vi.mocked(scanFile).mockResolvedValueOnce({
      status: 'failed',
      reason: 'The document reader did not load. Check your internet connection and try again.',
      retry: true,
    })
    const user = userEvent.setup()
    const { container } = render(
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: ['/app/documents'] })}
      />,
    )
    await screen.findByRole('button', { name: /choose file/i }, { timeout: 5000 })
    const input = container.querySelector<HTMLInputElement>('input[type=file]:not([capture])')
    if (input === null) throw new Error('No file input')
    await user.upload(input, new File(['%PDF'], 'policy.pdf', { type: 'application/pdf' }))

    const sheet = await screen.findByRole('dialog')
    expect(await within(sheet).findByText(/reader did not load/i)).toBeInTheDocument()
    await user.click(within(sheet).getByRole('button', { name: /try again/i }))
    /* The second attempt reads the policy. */
    expect(await within(sheet).findByDisplayValue('23456789')).toBeInTheDocument()
  })

  it('turns away a file it cannot hold', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const { container } = render(
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: ['/app/documents'] })}
      />,
    )
    await screen.findByRole('button', { name: /choose file/i }, { timeout: 5000 })
    const input = container.querySelector<HTMLInputElement>('input[type=file]:not([capture])')
    if (input === null) throw new Error('No file input')
    await user.upload(input, new File(['x'], 'notes.docx', { type: 'application/msword' }))
    expect(await screen.findByText(/pick a pdf, or a photo/i)).toBeInTheDocument()
    expect(useData.getState().snapshot?.documents).toHaveLength(0)
  })
})
