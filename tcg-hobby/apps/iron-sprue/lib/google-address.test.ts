import { describe, expect, it } from 'vitest';
import {
  buildIronSprueValidationAddressLines,
  extractIronSprueSearchPremise,
  googleAddressValidationDecision,
  mapGoogleValidatedAddressForCheckout,
} from './google-address';

describe('Iron Sprue Google address mapping', () => {
  it('maps a confirmed Google UK postal address into the canonical checkout address', () => {
    const address = mapGoogleValidatedAddressForCheckout({
      result: {
        verdict: { addressComplete: true },
        address: {
          formattedAddress: '10 Downing Street, London SW1A 2AA, UK',
          postalAddress: {
            regionCode: 'GB',
            postalCode: 'SW1A 2AA',
            locality: 'London',
            addressLines: ['10 Downing Street'],
          },
        },
      },
    }, { fullName: 'Test Customer', email: 'customer@example.com' });

    expect(address).toEqual({
      fullName: 'Test Customer',
      email: 'customer@example.com',
      line1: '10 Downing Street',
      line2: null,
      city: 'London',
      region: null,
      postalCode: 'SW1A 2AA',
      country: 'GB',
    });
  });

  it('requires customer confirmation when Google corrects or infers address components', () => {
    const response = {
      result: {
        verdict: { addressComplete: true, hasInferredComponents: true },
        address: {
          postalAddress: {
            regionCode: 'GB',
            postalCode: 'SW1A 2AA',
            locality: 'London',
            addressLines: ['10 Downing Street'],
          },
        },
      },
    };
    const address = mapGoogleValidatedAddressForCheckout(response, { fullName: '', email: '' });

    expect(googleAddressValidationDecision(response, address)).toBe('confirm');
  });

  it('rejects incomplete or non-UK validation results rather than creating another address path', () => {
    const response = {
      result: {
        verdict: { addressComplete: false, hasUnconfirmedComponents: true },
        address: {
          postalAddress: {
            regionCode: 'US',
            postalCode: '10001',
            locality: 'New York',
            addressLines: ['1 Example Street'],
          },
        },
      },
    };
    const address = mapGoogleValidatedAddressForCheckout(response, { fullName: '', email: '' });

    expect(address).toBeNull();
    expect(googleAddressValidationDecision(response, address)).toBe('invalid');
  });

  it('preserves a typed premise when a number-and-postcode search selects a street-level suggestion', () => {
    expect(extractIronSprueSearchPremise('12 WF13 3EW')).toEqual({
      premise: '12',
      postcode: 'WF13 3EW',
    });
    expect(buildIronSprueValidationAddressLines({
      address: { fullName: '', email: '', line1: '', line2: null, city: '', region: null, postalCode: '', country: 'GB' },
      searchInput: '12 WF13 3EW',
      selectedAddressText: 'Commercial Street, Ravensthorpe, Dewsbury, UK',
    })).toEqual([
      '12 Commercial Street, Ravensthorpe, Dewsbury, UK',
      'WF13 3EW',
    ]);
  });

  it('does not treat route-only validation as a complete delivery address', () => {
    const response = {
      result: {
        verdict: { addressComplete: true },
        address: {
          postalAddress: {
            regionCode: 'GB',
            postalCode: 'WF13 3EW',
            locality: 'Dewsbury',
            addressLines: ['Commercial Street'],
          },
          addressComponents: [
            { componentType: 'route', confirmationLevel: 'CONFIRMED' },
            { componentType: 'postal_code', confirmationLevel: 'CONFIRMED' },
          ],
        },
      },
    };
    const address = mapGoogleValidatedAddressForCheckout(response, { fullName: '', email: '' });

    expect(address?.line1).toBe('Commercial Street');
    expect(googleAddressValidationDecision(response, address)).toBe('invalid');
  });
});
