import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex min-h-6 w-fit shrink-0 items-center gap-1 rounded-full border border-transparent px-2.5 py-1 font-mono text-[11px] leading-none font-semibold whitespace-nowrap',
  {
    variants: {
      tone: {
        info: 'bg-primary/10 text-primary',
        success: 'bg-success/12 text-success',
        warning: 'bg-[#fff0d1] text-[#6b3a00]',
        danger: 'bg-destructive/12 text-destructive',
      },
    },
    defaultVariants: { tone: 'info' },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} data-slot="badge" {...props} />;
}
