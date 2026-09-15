import { render, screen, waitFor } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { routes } from '@/app/router'
import { allPrivateRouteSegments } from '@/app/nav/navigation'
import { useData } from '@/data/store/data'
import { useSession } from '@/data/store/session'

/**
 * §11 Phases 5–8 gate: every module screen renders on seeded data, follows the
 * §9.4 pattern, and shows an empty state rather than crashing when cleared.
 *
 * Mounting all 24 through the real route table is what catches the failures a
 * per-file test misses — a bad lazy import, a screen that reads a store before
 * it has loaded, a missing export after a rename.
 */

const SEGMENTS = allPrivateRouteSegments()

async function renderRoute(segment: string): Promise<void> {
  const router = createMemoryRouter(routes, { initialEntries: [`/app/${segment}`] })
  render(<RouterProvider router={router} />)
  await waitFor(
    () => {
      expect(screen.queryByLabelText(/loading your data/i)).not.toBeInTheDocument()
    },
    { timeout: 5000 },
  )
}

/** The text either boundary renders. Seeing it means the screen threw. */
function crashed(): boolean {
  const body = document.body.textContent ?? ''
  return /something went wrong|unexpected application error|could not be opened/i.test(body)
}

describe('every private route', () => {
  beforeEach(async () => {
    useSession.setState({ signedIn: true })
    useData.setState({ status: 'idle', snapshot: null, error: null })
    await useData.getState().resetToDemo()
  })

  it('covers all 24 segments', () => {
    expect(SEGMENTS.length).toBe(24)
  })

  it.each(SEGMENTS)('/app/%s renders without crashing', async (segment) => {
    await renderRoute(segment)
    expect(crashed()).toBe(false)
    expect(document.body.textContent ?? '').not.toMatch(/NaN|Infinity/)
  })
})

describe('every private route with all data cleared', () => {
  beforeEach(async () => {
    useSession.setState({ signedIn: true })
    useData.setState({ status: 'idle', snapshot: null, error: null })
    await useData.getState().clearEverything()
  })

  it.each(SEGMENTS)('/app/%s still renders after Clear everything', async (segment) => {
    await renderRoute(segment)
    expect(crashed()).toBe(false)
    expect(document.body.textContent ?? '').not.toMatch(/NaN|Infinity/)
  })
})

describe('tier gating', () => {
  beforeEach(async () => {
    useSession.setState({ signedIn: true })
    useData.setState({ status: 'idle', snapshot: null, error: null })
    await useData.getState().resetToDemo()
  })

  it('locks a Diamond module on Silver without blanking it (§9.5)', async () => {
    await useData.getState().saveProfile({ tier: 'silver' })
    await renderRoute('investments')

    expect(crashed()).toBe(false)
    // Locked is conveyed by a label, never by opacity alone.
    expect(screen.getByText(/diamond/i)).toBeInTheDocument()
    // The screen header is still there — a gate is not a blank page. The lock
    // renders a heading of its own, so this asserts on the page's own h1.
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings.some((node) => /investments/i.test(node.textContent ?? ''))).toBe(true)
  })

  it('opens the same module on Diamond', async () => {
    await useData.getState().saveProfile({ tier: 'diamond' })
    await renderRoute('investments')

    expect(crashed()).toBe(false)
    expect(screen.getByLabelText(/holdings/i)).toBeInTheDocument()
  })
})
