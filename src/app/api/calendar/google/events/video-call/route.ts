import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

// Helper to create Supabase client with proper cookie handling
async function createSupabaseClient(request?: NextRequest) {
  const cookieStore = await cookies();
  
  // Check for Authorization header first
  const authHeader = request?.headers.get('authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );
    return supabase;
  }
  
  // Fall back to cookie-based auth
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

// POST - Add or remove Google Meet from an event
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { eventId, calendarId, action } = body;

    console.log('[Video Call API] Request:', { eventId, calendarId, action });

    if (!eventId || !calendarId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the connected account for this calendar
    const { data: syncedCalendar } = await supabase
      .from('synced_calendars')
      .select('connected_account_id')
      .eq('google_calendar_id', calendarId)
      .eq('user_id', user.id)
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

    if (action === 'add') {
      // Add Google Meet to the event
      // First, get the existing event
      const getResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!getResponse.ok) {
        console.error('[Video Call API] Failed to get event:', await getResponse.text());
        return NextResponse.json({ error: 'Failed to get event' }, { status: 500 });
      }

      const existingEvent = await getResponse.json();

      // Generate a unique request ID for the conference
      const requestId = `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Update the event with conference data
      const updateBody = {
        ...existingEvent,
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
      };

      const updateResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateBody),
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('[Video Call API] Failed to add conference:', errorText);
        return NextResponse.json({ error: 'Failed to add video call' }, { status: 500 });
      }

      const updatedEvent = await updateResponse.json();
      console.log('[Video Call API] Conference added:', updatedEvent.hangoutLink);

      // Extract meet code from hangout link
      const hangoutLink = updatedEvent.hangoutLink || '';
      const meetCode = hangoutLink.split('/').pop() || '';

      return NextResponse.json({
        videoCall: {
          enabled: true,
          provider: 'google_meet',
          link: hangoutLink,
          code: meetCode,
        },
      });
    } else if (action === 'remove') {
      // Remove Google Meet from the event
      const getResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!getResponse.ok) {
        return NextResponse.json({ error: 'Failed to get event' }, { status: 500 });
      }

      const existingEvent = await getResponse.json();

      // Remove conference data
      const updateBody = {
        ...existingEvent,
        conferenceData: null,
      };

      const updateResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateBody),
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('[Video Call API] Failed to remove conference:', errorText);
        return NextResponse.json({ error: 'Failed to remove video call' }, { status: 500 });
      }

      console.log('[Video Call API] Conference removed');
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Video Call API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

