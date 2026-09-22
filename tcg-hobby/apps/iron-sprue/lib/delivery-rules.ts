import {
  getIronSprueDeliveryChargeMinor,
  getIronSprueExcludedPostcodeTerritory,
  isIronSprueDeliveryAddressDeliverable,
  ironSprueDeliveryCarrierAssessedAreas,
  ironSprueDeliveryPostcodeTerritoryExclusions,
  IRON_SPRUE_FREE_STANDARD_DELIVERY_THRESHOLD_MINOR,
  IRON_SPRUE_UNDELIVERABLE_ADDRESS_MESSAGE,
} from '@capital-hobby/types';
import type { ShippingMethodCode } from '@capital-hobby/types';

export {
  getIronSprueDeliveryChargeMinor,
  getIronSprueExcludedPostcodeTerritory,
  isIronSprueDeliveryAddressDeliverable,
  ironSprueDeliveryCarrierAssessedAreas,
  ironSprueDeliveryPostcodeTerritoryExclusions,
  IRON_SPRUE_FREE_STANDARD_DELIVERY_THRESHOLD_MINOR,
  IRON_SPRUE_UNDELIVERABLE_ADDRESS_MESSAGE,
};

export function formatIronSprueDeliveryPrice(minor: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(minor / 100);
}

export function ironSprueDeliveryChargeLabel(methodCode: ShippingMethodCode, qualifyingSubtotalMinor = 0) {
  const amountMinor = getIronSprueDeliveryChargeMinor(methodCode, 'GB', qualifyingSubtotalMinor);
  return amountMinor === 0 ? 'free' : formatIronSprueDeliveryPrice(amountMinor ?? 0);
}

export function ironSprueStandardDeliverySummary() {
  const standard = ironSprueDeliveryChargeLabel('UK_STANDARD');
  const threshold = formatIronSprueDeliveryPrice(IRON_SPRUE_FREE_STANDARD_DELIVERY_THRESHOLD_MINOR);
  return `UK standard delivery is ${standard}, with free UK standard delivery over ${threshold} qualifying spend.`;
}

export function ironSprueUndeliverableAddressMessage() {
  return IRON_SPRUE_UNDELIVERABLE_ADDRESS_MESSAGE;
}
