'use server';

import { addCardToDeck, createDeck, removeDeckCard, updateDeckCardQuantity, updateDeckDetails } from '@tcg-hobby/database';
import { requireCustomerSession } from './auth';
import { redirect } from 'next/navigation';

type FieldErrors = {
  name?: string;
  game?: string;
  notes?: string;
  imageLabel?: string;
  visibility?: string;
  maxCards?: string;
  maxCopiesPerCard?: string;
  quantity?: string;
  deckId?: string;
  productId?: string;
};

export type DeckCreateFormState = {
  fieldErrors: FieldErrors;
  formError?: string;
  values: {
    name: string;
    game: string;
    notes: string;
    imageLabel: string;
    visibility: string;
    maxCards: string;
    maxCopiesPerCard: string;
  };
};

function asString(value: FormDataEntryValue | null | undefined) {
  return typeof value === 'string' ? value : '';
}

function getReturnTo(value: FormDataEntryValue | null | undefined, fallback: string) {
  const target = asString(value);
  if (!target || !target.startsWith('/') || target.startsWith('//')) {
    return fallback;
  }

  return target;
}

function parseInteger(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function createDeckAction(_state: DeckCreateFormState, formData: FormData): Promise<DeckCreateFormState> {
  const session = await requireCustomerSession('/decks/new');
  const values = {
    name: asString(formData.get('name')),
    game: asString(formData.get('game')),
    notes: asString(formData.get('notes')),
    imageLabel: asString(formData.get('imageLabel')),
    visibility: asString(formData.get('visibility')) || 'PRIVATE',
    maxCards: asString(formData.get('maxCards')) || '60',
    maxCopiesPerCard: asString(formData.get('maxCopiesPerCard')) || '4',
  };

  const fieldErrors: FieldErrors = {};
  if (!values.name.trim()) fieldErrors.name = 'Deck name is required.';
  if (!values.game.trim()) fieldErrors.game = 'Game is required.';

  const maxCards = parseInteger(values.maxCards);
  const maxCopiesPerCard = parseInteger(values.maxCopiesPerCard);
  if (values.maxCards && maxCards === null) fieldErrors.maxCards = 'Enter a whole number.';
  if (values.maxCopiesPerCard && maxCopiesPerCard === null) fieldErrors.maxCopiesPerCard = 'Enter a whole number.';

  if (Object.keys(fieldErrors).length) {
    return {
      fieldErrors,
      values,
    };
  }

  try {
    const deck = await createDeck(session.user.id, {
      name: values.name.trim(),
      game: values.game.trim(),
      notes: values.notes.trim() || null,
      imageLabel: values.imageLabel.trim() || 'Deck stack',
      visibility: values.visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE',
      maxCards: maxCards ?? 60,
      maxCopiesPerCard: maxCopiesPerCard ?? 4,
    });

    redirect(`/decks/${deck.id}`);
  } catch (error) {
    return {
      fieldErrors: {},
      formError: error instanceof Error ? error.message : 'Unable to create that deck right now.',
      values,
    };
  }
}

export async function updateDeckDetailsAction(formData: FormData) {
  const session = await requireCustomerSession('/decks');
  const deckId = asString(formData.get('deckId'));
  const returnTo = getReturnTo(formData.get('returnTo'), `/decks/${deckId || ''}`);

  if (!deckId) {
    throw new Error('Deck identifier is required.');
  }

  const maxCards = parseInteger(asString(formData.get('maxCards')));
  const maxCopiesPerCard = parseInteger(asString(formData.get('maxCopiesPerCard')));

  await updateDeckDetails(session.user.id, deckId, {
    name: asString(formData.get('name')),
    game: asString(formData.get('game')),
    notes: asString(formData.get('notes')),
    visibility: asString(formData.get('visibility')) === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE',
    imageLabel: asString(formData.get('imageLabel')),
    ...(maxCards !== null ? { maxCards } : {}),
    ...(maxCopiesPerCard !== null ? { maxCopiesPerCard } : {}),
  });

  redirect(returnTo);
}

export async function addDeckCardAction(formData: FormData) {
  const session = await requireCustomerSession('/decks');
  const deckId = asString(formData.get('deckId'));
  const productId = asString(formData.get('productId'));
  const quantity = parseInteger(asString(formData.get('quantity'))) ?? 1;
  const returnTo = getReturnTo(formData.get('returnTo'), `/decks/${deckId || ''}`);

  if (!deckId || !productId) {
    throw new Error('Deck and product identifiers are required.');
  }

  await addCardToDeck(session.user.id, deckId, productId, quantity);
  redirect(returnTo);
}

export async function updateDeckCardQuantityAction(formData: FormData) {
  const session = await requireCustomerSession('/decks');
  const deckId = asString(formData.get('deckId'));
  const productId = asString(formData.get('productId'));
  const quantity = parseInteger(asString(formData.get('quantity'))) ?? 0;
  const returnTo = getReturnTo(formData.get('returnTo'), `/decks/${deckId || ''}`);

  if (!deckId || !productId) {
    throw new Error('Deck and product identifiers are required.');
  }

  await updateDeckCardQuantity(session.user.id, deckId, productId, quantity);
  redirect(returnTo);
}

export async function removeDeckCardAction(formData: FormData) {
  const session = await requireCustomerSession('/decks');
  const deckId = asString(formData.get('deckId'));
  const productId = asString(formData.get('productId'));
  const returnTo = getReturnTo(formData.get('returnTo'), `/decks/${deckId || ''}`);

  if (!deckId || !productId) {
    throw new Error('Deck and product identifiers are required.');
  }

  await removeDeckCard(session.user.id, deckId, productId);
  redirect(returnTo);
}
