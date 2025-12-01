"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import CalendarSidebar from './components/CalendarSidebar';
import CalendarHeader from './components/CalendarHeader';
import CalendarGrid from './components/CalendarGrid';
import EventPanel from './components/EventPanel';
import RecurringDeleteModal, { RecurringDeleteOption } from './components/RecurringDeleteModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useCalendars } from './hooks/useCalendars';
import { useEvents } from './hooks/useEvents';
import { useWeekNavigation } from './hooks/useWeekNavigation';
import { useTimeRangeSelection } from './hooks/useTimeRangeSelection';
import { useAutoConnectCalendar } from './hooks/useAutoConnectCalendar';
import { CalendarEvent, EventPayload, SelectionRange, EventPanelMode, UserSummary } from './types';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Calendar App Module
 * 
 * Full-featured calendar with:
 * - Week view with time grid
 * - Click/drag event creation
 * - Event details panel
 * - Multiple calendars with toggle
 * - Repeating events
 * - Video call integration
 * - Participant management
 * 
 * Following Gmail/Google Calendar UX patterns.
 */
export default function CalendarApp() {
  const { user, profile } = useAuth();
  
  // Create current user summary for participant list
  const currentUser: UserSummary | null = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      name: profile?.full_name || user.email?.split('@')[0] || 'Me',
      email: user.email,
      avatarUrl: profile?.avatar_url,
    };
  }, [user, profile]);
  
  // Track if we need to refresh after auto-connect
  const [needsRefresh, setNeedsRefresh] = useState(false);
  
  // Auto-connect Google Calendar on first load (if user logged in with Google)
  const { isConnecting: isAutoConnecting, isConnected: isAutoConnected } = useAutoConnectCalendar(() => {
    // Trigger refresh when connection completes
    setNeedsRefresh(true);
  });
  
  // State
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [panelMode, setPanelMode] = useState<EventPanelMode | null>(null);
  const [newEventData, setNewEventData] = useState<{ start: Date; end: Date } | null>(null);
  const [pendingEventTitle, setPendingEventTitle] = useState('');
  const [pendingEventAllDay, setPendingEventAllDay] = useState(false);
  const [view] = useState<'week' | 'month'>('week');
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRecurringDeleteModal, setShowRecurringDeleteModal] = useState(false);
  
  // Get user timezone (simplified for MVP)
  const timezone = useMemo(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Return short timezone abbreviation
      const abbr = new Date().toLocaleString('en-US', { timeZoneName: 'short' }).split(' ').pop();
      return abbr || 'PST';
    } catch {
      return 'PST';
    }
  }, []);

  // Hooks
  const weekNav = useWeekNavigation({ startDay: 0, timezone });
  const { 
    calendars, 
    enabledCalendarIds, 
    loading: calendarsLoading,
    toggleCalendar, 
    getCalendarColor,
    getDefaultCalendarId,
    refresh: refreshCalendars,
  } = useCalendars();
  
  const { 
    events, 
    loading: eventsLoading,
    savingEventId,
    addEvent,
    editEvent,
    removeEvent,
    addVideoCall,
    removeVideoCall,
    canEditEvent,
    refresh: refreshEvents,
  } = useEvents(weekNav.dateRange, enabledCalendarIds);
  
  // Refresh calendars and events when auto-connect completes
  useEffect(() => {
    if (needsRefresh) {
      setNeedsRefresh(false);
      // Refresh calendars first, then events (with delay to ensure calendars are synced)
      const doRefresh = async () => {
        // Wait a bit for calendar sync to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        await refreshCalendars();
        // Another delay to let React update enabledCalendarIds
        await new Promise(resolve => setTimeout(resolve, 500));
        refreshEvents();
      };
      doRefresh();
    }
  }, [needsRefresh, refreshCalendars, refreshEvents]);
  
  // Also refresh events when calendars change (enabledCalendarIds becomes non-empty)
  const prevCalendarCount = useRef(0);
  useEffect(() => {
    if (enabledCalendarIds.length > 0 && prevCalendarCount.current === 0) {
      // Calendars just became available, refresh events
      refreshEvents();
    }
    prevCalendarCount.current = enabledCalendarIds.length;
  }, [enabledCalendarIds.length, refreshEvents]);

  // Time range selection hook - defined first so we can access clearSelection
  const timeSelection = useTimeRangeSelection(useCallback((range: SelectionRange) => {
    // Create Date objects from the time slots
    const startDate = new Date(range.start.date);
    startDate.setHours(range.start.hour, range.start.minute, 0, 0);
    
    const endDate = new Date(range.end.date);
    endDate.setHours(range.end.hour, range.end.minute, 0, 0);
    
    // Open panel for new event
    setSelectedEvent(null);
    setNewEventData({ start: startDate, end: endDate });
    setPendingEventTitle(''); // Reset title for new event
    setPanelMode('create');
  }, []));
  
  // Clear selection after we've captured the data
  useEffect(() => {
    if (newEventData && panelMode === 'create') {
      timeSelection.clearSelection();
    }
  }, [newEventData, panelMode, timeSelection]);

  // Handle event click
  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setNewEventData(null);
    setPanelMode(canEditEvent(event) ? 'edit' : 'view');
  }, [canEditEvent]);

  // Handle panel close
  const handlePanelClose = useCallback(() => {
    setSelectedEvent(null);
    setNewEventData(null);
    setPanelMode(null);
    setPendingEventTitle('');
    setPendingEventAllDay(false);
    timeSelection.clearSelection();
  }, [timeSelection]);

  // Handle create event from sidebar button
  const handleCreateFromSidebar = useCallback(() => {
    const now = new Date();
    // Round to next 30 min slot
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 30) * 30;
    now.setMinutes(roundedMinutes, 0, 0);
    
    const endDate = new Date(now.getTime() + 30 * 60 * 1000);
    
    setSelectedEvent(null);
    setNewEventData({ start: now, end: endDate });
    setPendingEventTitle('');
    setPanelMode('create');
  }, []);

  // Handle save event
  const handleSaveEvent = useCallback(async (payload: EventPayload) => {
    if (panelMode === 'create') {
      const newEvent = await addEvent(payload);
      if (newEvent) {
        handlePanelClose();
      }
    } else if (panelMode === 'edit' && selectedEvent) {
      const updated = await editEvent(selectedEvent.id, payload);
      if (updated) {
        handlePanelClose(); // Close panel after successful edit
      }
    }
  }, [panelMode, selectedEvent, addEvent, editEvent, handlePanelClose]);

  // Handle delete button click - show appropriate modal
  const handleDeleteClick = useCallback(() => {
    if (!selectedEvent) return;
    
    // Check if event is recurring
    const isRecurring = selectedEvent.repeat?.type && selectedEvent.repeat.type !== 'none';
    
    if (isRecurring) {
      setShowRecurringDeleteModal(true);
    } else {
      setShowDeleteModal(true);
    }
  }, [selectedEvent]);

  // Handle actual delete event
  const handleDeleteEvent = useCallback(async () => {
    if (!selectedEvent) return;
    const success = await removeEvent(selectedEvent.id);
    if (success) {
      handlePanelClose();
    }
    setShowDeleteModal(false);
  }, [selectedEvent, removeEvent, handlePanelClose]);

  // Handle recurring event delete
  const handleRecurringDelete = useCallback(async (option: RecurringDeleteOption) => {
    if (!selectedEvent) return;
    
    // For now, all options delete the event
    // TODO: Implement proper Google Calendar recurring event deletion (this instance, following, all)
    const success = await removeEvent(selectedEvent.id, option);
    if (success) {
      handlePanelClose();
    }
    setShowRecurringDeleteModal(false);
  }, [selectedEvent, removeEvent, handlePanelClose]);

  // Handle video call toggle
  const handleVideoCallToggle = useCallback(async (enabled: boolean) => {
    if (!selectedEvent) return;
    if (enabled) {
      await addVideoCall(selectedEvent.id);
    } else {
      await removeVideoCall(selectedEvent.id);
    }
  }, [selectedEvent, addVideoCall, removeVideoCall]);

  // Handle pending event title change (for live preview in grid)
  const handlePendingTitleChange = useCallback((title: string) => {
    setPendingEventTitle(title);
  }, []);

  // Handle pending event all-day change (for live preview in grid)
  const handlePendingAllDayChange = useCallback((allDay: boolean) => {
    setPendingEventAllDay(allDay);
  }, []);

  // Get the default calendar ID (memoized)
  const defaultCalendarId = useMemo(() => {
    return getDefaultCalendarId() || 'work';
  }, [getDefaultCalendarId]);

  // Compute pending event for grid display
  const pendingEvent = useMemo(() => {
    if (panelMode !== 'create' || !newEventData) return null;
    return {
      start: newEventData.start,
      end: newEventData.end,
      title: pendingEventTitle,
      calendarId: defaultCalendarId,
      allDay: pendingEventAllDay,
    };
  }, [panelMode, newEventData, pendingEventTitle, defaultCalendarId, pendingEventAllDay]);

  // Don't block render for loading - show cached content immediately

  return (
    <>
      {/* Calendar Sidebar */}
      <CalendarSidebar
        calendars={calendars}
        enabledCalendarIds={enabledCalendarIds}
        onToggleCalendar={toggleCalendar}
        currentDate={weekNav.currentDate}
        weekDays={weekNav.weekDays}
        onDateSelect={weekNav.goToDate}
        onCreateEvent={handleCreateFromSidebar}
      />

      {/* Main Calendar Area */}
      <main 
        className={`
          flex flex-col h-screen flex-1 relative overflow-hidden 
          transition-all duration-200 ml-[264px]
          ${panelMode ? 'mr-60' : ''}
        `}
      >
        {/* Header */}
        <CalendarHeader
          monthLabel={weekNav.monthLabel}
          yearLabel={weekNav.yearLabel}
          onPrevWeek={weekNav.prevWeek}
          onNextWeek={weekNav.nextWeek}
          onToday={weekNav.goToToday}
        />

        {/* Calendar Grid */}
        <CalendarGrid
          weekDays={weekNav.weekDays}
          events={events}
          timezone={timezone}
          getCalendarColor={getCalendarColor}
          onEventClick={handleEventClick}
          selectedEventId={selectedEvent?.id}
          isDragging={timeSelection.isDragging}
          selectionRange={timeSelection.getSelectionRange()}
          hoverSlot={timeSelection.hoverSlot}
          onMouseDown={timeSelection.handleMouseDown}
          onMouseMove={timeSelection.handleMouseMove}
          onMouseUp={timeSelection.handleMouseUp}
          onMouseLeave={timeSelection.handleMouseLeave}
          formatDayHeader={weekNav.formatDayHeader}
          isToday={weekNav.isToday}
          pendingEvent={pendingEvent}
          defaultCalendarId={defaultCalendarId}
        />
      </main>

      {/* Event Panel (Right Side) */}
      {panelMode && (
        <EventPanel
          mode={panelMode}
          event={selectedEvent}
          calendars={calendars}
          initialStart={newEventData?.start}
          initialEnd={newEventData?.end}
          defaultCalendarId={defaultCalendarId}
          currentUser={currentUser}
          canEdit={!selectedEvent || canEditEvent(selectedEvent)}
          isSaving={!!savingEventId}
          onSave={handleSaveEvent}
          onDelete={handleDeleteClick}
          onClose={handlePanelClose}
          onVideoCallToggle={handleVideoCallToggle}
          onTitleChange={handlePendingTitleChange}
          onAllDayChange={handlePendingAllDayChange}
        />
      )}
      
      {/* Delete confirmation modal for non-recurring events */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteEvent}
        title={`Delete "${selectedEvent?.title}"?`}
        description="This will permanently delete this event. This action cannot be undone."
        confirmLabel="Delete event"
        confirmVariant="danger"
      />
      
      {/* Delete options modal for recurring events */}
      <RecurringDeleteModal
        isOpen={showRecurringDeleteModal}
        onClose={() => setShowRecurringDeleteModal(false)}
        onConfirm={handleRecurringDelete}
        eventTitle={selectedEvent?.title || ''}
      />
    </>
  );
}
