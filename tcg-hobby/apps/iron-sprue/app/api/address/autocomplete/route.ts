import { NextResponse } from 'next/server';
import { autocompleteIronSprueAddress } from '../../../../lib/google-address';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { input?: unknown; sessionToken?: unknown };
    const input = typeof body.input === 'string' ? body.input : '';
    const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken : '';
    const result = await autocompleteIronSprueAddress(input, sessionToken);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({
      available: false,
      suggestions: [],
      message: 'Address search is temporarily unavailable. Enter your address manually.',
    }, { status: 200 });
  }
}
