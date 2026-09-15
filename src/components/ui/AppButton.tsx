import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * §4 — gold is expensive. Only `primary` spends it; everything else is neutral.
 * §10.8 — every size clears a 44x44 tap target.
 */
const button = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-button font-medium',
    'transition-colors duration-150 select-none',
    'disabled:cursor-not-allowed disabled:opacity-60',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-gold text-on-gold hover:bg-gold-strong',
        outline: 'border border-border text-text hover:border-border-strong hover:bg-surface-2',
        ghost: 'text-text-2 hover:bg-surface-2 hover:text-text',
        danger: 'border border-danger/40 text-danger hover:bg-danger/10',
      },
      size: {
        /* min-h-11 is 44px — the §10.8 floor, not a suggestion. */
        md: 'min-h-11 px-4 text-body',
        sm: 'min-h-11 px-3 text-meta',
        icon: 'min-h-11 min-w-11',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'outline', size: 'md', block: false },
  },
)

export type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button> & { children?: ReactNode }

export function AppButton({
  variant,
  size,
  block,
  className,
  type = 'button',
  children,
  ...rest
}: AppButtonProps) {
  return (
    <button type={type} className={cn(button({ variant, size, block }), className)} {...rest}>
      {children}
    </button>
  )
}
