import { NextResponse } from 'next/server';

export async function GET() {
  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '421343221241-k4cvgu1mqcd1lhcbdki6oufnsoou5kgv.apps.googleusercontent.com';

  return NextResponse.json({
    clientId,
    enabled: true,
  });
}
