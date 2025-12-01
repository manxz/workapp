import { NextRequest, NextResponse } from 'next/server';

// Google Calendar OAuth scopes (need full calendar access to create/edit events)
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

export async function GET(request: NextRequest) {
  try {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const GOOGLE_REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${APP_URL}/api/calendar/google/callback`;

    // Debug logging
    console.log('[Google OAuth] Client ID:', GOOGLE_CLIENT_ID ? 'Set' : 'NOT SET');
    console.log('[Google OAuth] Redirect URI:', GOOGLE_REDIRECT_URI);
    console.log('[Google OAuth] App URL:', APP_URL);

    if (!GOOGLE_CLIENT_ID) {
      console.error('[Google OAuth] GOOGLE_CLIENT_ID is not set!');
      return NextResponse.json(
        { error: 'Google OAuth not configured. Missing GOOGLE_CLIENT_ID.' },
        { status: 500 }
      );
    }

    // Create a state parameter with user info to verify on callback
    const state = Buffer.from(JSON.stringify({
      timestamp: Date.now(),
      returnUrl: request.nextUrl.searchParams.get('returnUrl') || '/',
    })).toString('base64');

    // Build Google OAuth URL
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state: state,
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    
    console.log('[Google OAuth] Redirecting to:', googleAuthUrl);

    return NextResponse.redirect(googleAuthUrl);
  } catch (error) {
    console.error('[Google OAuth] Error initiating OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google authentication' },
      { status: 500 }
    );
  }
}
