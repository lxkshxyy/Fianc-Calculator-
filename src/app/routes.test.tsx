/*
 * Route-resolution and guard checks.
 *
 * NOTE: §12 scopes committed tests to money.ts and the quick-add parser, so this
 * file is an addition beyond that scope. It is kept because it mechanically
 * verifies the §11 Phase 2 done-when condition — "every route in §6 resolves to
 * a stub without a console error" — across all 36 paths, and because it is what
 * stops §5.1 and §6 drifting apart again as screens replace stubs. Delete it if
 * the spec's test scoping is meant to be exhaustive.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'

import { routes } from './router'
import { allPrivateRouteSegments } from './nav/navigation'
import { useSession } from '@/data/store/session'
import { createPasscode, type Passcode } from '@/lib/passcode'

const PUBLIC_PATHS = [
  '/',
  '/features',
  '/request-centre',
  '/request-centre/insurance-review',
  '/about',
  '/contact',
  '/auth',
  '/auth?mode=login',
  '/auth?mode=signup',
  '/forgot-password',
  '/legal/privacy',
  '/dev/kitchen-sink',
  '/this-route-does-not-exist',
]

const PRIVATE_PATHS = allPrivateRouteSegments().map((segment) => '/app/' + segment)

let errorSpy: MockInstance<typeof console.error>

/* Hashed once: PBKDF2 is deliberately slow, and four redirect cases do not each
   need to pay for it. */
const PASSWORD = 'correct horse'
let passcode: Passcode

beforeAll(async () => {
  passcode = await createPasscode(PASSWORD)
})

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  useSession.setState({ signedIn: true })
})

afterEach(() => {
  /* Vitest globals are off, so RTL's auto-cleanup is not installed. */
  cleanup()
  errorSpy.mockRestore()
})

async function renderAt(path: string): Promise<void> {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  await waitFor(() => {
    expect(document.body.textContent?.length ?? 0).toBeGreaterThan(0)
  })
}

describe('every route resolves', () => {
  it('counts 25 private routes', () => {
    expect(PRIVATE_PATHS).toHaveLength(25)
  })

  it.each(PUBLIC_PATHS)('resolves %s with no console error', async (path) => {
    await renderAt(path)
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it.each(PRIVATE_PATHS)('resolves %s with no console error', async (path) => {
    await renderAt(path)
    expect(errorSpy).not.toHaveBeenCalled()
  })
})

describe('the §6 guard', () => {
  it('redirects a signed-out visitor to /auth carrying redirectTo', async () => {
    useSession.setState({ signedIn: false })
    const router = createMemoryRouter(routes, { initialEntries: ['/app/budget'] })
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/auth')
    })
    expect(router.state.location.search).toContain('redirectTo=%2Fapp%2Fbudget')
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('never mounts the private shell while signed out', async () => {
    useSession.setState({ signedIn: false })
    const router = createMemoryRouter(routes, { initialEntries: ['/app/settings'] })
    render(<RouterProvider router={router} />)
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/auth')
    })
    expect(screen.queryByRole('navigation', { name: 'Primary' })).toBeNull()
  })

  it.each([
    ['https://evil.com', '/app/dashboard'],
    ['//evil.com', '/app/dashboard'],
    ['/\\evil.com', '/app/dashboard'],
    ['/app/budget', '/app/budget'],
  ])('sends redirectTo=%s to %s', async (requested, expected) => {
    /* An account exists but is signed out — the state the log-in form is for.
       With no account at all the screen offers sign-up instead. */
    useSession.setState({
      signedIn: false,
      remember: true,
      account: {
        displayName: 'Test',
        email: 'test@example.com',
        createdAt: '2026-01-01',
        passcode,
      },
    })
    const user = userEvent.setup()
    const router = createMemoryRouter(routes, {
      initialEntries: ['/auth?mode=login&redirectTo=' + encodeURIComponent(requested)],
    })
    render(<RouterProvider router={router} />)

    await user.type(await screen.findByLabelText(/^password$/i), PASSWORD)
    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe(expected)
      },
      { timeout: 5000 },
    )
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('404s an unknown path rather than rendering the shell', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/nope'] })
    render(<RouterProvider router={router} />)
    await waitFor(() => {
      expect(screen.getByText('That page does not exist')).toBeTruthy()
    })
  })
})
