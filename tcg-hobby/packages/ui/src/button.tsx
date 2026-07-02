import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from './lib/cn';

export const buttonVariants = cva(
  'inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-orange-500 text-neutral-950 hover:bg-orange-400',
        secondary: 'bg-neutral-800 text-neutral-50 hover:bg-neutral-700',
        ghost: 'text-neutral-100 hover:bg-neutral-900',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  return <Component className={cn(buttonVariants({ variant, className }))} {...props} />;
}
