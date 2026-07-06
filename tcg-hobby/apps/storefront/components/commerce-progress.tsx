import type { HTMLAttributes } from 'react';
import { Card, CardContent, cn } from '@tcg-hobby/ui';

export type CommerceProgressStep = 'basket' | 'delivery' | 'payment' | 'confirmation';

type CommerceProgressProps = HTMLAttributes<HTMLDivElement> & {
  currentStep: CommerceProgressStep;
};

const steps: Array<{
  key: CommerceProgressStep;
  label: string;
  helper: string;
}> = [
  { key: 'basket', label: 'Basket', helper: 'Review items' },
  { key: 'delivery', label: 'Delivery', helper: 'Address and shipping' },
  { key: 'payment', label: 'Payment', helper: 'Stripe test mode' },
  { key: 'confirmation', label: 'Confirmation', helper: 'Order receipt' },
];

export function CommerceProgress({ currentStep, className, ...props }: CommerceProgressProps) {
  const currentIndex = steps.findIndex((step) => step.key === currentStep);

  return (
    <Card className={cn('overflow-hidden border-surface-line/80 bg-surface-base/70', className)} {...props}>
      <CardContent className="p-4 sm:p-5">
        <ol className="grid gap-3 md:grid-cols-4">
          {steps.map((step, index) => {
            const isCurrent = step.key === currentStep;
            const isCompleted = currentIndex > index;

            return (
              <li
                key={step.key}
                className={cn(
                  'rounded-xl border px-4 py-3 transition-colors',
                  isCurrent
                    ? 'border-accent bg-accent/10'
                    : isCompleted
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-surface-line bg-surface-ink/70',
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'grid h-8 w-8 flex-none place-items-center rounded-full text-sm font-bold',
                      isCurrent
                        ? 'bg-accent text-neutral-950'
                        : isCompleted
                          ? 'bg-emerald-400/20 text-emerald-300'
                          : 'border border-surface-line bg-surface-base text-neutral-400',
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">{step.label}</p>
                    <p className="mt-1 text-sm font-medium text-neutral-50">{step.helper}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
