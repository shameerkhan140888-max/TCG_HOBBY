import { describe, expect, it } from 'vitest';
import {
  getIronSprueDeliveryChargeMinor,
  getIronSprueExcludedPostcodeTerritory,
  isIronSprueDeliveryAddressDeliverable,
  ironSprueDeliveryCarrierAssessedAreas,
  ironSprueDeliveryPostcodeTerritoryExclusions,
  ironSprueUndeliverableAddressMessage,
  ironSprueStandardDeliverySummary,
} from './delivery-rules';

function areaCodes(areas: readonly (string | { area: string })[]) {
  return areas.map((area) => typeof area === 'string' ? area : area.area);
}

describe('Iron Sprue delivery rules', () => {
  it('projects storefront delivery wording from the shared rule source', () => {
    expect(getIronSprueDeliveryChargeMinor('UK_STANDARD', 'GB', 2999)).toBe(399);
    expect(getIronSprueDeliveryChargeMinor('UK_STANDARD', 'GB', 3000)).toBe(0);
    expect(ironSprueStandardDeliverySummary()).toBe(
      'UK standard delivery is £3.99, with free UK standard delivery over £30.00 qualifying spend.',
    );
  });

  it('keeps remote territory and carrier-assessed areas in one exported rule set', () => {
    expect(areaCodes(ironSprueDeliveryPostcodeTerritoryExclusions)).toEqual(['BT', 'GY', 'JE', 'IM', 'HS', 'ZE']);
    expect(areaCodes(ironSprueDeliveryCarrierAssessedAreas)).toEqual(['IV', 'KA', 'KW', 'PA', 'PH']);
  });

  it('rejects excluded postcode territories from the shared checkout eligibility rule', () => {
    expect(getIronSprueExcludedPostcodeTerritory('BT1 1AA')?.label).toBe('Northern Ireland');
    expect(getIronSprueExcludedPostcodeTerritory('ZE1 0AA')?.label).toBe('Shetland Islands');
    expect(isIronSprueDeliveryAddressDeliverable('GB', 'BT1 1AA')).toBe(false);
    expect(isIronSprueDeliveryAddressDeliverable('GB', 'ZE1 0AA')).toBe(false);
    expect(isIronSprueDeliveryAddressDeliverable('GB', 'WF13 3EW')).toBe(true);
    expect(ironSprueUndeliverableAddressMessage()).toBe(
      "Sorry, we don't currently deliver to this address. Please choose another delivery address to continue.",
    );
  });
});
