'use client';

import { useEffect, useState } from 'react';

export function IronSprueBulkApprovalControls({
  actions = [{ label: 'Approve selected', value: 'APPROVED', tone: 'primary' }],
  formId,
  itemLabel,
  totalCount,
}: {
  actions?: Array<{ label: string; value: string; tone?: 'primary' | 'secondary' | 'warning' }>;
  formId: string;
  itemLabel: string;
  totalCount: number;
}) {
  const [selectedCount, setSelectedCount] = useState(0);

  useEffect(() => {
    const selector = `input[data-bulk-group="${formId}"]`;
    const checkboxes = Array.from(document.querySelectorAll<HTMLInputElement>(selector));
    const refresh = () => setSelectedCount(checkboxes.filter((checkbox) => checkbox.checked).length);

    checkboxes.forEach((checkbox) => checkbox.addEventListener('change', refresh));
    refresh();

    return () => {
      checkboxes.forEach((checkbox) => checkbox.removeEventListener('change', refresh));
    };
  }, [formId, totalCount]);

  function setAll(nextChecked: boolean) {
    const selector = `input[data-bulk-group="${formId}"]`;
    document.querySelectorAll<HTMLInputElement>(selector).forEach((checkbox) => {
      checkbox.checked = nextChecked;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function confirmBulkAction(label: string) {
    return selectedCount > 0 && window.confirm(`${label} for ${selectedCount} selected ${itemLabel}?`);
  }

  if (totalCount < 1) return null;

  const allSelected = selectedCount === totalCount;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-surface-line bg-surface-ink p-3 text-sm">
      <label className="flex items-center gap-2 font-semibold text-neutral-100">
        <input
          aria-label={`Select all displayed ${itemLabel}`}
          checked={allSelected}
          onChange={(event) => setAll(event.target.checked)}
          type="checkbox"
        />
        Select all displayed
      </label>
      <span className="text-neutral-400">{selectedCount} selected</span>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            className={[
              'rounded-md px-4 py-2 font-bold disabled:cursor-not-allowed disabled:opacity-50',
              action.tone === 'warning'
                ? 'border border-red-500/60 bg-red-950/40 text-red-100'
                : action.tone === 'secondary'
                  ? 'border border-surface-line bg-black/30 text-neutral-100'
                  : 'bg-accent text-black',
            ].join(' ')}
            disabled={selectedCount < 1}
            form={formId}
            key={action.value}
            name="bulkAction"
            onClick={(event) => {
              if (!confirmBulkAction(action.label)) event.preventDefault();
            }}
            type="submit"
            value={action.value}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
