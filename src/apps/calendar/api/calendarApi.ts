/**
 * Calendar API Client
 * 
 * Typed API client hooks for calendar operations.
 * Uses Supabase for data storage and Google Calendar API for synced calendars.
 */

import { CalendarEvent, Calendar, UserSummary, DateRange, EventPayload, VideoCall, RepeatType, RsvpStatus } from '../types';
import { supabase } from '@/lib/supabase';

// ============================================================================
// Cache for faster subsequent loads
// ============================================================================

interface CachedAccountData {
  accounts: Array<{
    id: string;
    email: string;
    access_token: string;
    refresh_token: string | null;
    token_expires_at: string;
  }>;
  calendars: Array<{
    google_calendar_id: string;
    connected_account_id: string;
    is_enabled: boolean;
    color: string;
    name: string;
  }>;
  timestamp: number;
}

let accountCache: CachedAccountData | null = null;
const CACHE_TTL = 60000; // 1 minute cache

// Google OAuth credentials from environment
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// ============================================================================
// Token Refresh
// ============================================================================

// Track if we're currently refreshing to avoid duplicate refreshes
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Refresh an expired Google access token using the refresh token
 * Uses a singleton pattern to avoid duplicate refresh calls
 */
async function refreshAccessToken(
  accountId: string,
  refreshToken: string
): Promise<string | null> {
  // If already refreshing, wait for that to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/calendar/google/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, refreshToken }),
      });

      if (!response.ok) {
        console.error('[CalendarAPI] Failed to refresh token');
        return null;
      }

      const data = await response.json();
      
      // Update the token in cache directly instead of invalidating
      if (accountCache) {
        const account = accountCache.accounts.find(a => a.id === accountId);
        if (account) {
          account.access_token = data.access_token;
        }
      }
      
      return data.access_token;
    } catch (err) {
      console.error('[CalendarAPI] Error refreshing token:', err);
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ============================================================================
// Constants
// ============================================================================

const INTERNAL_CALENDARS: Calendar[] = [
  { id: 'work', name: 'Work', color: '#3B82F6', editable: true, isDefault: true },
  { id: 'personal', name: 'Personal', color: '#22C55E', editable: true },
  { id: 'holidays', name: 'US Holidays', color: '#A855F7', editable: false, isHoliday: true },
];


// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch all calendars available to the user
 */
export async function fetchCalendars(): Promise<Calendar[]> {
  return INTERNAL_CALENDARS;
}

/**
 * Get cached or fresh account data
 */
async function getAccountData(userId: string): Promise<CachedAccountData | null> {
  // Return cache if still valid
  if (accountCache && Date.now() - accountCache.timestamp < CACHE_TTL) {
    return accountCache;
  }

  // Fetch accounts and calendars in parallel
  const [accountsResult, calendarsResult] = await Promise.all([
    supabase
      .from('connected_calendar_accounts')
      .select('id, email, access_token, refresh_token, token_expires_at')
      .eq('user_id', userId)
      .eq('provider', 'google'),
    supabase
      .from('synced_calendars')
      .select('google_calendar_id, connected_account_id, is_enabled, color, name')
      .eq('user_id', userId)
      .eq('is_enabled', true)
  ]);

  if (accountsResult.error || !accountsResult.data?.length) {
    return null;
  }

  accountCache = {
    accounts: accountsResult.data,
    calendars: calendarsResult.data || [],
    timestamp: Date.now(),
  };

  return accountCache;
}

/**
 * Invalidate cache (call after connecting/disconnecting accounts)
 */
export function invalidateAccountCache() {
  accountCache = null;
}

/**
 * Fetch events within a date range
 * Fetches from Google Calendar API using stored access tokens
 * Optimized with parallel fetching
 */
export async function fetchEvents(
  range: DateRange,
  calendarIds: string[],
  userId: string
): Promise<CalendarEvent[]> {
  try {
    const accountData = await getAccountData(userId);
    
    if (!accountData) {
      return [];
    }

    const allEvents: CalendarEvent[] = [];

    // Process each account (validate token first, then fetch all calendars)
    for (const account of accountData.accounts) {
      const accountCalendars = accountData.calendars.filter(
        c => c.connected_account_id === account.id
      );

      const calendarsToFetch = accountCalendars.length > 0 
        ? accountCalendars.map(c => ({ id: c.google_calendar_id, color: c.color, name: c.name }))
        : [{ id: 'primary', color: '#4285F4', name: account.email }];

      // Get a valid token for this account (refresh if needed)
      const validToken = await getValidToken(account, calendarsToFetch[0], range, userId);
      
      if (!validToken) {
        continue;
      }

      // Now fetch ALL calendars for this account in parallel with the valid token
      const fetchPromises = calendarsToFetch.map(calendar =>
        fetchCalendarEvents(validToken, calendar, range, userId)
      );

      const results = await Promise.all(fetchPromises);
      allEvents.push(...results.flat());
    }
    
    return allEvents;
  } catch (err) {
    console.error('[CalendarAPI] Error fetching events:', err);
    return [];
  }
}

/**
 * Get a valid access token for an account, refreshing if necessary
 * Tests the token with a simple API call first
 */
async function getValidToken(
  account: { id: string; email: string; access_token: string; refresh_token: string | null },
  testCalendar: { id: string; color: string; name: string },
  range: DateRange,
  userId: string
): Promise<string | null> {
  // Test the current token
  const testResult = await testToken(account.access_token, testCalendar.id, range);
  
  if (testResult.valid) {
    return account.access_token;
  }

  // Token invalid, try to refresh
  if (!account.refresh_token) {
    return null;
  }

  const newToken = await refreshAccessToken(account.id, account.refresh_token);
  if (newToken) {
    return newToken;
  }

  return null;
}

/**
 * Test if a token is valid by making a lightweight API call
 */
async function testToken(
  accessToken: string,
  calendarId: string,
  range: DateRange
): Promise<{ valid: boolean }> {
  try {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    url.searchParams.set('timeMin', range.start);
    url.searchParams.set('timeMax', range.end);
    url.searchParams.set('maxResults', '1'); // Just check if we can access

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return { valid: response.ok };
  } catch {
    return { valid: false };
  }
}

// Cache for profile lookups by email
let profileCache: Map<string, UserSummary> | null = null;

/**
 * Load all profiles into cache for efficient email lookup
 */
async function loadProfileCache(): Promise<Map<string, UserSummary>> {
  if (profileCache) return profileCache;
  
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url');
  
  profileCache = new Map();
  if (profiles) {
    for (const p of profiles) {
      if (p.email) {
        profileCache.set(p.email.toLowerCase(), {
          id: p.id,
          name: p.full_name || p.email,
          email: p.email,
          avatarUrl: p.avatar_url,
        });
      }
    }
  }
  return profileCache;
}

/**
 * Invalidate profile cache
 */
export function invalidateProfileCache() {
  profileCache = null;
}

/**
 * Fetch events from a single calendar
 */
async function fetchCalendarEvents(
  accessToken: string,
  calendar: { id: string; color: string; name: string },
  range: DateRange,
  userId: string
): Promise<CalendarEvent[]> {
  try {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`);
    url.searchParams.set('timeMin', range.start);
    url.searchParams.set('timeMax', range.end);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '250');

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CalendarAPI] Failed to fetch ${calendar.id}:`, response.status, errorText);
      // Return empty array - the retry wrapper will handle refresh
      return [];
    }

    // Load profile cache for email lookups
    const profiles = await loadProfileCache();

    const data = await response.json();
    return (data.items || []).map((event: any) => {
      // Log recurring event info for debugging
      if (event.recurringEventId || event.recurrence) {
        console.log(`[CalendarAPI] Recurring event: "${event.summary}"`, {
          recurringEventId: event.recurringEventId,
          recurrence: event.recurrence,
        });
      }
      
      // Map attendees, looking up profile data by email
      const participants: UserSummary[] = (event.attendees || []).map((a: any) => {
        const email = a.email?.toLowerCase();
        const profile = email ? profiles.get(email) : null;
        
        if (profile) {
          // Found matching profile - use our data
          return profile;
        }
        
        // External attendee - use Google's data
        return {
          id: a.email,
          name: a.displayName || a.email,
          email: a.email,
          avatarUrl: null,
        };
      });
      
      // Determine if this is an invite (organizer is not the current user)
      // organizer.self is true ONLY if the current user is the organizer
      // If organizer.self is undefined or false, this is an invite from someone else
      const organizerEmail = event.organizer?.email || null;
      const selfAttendee = (event.attendees || []).find((a: any) => a.self === true);
      
      // isInvite is true when:
      // 1. There's an organizer and they're NOT the current user (self !== true)
      // 2. AND the current user is in the attendees list (selfAttendee exists)
      const isInvite = event.organizer && event.organizer.self !== true && !!selfAttendee;
      const myResponseStatus: RsvpStatus | undefined = selfAttendee?.responseStatus as RsvpStatus | undefined;
      
      
      return {
        id: event.id,
        title: event.summary || 'Untitled Event',
        calendarId: calendar.id,
        ownerId: userId,
        participants,
        allDay: !!event.start?.date,
        start: event.start?.dateTime || event.start?.date || '',
        end: event.end?.dateTime || event.end?.date || '',
        repeat: { type: parseGoogleRecurrence(event.recurrence, event.recurringEventId) },
        location: event.location,
        videoCall: event.hangoutLink ? {
          enabled: true,
          provider: 'google_meet' as const,
          link: event.hangoutLink,
          code: extractMeetCode(event.hangoutLink),
        } : null,
        color: calendar.color,
        // Invite fields
        isInvite,
        myResponseStatus,
        organizerEmail,
      };
    });
  } catch (err) {
    console.error(`[CalendarAPI] Error fetching ${calendar.id}:`, err);
    return [];
  }
}

/**
 * Create a new event in Google Calendar
 */
export async function createEvent(
  payload: EventPayload,
  userId: string
): Promise<CalendarEvent> {
  try {
    // Get the session token from supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json',
    };
    
    // Add auth header if we have a session
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    console.log('[CalendarAPI] Creating event with attendees:', payload.participantEmails);
    
    const response = await fetch('/api/calendar/google/events', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        calendarId: payload.calendarId,
        title: payload.title,
        description: payload.description,
        start: payload.start,
        end: payload.end,
        allDay: payload.allDay,
        location: payload.location,
        attendees: payload.participantEmails || [], // Send emails for Google Calendar
        repeat: payload.repeat,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        videoCall: payload.videoCall?.enabled || false, // Request Google Meet link
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create event');
    }

    const { event } = await response.json();
    
    // Convert Google event to our CalendarEvent format
    const newEvent: CalendarEvent = {
      id: event.id,
      title: event.summary || payload.title,
      description: event.description || null,
      calendarId: payload.calendarId,
      ownerId: userId,
      participants: payload.participants || [], // UserSummary[] from payload
      allDay: payload.allDay,
      start: event.start?.dateTime || event.start?.date || payload.start,
      end: event.end?.dateTime || event.end?.date || payload.end,
      repeat: payload.repeat,
      location: event.location || null,
      videoCall: event.hangoutLink ? {
        enabled: true,
        provider: 'google_meet',
        link: event.hangoutLink,
        code: extractMeetCode(event.hangoutLink),
      } : null,
      createdAt: event.created || new Date().toISOString(),
      updatedAt: event.updated || new Date().toISOString(),
    };
    
    // Invalidate cache to refetch events
    invalidateAccountCache();
    
    return newEvent;
  } catch (err) {
    console.error('[CalendarAPI] Error creating event:', err);
    throw err;
  }
}

/**
 * Update an existing event in Google Calendar
 */
export async function updateEvent(
  eventId: string,
  updates: Partial<EventPayload>,
  calendarId: string
): Promise<CalendarEvent> {
  try {
    // Get the session token from supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json',
    };
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    const response = await fetch('/api/calendar/google/events', {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        eventId,
        calendarId,
        title: updates.title,
        description: updates.description,
        start: updates.start,
        end: updates.end,
        allDay: updates.allDay,
        location: updates.location,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update event');
    }

    const { event } = await response.json();
    
    // Invalidate cache to refetch events
    invalidateAccountCache();
    
    // Convert Google event to our CalendarEvent format
    return {
      id: event.id,
      title: event.summary,
      description: event.description || null,
      calendarId,
      ownerId: '', // Will be filled by caller
      participants: [],
      allDay: !!event.start?.date,
      start: event.start?.dateTime || event.start?.date || '',
      end: event.end?.dateTime || event.end?.date || '',
      repeat: { type: 'none' },
      location: event.location || null,
      videoCall: event.hangoutLink ? {
        enabled: true,
        provider: 'google_meet',
        link: event.hangoutLink,
        code: extractMeetCode(event.hangoutLink),
      } : null,
      updatedAt: event.updated || new Date().toISOString(),
    };
  } catch (err) {
    console.error('[CalendarAPI] Error updating event:', err);
    throw err;
  }
}

/**
 * Delete an event from Google Calendar
 * @param recurringOption - For recurring events: 'this' (single instance), 'all' (entire series), 'following' (this and future)
 */
export async function deleteEvent(
  eventId: string, 
  calendarId: string,
  recurringOption?: 'this' | 'all' | 'following'
): Promise<void> {
  try {
    // Get the session token from supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = {};
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    let url = `/api/calendar/google/events?eventId=${encodeURIComponent(eventId)}&calendarId=${encodeURIComponent(calendarId)}`;
    if (recurringOption) {
      url += `&recurringOption=${recurringOption}`;
    }
    
    const response = await fetch(url, { 
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete event');
    }
    
    // Invalidate cache to refetch events
    invalidateAccountCache();
  } catch (err) {
    console.error('[CalendarAPI] Error deleting event:', err);
    throw err;
  }
}

/**
 * Create a video call (Google Meet) for an event
 * Uses Google Calendar API's conferenceData feature
 */
export async function createVideoCall(eventId: string, calendarId: string): Promise<VideoCall> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json',
    };
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    const response = await fetch('/api/calendar/google/events/video-call', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        eventId,
        calendarId,
        action: 'add',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create video call');
    }

    const { videoCall } = await response.json();
    return videoCall;
  } catch (err) {
    console.error('[CalendarAPI] Error creating video call:', err);
    throw err;
  }
}

/**
 * Remove video call from an event
 */
export async function deleteVideoCall(eventId: string, calendarId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json',
    };
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    const response = await fetch('/api/calendar/google/events/video-call', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        eventId,
        calendarId,
        action: 'remove',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove video call');
    }
  } catch (err) {
    console.error('[CalendarAPI] Error removing video call:', err);
    throw err;
  }
}

/**
 * Respond to a calendar invite (RSVP)
 * @param response - 'accepted', 'declined', or 'tentative'
 */
export async function respondToInvite(
  eventId: string, 
  calendarId: string, 
  response: 'accepted' | 'declined' | 'tentative'
): Promise<RsvpStatus> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json',
    };
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    const apiResponse = await fetch('/api/calendar/google/events/rsvp', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        eventId,
        calendarId,
        response,
      }),
    });

    if (!apiResponse.ok) {
      const error = await apiResponse.json();
      console.error('[CalendarAPI] RSVP - API error:', error);
      throw new Error(error.error || 'Failed to respond to invite');
    }

    return response;
  } catch (err) {
    console.error('[CalendarAPI] Error responding to invite:', err);
    throw err;
  }
}

/**
 * Search users for participant selection
 * Queries profiles table directly
 */
export async function searchUsers(query: string): Promise<UserSummary[]> {
  // If no query, return all users
  const baseQuery = supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .limit(20);
  
  // If there's a search query, filter by name or email
  const { data: users, error } = query.trim() 
    ? await baseQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    : await baseQuery;

  if (error || !users) {
    console.error('[CalendarAPI] Error searching users:', error);
    return [];
  }

  return users.map(u => ({
    id: u.id,
    name: u.full_name || u.email || 'Unknown',
    email: u.email,
    avatarUrl: u.avatar_url,
  }));
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateMeetCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part = () => Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part()}-${part()}-${part()}`;
}

function extractMeetCode(hangoutLink: string): string {
  // Extract code from URLs like https://meet.google.com/abc-defg-hij
  // Also handles variant formats and query parameters
  const match = hangoutLink.match(/meet\.google\.com\/([a-z]+-[a-z]+-[a-z]+)/i);
  return match ? match[1] : '';
}

function parseGoogleRecurrence(recurrence?: string[], recurringEventId?: string): RepeatType {
  // If event has a recurringEventId, it's an instance of a recurring event
  if (recurringEventId) {
    return 'weekly'; // Default to weekly for recurring instances
  }
  
  // If event has recurrence rules, parse them
  if (recurrence && recurrence.length > 0) {
    const rrule = recurrence.find(r => r.startsWith('RRULE:')) || '';
    
    if (rrule.includes('FREQ=DAILY')) return 'daily';
    if (rrule.includes('FREQ=WEEKLY')) return 'weekly';
    if (rrule.includes('FREQ=MONTHLY')) return 'monthly';
    if (rrule.includes('FREQ=YEARLY')) return 'yearly';
    
    // Has recurrence but couldn't parse - assume weekly
    return 'weekly';
  }
  
  return 'none';
}
