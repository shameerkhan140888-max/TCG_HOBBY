'use client';

import React from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@tcg-hobby/ui';

export function LaunchEmailSubmitButton({ compact = false }: { compact?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className={compact ? 'w-full sm:w-auto' : 'w-full'} disabled={pending} aria-disabled={pending}>
      {pending ? 'Joining...' : 'Be first to know'}
    </Button>
  );
}
