import type { ImgHTMLAttributes } from 'react';
import { cn } from './lib/cn';

export type BrandMarkProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  className?: string | undefined;
  alt?: string | undefined;
};

export function BrandMark({ className, alt = 'TCG Hobby logo', ...props }: BrandMarkProps) {
  return (
    <img
      alt={alt}
      className={cn('block object-contain', className)}
      height={1280}
      src="/brand/tcg-hobby-logo.png"
      width={1280}
      {...props}
    />
  );
}
