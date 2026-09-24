import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * tailwind-merge, taught this app's own scales.
 *
 * Out of the box it knows Tailwind's default classes and guesses at everything
 * else: an unrecognised `text-*` is filed as a font size. Both of this app's
 * §4.2 type scale (`text-body`) and its §4.1 colours (`text-on-gold`) are
 * unrecognised, so the two landed in one group and the later class silently
 * deleted the earlier one. `cn('text-on-gold', 'text-base')` returned
 * `text-base` — a primary button whose label was the page's default colour,
 * near-black on a dark green fill, which is how it was found.
 *
 * Listing the scales here puts size and colour back in separate groups, so they
 * stop cancelling each other and a genuine conflict — two sizes, two colours —
 * still resolves last-one-wins as it should.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      /* §4.2 — the type scale in index.css. */
      'font-size': [
        {
          text: ['micro', 'caption', 'meta', 'body', 'lead', 'title', 'heading', 'page', 'hero'],
        },
      ],
      /* §4.1 — every colour token, plus the aliases that survive the palette swaps. */
      'text-color': [
        {
          text: [
            'text',
            'text-2',
            'text-label',
            'text-3',
            'accent',
            'accent-strong',
            'accent-dim',
            'on-accent',
            'reward',
            'reward-dim',
            'on-reward',
            'gold',
            'gold-strong',
            'gold-dim',
            'on-gold',
            'danger',
            'warn',
            'success',
            'info',
            'cat-sky',
            'cat-mint',
            'cat-violet',
            'cat-amber',
            'cat-rose',
            'cat-teal',
          ],
        },
      ],
    },
  },
})

/** Merge conditional class names, with later Tailwind utilities winning conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
