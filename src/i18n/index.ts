import { useCallback, useEffect } from 'react'

import type { Language } from '@/data/schema/profile'
import { useProfile } from '@/data/store/data'
import type { TranslationKey } from './en'
import { translate, type Translate } from './translate'

/**
 * Translation, the React half.
 *
 * ── Why the language lives on the Profile record ────────────────────────────
 * Because that is where it already was. `Profile.language` has been part of the
 * schema since the beginning and Settings already wrote to it; the switch simply
 * had nothing reading it. Putting a second copy in localStorage next to the
 * theme would have been two sources of truth for one setting — §8.1's whole
 * objection — so this reads the record.
 *
 * The cost is that the profile loads asynchronously, so the first paint of a
 * cold start is English even for a Hindi user. That is a few hundred
 * milliseconds of the app shell, and the alternative is blocking the whole app
 * on a database read. English is the fallback everywhere else too, so this is
 * the same behaviour, just earlier.
 *
 * ── Missing keys fall back, they never show ─────────────────────────────────
 * `hi` is a partial dictionary, so `t()` returns the English line for anything
 * not yet translated. A user switching to Hindi sees a part-Hindi app — never
 * `nav.income` rendered raw on a screen.
 */

/** The language the app should currently render in. English until the profile loads. */
export function useLanguage(): Language {
  return useProfile()?.language ?? 'en'
}

/**
 * The hook screens use: `const t = useT()`, then `t('nav.income')`.
 *
 * Memoised on the language alone, so a component re-rendering for any other
 * reason does not get a new function identity and invalidate everything
 * downstream of it.
 */
export function useT(): Translate {
  const language = useLanguage()
  return useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(language, key, vars),
    [language],
  )
}

/**
 * Stamps `<html lang>`.
 *
 * Not cosmetic: it is what tells a screen reader which voice to use, what lets
 * the browser hyphenate and pick the right font for Devanagari, and what
 * Android's WebView reads when offering to translate the page. A Hindi app
 * still announcing `lang="en"` is read aloud in an English accent.
 */
export function useHtmlLang(): void {
  const language = useLanguage()
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
}

export type { TranslationKey, Translate }
export { translate, englishT } from './translate'
