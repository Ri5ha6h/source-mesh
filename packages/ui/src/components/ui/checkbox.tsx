'use client';

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { cn } from '../../lib/utils';

export function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-card text-primary-foreground shadow-xs outline-none transition-[background-color,border-color,box-shadow] data-checked:border-primary data-checked:bg-primary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive',
        className,
      )}
      data-slot="checkbox"
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className="flex items-center justify-center text-current"
        data-slot="checkbox-indicator"
      >
        <svg aria-hidden="true" fill="none" height="12" viewBox="0 0 12 12" width="12">
          <path
            d="m2.25 6.1 2.2 2.15 5.3-5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
