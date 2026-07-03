import type { HTMLAttributes } from 'react';
import { cn } from './lib/cn';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BreadcrumbsProps = HTMLAttributes<HTMLElement> & {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ className, items, ...props }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex flex-wrap items-center gap-2 text-sm text-neutral-400', className)} {...props}>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-2">
          {index > 0 ? <span className="text-neutral-600">/</span> : null}
          {item.href ? (
            <a className="transition-colors hover:text-neutral-100" href={item.href}>
              {item.label}
            </a>
          ) : (
            <span className="text-neutral-200">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
