/**
 * PREVIEW MODE — the one switch that opens every paid screen.
 *
 * While this is `true` nothing in the app is locked: every Diamond module opens,
 * every journey stage is reachable, and the upgrade wall never appears. It is on
 * so the app can be walked end to end without buying anything.
 *
 * ────────────────────────────────────────────────────────────────────────────
 *  SET THIS TO false BEFORE THE APP IS PUBLISHED. Nothing else has to change.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Gating is not deleted, only suspended. `useEntitlement` still computes the
 * real answer and reports it as `earned`, so the app always knows which screens
 * are paid — see PAYWALL.md for the current list. Flipping this back to `false`
 * restores every lock exactly as it was.
 *
 * A banner is shown across the app while this is on, so it cannot ship enabled
 * without somebody noticing.
 */
export const PREVIEW_ALL = true
