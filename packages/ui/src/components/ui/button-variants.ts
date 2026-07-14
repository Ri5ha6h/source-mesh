import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex min-h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent px-4 py-2 text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform] outline-none select-none disabled:pointer-events-none disabled:opacity-50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white shadow-xs hover:bg-primary/90',
        outline:
          'border-border bg-card text-foreground shadow-xs hover:border-primary hover:bg-accent',
        ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
      },
      size: {
        default: 'h-10',
        sm: 'h-8 px-3 text-xs',
        wide: 'h-11 w-full',
        icon: 'size-9 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);
