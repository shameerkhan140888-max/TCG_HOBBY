'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@tcg-hobby/ui';

type MerchandisingRailScrollerProps = {
  labelledBy?: string;
  children: React.ReactNode;
};

function shouldReduceMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function MerchandisingRailScroller({ labelledBy, children }: MerchandisingRailScrollerProps) {
  const fallbackId = useId();
  const labelId = labelledBy ?? fallbackId;
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const overflow = scroller.scrollWidth > scroller.clientWidth + 2;
    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    setCanScroll(overflow);
    setCanScrollPrevious(scroller.scrollLeft > 2);
    setCanScrollNext(scroller.scrollLeft < maxScrollLeft - 2);
  }, []);

  useEffect(() => {
    updateScrollState();
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(scroller);
    scroller.addEventListener('scroll', updateScrollState, { passive: true });

    return () => {
      resizeObserver.disconnect();
      scroller.removeEventListener('scroll', updateScrollState);
    };
  }, [updateScrollState]);

  function scrollByPage(direction: 'previous' | 'next') {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction === 'next' ? scroller.clientWidth * 0.86 : -scroller.clientWidth * 0.86,
      behavior: shouldReduceMotion() ? 'auto' : 'smooth',
    });
  }

  return (
    <div className="space-y-4">
      <div
        ref={scrollerRef}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,122,26,0.55)_transparent] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
        role="list"
        aria-labelledby={labelId}
      >
        {children}
      </div>
      {canScroll ? (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Show previous recommendations"
            onClick={() => scrollByPage('previous')}
            disabled={!canScrollPrevious}
          >
            <span aria-hidden="true">&lt;</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Show next recommendations"
            onClick={() => scrollByPage('next')}
            disabled={!canScrollNext}
          >
            <span aria-hidden="true">&gt;</span>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
