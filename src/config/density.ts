/**
 * How tightly the app packs its content.
 *
 * 'dense'  — business-dashboard spacing. More on screen, tighter cards. This is
 *            the reference look: FINNOVA, Aura Store, the Jewellery dashboard.
 * 'calm'   — the original, roomier spacing. A personal finance app is one
 *            person's money rather than a sales desk, and the extra air suits
 *            that. Kept here so switching back is one word, not a rewrite.
 *
 * Both are real, both are maintained. Nothing about them is hardcoded in a
 * component: they set --pad-card and --gap-section on <html>, and every card
 * and section reads those through Tailwind's `p-card` / `space-y-section`.
 */
export type Density = 'calm' | 'dense'

export const DENSITY: Density = 'calm'

/** Stamps <html data-density>. Called before first paint, like the theme. */
export function applyDensity(density: Density = DENSITY): void {
  document.documentElement.setAttribute('data-density', density)
}
