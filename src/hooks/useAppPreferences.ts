import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook for managing per-user app preferences (enabled/disabled apps).
 * 
 * Architecture:
 * - Fetches user's enabled_apps from user_preferences table
 * - Defaults to ['chat', 'projects'] if no preferences exist
 * - Chat is always enabled and cannot be disabled
 * - Real-time sync across tabs via Supabase subscription
 * - Optimistic updates for instant UI feedback
 * 
 * @returns enabled_apps array, toggleApp function, and loading state
 */
export function useAppPreferences() {
  const { user } = useAuth();
  const [enabledApps, setEnabledApps] = useState<string[]>([]); // Start empty to prevent flash
  const [loading, setLoading] = useState(true);

  /**
   * Fetches user's app preferences from the database.
   * Creates a default entry if none exists.
   */
  const loadPreferences = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('enabled_apps')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no preferences exist, create default entry
        if (error.code === 'PGRST116') {
          const { data: newPrefs, error: insertError } = await supabase
            .from('user_preferences')
            .insert({
              user_id: user.id,
              enabled_apps: ['chat', 'projects'],
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating preferences:', insertError);
          } else if (newPrefs) {
            setEnabledApps(newPrefs.enabled_apps);
          }
        } else {
          console.error('Error loading preferences:', error);
        }
      } else if (data) {
        setEnabledApps(data.enabled_apps);
      }
    } catch (error) {
      console.error('Error in loadPreferences:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Initial load of preferences.
   */
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  /**
   * Subscribe to real-time changes for cross-tab sync.
   */
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user_preferences:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_preferences',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && 'enabled_apps' in payload.new) {
            setEnabledApps(payload.new.enabled_apps as string[]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  /**
   * Toggles an app on or off.
   * - Chat cannot be disabled (always enabled)
   * - Optimistic update for instant UI feedback
   * - Rollback on error
   * 
   * @param appId The app ID to toggle (e.g., 'chat', 'projects')
   * @returns Promise<boolean> - true if successful, false if failed or blocked
   */
  const toggleApp = useCallback(
    async (appId: string): Promise<boolean> => {
      if (!user) return false;

      // Chat cannot be disabled
      if (appId === 'chat') {
        console.warn('Chat app cannot be disabled');
        return false;
      }

      const isCurrentlyEnabled = enabledApps.includes(appId);
      const newEnabledApps = isCurrentlyEnabled
        ? enabledApps.filter((id) => id !== appId)
        : [...enabledApps, appId];

      // Optimistic update
      const previousEnabledApps = [...enabledApps];
      setEnabledApps(newEnabledApps);

      try {
        const { error } = await supabase
          .from('user_preferences')
          .update({ enabled_apps: newEnabledApps })
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating preferences:', error);
          // Rollback on error
          setEnabledApps(previousEnabledApps);
          return false;
        }

        return true;
      } catch (error) {
        console.error('Error in toggleApp:', error);
        // Rollback on error
        setEnabledApps(previousEnabledApps);
        return false;
      }
    },
    [user, enabledApps]
  );

  /**
   * Checks if a specific app is enabled.
   */
  const isAppEnabled = useCallback(
    (appId: string): boolean => {
      return enabledApps.includes(appId);
    },
    [enabledApps]
  );

  return {
    enabledApps,
    toggleApp,
    isAppEnabled,
    loading,
  };
}

