"use client";

import { useState, useEffect, useCallback } from 'react';
import { Calendar } from '../types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const CALENDARS_CACHE_KEY = 'calendar_list_cache';

/**
 * Get cached calendars from localStorage
 */
function getCachedCalendars(): Calendar[] {
  if (typeof window === 'undefined') return [];
  try {
    const cached = localStorage.getItem(CALENDARS_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (data.calendars?.length > 0) {
        return data.calendars;
      }
    }
  } catch {}
  return [];
}

/**
 * Save calendars to localStorage
 */
function setCachedCalendars(calendars: Calendar[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CALENDARS_CACHE_KEY, JSON.stringify({ calendars, timestamp: Date.now() }));
  } catch {}
}

/**
 * Hook for managing calendars
 * 
 * Fetches available calendars (both internal and synced Google calendars)
 * and tracks which ones are enabled.
 */
export function useCalendars() {
  const { user, profile } = useAuth();
  // Initialize from cache synchronously
  const [calendars, setCalendars] = useState<Calendar[]>(getCachedCalendars);
  const [enabledCalendarIds, setEnabledCalendarIds] = useState<Set<string>>(() => {
    // Initialize enabled IDs from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendar_enabled_ids');
      if (saved) {
        try {
          return new Set<string>(JSON.parse(saved));
        } catch {}
      }
    }
    // Default to cached calendar IDs if available
    const cached = getCachedCalendars();
    return new Set(cached.map(c => c.id));
  });
  const [loading, setLoading] = useState(calendars.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(calendars.length > 0);

  // Load calendars on mount and when user/profile changes
  useEffect(() => {
    if (user) {
      loadCalendars();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile?.full_name]);

  // Persist enabled calendar IDs to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && initialized) {
      localStorage.setItem('calendar_enabled_ids', JSON.stringify([...enabledCalendarIds]));
    }
  }, [enabledCalendarIds, initialized]);

  const loadCalendars = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch synced calendars from Supabase
      const { data: syncedCalendars, error: fetchError } = await supabase
        .from('synced_calendars')
        .select('id, google_calendar_id, name, color, is_primary, is_enabled, connected_account_id')
        .eq('user_id', user.id);

      if (fetchError) {
        console.error('[useCalendars] Error fetching calendars:', fetchError);
        throw fetchError;
      }

      // Convert synced calendars to Calendar type
      const googleCalendars: Calendar[] = (syncedCalendars || []).map(cal => {
        const isHoliday = cal.google_calendar_id.includes('holiday');
        
        // Determine display name
        let displayName = cal.name;
        if (cal.is_primary && profile?.full_name) {
          // For the primary calendar, use user's name instead of email
          displayName = profile.full_name;
        } else if (isHoliday) {
          // For holiday calendars, always show "US Holidays"
          displayName = 'US Holidays';
        }
        
        return {
          id: cal.google_calendar_id,
          name: displayName,
          color: cal.color,
          editable: cal.is_primary, // Only primary calendar is editable
          isDefault: cal.is_primary,
          isHoliday,
          syncedCalendarId: cal.id, // Store the Supabase row ID for updates
        };
      });

      setCalendars(googleCalendars);
      
      // Cache calendars for instant load on next visit
      setCachedCalendars(googleCalendars);

      // Update enabled calendars
      const saved = localStorage.getItem('calendar_enabled_ids');
      if (saved && initialized) {
        // Already initialized - keep current enabled state but add any new calendars
        try {
          const savedIds = new Set<string>(JSON.parse(saved));
          const currentCalendarIds = new Set(googleCalendars.map(c => c.id));
          // Add any NEW calendars that aren't in saved state (they should be enabled by default)
          const newCalendarIds = googleCalendars
            .filter(c => !savedIds.has(c.id))
            .map(c => c.id);
          
          if (newCalendarIds.length > 0) {
            // Enable new calendars
            setEnabledCalendarIds(prev => {
              const updated = new Set(prev);
              newCalendarIds.forEach(id => updated.add(id));
              return updated;
            });
          }
        } catch {
          // On error, enable all
          setEnabledCalendarIds(new Set(googleCalendars.map(c => c.id)));
        }
      } else if (!initialized) {
        // First initialization
        if (saved) {
          try {
            const savedIds = new Set<string>(JSON.parse(saved));
            // Only keep IDs that exist in our calendars
            const validIds = new Set(
              googleCalendars
                .filter(c => savedIds.has(c.id))
                .map(c => c.id)
            );
            // If nothing was saved or none are valid, enable all
            if (validIds.size > 0) {
              setEnabledCalendarIds(validIds);
            } else {
              setEnabledCalendarIds(new Set(googleCalendars.map(c => c.id)));
            }
          } catch {
            setEnabledCalendarIds(new Set(googleCalendars.map(c => c.id)));
          }
        } else {
          // Default: all calendars enabled
          setEnabledCalendarIds(new Set(googleCalendars.map(c => c.id)));
        }
        setInitialized(true);
      }
    } catch (err) {
      console.error('[useCalendars] Error:', err);
      setError('Failed to load calendars');
    } finally {
      setLoading(false);
    }
  };

  const toggleCalendar = useCallback((calendarId: string) => {
    setEnabledCalendarIds(prev => {
      const next = new Set(prev);
      if (next.has(calendarId)) {
        next.delete(calendarId);
      } else {
        next.add(calendarId);
      }
      return next;
    });
  }, []);

  const isCalendarEnabled = useCallback((calendarId: string) => {
    return enabledCalendarIds.has(calendarId);
  }, [enabledCalendarIds]);

  const getCalendarById = useCallback((calendarId: string) => {
    return calendars.find(c => c.id === calendarId);
  }, [calendars]);

  const getCalendarColor = useCallback((calendarId: string) => {
    const calendar = calendars.find(c => c.id === calendarId);
    // Ensure we return a valid hex color
    const color = calendar?.color;
    if (!color || color.trim() === '') return '#3B82F6';
    return color;
  }, [calendars]);

  // Get the default calendar (primary/editable one, or first enabled if no primary)
  const getDefaultCalendarId = useCallback((): string | null => {
    // First, try to find the primary editable calendar that's enabled
    const primaryEnabled = calendars.find(c => c.isDefault && c.editable && enabledCalendarIds.has(c.id));
    if (primaryEnabled) return primaryEnabled.id;
    
    // Fall back to any editable calendar that's enabled
    const editableEnabled = calendars.find(c => c.editable && enabledCalendarIds.has(c.id));
    if (editableEnabled) return editableEnabled.id;
    
    // Fall back to first enabled calendar
    const firstEnabled = calendars.find(c => enabledCalendarIds.has(c.id));
    if (firstEnabled) return firstEnabled.id;
    
    // Fall back to first calendar period
    return calendars[0]?.id || null;
  }, [calendars, enabledCalendarIds]);

  // Force refresh and clear all cached data
  const forceRefresh = useCallback(async () => {
    // Clear localStorage cache
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CALENDARS_CACHE_KEY);
      localStorage.removeItem('calendar_enabled_ids');
    }
    // Reload calendars
    await loadCalendars();
  }, []);

  return {
    calendars,
    enabledCalendarIds: [...enabledCalendarIds],
    loading,
    error,
    toggleCalendar,
    isCalendarEnabled,
    getCalendarById,
    getCalendarColor,
    getDefaultCalendarId,
    refresh: loadCalendars,
    forceRefresh,
  };
}
