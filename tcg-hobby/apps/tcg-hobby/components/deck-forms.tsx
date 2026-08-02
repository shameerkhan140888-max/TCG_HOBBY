'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, ErrorMessage, FormField, Input } from '@tcg-hobby/ui';
import { createDeckAction, type DeckCreateFormState } from '../lib/deck-actions';

const emptyState: DeckCreateFormState = {
  fieldErrors: {},
  values: {
    name: '',
    game: '',
    notes: '',
    imageLabel: '',
    visibility: 'PRIVATE',
    maxCards: '60',
    maxCopiesPerCard: '4',
  },
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create deck'}
    </Button>
  );
}

export function DeckCreateForm() {
  const [state, formAction] = useActionState(createDeckAction, emptyState);

  return (
    <form action={formAction} className="space-y-5 rounded-lg border border-surface-line bg-surface-base p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Deck name" htmlFor="deck-name" error={state.fieldErrors.name} required>
          <Input id="deck-name" name="name" defaultValue={state.values.name} placeholder="Friday Night Red" />
        </FormField>
        <FormField label="Game" htmlFor="deck-game" error={state.fieldErrors.game} required>
          <Input id="deck-game" name="game" defaultValue={state.values.game} placeholder="Magic: The Gathering" />
        </FormField>
        <FormField label="Visibility" htmlFor="deck-visibility" error={state.fieldErrors.visibility}>
          <select
            id="deck-visibility"
            name="visibility"
            defaultValue={state.values.visibility}
            className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent"
          >
            <option value="PRIVATE">Private</option>
            <option value="PUBLIC">Public</option>
          </select>
        </FormField>
        <FormField label="Deck image label" htmlFor="deck-image" error={state.fieldErrors.imageLabel}>
          <Input id="deck-image" name="imageLabel" defaultValue={state.values.imageLabel} placeholder="Deck stack" />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Maximum cards" htmlFor="deck-max-cards" error={state.fieldErrors.maxCards}>
          <Input id="deck-max-cards" name="maxCards" type="number" min={1} defaultValue={state.values.maxCards} />
        </FormField>
        <FormField label="Duplicate limit" htmlFor="deck-max-copies" error={state.fieldErrors.maxCopiesPerCard}>
          <Input id="deck-max-copies" name="maxCopiesPerCard" type="number" min={1} defaultValue={state.values.maxCopiesPerCard} />
        </FormField>
      </div>
      <FormField label="Notes" htmlFor="deck-notes" error={state.fieldErrors.notes}>
        <Input id="deck-notes" name="notes" defaultValue={state.values.notes} placeholder="Sideboard notes, match-up notes..." />
      </FormField>
      <ErrorMessage>{state.formError}</ErrorMessage>
      <SubmitButton />
    </form>
  );
}
