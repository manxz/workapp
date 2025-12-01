"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type SyncedCalendar = {
  id: string;
  google_calendar_id: string;
  name: string;
  color: string;
  is_primary: boolean;
  is_enabled: boolean;
};

export type ConnectedAccount = {
  id: string;
  provider: string;
  email: string;
  created_at: string;
  synced_calendars: SyncedCalendar[];
};

export function useConnectedAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Fetch connected accounts directly from Supabase
      const { data: accountsData, error: accountsError } = await supabase
        .from('connected_calendar_accounts')
        .select(`
          id,
          provider,
          email,
          created_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (accountsError) {
        console.error('[useConnectedAccounts] Error fetching accounts:', accountsError);
        throw new Error('Failed to fetch accounts');
      }

      // Fetch synced calendars for each account
      const accountsWithCalendars: ConnectedAccount[] = [];
      
      for (const account of accountsData || []) {
        const { data: calendarsData, error: calendarsError } = await supabase
          .from('synced_calendars')
          .select('id, google_calendar_id, name, color, is_primary, is_enabled')
          .eq('connected_account_id', account.id);

        if (calendarsError) {
          console.error('[useConnectedAccounts] Error fetching calendars:', calendarsError);
        }

        accountsWithCalendars.push({
          ...account,
          synced_calendars: calendarsData || [],
        });
      }

      setAccounts(accountsWithCalendars);
    } catch (err) {
      console.error('[useConnectedAccounts] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const disconnectAccount = useCallback(async (accountId: string) => {
    if (!user) return false;

    try {
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
        console.error('[useConnectedAccounts] Error deleting account:', deleteError);
        return false;
      }
      
      // Remove from local state
      setAccounts(prev => prev.filter(a => a.id !== accountId));
      return true;
    } catch (err) {
      console.error('[useConnectedAccounts] Error disconnecting:', err);
      return false;
    }
  }, [user]);

  const toggleCalendar = useCallback(async (accountId: string, calendarId: string, enabled: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('synced_calendars')
        .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
        .eq('id', calendarId)
        .eq('connected_account_id', accountId);

      if (updateError) {
        console.error('[useConnectedAccounts] Error updating calendar:', updateError);
        return false;
      }
      
      // Update local state
      setAccounts(prev => prev.map(account => {
        if (account.id !== accountId) return account;
        return {
          ...account,
          synced_calendars: account.synced_calendars.map(cal => {
            if (cal.id !== calendarId) return cal;
            return { ...cal, is_enabled: enabled };
          }),
        };
      }));
      
      return true;
    } catch (err) {
      console.error('[useConnectedAccounts] Error toggling calendar:', err);
      return false;
    }
  }, []);

  const connectGoogle = useCallback(() => {
    // Redirect to Google OAuth
    window.location.href = '/api/calendar/google/auth?returnUrl=/';
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    disconnectAccount,
    toggleCalendar,
    connectGoogle,
  };
}
