import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { routeMetaFor } from '@/app/nav/navigation'
import { routes } from '@/app/router'
import { useData } from '@/data/store/data'
import { useSession } from '@/data/store/session'
import { en } from './en'
import { hi } from './hi'
import { englishT, translate } from './translate'

/**
 * The language switch used to save a preference nothing read, so the app stayed
 * in English however many times you pressed हिन्दी. These tests are about the
 * part that was missing: pressing it has to change what is on the screen.
 */

describe('translation', () => {
  it('returns the Hindi line when there is one', () => {
    expect(translate('hi', 'nav.income')).toBe('आमदनी')
    expect(translate('en', 'nav.income')).toBe('Income')
  })

  it('falls back to English rather than showing a raw key', () => {
    /*
     * Proven against a real key deliberately left untranslated, not a fake one:
     * the point is what a user sees for copy nobody has got to yet.
     */
    const untranslated = (Object.keys(en) as (keyof typeof en)[]).filter(
      (key) => hi[key] === undefined,
    )
    for (const key of untranslated) {
      expect(translate('hi', key)).toBe(en[key])
      expect(translate('hi', key)).not.toBe(key)
    }
  })

  it('moves placeholders where the sentence needs them', () => {
    expect(translate('en', 'emi.monthsLeft', { count: 180 })).toBe('180 months left')
    expect(translate('hi', 'emi.monthsLeft', { count: 180 })).toBe('180 महीने बाकी')
  })

  it('leaves an unknown placeholder alone instead of printing undefined', () => {
    expect(translate('en', 'emi.monthsLeft', {})).toBe('{count} months left')
  })
})

describe('greeting somebody by name', () => {
  it('uses the first word of the name', () => {
    expect(routeMetaFor('/app/dashboard', undefined, 'Lakshay Sharma')?.accent).toBe('Lakshay')
    expect(routeMetaFor('/app/dashboard', undefined, 'Lakshay')?.accent).toBe('Lakshay')
    expect(routeMetaFor('/app/dashboard', undefined, '  Lakshay   Kumar  ')?.accent).toBe('Lakshay')
  })

  it('greets without a name rather than trailing a comma', () => {
    for (const empty of [null, undefined, '', '   ']) {
      const meta = routeMetaFor('/app/dashboard', undefined, empty)
      expect(meta?.title).toBe('Welcome back')
      expect(meta?.accent).toBeUndefined()
    }
  })

  it('puts the name where each language wants it', () => {
    const english = routeMetaFor('/app/dashboard', englishT, 'Lakshay')
    expect(english?.title + (english?.accent ?? '') + (english?.titleTail ?? '')).toBe(
      'Welcome back, Lakshay',
    )

    const hindi = routeMetaFor(
      '/app/dashboard',
      (key, vars) => translate('hi', key, vars),
      'Lakshay',
    )
    /* Name first in Hindi — nothing before it, the sentence after it. */
    expect(hindi?.title).toBe('')
    expect(hindi?.accent).toBe('Lakshay')
    expect(hindi?.titleTail).toBe(', आपका फिर से स्वागत है')
  })
})

describe('switching the language', () => {
  beforeEach(async () => {
    useSession.setState({ signedIn: true })
    useData.setState({ status: 'idle', snapshot: null, error: null })
    await useData.getState().clearEverything()
    document.documentElement.lang = 'en'
  })

  /*
   * Every route is lazily imported, so waiting for the data skeleton to clear is
   * not enough — the Suspense fallback is still up. Waiting for the control the
   * test is about to click covers both.
   */
  /* The language picker lives on the Profile screen, beside the name and picture. */
  async function openProfile(): Promise<HTMLElement> {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/profile'] })
    render(<RouterProvider router={router} />)
    return await screen.findByRole('button', { name: 'हिन्दी' }, { timeout: 5000 })
  }

  it('changes the navigation, the heading and <html lang>', async () => {
    const user = userEvent.setup()
    const hindiButton = await openProfile()

    /* English first — the screen heading, the section labels, the tab bar. */
    expect(screen.getAllByRole('heading', { name: 'Profile' }).length).toBeGreaterThan(0)
    expect(screen.getByText('Your details')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')

    await user.click(hindiButton)

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'प्रोफ़ाइल' }).length).toBeGreaterThan(0)
    })
    expect(screen.getByText('आपकी जानकारी')).toBeInTheDocument()
    expect(screen.getByText('भाषा')).toBeInTheDocument()
    /*
     * Twice: the desktop sidebar and the mobile tab bar both render it, and both
     * are in the tree at once under jsdom. Two hits is the assertion — one would
     * mean a nav surface was missed.
     */
    expect(screen.getAllByText('डैशबोर्ड')).toHaveLength(2)
    expect(screen.getAllByText('EMI और क्रेडिट').length).toBeGreaterThan(0)
    expect(document.documentElement.lang).toBe('hi')

    /* And back, so the switch is not one-way. */
    await user.click(screen.getByRole('button', { name: 'English' }))
    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'Profile' }).length).toBeGreaterThan(0)
    })
    expect(document.documentElement.lang).toBe('en')
  })

  it('renders the greeting with the name in the live header', async () => {
    await useData.getState().saveProfile({ displayName: 'Lakshay Sharma' })
    const router = createMemoryRouter(routes, { initialEntries: ['/app/dashboard'] })
    render(<RouterProvider router={router} />)

    const heading = await screen.findByRole('heading', { name: /Welcome back, Lakshay/ })
    expect(heading).toBeInTheDocument()
    /* The surname is not in the greeting. */
    expect(heading.textContent).not.toMatch(/Sharma/)
  })

  it('survives a reload, because it is stored on the profile', async () => {
    const user = userEvent.setup()
    await user.click(await openProfile())
    await waitFor(() => {
      expect(useData.getState().snapshot?.profile.language).toBe('hi')
    })

    /* Re-read from storage the way a cold start does. */
    useData.setState({ status: 'idle', snapshot: null, error: null })
    await useData.getState().load()
    expect(useData.getState().snapshot?.profile.language).toBe('hi')
  })

  it('names each language in its own language, never translated', () => {
    /*
     * Someone who reads only Hindi is scanning for "हिन्दी". If the picker
     * showed the *current* language's word for Hindi, the option would be
     * invisible to exactly the person looking for it.
     */
    expect(hi['settings.language']).toBeDefined()
    expect(Object.values(hi)).not.toContain('Hindi')
  })
})
