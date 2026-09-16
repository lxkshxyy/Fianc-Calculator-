import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { routes } from '@/app/router'
import { useData } from '@/data/store/data'
import { useSession } from '@/data/store/session'

/**
 * §6 — the account flow.
 *
 * The assertion that matters most is the last one: signing up leaves the app
 * empty. A new user landing in somebody else's seeded ₹18 L of debt would have
 * to delete rows before they could enter their own.
 */

async function renderAuth(path = '/auth?mode=signup'): Promise<void> {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  await waitFor(() => {
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })
}

describe('sign up', () => {
  beforeEach(async () => {
    useSession.setState({ signedIn: false, account: null })
    useData.setState({ status: 'idle', snapshot: null, error: null })
    await useData.getState().resetToDemo()
  })

  it('refuses an empty name and a malformed email, without writing anything', async () => {
    const user = userEvent.setup()
    await renderAuth()

    await user.type(screen.getByLabelText(/email/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText(/your name is needed/i)).toBeInTheDocument()
    expect(screen.getByText(/does not look like an email/i)).toBeInTheDocument()
    expect(useSession.getState().account).toBeNull()
    expect(useSession.getState().signedIn).toBe(false)
  })

  it('creates the account and starts the app with nothing in it', async () => {
    const user = userEvent.setup()
    // The demo household is loaded, so "empty afterwards" means it was cleared.
    expect(useData.getState().snapshot?.transactions.length ?? 0).toBeGreaterThan(0)

    await renderAuth()
    await user.type(screen.getByLabelText(/your name/i), 'Asha')
    await user.type(screen.getByLabelText(/email/i), 'asha@example.com')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(useSession.getState().account?.email).toBe('asha@example.com')
    })

    const session = useSession.getState()
    expect(session.signedIn).toBe(true)
    expect(session.account?.displayName).toBe('Asha')

    const snapshot = useData.getState().snapshot
    expect(snapshot?.transactions).toHaveLength(0)
    expect(snapshot?.assets).toHaveLength(0)
    expect(snapshot?.liabilities).toHaveLength(0)
    expect(snapshot?.goals).toHaveLength(0)
    /* The profile survives the clear — it is who you are, not your data. */
    expect(snapshot?.profile.displayName).toBe('Asha')
    expect(snapshot?.profile.tier).toBe('silver')
  })

  it('offers sign-up rather than a dead sign-in form when no account exists', async () => {
    await renderAuth('/auth')
    expect(screen.getByRole('button', { name: /create an account/i })).toBeInTheDocument()
    expect(screen.getByText(/no account on this device yet/i)).toBeInTheDocument()
  })
})

describe('sign in', () => {
  beforeEach(() => {
    useSession.setState({
      signedIn: false,
      account: { displayName: 'Asha', email: 'asha@example.com', createdAt: '2026-01-01' },
    })
  })

  it('signs back into the account already on the device', async () => {
    const user = userEvent.setup()
    await renderAuth('/auth')

    expect(screen.getByDisplayValue('asha@example.com')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => {
      expect(useSession.getState().signedIn).toBe(true)
    })
  })

  it('never offers a password field on sign in', async () => {
    await renderAuth('/auth')
    expect(document.querySelector('input[type="password"]')).toBeNull()
  })

  it('never offers a password field on sign up either', async () => {
    await renderAuth('/auth?mode=signup')
    expect(document.querySelector('input[type="password"]')).toBeNull()
  })
})
