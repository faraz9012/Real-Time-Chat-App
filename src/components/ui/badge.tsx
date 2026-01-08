import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700',
  {
    variants: {
      variant: {
        default: 'bg-slate-100',
        accent: 'border-amber-200 bg-amber-100 text-amber-800',
        success: 'border-emerald-200 bg-emerald-100 text-emerald-800',
        offline: 'border-red-300 bg-red-100 text-red-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <div className={cn(badgeVariants({ variant, className }))} {...props} />
)

export { Badge, badgeVariants }
