/**
 * Calendar App Module
 * 
 * Exports for the Calendar app and its supporting utilities.
 */

// Main app component
export { default as CalendarApp } from './CalendarApp';

// Types
export * from './types';

// Hooks
export { useCalendars } from './hooks/useCalendars';
export { useEvents } from './hooks/useEvents';
export { useWeekNavigation } from './hooks/useWeekNavigation';
export { useTimeRangeSelection } from './hooks/useTimeRangeSelection';
export { useParticipantSearch } from './hooks/useParticipantSearch';

// Components
export { default as CalendarSidebar } from './components/CalendarSidebar';
export { default as CalendarHeader } from './components/CalendarHeader';
export { default as CalendarGrid } from './components/CalendarGrid';
export { default as CalendarEventBlock } from './components/CalendarEventBlock';
export { default as EventPanel } from './components/EventPanel';

// API
export * from './api/calendarApi';

