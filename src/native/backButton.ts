/**
 * Android's hardware/gesture back.
 *
 * This is the single loudest difference between a web page in a shell and an app
 * that feels native. Left unhandled, Capacitor's default is to close the app
 * from wherever you are — press back once on a detail screen and the whole thing
 * disappears, which no Android user expects.
 *
 * The order here is the platform convention: whatever is on top closes first, a
 * screen goes back to the one before it, and only a root destination exits.
 */

/** Returns true if it consumed the press. */
export type BackHandler = () => boolean

const handlers: BackHandler[] = []

/**
 * Registers a handler for the topmost dismissible thing on screen — a sheet, a
 * dialog, an open filter panel. Returns the unsubscribe, so a component can
 * register on mount and drop off on unmount.
 *
 * The stack is LIFO: a sheet opened over a dialog closes first.
 */
export function pushBackHandler(handler: BackHandler): () => void {
  handlers.push(handler)
  return () => {
    const index = handlers.lastIndexOf(handler)
    if (index !== -1) handlers.splice(index, 1)
  }
}

/**
 * Routes a user would consider the bottom of the stack. Back from here leaves
 * the app rather than walking into whatever happened to be visited before.
 */
const ROOT_PATHS = new Set(['/', '/app', '/app/dashboard'])

export function handleBackPress(exitApp: () => void): void {
  for (let index = handlers.length - 1; index >= 0; index -= 1) {
    const handler = handlers[index]
    if (handler && handler()) return
  }

  if (ROOT_PATHS.has(window.location.pathname)) {
    exitApp()
    return
  }

  window.history.back()
}
