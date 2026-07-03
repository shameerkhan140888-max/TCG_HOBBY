import type { HTMLAttributes } from 'react';
import { cn } from './lib/cn';

export type BadgeVariant = 'accent' | 'neutral' | 'success' | 'warning' | 'outline';

const badgeStyles: Record<BadgeVariant, string> = {
  accent: 'border-accent/30 bg-accent/10 text-accent-soft',
  neutral: 'border-surface-line bg-surface-panel text-neutral-200',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  outline: 'border-surface-line bg-transparent text-neutral-200',
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
        badgeStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
