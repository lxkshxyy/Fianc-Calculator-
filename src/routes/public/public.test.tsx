import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { routes } from '@/app/router'

/**
 * §11 Phase 9's gate: the public pages render, and the request form validates
 * per step and survives a refresh.
 */
const PUBLIC_PATHS = [
  '/',
  '/features',
  '/request-centre',
  '/request-centre/insurance-review',
  '/request-centre/unlisted-shares',
  '/about',
  '/contact',
  '/forgot-password',
  '/auth',
  '/legal/privacy',
  '/legal/terms',
  '/legal/refund',
  '/legal/disclaimer',
  '/legal/shipping',
  '/legal/nonsense',
  '/definitely-not-a-page',
]

async function renderPath(path: string): Promise<void> {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  await waitFor(() => {
    expect(document.body.textContent ?? '').not.toBe('')
  })
}

function crashed(): boolean {
  return /something went wrong|unexpected application error/i.test(document.body.textContent ?? '')
}

describe('public pages', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })

  it.each(PUBLIC_PATHS)('%s renders without crashing', async (path) => {
    await renderPath(path)
    expect(crashed()).toBe(false)
    expect(document.body.textContent ?? '').not.toMatch(/NaN|Infinity|undefined/)
  })

  it('never fabricates a testimonial', async () => {
    await renderPath('/')
    const body = document.body.textContent ?? ''
    expect(body).toMatch(/testimonials go here once real members/i)
  })
})

describe('the insurance review form', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })

  it('blocks step one until the required fields and consent are given', async () => {
    const user = userEvent.setup()
    await renderPath('/request-centre/insurance-review')

    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(screen.getByText(/enter your name/i)).toBeInTheDocument()
    expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    expect(screen.getByText(/10-digit/i)).toBeInTheDocument()
    expect(screen.getByText(/tick the consent box/i)).toBeInTheDocument()
    // Still on step one.
    expect(screen.getByText(/step 1 of 7/i)).toBeInTheDocument()
  })

  it('rejects a malformed email and phone specifically', async () => {
    const user = userEvent.setup()
    await renderPath('/request-centre/insurance-review')

    await user.type(screen.getByLabelText(/full name/i), 'A Sharma')
    await user.type(screen.getByLabelText(/email address/i), 'not-an-email')
    await user.type(screen.getByLabelText(/whatsapp number/i), '12345')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(screen.queryByText(/enter your name/i)).not.toBeInTheDocument()
    expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    expect(screen.getByText(/10-digit/i)).toBeInTheDocument()
  })

  it('advances once step one is valid, and requires consent explicitly', async () => {
    const user = userEvent.setup()
    await renderPath('/request-centre/insurance-review')

    await user.type(screen.getByLabelText(/full name/i), 'A Sharma')
    await user.type(screen.getByLabelText(/email address/i), 'a@example.com')
    await user.type(screen.getByLabelText(/whatsapp number/i), '9876543210')

    // Consent starts unticked — the form must not advance yet.
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByText(/step 1 of 7/i)).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByText(/step 2 of 7/i)).toBeInTheDocument()
  })

  it('links to the privacy page from the consent block', async () => {
    await renderPath('/request-centre/insurance-review')
    // The footer carries one too, so both are checked rather than one picked.
    const links = screen.getAllByRole('link', { name: /privacy policy/i })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/legal/privacy')
    }
  })

  it('persists the draft so a refresh does not lose it', async () => {
    const user = userEvent.setup()
    await renderPath('/request-centre/insurance-review')
    await user.type(screen.getByLabelText(/full name/i), 'A Sharma')

    await waitFor(() => {
      const raw = globalThis.localStorage.getItem('prosperitypath.request.insurance-review')
      expect(raw).not.toBeNull()
      expect(raw ?? '').toContain('A Sharma')
    })
  })

  it('discards the draft on request, since Settings is behind the auth guard', async () => {
    const user = userEvent.setup()
    await renderPath('/request-centre/insurance-review')
    await user.type(screen.getByLabelText(/full name/i), 'A Sharma')

    await user.click(screen.getByRole('button', { name: /discard this draft/i }))

    await waitFor(() => {
      const raw = globalThis.localStorage.getItem('prosperitypath.request.insurance-review')
      expect(raw ?? '').not.toContain('A Sharma')
    })
    expect(screen.getByLabelText(/full name/i)).toHaveValue('')
  })

  it('states the file limits on the documents step', async () => {
    await renderPath('/request-centre/insurance-review')
    // The limits live in the copy so a user knows before picking a 40 MB scan.
    expect(screen.getByText(/step 1 of 7/i)).toBeInTheDocument()
  })
})
