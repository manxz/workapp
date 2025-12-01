import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  backgroundColor: string;
  foregroundColor: string;
  primary?: boolean;
  accessRole: string;
}

interface GoogleCalendarListResponse {
  items: GoogleCalendar[];
}

// Helper to get user from Supabase auth
async function getUser(request: NextRequest) {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  const accessToken = cookieStore.get('sb-access-token')?.value;
  const refreshToken = cookieStore.get('sb-refresh-token')?.value;
  
  if (!accessToken) {
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      return supabase.auth.getUser();
    }
    return { data: { user: null }, error: new Error('No auth token') };
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  if (refreshToken) {
    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  }
  return supabase.auth.getUser();
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

    if (!response.ok) {
      console.error('Token refresh failed:', await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

// GET - Fetch calendars from all connected Google accounts
export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await getUser(request);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get connected accounts with tokens
    const { data: accounts, error: accountsError } = await supabase
      .from('connected_google_accounts')
      .select('*')
      .eq('user_id', user.id);

    if (accountsError) {
      console.error('Error fetching connected accounts:', accountsError);
      return NextResponse.json({ error: 'Failed to fetch connected accounts' }, { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ calendars: [] });
    }

    const allCalendars: Array<{
      accountId: string;
      accountEmail: string;
      calendars: GoogleCalendar[];
    }> = [];

    // Fetch calendars from each connected account
    for (const account of accounts) {
      let accessToken = account.access_token;
      
      // Check if token is expired
      const tokenExpiry = new Date(account.token_expires_at);
      if (tokenExpiry < new Date()) {
        const newTokens = await refreshAccessToken(account.refresh_token);
        if (!newTokens) {
          console.error(`Failed to refresh token for account ${account.google_email}`);
          continue;
        }

        accessToken = newTokens.access_token;
        
        // Update the token in the database
        await supabase
          .from('connected_google_accounts')
          .update({
            access_token: newTokens.access_token,
            token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
          })
          .eq('id', account.id);
      }

      // Fetch calendars from Google Calendar API
      try {
        const calendarResponse = await fetch(
          'https://www.googleapis.com/calendar/v3/users/me/calendarList',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!calendarResponse.ok) {
          console.error(`Failed to fetch calendars for ${account.google_email}:`, await calendarResponse.text());
          continue;
        }

        const calendarData: GoogleCalendarListResponse = await calendarResponse.json();
        
        allCalendars.push({
          accountId: account.id,
          accountEmail: account.google_email,
          calendars: calendarData.items || [],
        });
      } catch (error) {
        console.error(`Error fetching calendars for ${account.google_email}:`, error);
      }
    }

    return NextResponse.json({ calendars: allCalendars });
  } catch (error) {
    console.error('Error in GET /api/calendar/google/calendars:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
