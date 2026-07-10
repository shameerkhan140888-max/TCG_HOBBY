import type { ImgHTMLAttributes } from 'react';
import { cn } from './lib/cn';

export type BrandMarkProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  className?: string | undefined;
  alt?: string | undefined;
};

export function BrandMark({ className, alt = 'TCG Hobby logo', ...props }: BrandMarkProps) {
  const width = typeof props.width === 'number' ? props.width : 160;
  const height = typeof props.height === 'number' ? props.height : 56;
  return (
    <img
      alt={alt}
      className={cn('block h-auto object-contain', className)}
      height={height}
      src="/brand/tcg-hobby-horizontal-dark.svg"
      width={width}
      {...props}
    />
  );
}
