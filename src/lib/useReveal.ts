import { useEffect, useRef } from 'react'

/**
 * Replays an entrance animation whenever the element comes into view.
 *
 * A mount-triggered animation fires once, during page load, often while the
 * element is still below the fold — so the thing meant to draw the eye has
 * finished before the eye arrives. This watches instead: the class goes on when
 * the element scrolls into view and comes off when it leaves, so the animation
 * runs every time it is actually looked at.
 *
 * Two fallbacks matter. Without IntersectionObserver (jsdom, old webviews) the
 * class is added straight away, so the end state is correct and nothing is
 * hidden. And the animation is only ever an *entrance* — the element's resting
 * style is already right, so if every animation on the machine is disabled the
 * bar still shows its real width.
 */
export function useReveal<T extends HTMLElement>() {
  /* `T | null`, not `T` — a callback ref has to be able to write to it. */
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const node = ref.current
    if (node === null) return

    if (typeof IntersectionObserver === 'undefined') {
      node.classList.add('reveal')
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry === undefined) return
        /* Removing on exit is what lets it replay on the way back. */
        node.classList.toggle('reveal', entry.isIntersecting)
      },
      { threshold: 0.2 },
    )

    observer.observe(node)
    return () => {
      observer.disconnect()
    }
  }, [])

  return ref
}
