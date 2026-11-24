import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // If not logged in locally, return 401
  return NextResponse.json(
    { error: 'Please sign in' },
    { status: 401 }
  );
}
