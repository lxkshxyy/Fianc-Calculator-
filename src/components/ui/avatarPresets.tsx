import type { ReactNode } from 'react'

/**
 * The six preset profile pictures, drawn as SVG.
 *
 * A few hundred bytes each, sharp at every size, and no network or asset
 * pipeline involved. Deliberately varied — different ages, hair and skin tones
 * — so that "pick one that feels like you" is a real choice. Stored on the
 * profile by id (`preset:<id>`), so a drawing can be refined here and every
 * profile using it follows.
 */

type Look = {
  bg: string
  skin: string
  shirt: string
  /** Hair drawn behind the head (long hair falls behind the shoulders). */
  back?: ReactNode
  /** Hair and accessories drawn over the head. */
  front: ReactNode
}

const EYES_Y = 29

export function face(look: Look): ReactNode {
  return (
    <>
      <rect width="64" height="64" fill={look.bg} />
      {look.back}
      {/* Shoulders, then neck, then head — painter's order. */}
      <path d="M9 64c1.5-12.5 11-19 23-19s21.5 6.5 23 19z" fill={look.shirt} />
      <path d="M27 38h10v8.5c0 2.8-2.2 4.5-5 4.5s-5-1.7-5-4.5z" fill={look.skin} />
      <path
        d="M27 44.5c1.6 1.2 3.2 1.8 5 1.8s3.4-.6 5-1.8"
        fill="none"
        stroke="#000"
        strokeOpacity=".1"
        strokeWidth="2"
      />
      <ellipse cx="32" cy="28" rx="11.5" ry="12.5" fill={look.skin} />
      <ellipse cx="20.7" cy="29.5" rx="2" ry="2.8" fill={look.skin} />
      <ellipse cx="43.3" cy="29.5" rx="2" ry="2.8" fill={look.skin} />
      <circle cx="27.6" cy={EYES_Y} r="1.35" fill="#2a1f1a" />
      <circle cx="36.4" cy={EYES_Y} r="1.35" fill="#2a1f1a" />
      <path
        d="M28.6 34.2c2 1.7 4.8 1.7 6.8 0"
        fill="none"
        stroke="#2a1f1a"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
      <circle cx="25.2" cy="32.4" r="1.8" fill="#e8766b" opacity=".18" />
      <circle cx="38.8" cy="32.4" r="1.8" fill="#e8766b" opacity=".18" />
      {look.front}
    </>
  )
}

export const AVATAR_PRESETS: { id: string; look: Look }[] = [
  {
    id: 'sunrise',
    look: {
      bg: '#fde2c4',
      skin: '#f0c19a',
      shirt: '#1f8a70',
      front: (
        <path
          d="M20.3 27.5c-.6-8.6 4.9-14.6 12.2-14.6 7.2 0 12.4 5.4 11.3 14.2-1.4-3.7-3.2-6.1-6.3-7.4-3.3 2.5-9.6 3.6-15.1 2.7-.9 1.6-1.6 3.3-2.1 5.1z"
          fill="#2b211d"
        />
      ),
    },
  },
  {
    id: 'lotus',
    look: {
      bg: '#e6dcfb',
      skin: '#c68b62',
      shirt: '#c2417a',
      back: <path d="M17.5 30c0-11 6.4-17.8 14.5-17.8S46.5 19 46.5 30v21h-29z" fill="#1d1512" />,
      front: (
        <path
          d="M20.4 28.8c-.3-9.3 5-15.2 11.6-15.2 6.7 0 12 5.9 11.6 15.2-2.6-4.8-6.2-7.9-11.6-9.2-3.6 3.4-7.4 6.4-11.6 9.2z"
          fill="#1d1512"
        />
      ),
    },
  },
  {
    id: 'banyan',
    look: {
      bg: '#d4efdf',
      skin: '#8c5a3c',
      shirt: '#3a5a8c',
      front: (
        <>
          <path
            d="M20.6 26.2c-.4-8 5-13.3 11.5-13.3s11.9 5.3 11.4 13.3c-1.9-3.2-4.7-4.9-11.4-4.9s-9.6 1.7-11.5 4.9z"
            fill="#16110e"
          />
          <path
            d="M20.8 29.6c.4 7.9 5.1 12.4 11.2 12.4s10.8-4.5 11.2-12.4c-1.1 2.6-2.7 3.4-4.3 3.4-1.9 0-3.4-1.3-6.9-1.3s-5 1.3-6.9 1.3c-1.6 0-3.2-.8-4.3-3.4z"
            fill="#16110e"
          />
          <path
            d="M28.6 35.4c2 1.2 4.8 1.2 6.8 0"
            fill="none"
            stroke="#f3e1d6"
            strokeLinecap="round"
            strokeWidth="1.3"
          />
        </>
      ),
    },
  },
  {
    id: 'monsoon',
    look: {
      bg: '#d3e7f8',
      skin: '#e6b28c',
      shirt: '#223047',
      front: (
        <>
          <g fill="#4a2f22">
            <circle cx="22.5" cy="22" r="4.4" />
            <circle cx="27" cy="17.2" r="4.6" />
            <circle cx="32.6" cy="15.6" r="4.8" />
            <circle cx="38" cy="17.4" r="4.6" />
            <circle cx="42" cy="22.2" r="4.3" />
            <circle cx="21" cy="26.8" r="2.8" />
            <circle cx="43.2" cy="26.8" r="2.8" />
          </g>
          <g fill="none" stroke="#1b2430" strokeWidth="1.4">
            <circle cx="27.6" cy={EYES_Y} r="3.4" />
            <circle cx="36.4" cy={EYES_Y} r="3.4" />
            <path d="M31 28.6c.6-.5 1.4-.5 2 0" />
          </g>
        </>
      ),
    },
  },
  {
    id: 'marigold',
    look: {
      bg: '#ffe2a1',
      skin: '#a86a44',
      shirt: '#d9632b',
      front: (
        <>
          <circle cx="32" cy="12.2" r="5.6" fill="#20160f" />
          <path
            d="M20.4 28.2c-.5-9 4.9-14.4 11.6-14.4s12.1 5.4 11.6 14.4c-1.2-4.6-4.6-7.9-11.6-7.9s-10.4 3.3-11.6 7.9z"
            fill="#20160f"
          />
          <circle cx="32" cy="22.6" r=".9" fill="#c2203a" />
        </>
      ),
    },
  },
  {
    id: 'elder',
    look: {
      bg: '#ece6df',
      skin: '#d9a57b',
      shirt: '#6b4f8a',
      front: (
        <>
          <path
            d="M20.3 27.5c-.6-8.6 4.9-14.6 12.2-14.6 7.2 0 12.4 5.4 11.3 14.2-1.4-3.7-3.2-6.1-6.3-7.4-3.3 2.5-9.6 3.6-15.1 2.7-.9 1.6-1.6 3.3-2.1 5.1z"
            fill="#dcdcdc"
          />
          <path
            d="M27.6 32.5c1.4-1.1 2.9-1.3 4.4-.5 1.5-.8 3-.6 4.4.5-1.4 1-2.9 1.2-4.4.6-1.5.6-3 .4-4.4-.6z"
            fill="#d2d2d2"
          />
          <g fill="none" stroke="#6b5a4a" strokeWidth="1.3">
            <rect x="23.8" y="26.2" width="7.4" height="5.6" rx="2.2" />
            <rect x="32.8" y="26.2" width="7.4" height="5.6" rx="2.2" />
            <path d="M31.2 28.4h1.6" />
          </g>
        </>
      ),
    },
  },
]

export const PRESET_IDS = AVATAR_PRESETS.map((preset) => preset.id)

export function presetRef(id: string): string {
  return `preset:${id}`
}
