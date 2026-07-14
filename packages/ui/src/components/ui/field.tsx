import type { FieldsetHTMLAttributes, HTMLAttributes, LabelHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Field({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid gap-2', className)} data-slot="field" {...props} />;
}

export function FieldGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid gap-4', className)} data-slot="field-group" {...props} />;
}

export function FieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-medium text-foreground',
        className,
      )}
      data-slot="field-label"
      {...props}
    />
  );
}

export function FieldDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('m-0 text-xs leading-relaxed text-muted-foreground', className)}
      data-slot="field-description"
      {...props}
    />
  );
}

export function FieldSet({ className, ...props }: FieldsetHTMLAttributes<HTMLFieldSetElement>) {
  return (
    <fieldset
      className={cn('grid gap-3 rounded-lg border border-border p-4', className)}
      data-slot="field-set"
      {...props}
    />
  );
}

export function FieldLegend({ className, ...props }: HTMLAttributes<HTMLLegendElement>) {
  return (
    <legend
      className={cn('px-1 text-sm font-semibold text-foreground', className)}
      data-slot="field-legend"
      {...props}
    />
  );
}
