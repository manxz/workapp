import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string; responseStatus: string }>;
  hangoutLink?: string;
  conferenceData?: { entryPoints?: Array<{ entryPointType: string; uri: string }> };
  colorId?: string;
  status: string;
  recurringEventId?: string;
}

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

// GET - Fetch events from Google Calendar
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const timeMin = searchParams.get('timeMin') || new Date().toISOString();
    const timeMax = searchParams.get('timeMax');
    const accountId = searchParams.get('accountId');

    // Fetch connected accounts
    let query = supabase
      .from('connected_calendar_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google');

    if (accountId) {
      query = query.eq('id', accountId);
    }

    const { data: accounts, error: accountsError } = await query;

    if (accountsError) {
      console.error('[Events API] Error fetching connected accounts:', accountsError);
      return NextResponse.json({ error: 'Failed to fetch connected accounts' }, { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      console.log('[Events API] No connected accounts found');
      return NextResponse.json({ events: [] });
    }

    const allEvents: GoogleEvent[] = [];

    // Fetch events from each connected account
    for (const account of accounts) {
      let accessToken = account.access_token;
      
      // Check if token is expired
      const tokenExpiry = account.token_expires_at ? new Date(account.token_expires_at) : new Date(0);
      if (tokenExpiry < new Date() && account.refresh_token) {
        console.log('[Events API] Token expired, refreshing...');
        const newTokens = await refreshAccessToken(account.refresh_token);
        if (!newTokens) {
          console.error(`[Events API] Failed to refresh token for account ${account.email}`);
          continue;
        }

        accessToken = newTokens.access_token;
        
        // Update token in database
        await supabase
          .from('connected_calendar_accounts')
          .update({
            access_token: newTokens.access_token,
            token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
          })
          .eq('id', account.id);
      }

      // Fetch synced calendars for this account
      const { data: syncedCalendars } = await supabase
        .from('synced_calendars')
        .select('google_calendar_id, is_enabled')
        .eq('connected_account_id', account.id)
        .eq('is_enabled', true);

      const calendarIds = syncedCalendars?.map(c => c.google_calendar_id) || ['primary'];

      // Fetch events from each enabled calendar
      for (const calendarId of calendarIds) {
        try {
          const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
          url.searchParams.set('timeMin', timeMin);
          if (timeMax) url.searchParams.set('timeMax', timeMax);
          url.searchParams.set('singleEvents', 'true');
          url.searchParams.set('orderBy', 'startTime');
          url.searchParams.set('maxResults', '250');

          const eventsResponse = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!eventsResponse.ok) {
            console.error(`[Events API] Failed to fetch events for calendar ${calendarId}:`, await eventsResponse.text());
            continue;
          }

          const eventsData = await eventsResponse.json();
          const events = (eventsData.items || []).map((event: GoogleEvent) => ({
            ...event,
            calendarId,
            accountId: account.id,
            accountEmail: account.email,
          }));
          
          allEvents.push(...events);
        } catch (error) {
          console.error(`[Events API] Error fetching events for calendar ${calendarId}:`, error);
        }
      }
    }

    console.log(`[Events API] Returning ${allEvents.length} events`);
    return NextResponse.json({ events: allEvents });
  } catch (error) {
    console.error('[Events API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new event in Google Calendar
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[Events API POST] Auth error:', authError?.message || 'No user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('[Events API POST] User authenticated:', user.id);

    const body = await request.json();
    const { calendarId, title, description, start, end, allDay, location, attendees, repeat, timezone, videoCall } = body;

    console.log('[Events API POST] Request body:', { calendarId, title, start, end, allDay, repeat, timezone, attendees, videoCall });

    if (!calendarId || !title || !start || !end) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the connected account for this calendar
    const { data: syncedCalendar, error: syncError } = await supabase
      .from('synced_calendars')
      .select('connected_account_id')
      .eq('google_calendar_id', calendarId)
      .eq('user_id', user.id)
      .single();

    console.log('[Events API POST] Synced calendar lookup:', { syncedCalendar, error: syncError?.message });

    if (!syncedCalendar) {
      console.error('[Events API POST] Calendar not found for ID:', calendarId);
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

      // Update token in database
      await supabase
        .from('connected_calendar_accounts')
        .update({
          access_token: newTokens.access_token,
          token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        })
        .eq('id', account.id);
    }

    // Build the Google Calendar event object
    const googleEvent: any = {
      summary: title,
      description: description || undefined,
      location: location || undefined,
    };

    // Get user's timezone from request (default to America/Los_Angeles)
    const userTimezone = timezone || 'America/Los_Angeles';
    
    // Set start and end times
    if (allDay) {
      // All-day events use date format (YYYY-MM-DD)
      // Google Calendar end date is EXCLUSIVE, so for a single-day event on Dec 1,
      // start = "2024-12-01" and end = "2024-12-02"
      const startDate = start.split('T')[0];
      let endDate = end.split('T')[0];
      
      // If start and end are the same day, add one day to end for Google Calendar
      if (startDate === endDate) {
        const endDateObj = new Date(endDate + 'T00:00:00');
        endDateObj.setDate(endDateObj.getDate() + 1);
        endDate = endDateObj.toISOString().split('T')[0];
      }
      
      googleEvent.start = { date: startDate };
      googleEvent.end = { date: endDate };
    } else {
      // Timed events use dateTime format with timezone (required for recurring events)
      googleEvent.start = { dateTime: start, timeZone: userTimezone };
      googleEvent.end = { dateTime: end, timeZone: userTimezone };
    }

    // Add attendees if provided - filter out invalid emails
    if (attendees && Array.isArray(attendees) && attendees.length > 0) {
      const validAttendees = attendees
        .filter((email: string) => email && typeof email === 'string' && email.includes('@'))
        .map((email: string) => ({ email: email.trim() }));
      
      if (validAttendees.length > 0) {
        console.log('[Events API POST] Adding attendees:', validAttendees);
        googleEvent.attendees = validAttendees;
      }
    }

    // Add recurrence rule if provided
    if (repeat?.type && repeat.type !== 'none') {
      const rruleMap: Record<string, string> = {
        daily: 'RRULE:FREQ=DAILY',
        weekly: 'RRULE:FREQ=WEEKLY',
        monthly: 'RRULE:FREQ=MONTHLY',
        yearly: 'RRULE:FREQ=YEARLY',
      };
      if (rruleMap[repeat.type]) {
        googleEvent.recurrence = [rruleMap[repeat.type]];
      }
    }

    // Add Google Meet conference if requested
    let apiUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
    if (videoCall) {
      const requestId = `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      googleEvent.conferenceData = {
        createRequest: {
          requestId,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      };
      apiUrl += '?conferenceDataVersion=1';
    }

    // Create event in Google Calendar
    const createResponse = await fetch(
      apiUrl,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[Events API] Failed to create event:', errorText);
      return NextResponse.json({ error: 'Failed to create event in Google Calendar' }, { status: 500 });
    }

    const createdEvent = await createResponse.json();
    console.log('[Events API] Event created:', createdEvent.id);

    return NextResponse.json({ event: createdEvent });
  } catch (error) {
    console.error('[Events API] Error creating event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete an event from Google Calendar
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    const calendarId = searchParams.get('calendarId');
    const recurringOption = searchParams.get('recurringOption') as 'this' | 'all' | 'following' | null;

    if (!eventId || !calendarId) {
      return NextResponse.json({ error: 'Missing eventId or calendarId' }, { status: 400 });
    }
    
    console.log('[Events API DELETE] Request:', { eventId, calendarId, recurringOption });

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

    // Determine which event ID to delete based on recurring option
    let deleteEventId = eventId;
    
    // For recurring events, the instance ID format is: masterEventId_YYYYMMDDTHHMMSSZ
    // Extract the master event ID if deleting all events
    if (recurringOption === 'all') {
      // Check if this is a recurring instance (has underscore with date suffix)
      const underscoreIndex = eventId.lastIndexOf('_');
      if (underscoreIndex > 0) {
        // This is an instance - get the master event ID
        const possibleMasterId = eventId.substring(0, underscoreIndex);
        // Verify the suffix looks like a date (YYYYMMDDTHHMMSSZ)
        const suffix = eventId.substring(underscoreIndex + 1);
        if (/^\d{8}T\d{6}Z$/.test(suffix)) {
          deleteEventId = possibleMasterId;
          console.log('[Events API DELETE] Deleting master event:', deleteEventId);
        }
      }
    }
    
    // For 'following' option, we need to update the master event's recurrence rule
    // This is more complex and would require fetching the master event, updating UNTIL, then deleting this instance
    // For now, we'll just delete this instance (same as 'this')
    if (recurringOption === 'following') {
      console.log('[Events API DELETE] Following option - deleting single instance (TODO: implement UNTIL update)');
      // TODO: Implement proper "this and following" by updating recurrence UNTIL date
    }

    // Delete event from Google Calendar
    const deleteResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(deleteEventId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!deleteResponse.ok && deleteResponse.status !== 204) {
      const errorText = await deleteResponse.text();
      console.error('[Events API] Failed to delete event:', errorText);
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    console.log('[Events API] Event deleted:', deleteEventId, 'option:', recurringOption);
    return NextResponse.json({ success: true, deletedEventId: deleteEventId });
  } catch (error) {
    console.error('[Events API] Error deleting event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update an event in Google Calendar
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { eventId, calendarId, title, description, start, end, allDay, location } = body;

    if (!eventId || !calendarId) {
      return NextResponse.json({ error: 'Missing eventId or calendarId' }, { status: 400 });
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

    // Build update object (only include provided fields)
    const updateData: any = {};
    if (title !== undefined) updateData.summary = title;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    
    if (start && end) {
      if (allDay) {
        // Google Calendar end date is EXCLUSIVE for all-day events
        const startDate = start.split('T')[0];
        let endDate = end.split('T')[0];
        
        // If start and end are the same day, add one day to end
        if (startDate === endDate) {
          const endDateObj = new Date(endDate + 'T00:00:00');
          endDateObj.setDate(endDateObj.getDate() + 1);
          endDate = endDateObj.toISOString().split('T')[0];
        }
        
        updateData.start = { date: startDate };
        updateData.end = { date: endDate };
      } else {
        updateData.start = { dateTime: start };
        updateData.end = { dateTime: end };
      }
    }

    // Update event in Google Calendar
    const updateResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('[Events API] Failed to update event:', errorText);
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }

    const updatedEvent = await updateResponse.json();
    console.log('[Events API] Event updated:', updatedEvent.id);

    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error('[Events API] Error updating event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
