import type { CheckoutAddress } from '@capital-hobby/types';
import { NextResponse } from 'next/server';
import { validateIronSprueAddress } from '../../../../lib/google-address';

export const runtime = 'nodejs';

function checkoutAddressFromBody(value: unknown): CheckoutAddress | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  return {
    fullName: typeof record.fullName === 'string' ? record.fullName : '',
    email: typeof record.email === 'string' ? record.email : '',
    line1: typeof record.line1 === 'string' ? record.line1 : '',
    line2: typeof record.line2 === 'string' && record.line2.trim() ? record.line2 : null,
    city: typeof record.city === 'string' ? record.city : '',
    region: typeof record.region === 'string' && record.region.trim() ? record.region : null,
    postalCode: typeof record.postalCode === 'string' ? record.postalCode : '',
    country: typeof record.country === 'string' ? record.country : 'GB',
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      address?: unknown;
      sessionToken?: unknown;
      selectedAddressText?: unknown;
      searchInput?: unknown;
    };
    const address = checkoutAddressFromBody(body.address);
    if (!address) {
      return NextResponse.json({
        available: true,
        status: 'invalid',
        address: null,
        formattedAddress: null,
        message: 'Complete the delivery address before continuing.',
      }, { status: 400 });
    }
    const result = await validateIronSprueAddress({
      address,
      sessionToken: typeof body.sessionToken === 'string' ? body.sessionToken : null,
      selectedAddressText: typeof body.selectedAddressText === 'string' ? body.selectedAddressText : null,
      searchInput: typeof body.searchInput === 'string' ? body.searchInput : null,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({
      available: false,
      status: 'unavailable',
      address: null,
      formattedAddress: null,
      message: 'Address validation is temporarily unavailable. Check the address carefully before continuing.',
    }, { status: 200 });
  }
}
