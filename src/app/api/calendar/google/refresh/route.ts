import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

// Helper to create Supabase client
async function createSupabaseClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore
          }
        },
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const { accountId, refreshToken } = await request.json();

    if (!accountId || !refreshToken) {
      return NextResponse.json({ error: 'Missing accountId or refreshToken' }, { status: 400 });
    }

    // Refresh the token with Google
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Token Refresh] Google API error:', errorText);
      return NextResponse.json({ error: 'Failed to refresh token' }, { status: 401 });
    }

    const tokens = await tokenResponse.json();
    const { access_token, expires_in } = tokens;

    // Update the token in the database
    const supabase = await createSupabaseClient();
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('connected_calendar_accounts')
      .update({
        access_token,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId);

    if (updateError) {
      console.error('[Token Refresh] Database update error:', updateError);
      return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
    }

    console.log('[Token Refresh] Successfully refreshed token for account:', accountId);
    return NextResponse.json({ access_token, expires_in });
  } catch (error) {
    console.error('[Token Refresh] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

