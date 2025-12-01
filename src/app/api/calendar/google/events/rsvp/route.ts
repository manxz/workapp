import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

// Refresh Google access token
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

// POST - Respond to a calendar invite (RSVP)
export async function POST(request: NextRequest) {
  try {
    // Get the auth token from the header
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Decode the JWT to get the user ID (the token is already validated by Supabase on the client)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub;
        console.log('[RSVP API] Decoded user from token:', userId);
      } catch (e) {
        console.error('[RSVP API] Failed to decode token:', e);
      }
    }
    
    // Fall back to cookie-based auth if no bearer token
    if (!userId) {
      const cookieStore = await cookies();
      const cookieSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return cookieStore.getAll(); },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                );
              } catch { /* Ignore */ }
            },
          },
        }
      );
      const { data, error } = await cookieSupabase.auth.getUser();
      if (!error && data?.user) {
        userId = data.user.id;
      }
    }
    
    if (!userId) {
      console.log('[RSVP API] Auth failed: No valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Use anon key with the auth token for database operations
    // authHeader was already defined at the top of the function
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      authHeader ? {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      } : undefined
    );

    const body = await request.json();
    const { eventId, calendarId, response: rsvpResponse } = body;

    if (!eventId || !calendarId || !rsvpResponse) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate response value
    if (!['accepted', 'declined', 'tentative'].includes(rsvpResponse)) {
      return NextResponse.json({ error: 'Invalid response value' }, { status: 400 });
    }

    console.log('[RSVP API] Request:', { eventId, calendarId, rsvpResponse });

    // Find the connected account for this calendar
    const { data: syncedCalendar } = await supabase
      .from('synced_calendars')
      .select('connected_account_id')
      .eq('google_calendar_id', calendarId)
      .eq('user_id', userId)
      .single();

    if (!syncedCalendar) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    }

    // Get the account with access token
    const { data: account, error: accountError } = await supabase
      .from('connected_calendar_accounts')
      .select('*')
      .eq('id', syncedCalendar.connected_account_id)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Connected account not found' }, { status: 404 });
    }

    let accessToken = account.access_token;

    // Refresh token if expired
    const tokenExpiry = account.token_expires_at ? new Date(account.token_expires_at) : new Date(0);
    if (tokenExpiry < new Date() && account.refresh_token) {
      const newTokens = await refreshAccessToken(account.refresh_token);
      if (!newTokens) {
        return NextResponse.json({ error: 'Failed to refresh access token' }, { status: 401 });
      }
      accessToken = newTokens.access_token;

      await supabase
        .from('connected_calendar_accounts')
        .update({
          access_token: newTokens.access_token,
          token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        })
        .eq('id', account.id);
    }

    // First, get the current event to find our attendee entry
    const getResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      console.error('[RSVP API] Failed to get event:', errorText);
      return NextResponse.json({ error: 'Failed to get event' }, { status: 500 });
    }

    const event = await getResponse.json();
    
    // Update the attendee's response status
    // Find the attendee with self=true and update their responseStatus
    const updatedAttendees = (event.attendees || []).map((attendee: any) => {
      if (attendee.self) {
        return { ...attendee, responseStatus: rsvpResponse };
      }
      return attendee;
    });

    // Update the event with the new attendee response
    const updateResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendees: updatedAttendees,
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('[RSVP API] Failed to update RSVP:', errorText);
      return NextResponse.json({ error: 'Failed to update RSVP' }, { status: 500 });
    }

    const updatedEvent = await updateResponse.json();
    console.log('[RSVP API] RSVP updated successfully:', eventId, rsvpResponse);

    return NextResponse.json({ 
      success: true, 
      response: rsvpResponse,
      event: updatedEvent,
    });
  } catch (error) {
    console.error('[RSVP API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

