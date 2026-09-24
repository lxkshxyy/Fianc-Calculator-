import { cn } from '@/lib/cn'
import { AVATAR_PRESETS, face, PRESET_IDS } from './avatarPresets'

/**
 * The person's picture: a preset drawing, their own photo, or — until they pick
 * either — the first letter of their name.
 *
 * The presets themselves are drawn in avatarPresets.tsx.
 */

export function PresetArt({ id, className }: { id: string; className?: string }) {
  const preset = AVATAR_PRESETS.find((entry) => entry.id === id)
  if (preset === undefined) return null
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className} focusable="false">
      {face(preset.look)}
    </svg>
  )
}

/**
 * `size` is in pixels and sets both dimensions, so the circle never becomes an
 * oval inside a flex row that wants to stretch it.
 */
export function Avatar({
  avatar,
  name,
  size = 40,
  className,
}: {
  avatar: string | null | undefined
  name: string
  size?: number
  className?: string
}) {
  const style = { width: size, height: size }
  const base = cn('rounded-pill shrink-0 overflow-hidden', className)

  if (avatar?.startsWith('preset:') === true) {
    const id = avatar.slice('preset:'.length)
    if (PRESET_IDS.includes(id)) {
      return (
        <span className={cn(base, 'block')} style={style}>
          <PresetArt id={id} className="block size-full" />
        </span>
      )
    }
  }

  if (avatar?.startsWith('data:image/') === true) {
    return <img src={avatar} alt="" className={cn(base, 'object-cover')} style={style} />
  }

  const initial = name.trim().slice(0, 1).toUpperCase() || '?'
  return (
    <span
      aria-hidden
      className={cn(base, 'bg-gold/15 text-gold flex items-center justify-center font-semibold')}
      style={{ ...style, fontSize: Math.round(size * 0.42) }}
    >
      {initial}
    </span>
  )
}
