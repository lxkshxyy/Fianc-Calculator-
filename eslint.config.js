import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/*
 * §2.2 — these are wrong in any file that ships to a browser.
 */
const BROWSER_BANS = [
  {
    selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
    message: '§2.2 forbids dangerouslySetInnerHTML.',
  },
  {
    selector: 'MemberExpression[property.name="reload"][object.property.name="location"]',
    message: '§2.2 forbids window.location.reload() as error handling.',
  },
  {
    selector: 'MemberExpression[property.name="reload"][object.name="location"]',
    message: '§2.2 forbids location.reload() as error handling.',
  },
]

/*
 * §2.1.9 applies to client code only. Vite does not shim `process` in the
 * bundle, so reading it there throws before any fallback runs — but vite.config.ts
 * and vitest.setup.ts run in Node, where process.env is the only way to read the
 * environment. Scoping this to src/ rather than banning it everywhere is the
 * difference between a rule that protects the app and one people learn to
 * suppress inline.
 */
const NO_PROCESS_ENV = {
  selector: 'MemberExpression[object.name="process"][property.name="env"]',
  message: '§2.1.9 — read config via import.meta.env.VITE_*; Vite does not shim process.',
}

export default tseslint.config(
  /* `android/` holds a copy of the built bundle inside the native project, and
     `_to_delete/` is parked files — neither is source, and linting either
     buries the real result under hundreds of errors from minified code. */
  { ignores: ['dist', 'node_modules', 'coverage', 'dev-dist', 'android', '_to_delete'] },

  /* TypeScript sources — type-aware linting, which is what §2.1.1 needs. */
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      /*
       * §2.1.1 — tsc can see neither of these: explicit `any` is legal under `strict`,
       * and `@ts-ignore` is by construction the thing that makes tsc pass.
       * ESLint is the only enforcement, so both are errors and §2.3 runs lint at every gate.
       */
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 10,
        },
      ],

      /* §2.2 and §2.1.9 — forbidden outright. */
      'no-restricted-syntax': ['error', ...BROWSER_BANS, NO_PROCESS_ENV],
    },
  },

  /* Node-side TypeScript config files — everything above still applies except
     the process.env ban, which is about the browser bundle, not about Node. */
  {
    files: ['vite.config.ts', 'vitest.setup.ts', 'capacitor.config.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      'no-restricted-syntax': ['error', ...BROWSER_BANS],
    },
  },

  /* Plain JS (this file) — no type information available, so typed rules are off. */
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },

  prettier,
)
