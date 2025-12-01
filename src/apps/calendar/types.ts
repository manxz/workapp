/**
 * Calendar App Types
 * 
 * Core type definitions for the Calendar module.
 */

/**
 * Repeat frequency for recurring events
 */
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Repeat configuration for events
 */
export type RepeatConfig = {
  type: RepeatType;
  until?: string | null; // ISO date string or null for infinite
};

/**
 * Video call configuration for events
 */
export type VideoCall = {
  enabled: boolean;
  provider: 'google_meet';
  link: string;
  code?: string; // May be empty for some recurring events
};

/**
 * Google Calendar sync metadata
 */
export type GoogleSync = {
  externalId?: string | null;
  source?: 'google' | 'internal';
};

/**
 * User summary for participant selection
 */
export type UserSummary = {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
};

/**
 * Calendar event (meeting, appointment, etc.)
 */
export type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  calendarId: string;
  ownerId: string;
  participants: UserSummary[]; // Attendees with id, name, email
  allDay: boolean;
  start: string; // ISO date string
  end: string; // ISO date string
  repeat: RepeatConfig;
  location?: string | null;
  videoCall?: VideoCall | null;
  googleSync?: GoogleSync | null;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Calendar (container for events)
 */
export type Calendar = {
  id: string;
  name: string;
  color: string; // Hex color code
  editable: boolean; // Can user create/edit events in this calendar
  isDefault?: boolean;
  isHoliday?: boolean;
  source?: 'internal' | 'google';
  syncedCalendarId?: string; // Supabase row ID for synced calendars
};

/**
 * Date range for fetching events
 */
export type DateRange = {
  start: string; // ISO date string
  end: string; // ISO date string
};

/**
 * Event creation/update payload
 */
export type EventPayload = Omit<CalendarEvent, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> & {
  participantEmails?: string[]; // Email addresses for Google Calendar attendees
};

/**
 * Event panel mode
 */
export type EventPanelMode = 'create' | 'edit' | 'view';

/**
 * Time slot for grid selection
 */
export type TimeSlot = {
  date: Date;
  hour: number;
  minute: number;
};

/**
 * Selection range from drag operation
 */
export type SelectionRange = {
  start: TimeSlot;
  end: TimeSlot;
};

/**
 * Week view configuration
 */
export type WeekConfig = {
  startDay: 0 | 1; // 0 = Sunday, 1 = Monday
  timezone: string;
};

/**
 * Default calendar colors
 */
export const CALENDAR_COLORS = {
  work: '#3B82F6', // Blue
  personal: '#22C55E', // Green
  holidays: '#A855F7', // Purple
  google: '#EA4335', // Google red
} as const;

/**
 * Default repeat options
 */
export const REPEAT_OPTIONS: { value: RepeatType; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
  { value: 'yearly', label: 'Every year' },
];

/**
 * Hours to display in time grid
 */
export const GRID_HOURS = Array.from({ length: 24 }, (_, i) => i);

/**
 * Minute increments for snapping
 */
export const SNAP_MINUTES = 15;

/**
 * Default event duration in minutes (for single click creation)
 */
export const DEFAULT_EVENT_DURATION = 30;

/**
 * Minimum event duration in minutes
 */
export const MIN_EVENT_DURATION = 15;

