import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { credential, email } = body;

    let userEmail = email || 'citizen@village.org';
    let userName = 'Google Citizen';
    let googleId = 'google-' + Date.now();

    if (credential) {
      try {
        const verifyRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
        );
        if (verifyRes.ok) {
          const payload = await verifyRes.json();
          userEmail = payload.email || userEmail;
          userName = payload.name || userName;
          googleId = payload.sub || googleId;
        }
      } catch (err) {
        console.warn('ID token verification skipped:', err);
      }
    }

    const user = {
      id: 'usr-' + Buffer.from(userEmail).toString('hex').slice(0, 16),
      email: userEmail,
      name: userName,
      role: 'user',
      auth_provider: 'google',
    };

    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Google authentication failed' },
      { status: 400 }
    );
  }
}
