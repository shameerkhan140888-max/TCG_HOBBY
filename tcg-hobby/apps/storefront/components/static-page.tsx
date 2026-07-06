import type { ReactNode } from 'react';
import { Container, Section } from '@tcg-hobby/ui';

type StaticPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function StaticPage({ eyebrow, title, description, children }: StaticPageProps) {
  return (
    <Section>
      <Container className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">{eyebrow}</p>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-50 sm:text-4xl">{title}</h1>
          <p className="max-w-3xl text-base leading-7 text-neutral-300">{description}</p>
        </div>
        <div className="max-w-3xl space-y-4 text-sm leading-7 text-neutral-400">{children}</div>
      </Container>
    </Section>
  );
}
