'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from './lib/cn';

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function calculateCountdownParts(targetDate: string | Date): CountdownParts {
  const target = targetDate instanceof Date ? targetDate : new Date(targetDate);
  const totalMs = Math.max(target.getTime() - Date.now(), 0);
  return {
    days: Math.floor(totalMs / (1000 * 60 * 60 * 24)),
    hours: Math.floor((totalMs / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((totalMs / (1000 * 60)) % 60),
    seconds: Math.floor((totalMs / 1000) % 60),
  };
}

export type CountdownTimerProps = {
  targetDate: string | Date;
  className?: string;
  compact?: boolean;
};

export function CountdownTimer({ targetDate, className, compact = false }: CountdownTimerProps) {
  const initial = useMemo(() => calculateCountdownParts(targetDate), [targetDate]);
  const [parts, setParts] = useState(initial);

  useEffect(() => {
    setParts(calculateCountdownParts(targetDate));
    const timer = window.setInterval(() => {
      setParts(calculateCountdownParts(targetDate));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [targetDate]);

  const cells = [
    { label: 'Days', value: parts.days },
    { label: 'Hrs', value: parts.hours },
    { label: 'Min', value: parts.minutes },
    { label: 'Sec', value: parts.seconds },
  ];

  return (
    <div className={cn('grid grid-cols-4 gap-2', className)}>
      {cells.map((cell) => (
        <div key={cell.label} className="rounded-md border border-surface-line bg-surface-ink px-3 py-2 text-center">
          <div className={cn('font-black text-neutral-50', compact ? 'text-lg' : 'text-2xl')}>{String(cell.value).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">{cell.label}</div>
        </div>
      ))}
    </div>
  );
}
