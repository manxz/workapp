"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook to auto-connect Google Calendar when user logs in with Google OAuth
 * and has granted calendar scopes.
 * 
 * This checks if:
 * 1. User is logged in via Google
 * 2. Session has a provider_token (Google access token)
 * 3. User doesn't already have a connected calendar account
 * 
 * If all conditions are met, it automatically creates a connected_calendar_account
 * entry and syncs their calendars.
 */
export function useAutoConnectCalendar(onConnected?: () => void) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const autoConnect = async () => {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          return;
        }

        // Check if user logged in with Google and has provider token
        const providerToken = session.provider_token;
        const providerRefreshToken = session.provider_refresh_token;
        
        if (!providerToken) {
          return;
        }

        // Check if user already has a connected Google account
        const { data: existingAccounts, error: fetchError } = await supabase
          .from('connected_calendar_accounts')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('provider', 'google');

        if (fetchError) {
          console.error('[AutoConnect] Error checking existing accounts:', fetchError);
          return;
        }

        if (existingAccounts && existingAccounts.length > 0) {
          setIsConnected(true);
          // Already connected, still notify so events can load
          if (onConnected) onConnected();
          return;
        }

        // Get Google user info to get the provider account ID
        setIsConnecting(true);
        
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${providerToken}`,
          },
        });

        if (!userInfoResponse.ok) {
          console.error('[AutoConnect] Failed to get Google user info');
          setError('Failed to get Google account info');
          return;
        }

        const googleUser = await userInfoResponse.json();
        const { id: googleAccountId, email } = googleUser;

        // Create connected calendar account (or get existing if race condition)
        const { data: newAccount, error: insertError } = await supabase
          .from('connected_calendar_accounts')
          .insert({
            user_id: session.user.id,
            provider: 'google',
            provider_account_id: googleAccountId,
            email: email,
            access_token: providerToken,
            refresh_token: providerRefreshToken || null,
            token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // Assume 1 hour expiry
            scopes: ['calendar', 'calendar.events', 'userinfo.email', 'userinfo.profile'],
          })
          .select('id')
          .single();

        if (insertError) {
          // If insert failed, it might be due to race condition - check if account exists now
          const { data: existingNow } = await supabase
            .from('connected_calendar_accounts')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('provider', 'google')
            .single();
          
          if (existingNow) {
            console.log('[AutoConnect] Account already exists (race condition), using existing');
            setIsConnected(true);
            if (onConnected) onConnected();
            return;
          }
          
          console.error('[AutoConnect] Failed to create connected account:', insertError);
          setError('Failed to connect calendar');
          return;
        }

        // Sync calendars from Google
        if (newAccount) {
          await syncCalendars(newAccount.id, session.user.id, providerToken);
        }

        setIsConnected(true);
        
        // Notify parent that connection is complete so it can refresh data
        if (onConnected) {
          onConnected();
        }
      } catch (err) {
        console.error('[AutoConnect] Error:', err);
        setError('An error occurred while connecting calendar');
      } finally {
        setIsConnecting(false);
      }
    };

    autoConnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isConnecting, isConnected, error };
}

// Helper function to sync calendars
async function syncCalendars(accountId: string, userId: string, accessToken: string) {
  try {
    const calendarsResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!calendarsResponse.ok) {
      console.error('[AutoConnect] Failed to fetch Google calendars');
      return;
    }

    const calendarsData = await calendarsResponse.json();
    const calendars = calendarsData.items || [];

    // Insert calendars (upsert to avoid duplicates)
    for (const calendar of calendars) {
      // Check if calendar already exists
      const { data: existing } = await supabase
        .from('synced_calendars')
        .select('id')
        .eq('connected_account_id', accountId)
        .eq('google_calendar_id', calendar.id)
        .single();

      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from('synced_calendars')
          .update({
            name: calendar.summary || 'Untitled Calendar',
            color: calendar.backgroundColor || '#4285F4',
            is_primary: calendar.primary || false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('[AutoConnect] Failed to update calendar:', updateError);
        }
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('synced_calendars')
          .insert({
            connected_account_id: accountId,
            user_id: userId,
            google_calendar_id: calendar.id,
            name: calendar.summary || 'Untitled Calendar',
            color: calendar.backgroundColor || '#4285F4',
            is_primary: calendar.primary || false,
            is_enabled: true,
          });

        if (insertError) {
          console.error('[AutoConnect] Failed to insert calendar:', insertError);
        }
      }
    }

  } catch (err) {
    console.error('[AutoConnect] Error syncing calendars:', err);
  }
}

