/**
 * The product's name, in one place.
 *
 * It has changed once already. Everything that shows it — the sidebar, the
 * public header, the sign-in screen, the page title, the PWA manifest — reads
 * from here, so the next change is this file and nothing else.
 */
export const BRAND = {
  /** The full name. Websites, page titles, the manifest's `name`. */
  full: 'Wealth Rebuild Circle',
  /**
   * The short form. Used wherever the full name would be truncated by the
   * platform anyway: under an Android launcher icon, on a home-screen tile, in
   * a browser tab that is already narrow.
   */
  short: 'WRC',
  /** Wordmark split — the accent colour falls on the last word. */
  lead: 'Wealth Rebuild',
  tail: 'Circle',
  tagline: 'Personal finance and wealth building.',
} as const
