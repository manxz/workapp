"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CalendarEvent, DateRange, EventPayload, RsvpStatus } from '../types';
import { 
  fetchEvents, 
  createEvent, 
  updateEvent, 
  deleteEvent,
  createVideoCall,
  deleteVideoCall,
  respondToInvite,
} from '../api/calendarApi';
import { useAuth } from '@/contexts/AuthContext';

// Cache key for localStorage
const CACHE_KEY = 'calendar_events_cache';

interface CachedData {
  events: CalendarEvent[];
  timestamp: number;
  rangeStart: string;
  rangeEnd: string;
}

/**
 * Get a large date range for preloading (2 months before + 2 months after)
 */
function getLargeRange(): DateRange {
  const now = new Date();
  
  // Start: 2 months ago
  const start = new Date(now);
  start.setMonth(start.getMonth() - 2);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  
  // End: 2 months from now
  const end = new Date(now);
  end.setMonth(end.getMonth() + 3);
  end.setDate(0); // Last day of prev month
  end.setHours(23, 59, 59, 999);
  
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * Load cached events from localStorage
 */
function loadCache(): CachedData | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}
  return null;
}

/**
 * Save events to localStorage
 */
function saveCache(data: CachedData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

// Load cache at module level for instant access
const initialCache = loadCache();

/**
 * Hook for managing calendar events
 * 
 * Loads a large date range (4 months) and filters client-side for instant navigation.
 */
export function useEvents(
  viewRange: DateRange | null,  // The week being viewed (for filtering)
  enabledCalendarIds: string[]
) {
  const { user } = useAuth();
  
  // All events (large range, cached)
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>(
    initialCache?.events || []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  
  // Track if initial fetch is done
  const hasFetchedRef = useRef(false);
  const fetchRangeRef = useRef<DateRange | null>(null);

  // Track the calendar IDs we fetched with
  const fetchedWithCalendarsRef = useRef<string>('');
  
  // Fetch the large range on mount (background refresh)
  useEffect(() => {
    if (!user) return;
    
    // Create a key from current calendar IDs to detect changes
    const calendarKey = enabledCalendarIds.sort().join(',');
    
    // Skip if no calendars enabled yet (wait for calendars to load)
    if (enabledCalendarIds.length === 0) return;
    
    // Skip if we already fetched with the same calendars
    if (hasFetchedRef.current && fetchedWithCalendarsRef.current === calendarKey) return;
    
    const fetchLargeRange = async () => {
      const range = getLargeRange();
      fetchRangeRef.current = range;
      
      // Only show loading if we have NO cached data
      if (allEvents.length === 0) {
        setLoading(true);
      }
      
      try {
        const data = await fetchEvents(range, enabledCalendarIds, user.id);
        setAllEvents(data);
        hasFetchedRef.current = true;
        fetchedWithCalendarsRef.current = calendarKey;
        
        // Cache for next time
        saveCache({
          events: data,
          timestamp: Date.now(),
          rangeStart: range.start,
          rangeEnd: range.end,
        });
      } catch (err) {
        console.error('Error loading events:', err);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLargeRange();
  }, [user?.id, enabledCalendarIds.join(',')]);

  // Filter events for the current view (instant - no network)
  const events = useMemo(() => {
    if (!viewRange) return [];
    
    const start = new Date(viewRange.start);
    const end = new Date(viewRange.end);
    
    return allEvents.filter(event => {
      // Filter by enabled calendars
      if (!enabledCalendarIds.includes(event.calendarId)) return false;
      
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      // Event overlaps with view range
      return eventStart < end && eventEnd > start;
    });
  }, [allEvents, viewRange?.start, viewRange?.end, enabledCalendarIds]);

  // Manual refresh
  const refresh = useCallback(async () => {
    if (!user) return;
    
    const range = fetchRangeRef.current || getLargeRange();
    setLoading(true);
    
    try {
      const data = await fetchEvents(range, enabledCalendarIds, user.id);
      setAllEvents(data);
      
      saveCache({
        events: data,
        timestamp: Date.now(),
        rangeStart: range.start,
        rangeEnd: range.end,
      });
    } catch (err) {
      console.error('Error refreshing events:', err);
      setError('Failed to refresh events');
    } finally {
      setLoading(false);
    }
  }, [user, enabledCalendarIds]);

  const addEvent = useCallback(async (payload: EventPayload): Promise<CalendarEvent | null> => {
    if (!user) return null;
    
    try {
      setSavingEventId('new');
      const newEvent = await createEvent(payload, user.id);
      setAllEvents(prev => [...prev, newEvent]);
      
      // Update cache
      const range = fetchRangeRef.current || getLargeRange();
      saveCache({
        events: [...allEvents, newEvent],
        timestamp: Date.now(),
        rangeStart: range.start,
        rangeEnd: range.end,
      });
      
      return newEvent;
    } catch (err) {
      console.error('Error creating event:', err);
      setError('Failed to create event');
      return null;
    } finally {
      setSavingEventId(null);
    }
  }, [user, allEvents]);

  const editEvent = useCallback(async (
    eventId: string, 
    updates: Partial<EventPayload>,
    optimistic?: boolean
  ): Promise<CalendarEvent | null> => {
    // Find the event to get its calendarId
    const existingEvent = allEvents.find(e => e.id === eventId);
    if (!existingEvent) {
      setError('Event not found');
      return null;
    }
    
    const calendarId = updates.calendarId || existingEvent.calendarId;
    
    // For optimistic updates, update UI immediately before API call
    if (optimistic) {
      const optimisticEvent = { ...existingEvent, ...updates, calendarId };
      const optimisticEvents = allEvents.map(e => e.id === eventId ? optimisticEvent : e);
      setAllEvents(optimisticEvents);
      
      // Update cache immediately
      const range = fetchRangeRef.current || getLargeRange();
      saveCache({
        events: optimisticEvents,
        timestamp: Date.now(),
        rangeStart: range.start,
        rangeEnd: range.end,
      });
      
      // Make API call in background
      updateEvent(eventId, updates, calendarId).catch(err => {
        console.error('Error updating event:', err);
        // Revert on error
        setAllEvents(allEvents);
        setError('Failed to update event');
      });
      
      return optimisticEvent as CalendarEvent;
    }
    
    // Non-optimistic: wait for API response
    try {
      setSavingEventId(eventId);
      const updated = await updateEvent(eventId, updates, calendarId);
      
      // Merge updated fields with existing event data
      const mergedEvent = { ...existingEvent, ...updated, calendarId };
      const newEvents = allEvents.map(e => e.id === eventId ? mergedEvent : e);
      setAllEvents(newEvents);
      
      // Update cache so reload shows updated data
      const range = fetchRangeRef.current || getLargeRange();
      saveCache({
        events: newEvents,
        timestamp: Date.now(),
        rangeStart: range.start,
        rangeEnd: range.end,
      });
      
      return mergedEvent;
    } catch (err) {
      console.error('Error updating event:', err);
      setError('Failed to update event');
      return null;
    } finally {
      setSavingEventId(null);
    }
  }, [allEvents]);

  const removeEvent = useCallback(async (eventId: string, recurringOption?: 'this' | 'all' | 'following'): Promise<boolean> => {
    // Find the event to get its calendarId
    const existingEvent = allEvents.find(e => e.id === eventId);
    if (!existingEvent) {
      setError('Event not found');
      return false;
    }
    
    try {
      setSavingEventId(eventId);
      await deleteEvent(eventId, existingEvent.calendarId, recurringOption);
      
      let newEvents: CalendarEvent[];
      
      if (recurringOption === 'all') {
        // For 'all' option, remove all events with the same recurring base ID
        // Instance IDs look like: masterEventId_YYYYMMDDTHHMMSSZ
        const underscoreIndex = eventId.lastIndexOf('_');
        const masterIdPrefix = underscoreIndex > 0 ? eventId.substring(0, underscoreIndex) : eventId;
        
        newEvents = allEvents.filter(e => {
          // Remove events that start with the same master ID
          if (e.id === eventId) return false;
          if (e.id.startsWith(masterIdPrefix + '_')) return false;
          if (e.id === masterIdPrefix) return false;
          return true;
        });
      } else if (recurringOption === 'following') {
        // For 'following', remove this and all future instances
        // This is approximate - a full implementation would refetch
        const eventDate = new Date(existingEvent.start);
        const underscoreIndex = eventId.lastIndexOf('_');
        const masterIdPrefix = underscoreIndex > 0 ? eventId.substring(0, underscoreIndex) : eventId;
        
        newEvents = allEvents.filter(e => {
          if (e.id === eventId) return false;
          // Check if same recurring series and in the future
          if (e.id.startsWith(masterIdPrefix + '_') || e.id === masterIdPrefix) {
            const eDate = new Date(e.start);
            if (eDate >= eventDate) return false;
          }
          return true;
        });
      } else {
        // For 'this' or no option, just remove the single event
        newEvents = allEvents.filter(e => e.id !== eventId);
      }
      
      // Update state
      setAllEvents(newEvents);
      
      // Update cache so reload doesn't show stale data
      const range = fetchRangeRef.current || getLargeRange();
      saveCache({
        events: newEvents,
        timestamp: Date.now(),
        rangeStart: range.start,
        rangeEnd: range.end,
      });
      
      return true;
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Failed to delete event');
      return false;
    } finally {
      setSavingEventId(null);
    }
  }, [allEvents]);

  const addVideoCall = useCallback(async (eventId: string): Promise<boolean> => {
    const existingEvent = allEvents.find(e => e.id === eventId);
    if (!existingEvent) {
      setError('Event not found');
      return false;
    }
    
    try {
      setSavingEventId(eventId);
      const videoCall = await createVideoCall(eventId, existingEvent.calendarId);
      setAllEvents(prev => prev.map(e => 
        e.id === eventId ? { ...e, videoCall } : e
      ));
      return true;
    } catch (err) {
      console.error('Error creating video call:', err);
      setError('Failed to create video call');
      return false;
    } finally {
      setSavingEventId(null);
    }
  }, [allEvents]);

  const removeVideoCall = useCallback(async (eventId: string): Promise<boolean> => {
    const existingEvent = allEvents.find(e => e.id === eventId);
    if (!existingEvent) {
      setError('Event not found');
      return false;
    }
    
    try {
      setSavingEventId(eventId);
      await deleteVideoCall(eventId, existingEvent.calendarId);
      setAllEvents(prev => prev.map(e => 
        e.id === eventId ? { ...e, videoCall: null } : e
      ));
      return true;
    } catch (err) {
      console.error('Error removing video call:', err);
      setError('Failed to remove video call');
      return false;
    } finally {
      setSavingEventId(null);
    }
  }, [allEvents]);

  const getEventById = useCallback((eventId: string) => {
    return allEvents.find(e => e.id === eventId);
  }, [allEvents]);

  const canEditEvent = useCallback((event: CalendarEvent) => {
    // For Google Calendar events, we can edit if the event is on the primary calendar
    // (which is the only editable calendar based on our setup)
    // The primary calendar ID is usually the user's email address
    // For now, assume all events can be edited - the API will return an error if not
    return true;
  }, []);

  const rsvpToEvent = useCallback(async (
    eventId: string, 
    response: 'accepted' | 'declined' | 'tentative'
  ): Promise<boolean> => {
    const existingEvent = allEvents.find(e => e.id === eventId);
    if (!existingEvent) {
      setError('Event not found');
      return false;
    }
    
    try {
      setSavingEventId(eventId);
      await respondToInvite(eventId, existingEvent.calendarId, response);
      
      // Update local state with new response status
      const newEvents = allEvents.map(e => 
        e.id === eventId ? { ...e, myResponseStatus: response as RsvpStatus } : e
      );
      setAllEvents(newEvents);
      
      // Update cache
      const range = fetchRangeRef.current || getLargeRange();
      saveCache({
        events: newEvents,
        timestamp: Date.now(),
        rangeStart: range.start,
        rangeEnd: range.end,
      });
      
      return true;
    } catch (err) {
      console.error('Error responding to invite:', err);
      setError('Failed to respond to invite');
      return false;
    } finally {
      setSavingEventId(null);
    }
  }, [allEvents]);

  return {
    events,          // Filtered for current view
    allEvents,       // All loaded events
    loading,
    error,
    savingEventId,
    addEvent,
    editEvent,
    removeEvent,
    addVideoCall,
    removeVideoCall,
    getEventById,
    canEditEvent,
    rsvpToEvent,
    refresh,
    clearError: () => setError(null),
  };
}
