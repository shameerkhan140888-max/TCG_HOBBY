'use client';

import { useState } from 'react';
import type { HTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react';
import { cn } from './lib/cn';

export type ProductImageMediaProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
  fallback: ReactNode;
};

export type ProductImageStageProps = HTMLAttributes<HTMLDivElement>;

export function ProductImageStage({ className, ...props }: ProductImageStageProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_rgba(15,15,18,0.08),0_10px_28px_rgba(0,0,0,0.16)]',
        className,
      )}
      {...props}
    />
  );
}

export function ProductImageMedia({
  src,
  fallback,
  onError,
  ...props
}: ProductImageMediaProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (failedSrc === src) {
    return <>{fallback}</>;
  }

  return (
    <img
      {...props}
      src={src}
      onError={(event) => {
        onError?.(event);
        setFailedSrc(src);
      }}
    />
  );
}
