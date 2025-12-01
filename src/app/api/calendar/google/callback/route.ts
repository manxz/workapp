import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

// Helper to create Supabase client with proper cookie handling
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
            // Ignore - this is called from a Server Component
          }
        },
      },
    }
  );
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const GOOGLE_REDIRECT_URI = `${baseUrl}/api/calendar/google/callback`;

  // Handle errors from Google
  if (error) {
    console.error('[Google Callback] OAuth error:', error);
    return NextResponse.redirect(new URL('/?error=google_auth_failed', baseUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', baseUrl));
  }

  try {
    // Parse state
    let returnUrl = '/';
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        returnUrl = stateData.returnUrl || '/';
      } catch (e) {
        console.error('[Google Callback] Failed to parse state:', e);
      }
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[Google Callback] Token exchange failed:', errorData);
      return NextResponse.redirect(new URL('/?error=token_exchange_failed', baseUrl));
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, scope } = tokens;
    
    // Parse the actual scopes granted by Google
    const grantedScopes = scope ? scope.split(' ').map((s: string) => s.replace('https://www.googleapis.com/auth/', '')) : [];
    console.log('[Google Callback] Granted scopes:', grantedScopes);

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('[Google Callback] Failed to get user info');
      return NextResponse.redirect(new URL('/?error=user_info_failed', baseUrl));
    }

    const googleUser = await userInfoResponse.json();
    const { id: googleAccountId, email } = googleUser;

    // Get current Supabase user
    const supabase = await createSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Google Callback] User not authenticated:', authError);
      return NextResponse.redirect(new URL('/?error=not_authenticated', baseUrl));
    }

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Store connected account in database
    const { data: existingAccount } = await supabase
      .from('connected_calendar_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('provider_account_id', googleAccountId)
      .single();

    let accountId: string;

    if (existingAccount) {
      // Update existing account with new tokens and scopes
      const { error: updateError } = await supabase
        .from('connected_calendar_accounts')
        .update({
          access_token,
          refresh_token: refresh_token || undefined,
          token_expires_at: tokenExpiresAt,
          email,
          scopes: grantedScopes.length > 0 ? grantedScopes : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAccount.id);

      if (updateError) {
        console.error('[Google Callback] Failed to update connected account:', updateError);
        return NextResponse.redirect(new URL('/?error=database_error', baseUrl));
      }
      accountId = existingAccount.id;
    } else {
      // Insert new account with the actual scopes granted by Google
      const { data: newAccount, error: insertError } = await supabase
        .from('connected_calendar_accounts')
        .insert({
          user_id: user.id,
          provider: 'google',
          provider_account_id: googleAccountId,
          email,
          access_token,
          refresh_token,
          token_expires_at: tokenExpiresAt,
          scopes: grantedScopes.length > 0 ? grantedScopes : ['calendar', 'calendar.events', 'userinfo.email', 'userinfo.profile'],
        })
        .select('id')
        .single();

      if (insertError || !newAccount) {
        console.error('[Google Callback] Failed to insert connected account:', insertError);
        return NextResponse.redirect(new URL('/?error=database_error', baseUrl));
      }
      accountId = newAccount.id;
    }

    // Fetch calendars from Google and store them
    await syncGoogleCalendars(supabase, user.id, accountId, access_token);

    console.log('[Google Callback] Successfully connected Google Calendar for user:', user.id);
    
    // Redirect back to app
    return NextResponse.redirect(new URL(returnUrl, baseUrl));
  } catch (error) {
    console.error('[Google Callback] Error:', error);
    return NextResponse.redirect(new URL('/?error=callback_error', baseUrl));
  }
}

// Helper function to sync calendars from Google
async function syncGoogleCalendars(
  supabase: any,
  userId: string,
  accountId: string,
  accessToken: string
) {
  try {
    // Fetch calendars from Google Calendar API
    const calendarsResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!calendarsResponse.ok) {
      console.error('[Google Callback] Failed to fetch Google calendars');
      return;
    }

    const calendarsData = await calendarsResponse.json();
    const calendars = calendarsData.items || [];

    // Upsert calendars
    for (const calendar of calendars) {
      const { error: upsertError } = await supabase
        .from('synced_calendars')
        .upsert(
          {
            connected_account_id: accountId,
            user_id: userId,
            google_calendar_id: calendar.id,
            name: calendar.id.includes('holiday') ? 'US Holidays' : (calendar.summary || 'Untitled Calendar'),
            color: calendar.backgroundColor || '#4285F4',
            is_primary: calendar.primary || false,
            is_enabled: true, // Enable by default
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'connected_account_id,google_calendar_id',
          }
        );

      if (upsertError) {
        console.error('[Google Callback] Failed to upsert calendar:', upsertError);
      }
    }

    console.log(`[Google Callback] Synced ${calendars.length} calendars`);
  } catch (error) {
    console.error('[Google Callback] Error syncing calendars:', error);
  }
}
