import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';
import { cn } from '../../lib/utils';

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-x-auto" data-slot="table-container">
      <table
        className={cn('w-full caption-bottom text-sm', className)}
        data-slot="table"
        {...props}
      />
    </div>
  );
}
export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('[&_tr]:border-b', className)} data-slot="table-header" {...props} />;
}
export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn('[&_tr:last-child]:border-0', className)}
      data-slot="table-body"
      {...props}
    />
  );
}
export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-b border-border transition-colors hover:bg-muted/45 data-[state=selected]:bg-muted',
        className,
      )}
      data-slot="table-row"
      {...props}
    />
  );
}
export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-11 px-3 text-left align-middle font-mono text-[10px] font-semibold tracking-[0.08em] whitespace-nowrap text-muted-foreground uppercase',
        className,
      )}
      data-slot="table-head"
      {...props}
    />
  );
}
export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('p-3 align-middle whitespace-nowrap', className)}
      data-slot="table-cell"
      {...props}
    />
  );
}

export function TableCaption({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <caption
      className={cn('mt-4 text-sm text-muted-foreground', className)}
      data-slot="table-caption"
      {...props}
    />
  );
}
