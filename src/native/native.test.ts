import { afterEach, describe, expect, it, vi } from 'vitest'

import { handleBackPress, pushBackHandler } from './backButton'
import { isNativeApp, resolvedTheme, themeBackground } from './platform'

/**
 * The native shell must be invisible to the web build. These assert the two
 * things that would break it silently: a native branch running in a browser,
 * and Android's back button doing something other than the platform convention.
 */

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
  window.history.pushState({}, '', '/')
  vi.restoreAllMocks()
})

describe('platform detection', () => {
  it('reports web when not running in the Android shell', () => {
    expect(isNativeApp()).toBe(false)
  })

  it('reads a stamped theme', () => {
    document.documentElement.setAttribute('data-theme', 'light')
    expect(resolvedTheme()).toBe('light')
    document.documentElement.setAttribute('data-theme', 'dark')
    expect(resolvedTheme()).toBe('dark')
  })

  it('falls back to the media query when nothing is stamped (§4.1 system)', () => {
    // jsdom answers every media query false, which is the dark branch here.
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    expect(resolvedTheme()).toBe('dark')
  })

  it('gives each theme a background matching tokens.css', () => {
    expect(themeBackground('dark')).toBe('#0a0b0c')
    expect(themeBackground('light')).toBe('#f6f7f8')
  })
})

describe('android back button', () => {
  it('exits from a root destination rather than walking back through history', () => {
    window.history.pushState({}, '', '/app/dashboard')
    const exit = vi.fn()
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined)

    handleBackPress(exit)

    expect(exit).toHaveBeenCalledTimes(1)
    expect(back).not.toHaveBeenCalled()
  })

  it('goes back a screen from anywhere else', () => {
    window.history.pushState({}, '', '/app/goals')
    const exit = vi.fn()
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined)

    handleBackPress(exit)

    expect(back).toHaveBeenCalledTimes(1)
    expect(exit).not.toHaveBeenCalled()
  })

  it('lets an open sheet consume the press first', () => {
    window.history.pushState({}, '', '/app/goals')
    const exit = vi.fn()
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined)
    const close = vi.fn(() => true)
    const remove = pushBackHandler(close)

    handleBackPress(exit)

    expect(close).toHaveBeenCalledTimes(1)
    expect(back).not.toHaveBeenCalled()
    expect(exit).not.toHaveBeenCalled()

    remove()
    handleBackPress(exit)
    expect(back).toHaveBeenCalledTimes(1)
  })

  it('falls through a handler that declines the press', () => {
    window.history.pushState({}, '', '/app/goals')
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined)
    const remove = pushBackHandler(() => false)

    handleBackPress(vi.fn())

    expect(back).toHaveBeenCalledTimes(1)
    remove()
  })

  it('closes the topmost of two stacked handlers', () => {
    window.history.pushState({}, '', '/app/goals')
    const outer = vi.fn(() => true)
    const inner = vi.fn(() => true)
    const removeOuter = pushBackHandler(outer)
    const removeInner = pushBackHandler(inner)

    handleBackPress(vi.fn())

    expect(inner).toHaveBeenCalledTimes(1)
    expect(outer).not.toHaveBeenCalled()

    removeInner()
    removeOuter()
  })
})
