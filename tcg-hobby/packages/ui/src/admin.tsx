import type { HTMLAttributes, ReactNode } from 'react';
import { Button } from './button';
import { Badge } from './badge';
import { Card, CardContent } from './card';
import { Input } from './input';
import { cn } from './lib/cn';

export type PageHeaderProps = HTMLAttributes<HTMLDivElement> & {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between', className)} {...props}>
      <div className="space-y-3">
        {eyebrow ? <p className="text-sm font-semibold uppercase tracking-wide text-accent">{eyebrow}</p> : null}
        <div className="space-y-2">
          <h1 className="text-3xl font-black leading-tight sm:text-4xl">{title}</h1>
          {description ? <p className="max-w-3xl text-sm leading-6 text-neutral-400">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export type MetricCardProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: string;
  detail?: string;
};

export function MetricCard({ label, value, detail, className, ...props }: MetricCardProps) {
  return (
    <Card className={cn(className)} {...props}>
      <CardContent className="space-y-3">
        <p className="text-sm text-neutral-400">{label}</p>
        <p className="text-3xl font-black text-neutral-50">{value}</p>
        {detail ? <p className="text-sm leading-6 text-neutral-500">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}

export type DataCardProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  value: string;
  detail?: string;
  footer?: ReactNode;
};

export function DataCard({ title, value, detail, footer, className, ...props }: DataCardProps) {
  return (
    <Card className={cn(className)} {...props}>
      <CardContent className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">{title}</p>
        <p className="text-2xl font-black text-neutral-50">{value}</p>
        {detail ? <p className="text-sm leading-6 text-neutral-400">{detail}</p> : null}
        {footer ? <div className="pt-2">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

export type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'success' | 'warning' | 'accent' | 'danger';
  children: ReactNode;
};

export function StatusBadge({ tone = 'neutral', children, className, ...props }: StatusBadgeProps) {
  const variantMap = {
    neutral: 'neutral',
    success: 'success',
    warning: 'warning',
    accent: 'accent',
    danger: 'warning',
  } as const;

  return (
    <Badge className={className} variant={variantMap[tone]} {...props}>
      {children}
    </Badge>
  );
}

export type AdminTableProps = HTMLAttributes<HTMLDivElement> & {
  columns: string[];
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export function AdminTable({ columns, toolbar, footer, children, className, ...props }: AdminTableProps) {
  return (
    <Card className={cn(className)} {...props}>
      <CardContent className="space-y-4 p-0">
        {toolbar ? <div className="border-b border-surface-line p-4">{toolbar}</div> : null}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-line text-left text-sm">
            <thead className="bg-surface-ink/70 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="px-4 py-3 font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            {children}
          </table>
        </div>
        {footer ? <div className="border-t border-surface-line p-4">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

export type SearchToolbarProps = HTMLAttributes<HTMLFormElement> & {
  searchName?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  children?: ReactNode;
};

export function SearchToolbar({
  searchName = 'search',
  searchValue = '',
  searchPlaceholder = 'Search',
  children,
  className,
  ...props
}: SearchToolbarProps) {
  return (
    <form className={cn('flex flex-col gap-3 rounded-lg border border-surface-line bg-surface-base p-4 lg:flex-row lg:items-end', className)} {...props}>
      <div className="min-w-0 flex-1 space-y-2">
        <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor={searchName}>
          Search
        </label>
        <Input id={searchName} name={searchName} defaultValue={searchValue} placeholder={searchPlaceholder} />
      </div>
      {children}
      <Button type="submit" variant="outline">
        Apply
      </Button>
    </form>
  );
}

export type FormSectionProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
};

export function FormSection({ title, description, children, className, ...props }: FormSectionProps) {
  return (
    <Card className={cn(className)} {...props}>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-50">{title}</h2>
          {description ? <p className="text-sm leading-6 text-neutral-400">{description}</p> : null}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export type EmptyTableStateProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyTableState({ title, description, action, className, ...props }: EmptyTableStateProps) {
  return (
    <Card className={cn(className)} {...props}>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-neutral-50">{title}</h3>
          <p className="text-sm leading-6 text-neutral-400">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

export type ConfirmDialogProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'primary' | 'outline' | 'danger';
  action?: (formData: FormData) => void | Promise<void>;
};

export function ConfirmDialog({ title, description, confirmLabel, tone = 'danger', action, className, ...props }: ConfirmDialogProps) {
  const variant = tone === 'primary' ? 'primary' : tone === 'outline' ? 'outline' : 'secondary';

  return (
    <Card className={cn(className)} {...props}>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-neutral-50">{title}</h3>
          <p className="text-sm leading-6 text-neutral-400">{description}</p>
        </div>
        {action ? (
          <form action={action}>
            <Button type="submit" variant={variant}>
              {confirmLabel}
            </Button>
          </form>
        ) : (
          <Button variant={variant}>{confirmLabel}</Button>
        )}
      </CardContent>
    </Card>
  );
}
