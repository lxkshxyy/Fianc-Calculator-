import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/*
 * Testing Library auto-cleans only when vitest runs with `globals: true`, which
 * this project deliberately does not — so it is registered explicitly here.
 *
 * Without it, a second `render()` in the same file mounts alongside the first
 * and every query fails with "found multiple elements", which reads like a
 * duplicate-DOM bug in the component under test rather than a harness gap.
 */
afterEach(() => {
  cleanup()
})

/*
 * jsdom implements neither `matchMedia` nor `ResizeObserver`, though both are
 * universally available in every browser this app targets. They are stubbed here
 * rather than feature-detected in product code, so components can use them
 * directly without carrying a branch that only ever runs in tests.
 *
 * (AppLayout's ResizeObserver *is* feature-detected, but for a different reason:
 * it runs at shell mount, where a throw would blank the app.)
 */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}
