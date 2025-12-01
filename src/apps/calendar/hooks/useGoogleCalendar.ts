"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface ConnectedGoogleAccount {
  id: string;
  email: string;
  provider_account_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string;
  created_at: string;
}

export interface SyncedCalendarInfo {
  id: string;
  google_calendar_id: string;
  name: string;
  color: string;
  is_primary: boolean;
  is_enabled: boolean;
  connected_account_id: string;
}

export interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string; responseStatus: string }>;
  hangoutLink?: string;
  status: string;
  calendarId?: string;
  accountId?: string;
  accountEmail?: string;
}

export function useGoogleCalendar() {
  const { user } = useAuth();
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedGoogleAccount[]>([]);
  const [calendars, setCalendars] = useState<SyncedCalendarInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch connected accounts from Supabase
  const fetchConnectedAccounts = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('connected_calendar_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google');

      if (fetchError) {
        console.error('[useGoogleCalendar] Error fetching accounts:', fetchError);
        throw new Error('Failed to fetch connected accounts');
      }
      
      setConnectedAccounts(data || []);
    } catch (err) {
      console.error('[useGoogleCalendar] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch synced calendars from Supabase
  const fetchCalendars = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('synced_calendars')
        .select('*')
        .eq('user_id', user.id);

      if (fetchError) {
        console.error('[useGoogleCalendar] Error fetching calendars:', fetchError);
        throw new Error('Failed to fetch calendars');
      }
      
      setCalendars(data || []);
    } catch (err) {
      console.error('[useGoogleCalendar] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initiate Google OAuth flow
  const connectGoogleAccount = useCallback(() => {
    window.location.href = '/api/calendar/google/auth?returnUrl=/';
  }, []);

  // Disconnect a Google account
  const disconnectAccount = useCallback(async (accountId: string) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      // Delete synced calendars first
      await supabase
        .from('synced_calendars')
        .delete()
        .eq('connected_account_id', accountId);

      // Delete the connected account
      const { error: deleteError } = await supabase
        .from('connected_calendar_accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error('Failed to disconnect account');
      }
      
      // Remove from local state
      setConnectedAccounts(prev => prev.filter(a => a.id !== accountId));
      setCalendars(prev => prev.filter(c => c.connected_account_id !== accountId));
    } catch (err) {
      console.error('[useGoogleCalendar] Error disconnecting:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch events directly from Google Calendar API
  const fetchEvents = useCallback(async (timeMin: string, timeMax: string): Promise<GoogleEvent[]> => {
    if (!user || connectedAccounts.length === 0) {
      return [];
    }

    const allEvents: GoogleEvent[] = [];

    for (const account of connectedAccounts) {
      // Get enabled calendars for this account
      const enabledCalendars = calendars.filter(
        c => c.connected_account_id === account.id && c.is_enabled
      );

      // If no enabled calendars, use 'primary'
      const calendarIds = enabledCalendars.length > 0 
        ? enabledCalendars.map(c => c.google_calendar_id)
        : ['primary'];

      for (const calendarId of calendarIds) {
        try {
          const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
          url.searchParams.set('timeMin', timeMin);
          url.searchParams.set('timeMax', timeMax);
          url.searchParams.set('singleEvents', 'true');
          url.searchParams.set('orderBy', 'startTime');
          url.searchParams.set('maxResults', '250');

          const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${account.access_token}` },
          });

          if (!response.ok) {
            console.error(`[useGoogleCalendar] Failed to fetch events for ${calendarId}:`, await response.text());
            continue;
          }

          const data = await response.json();
          const events = (data.items || []).map((event: GoogleEvent) => ({
            ...event,
            calendarId,
            accountId: account.id,
            accountEmail: account.email,
          }));
          
          allEvents.push(...events);
        } catch (err) {
          console.error(`[useGoogleCalendar] Error fetching events for ${calendarId}:`, err);
        }
      }
    }

    console.log(`[useGoogleCalendar] Fetched ${allEvents.length} events`);
    return allEvents;
  }, [user, connectedAccounts, calendars]);

  // Load data on mount
  useEffect(() => {
    if (user) {
      fetchConnectedAccounts();
      fetchCalendars();
    }
  }, [user, fetchConnectedAccounts, fetchCalendars]);

  return {
    connectedAccounts,
    calendars,
    loading,
    error,
    connectGoogleAccount,
    disconnectAccount,
    fetchCalendars,
    fetchEvents,
    refreshAccounts: fetchConnectedAccounts,
  };
}
