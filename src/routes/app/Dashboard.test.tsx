import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { useData } from '@/data/store/data'
import { Dashboard } from './Dashboard'

/**
 * §11 Phase 4's gate is that the dashboard renders §9.1 on real seeded numbers.
 * This asserts the six blocks are present and reading from the repository, and
 * that the two things most likely to break silently are right: the negative net
 * worth renders as a loss, and nothing anywhere renders NaN.
 */

async function renderDashboard(): Promise<void> {
  await useData.getState().load()
  await waitFor(() => {
    expect(useData.getState().status).toBe('ready')
  })
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
}

describe('Dashboard', () => {
  beforeEach(() => {
    useData.setState({ status: 'idle', snapshot: null, error: null })
  })

  it('renders the six §9.1 blocks on seeded data', async () => {
    await renderDashboard()

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/welcome back/i)
    expect(screen.getByLabelText(/quick add a transaction/i)).toBeInTheDocument()
    expect(screen.getByText(/net worth/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/your journey/i)).toBeInTheDocument()
    expect(screen.getByText(/financial health/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/key metrics/i)).toBeInTheDocument()
  })

  it('shows the seeded household as a loss, in Indian units', async () => {
    await renderDashboard()
    const netWorth = screen.getByText(/^-₹/)
    expect(netWorth).toBeInTheDocument()
    expect(netWorth.textContent).toMatch(/L|Cr/)
  })

  it('renders no NaN, Infinity or undefined anywhere on the screen', async () => {
    await renderDashboard()
    const body = document.body.textContent ?? ''
    expect(body).not.toMatch(/NaN/)
    expect(body).not.toMatch(/Infinity/)
    expect(body).not.toMatch(/undefined/)
  })

  it('shows all six stages, with the current one marked', async () => {
    await renderDashboard()
    const rail = screen.getByLabelText(/your journey/i)
    expect(within(rail).getAllByText(/stage \d|^\d$/i).length).toBeGreaterThan(0)
    expect(within(rail).getByText(/current/i)).toBeInTheDocument()
  })

  it('opens the confirm sheet rather than writing straight from the bar (§9.2)', async () => {
    const user = userEvent.setup()
    await renderDashboard()

    const before = useData.getState().snapshot?.transactions.length ?? 0
    await user.type(screen.getByLabelText(/quick add a transaction/i), 'paid 15k rent')
    await user.click(screen.getByRole('button', { name: /^add$/i }))

    expect(await screen.findByText(/check this before it is saved/i)).toBeInTheDocument()
    // Still nothing written.
    expect(useData.getState().snapshot?.transactions.length ?? 0).toBe(before)
  })

  it('toggles the layout editor', async () => {
    const user = userEvent.setup()
    await renderDashboard()

    await user.click(screen.getByRole('button', { name: /edit dashboard/i }))
    expect(screen.getByText(/arrange your dashboard/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /move net worth down/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^done$/i }))
    expect(screen.queryByText(/arrange your dashboard/i)).not.toBeInTheDocument()
  })
})
