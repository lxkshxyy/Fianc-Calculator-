import type { VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { button } from './buttonStyles'

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
