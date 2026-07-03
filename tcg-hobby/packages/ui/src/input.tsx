import type { InputHTMLAttributes } from 'react';
import { cn } from './lib/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none transition-colors placeholder:text-neutral-500 focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}
