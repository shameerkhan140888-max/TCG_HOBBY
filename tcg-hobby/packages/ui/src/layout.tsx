import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './lib/cn';

export function PageShell({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-h-screen bg-surface-ink text-neutral-50', className)} {...props} />;
}

export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)} {...props} />;
}

export function Section({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('py-10 sm:py-14 lg:py-16', className)} {...props} />;
}

export function Stack({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-4', className)} {...props} />;
}

export function SplitLayout({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-surface-ink text-neutral-50 lg:grid-cols-[280px_1fr]">
      {sidebar}
      <main className="min-w-0 border-l border-surface-line bg-surface-base">{children}</main>
    </div>
  );
}
