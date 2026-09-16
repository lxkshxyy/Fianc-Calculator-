import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { routes } from '@/app/router'
import { useData } from '@/data/store/data'
import { useSession } from '@/data/store/session'

/**
 * The thing the app exists to do: let somebody enter their own numbers.
 *
 * Every screen could render perfectly and the product would still be useless if
 * this path broke, so it is tested end to end through the real route table
 * rather than against the store directly.
 */

/**
 * Opens a screen and waits for its Add button.
 *
 * Waiting for the data skeleton to clear is not enough: every route is lazily
 * imported (§2.1.4), so the Suspense fallback is still on screen after the data
 * is ready. Waiting for the control the test is about to click covers both.
 */
async function open(segment: string, addButton: RegExp): Promise<HTMLElement> {
  const router = createMemoryRouter(routes, { initialEntries: [`/app/${segment}`] })
  render(<RouterProvider router={router} />)
  return await screen.findByRole('button', { name: addButton }, { timeout: 5000 })
}

describe('entering your own data', () => {
  beforeEach(async () => {
    useSession.setState({ signedIn: true })
    useData.setState({ status: 'idle', snapshot: null, error: null })
    /* A brand-new account: empty, exactly as sign-up leaves it. */
    await useData.getState().clearEverything()
  })

  it('adds an income source and the monthly total follows', async () => {
    const user = userEvent.setup()
    await user.click(await open('income', /add income/i))
    await user.type(screen.getByLabelText(/^name$/i), 'Salary')
    await user.type(screen.getByLabelText(/amount/i), '90000')
    await user.click(screen.getByRole('button', { name: /save income source/i }))

    await waitFor(() => {
      expect(useData.getState().snapshot?.incomeSources).toHaveLength(1)
    })

    const source = useData.getState().snapshot?.incomeSources[0]
    expect(source?.name).toBe('Salary')
    expect(source?.amount).toBe(90_000)
    expect(source?.cadence).toBe('monthly')
    expect(source?.active).toBe(true)
  })

  it('accepts Indian shorthand for the amount', async () => {
    const user = userEvent.setup()
    await user.click(await open('assets', /add asset/i))
    await user.type(screen.getByLabelText(/^name$/i), 'HDFC savings')
    await user.type(screen.getByLabelText(/current value/i), '2.5L')
    await user.click(screen.getByRole('button', { name: /save asset/i }))

    await waitFor(() => {
      expect(useData.getState().snapshot?.assets).toHaveLength(1)
    })
    expect(useData.getState().snapshot?.assets[0]?.value).toBe(250_000)
    /* A blank nominee is null, not an empty string the schema would reject. */
    expect(useData.getState().snapshot?.assets[0]?.nominee).toBeNull()
  })

  it('refuses an unreadable amount rather than writing a silent zero', async () => {
    const user = userEvent.setup()
    await user.click(await open('goals', /add goal/i))
    await user.type(screen.getByLabelText(/^goal$/i), 'Emergency fund')
    await user.type(screen.getByLabelText(/target amount/i), 'soon')
    await user.click(screen.getByRole('button', { name: /save goal/i }))

    // Nothing written — a mistyped amount must never become ₹0.
    expect(useData.getState().snapshot?.goals ?? []).toHaveLength(0)
  })

  /*
   * The regression this pair exists for: both these forms have a date field, and
   * a date input left empty blocked every save while looking like an optional
   * box nobody had filled. The dashboard then read ₹0 of liabilities for someone
   * who had typed a loan in three times.
   */
  it('adds a loan without being asked for a date, and the dashboard follows', async () => {
    const user = userEvent.setup()
    await user.click(await open('emi-credit', /add loan/i))
    await user.type(screen.getByLabelText(/^name$/i), 'Home loan')
    await user.type(screen.getByLabelText(/original amount/i), '30L')
    await user.type(screen.getByLabelText(/still owed/i), '24L')
    await user.type(screen.getByLabelText(/interest rate/i), '8.65')
    await user.type(screen.getByLabelText(/monthly emi/i), '26000')
    await user.type(screen.getByLabelText(/months left/i), '180')
    await user.click(screen.getByRole('button', { name: /save liability/i }))

    await waitFor(() => {
      expect(useData.getState().snapshot?.liabilities).toHaveLength(1)
    })

    const loan = useData.getState().snapshot?.liabilities[0]
    expect(loan?.outstanding).toBe(2_400_000)
    expect(loan?.emi).toBe(26_000)
    expect(loan?.tenureRemaining).toBe(180)
    /* Seeded, not left empty — that is the whole point. */
    expect(loan?.startedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('adds a goal without being asked for a date', async () => {
    const user = userEvent.setup()
    await user.click(await open('goals', /add goal/i))
    await user.type(screen.getByLabelText(/^goal$/i), 'Emergency fund')
    await user.type(screen.getByLabelText(/target amount/i), '6L')
    await user.type(screen.getByLabelText(/saved so far/i), '0')
    await user.click(screen.getByRole('button', { name: /save goal/i }))

    await waitFor(() => {
      expect(useData.getState().snapshot?.goals).toHaveLength(1)
    })
    /* A goal points at the future, so its seeded date has to be ahead of today. */
    const goal = useData.getState().snapshot?.goals[0]
    expect(goal?.targetDate).toBeDefined()
    expect(goal?.targetDate.localeCompare(new Date().toISOString().slice(0, 10))).toBe(1)
  })

  it('names the box you missed instead of quoting the schema at you', async () => {
    const user = userEvent.setup()
    await user.click(await open('emi-credit', /add loan/i))
    await user.type(screen.getByLabelText(/^name$/i), 'Car loan')
    /* Everything else left blank. */
    await user.click(screen.getByRole('button', { name: /save liability/i }))

    expect(await screen.findByText('Still owed is needed.')).toBeInTheDocument()
    expect(screen.getByText('Monthly EMI is needed.')).toBeInTheDocument()
    expect(useData.getState().snapshot?.liabilities ?? []).toHaveLength(0)
  })

  it('will not save a record with no name', async () => {
    const user = userEvent.setup()
    await user.click(await open('income', /add income/i))
    await user.type(screen.getByLabelText(/amount/i), '5000')
    await user.click(screen.getByRole('button', { name: /save income source/i }))

    expect(useData.getState().snapshot?.incomeSources ?? []).toHaveLength(0)
  })
})
