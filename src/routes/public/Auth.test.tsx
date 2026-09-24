import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { routes } from '@/app/router'
import { useData } from '@/data/store/data'
import { useSession } from '@/data/store/session'
import { createPasscode } from '@/lib/passcode'

/**
 * §6 — the account flow, across its three screens.
 *
 * Two assertions carry the most weight. Signing up must leave the app empty: a
 * new user landing in somebody else's seeded ₹18 L of debt would have to delete
 * rows before they could enter their own. And a wrong password must not get in,
 * because a lock that opens anyway is worse than no lock — it is a lock people
 * trust.
 */

async function renderAuth(path = '/auth'): Promise<void> {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  await waitFor(() => {
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })
}

describe('the welcome screen', () => {
  beforeEach(() => {
    useSession.setState({ signedIn: false, account: null, remember: true })
  })

  it('is what a new install and a sign-out both land on', async () => {
    await renderAuth('/auth')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/build today/i)
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument()
  })

  it('opens each form from the pill painted into the artwork', async () => {
    /*
     * The welcome screen is an image; the two links over it carry no visible
     * styling of their own. Nothing on screen would look wrong if they stopped
     * working, so this is the only thing standing between a redesign and a
     * splash screen with no way past it.
     */
    const user = userEvent.setup()
    const router = createMemoryRouter(routes, { initialEntries: ['/auth'] })
    render(<RouterProvider router={router} />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('link', { name: /log in/i }))
    await waitFor(() => {
      expect(router.state.location.search).toBe('?mode=login')
    })
  })

  it('offers no third-party sign-in on any screen', async () => {
    for (const path of ['/auth', '/auth?mode=login', '/auth?mode=signup']) {
      const router = createMemoryRouter(routes, { initialEntries: [path] })
      const view = render(<RouterProvider router={router} />)
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      })
      expect(document.body.textContent).not.toMatch(/google|apple|facebook|continue with/i)
      view.unmount()
    }
  })
})

describe('sign up', () => {
  beforeEach(async () => {
    useSession.setState({ signedIn: false, account: null, remember: true })
    useData.setState({ status: 'idle', snapshot: null, error: null })
    await useData.getState().resetToDemo()
  })

  it('refuses an empty name, a malformed email and a short password, writing nothing', async () => {
    const user = userEvent.setup()
    await renderAuth('/auth?mode=signup')

    await user.type(screen.getByLabelText(/email address/i), 'not-an-email')
    await user.type(screen.getByLabelText(/^password$/i), 'abc')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/your name is needed/i)).toBeInTheDocument()
    expect(screen.getByText(/does not look like an email/i)).toBeInTheDocument()
    expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument()
    expect(screen.getByText(/accept the terms/i)).toBeInTheDocument()
    expect(useSession.getState().account).toBeNull()
    expect(useSession.getState().signedIn).toBe(false)
  })

  it('creates the account and starts the app with nothing in it', async () => {
    const user = userEvent.setup()
    // The demo household is loaded, so "empty afterwards" means it was cleared.
    expect(useData.getState().snapshot?.transactions.length ?? 0).toBeGreaterThan(0)

    await renderAuth('/auth?mode=signup')
    await user.type(screen.getByLabelText(/full name/i), 'Asha')
    await user.type(screen.getByLabelText(/email address/i), 'asha@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'correct horse')
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(
      () => {
        expect(useSession.getState().account?.email).toBe('asha@example.com')
      },
      { timeout: 5000 },
    )

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

  it('stores a salted hash, never the password that was typed', async () => {
    const user = userEvent.setup()
    await renderAuth('/auth?mode=signup')
    await user.type(screen.getByLabelText(/full name/i), 'Asha')
    await user.type(screen.getByLabelText(/email address/i), 'asha@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'correct horse')
    await user.click(screen.getByLabelText(/i agree/i))
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(
      () => {
        expect(useSession.getState().account?.passcode).not.toBeNull()
      },
      { timeout: 5000 },
    )
    expect(JSON.stringify(useSession.getState().account)).not.toContain('correct horse')
  })

  it('hides what is typed until asked to show it', async () => {
    const user = userEvent.setup()
    await renderAuth('/auth?mode=signup')

    const field = screen.getByLabelText(/^password$/i)
    expect(field).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: /show password/i }))
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('type', 'text')
  })
})

describe('log in', () => {
  beforeEach(async () => {
    useSession.setState({
      signedIn: false,
      remember: true,
      account: {
        displayName: 'Asha',
        email: 'asha@example.com',
        createdAt: '2026-01-01',
        passcode: await createPasscode('correct horse'),
      },
    })
  })

  it('lets the right password in', async () => {
    const user = userEvent.setup()
    await renderAuth('/auth?mode=login')

    await user.type(screen.getByLabelText(/^password$/i), 'correct horse')
    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    await waitFor(
      () => {
        expect(useSession.getState().signedIn).toBe(true)
      },
      { timeout: 5000 },
    )
  })

  it('keeps the wrong password out, and says so without hinting', async () => {
    const user = userEvent.setup()
    await renderAuth('/auth?mode=login')

    await user.type(screen.getByLabelText(/^password$/i), 'wrong horse')
    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/does not match/i)
    expect(useSession.getState().signedIn).toBe(false)
  })

  it('refuses an email no account on this device uses', async () => {
    const user = userEvent.setup()
    await renderAuth('/auth?mode=login')

    await user.clear(screen.getByLabelText(/email address/i))
    await user.type(screen.getByLabelText(/email address/i), 'someone@else.com')
    await user.type(screen.getByLabelText(/^password$/i), 'correct horse')
    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no account on this device/i)
    expect(useSession.getState().signedIn).toBe(false)
  })

  it('leaves the session behind on the next launch when Remember me is unticked', async () => {
    const user = userEvent.setup()
    await renderAuth('/auth?mode=login')

    await user.click(screen.getByLabelText(/remember me/i))
    await user.type(screen.getByLabelText(/^password$/i), 'correct horse')
    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    await waitFor(
      () => {
        expect(useSession.getState().signedIn).toBe(true)
      },
      { timeout: 5000 },
    )
    expect(useSession.getState().remember).toBe(false)
  })

  it('offers sign-up rather than a dead form when there is no account', async () => {
    useSession.setState({ signedIn: false, account: null, remember: true })
    await renderAuth('/auth?mode=login')
    expect(screen.getByRole('button', { name: /create an account/i })).toBeInTheDocument()
    expect(screen.getByText(/no account on this device yet/i)).toBeInTheDocument()
  })

  it('offers to set one when the account predates passwords', async () => {
    useSession.setState({
      signedIn: false,
      remember: true,
      account: {
        displayName: 'Asha',
        email: 'asha@example.com',
        createdAt: '2026-01-01',
        passcode: null,
      },
    })
    const user = userEvent.setup()
    await renderAuth('/auth?mode=login')

    expect(screen.getByText(/made before .* had passwords/i)).toBeInTheDocument()
    await user.type(screen.getByLabelText(/choose a password/i), 'new password')
    await user.click(screen.getByRole('button', { name: /set password and log in/i }))

    await waitFor(
      () => {
        expect(useSession.getState().account?.passcode).not.toBeNull()
      },
      { timeout: 5000 },
    )
    expect(useSession.getState().signedIn).toBe(true)
  })
})
