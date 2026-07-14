import type { SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function NativeSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-10 w-full appearance-none rounded-md border border-input bg-card px-3 py-1 pr-9 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow,border-color] disabled:pointer-events-none disabled:opacity-50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive',
        className,
      )}
      data-slot="native-select"
      {...props}
    />
  );
}
