import type { Language } from '@/data/schema/profile'
import { en, type Dictionary, type TranslationKey } from './en'
import { hi } from './hi'

/**
 * Translation without React.
 *
 * The hooks live in `index.ts`. This half is importable from plain modules —
 * `navigation.ts` builds screen titles and has no business importing React to
 * do it — and from tests that want to assert a Hindi string without rendering.
 */

const DICTIONARIES: Record<Language, Dictionary> = {
  en,
  hi,
}

export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string

/**
 * Substitutes `{name}` placeholders.
 *
 * Deliberately not a template literal at the call site: Hindi puts the subject
 * in a different place in the sentence to English, and a translator has to be
 * able to move `{name}` within the line. `'{count} months left'` becomes
 * `'{count} महीने बाकी'` — same placeholder, different position.
 */
function fill(template: string, vars?: Record<string, string | number>): string {
  if (vars === undefined) return template
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const value = vars[key]
    return value === undefined ? whole : String(value)
  })
}

export function translate(
  language: Language,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const line = DICTIONARIES[language][key] ?? en[key]
  return fill(line, vars)
}

/** English, for callers outside a component tree. Tests and defaults use it. */
export const englishT: Translate = (key, vars) => translate('en', key, vars)
