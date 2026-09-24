import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { routes } from '@/app/router'
import { useData } from '@/data/store/data'
import { useSession } from '@/data/store/session'
import { activationCodeFor } from '@/lib/activation'

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

describe('upgrading to Diamond', () => {
  it('goes from Settings to a request, then a code, then Diamond', async () => {
    const user = userEvent.setup()
    open('/app/settings')
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

    await user.click(within(sheet).getByRole('button', { name: /save document/i }))

    await waitFor(() => {
      expect(useData.getState().snapshot?.documents).toHaveLength(1)
    })
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
