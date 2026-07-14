import { cn } from '../lib/utils';

export function SourceMeshBrand({ className }: { className?: string }) {
  return (
    <span className={cn('brand-lockup', className)}>
      <span aria-hidden="true" className="brand-mark" />
      <span className="brand-name">Source Mesh</span>
    </span>
  );
}
