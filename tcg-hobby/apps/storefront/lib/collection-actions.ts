'use server';

import { addCollectionItem, removeCollectionItem, updateCollectionItemQuantity, type UpsertCollectionItemInput } from '@tcg-hobby/database';
import { requireCustomerSession } from './auth';
import { redirect } from 'next/navigation';

type FieldErrors = {
  productId?: string;
  quantity?: string;
  printVariant?: string;
  condition?: string;
  language?: string;
  purchasePriceMinor?: string;
  dateAcquired?: string;
  notes?: string;
};

export type CollectionImportFormState = {
  fieldErrors: FieldErrors;
  formError?: string;
  values: {
    productId: string;
    quantity: string;
    printVariant: string;
    condition: string;
    language: string;
    foil: boolean;
    notes: string;
    dateAcquired: string;
    purchasePriceMinor: string;
  };
};

export type CollectionQuantityFormState = {
  fieldErrors: {
    quantity?: string;
  };
  formError?: string;
  values: {
    quantity: string;
  };
};

const collectionVariants = ['REGULAR', 'REVERSE_HOLO', 'HOLO', 'PROMO', 'FIRST_EDITION', 'FOIL'] as const satisfies readonly UpsertCollectionItemInput['printVariant'][];
const conditions = ['MINT', 'NEAR_MINT', 'LIGHTLY_PLAYED', 'MODERATELY_PLAYED', 'HEAVILY_PLAYED', 'DAMAGED', 'SEALED'] as const satisfies readonly UpsertCollectionItemInput['condition'][];

function isCollectionPrintVariant(value: string): value is UpsertCollectionItemInput['printVariant'] {
  return collectionVariants.includes(value as UpsertCollectionItemInput['printVariant']);
}

function isCollectionCondition(value: string): value is UpsertCollectionItemInput['condition'] {
  return conditions.includes(value as UpsertCollectionItemInput['condition']);
}

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

export async function addCollectionItemAction(_state: CollectionImportFormState, formData: FormData): Promise<CollectionImportFormState> {
  const session = await requireCustomerSession('/collection/import');
  const returnTo = getReturnTo(formData.get('returnTo'), '/collection');

  const values = {
    productId: asString(formData.get('productId')),
    quantity: asString(formData.get('quantity')) || '1',
    printVariant: asString(formData.get('printVariant')) || 'REGULAR',
    condition: asString(formData.get('condition')) || 'NEAR_MINT',
    language: asString(formData.get('language')) || 'EN',
    foil: asString(formData.get('foil')) === 'on',
    notes: asString(formData.get('notes')),
    dateAcquired: asString(formData.get('dateAcquired')),
    purchasePriceMinor: asString(formData.get('purchasePriceMinor')),
  };

  const fieldErrors: FieldErrors = {};
  if (!values.productId) fieldErrors.productId = 'Choose a catalogue product.';
  if (!values.quantity || !Number.isInteger(Number(values.quantity)) || Number(values.quantity) < 1) fieldErrors.quantity = 'Quantity must be at least 1.';
  if (!isCollectionPrintVariant(values.printVariant)) fieldErrors.printVariant = 'Choose a supported collection variant.';
  if (!isCollectionCondition(values.condition)) fieldErrors.condition = 'Choose a supported condition.';
  if (!values.language.trim()) fieldErrors.language = 'Language is required.';
  const purchasePriceMinor = parseInteger(values.purchasePriceMinor);
  if (values.purchasePriceMinor && purchasePriceMinor === null) fieldErrors.purchasePriceMinor = 'Enter a whole number amount in pence.';
  if (values.dateAcquired && Number.isNaN(Date.parse(values.dateAcquired))) fieldErrors.dateAcquired = 'Enter a valid acquisition date.';

  if (Object.keys(fieldErrors).length) {
    return {
      fieldErrors,
      values,
    };
  }

  const printVariant = values.printVariant;
  const condition = values.condition;
  if (!isCollectionPrintVariant(printVariant) || !isCollectionCondition(condition)) {
    return {
      fieldErrors: {
        printVariant: 'Choose a supported collection variant.',
        condition: 'Choose a supported condition.',
      },
      values,
    };
  }

  try {
    await addCollectionItem(session.user.id, {
      productId: values.productId,
      ownedQuantity: Number(values.quantity),
      printVariant,
      condition,
      foil: values.foil,
      language: values.language.trim().toUpperCase(),
      notes: values.notes.trim() || null,
      dateAcquired: values.dateAcquired || null,
      purchasePriceMinor,
    });
  } catch (error) {
    return {
      fieldErrors: {},
      formError: error instanceof Error ? error.message : 'Unable to save that item right now.',
      values,
    };
  }

  redirect(returnTo);
}

export async function updateCollectionItemQuantityAction(formData: FormData) {
  const session = await requireCustomerSession('/collection');
  const itemId = asString(formData.get('itemId'));
  const quantity = Number.parseInt(asString(formData.get('quantity')) || '0', 10);
  const returnTo = getReturnTo(formData.get('returnTo'), '/collection');

  if (!itemId) {
    throw new Error('Collection item identifier is required.');
  }

  await updateCollectionItemQuantity(session.user.id, itemId, quantity);
  redirect(returnTo);
}

export async function removeCollectionItemAction(formData: FormData) {
  const session = await requireCustomerSession('/collection');
  const itemId = asString(formData.get('itemId'));
  const returnTo = getReturnTo(formData.get('returnTo'), '/collection');

  if (!itemId) {
    throw new Error('Collection item identifier is required.');
  }

  await removeCollectionItem(session.user.id, itemId);
  redirect(returnTo);
}
