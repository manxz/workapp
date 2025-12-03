"use client";

import { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { CalendarEvent, TimeSlot, SelectionRange, GRID_HOURS, SNAP_MINUTES } from '../types';
import CalendarEventBlock, { AllDayEventBlock } from './CalendarEventBlock';

/**
 * Pending event shown while creating a new event
 */
type PendingEvent = {
  start: Date;
  end: Date;
  title: string;
  calendarId: string;
  allDay?: boolean;
};

type CalendarGridProps = {
  weekDays: Date[];
  events: CalendarEvent[];
  timezone: string;
  getCalendarColor: (calendarId: string) => string;
  onEventClick: (event: CalendarEvent) => void;
  onEventMove?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void;
  selectedEventId?: string | null;
  // Selection handlers
  isDragging: boolean;
  selectionRange: SelectionRange | null;
  hoverSlot: TimeSlot | null;
  onMouseDown: (e: React.MouseEvent, gridTop: number, rowHeight: number, date: Date) => void;
  onMouseMove: (e: React.MouseEvent, gridTop: number, rowHeight: number, date: Date) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  formatDayHeader: (date: Date) => { dayName: string; dayNum: number };
  isToday: (date: Date) => boolean;
  // Pending event (shown while creating)
  pendingEvent?: PendingEvent | null;
  // Default calendar ID for selection color
  defaultCalendarId?: string;
};

// Height of each hour row in pixels
const HOUR_HEIGHT = 61;
// Show all 24 hours (0-23)
const VISIBLE_HOURS = Array.from({ length: 24 }, (_, i) => i);
const FIRST_HOUR = 0;
// Default scroll position (8am)
const DEFAULT_SCROLL_HOUR = 8;

/**
 * Event layout info for overlapping events
 */
type EventLayout = {
  column: number;      // Which column this event is in (0-indexed)
  totalColumns: number; // Total columns in its overlap group
};

/**
 * Calculate layout for overlapping events (Google Calendar style)
 * Returns a map of eventId -> layout info
 */
function calculateEventLayouts(events: CalendarEvent[]): Map<string, EventLayout> {
  if (events.length === 0) return new Map();
  
  // Convert events to time ranges in minutes for easier comparison
  const eventRanges = events.map(event => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    return {
      id: event.id,
      startMinutes: start.getHours() * 60 + start.getMinutes(),
      endMinutes: end.getHours() * 60 + end.getMinutes(),
    };
  });
  
  // Sort by start time, then by duration (longer events first)
  eventRanges.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes);
  });
  
  // Track which columns are occupied at each time
  // Each entry is: { endMinutes, column }
  const columns: { endMinutes: number; eventId: string }[] = [];
  const layouts = new Map<string, { column: number; group: Set<string> }>();
  
  for (const event of eventRanges) {
    // Find the first available column
    let assignedColumn = -1;
    for (let col = 0; col < columns.length; col++) {
      if (columns[col].endMinutes <= event.startMinutes) {
        // This column is free
        assignedColumn = col;
        columns[col] = { endMinutes: event.endMinutes, eventId: event.id };
        break;
      }
    }
    
    // If no column available, create a new one
    if (assignedColumn === -1) {
      assignedColumn = columns.length;
      columns.push({ endMinutes: event.endMinutes, eventId: event.id });
    }
    
    // Find all events that overlap with this one
    const overlappingEvents = new Set<string>();
    overlappingEvents.add(event.id);
    
    for (const other of eventRanges) {
      if (other.id === event.id) continue;
      // Check if they overlap
      if (event.startMinutes < other.endMinutes && event.endMinutes > other.startMinutes) {
        overlappingEvents.add(other.id);
      }
    }
    
    layouts.set(event.id, { column: assignedColumn, group: overlappingEvents });
  }
  
  // Now calculate total columns for each event based on its overlap group
  const result = new Map<string, EventLayout>();
  
  for (const [eventId, layout] of layouts) {
    // Find max column used by any event in this group
    let maxColumn = layout.column;
    for (const otherId of layout.group) {
      const otherLayout = layouts.get(otherId);
      if (otherLayout && otherLayout.column > maxColumn) {
        maxColumn = otherLayout.column;
      }
    }
    
    result.set(eventId, {
      column: layout.column,
      totalColumns: maxColumn + 1,
    });
  }
  
  return result;
}

export default function CalendarGrid({
  weekDays,
  events,
  timezone,
  getCalendarColor,
  onEventClick,
  onEventMove,
  selectedEventId,
  isDragging,
  selectionRange,
  hoverSlot,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  formatDayHeader,
  isToday,
  pendingEvent,
  defaultCalendarId,
}: CalendarGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  
  // Event dragging state
  const [draggingEvent, setDraggingEvent] = useState<CalendarEvent | null>(null);
  const [dragPreviewSlot, setDragPreviewSlot] = useState<{ date: Date; hour: number; minute: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; event: CalendarEvent; offsetMinutes: number } | null>(null);
  const isDragSignificantRef = useRef(false);
  
  // Event resizing state
  const [resizingEvent, setResizingEvent] = useState<CalendarEvent | null>(null);
  const [resizeEndSlot, setResizeEndSlot] = useState<{ hour: number; minute: number } | null>(null);
  const resizeStartRef = useRef<{ y: number; event: CalendarEvent } | null>(null);
  const isResizeSignificantRef = useRef(false);

  // Auto-scroll to 8am on initial load
  useEffect(() => {
    if (scrollContainerRef.current && !hasScrolledRef.current) {
      const scrollTop = DEFAULT_SCROLL_HOUR * HOUR_HEIGHT;
      scrollContainerRef.current.scrollTop = scrollTop;
      hasScrolledRef.current = true;
    }
  }, []);

  // Separate all-day events from timed events
  const { allDayEvents, timedEvents } = useMemo(() => {
    const allDay: CalendarEvent[] = [];
    const timed: CalendarEvent[] = [];
    
    events.forEach(event => {
      if (event.allDay) {
        allDay.push(event);
      } else {
        timed.push(event);
      }
    });
    
    return { allDayEvents: allDay, timedEvents: timed };
  }, [events]);

  // Get events for a specific day
  const getEventsForDay = useCallback((day: Date) => {
    return timedEvents.filter(event => {
      const eventStart = new Date(event.start);
      return (
        eventStart.getDate() === day.getDate() &&
        eventStart.getMonth() === day.getMonth() &&
        eventStart.getFullYear() === day.getFullYear()
      );
    });
  }, [timedEvents]);

  // Get all-day events for a specific day
  // For all-day events, dates come as "YYYY-MM-DD" strings which need special handling
  // to avoid timezone conversion issues
  const getAllDayEventsForDay = useCallback((day: Date) => {
    const dayYear = day.getFullYear();
    const dayMonth = day.getMonth();
    const dayDate = day.getDate();
    
    return allDayEvents.filter(event => {
      // For all-day events, parse the date string directly to avoid timezone issues
      // Google returns dates like "2024-11-28" for start and "2024-11-29" for end (exclusive)
      const startStr = event.start;
      const endStr = event.end;
      
      // Parse as local date (YYYY-MM-DD format)
      const startParts = startStr.split('T')[0].split('-');
      const endParts = endStr.split('T')[0].split('-');
      
      const eventStartYear = parseInt(startParts[0]);
      const eventStartMonth = parseInt(startParts[1]) - 1; // JS months are 0-indexed
      const eventStartDate = parseInt(startParts[2]);
      
      const eventEndYear = parseInt(endParts[0]);
      const eventEndMonth = parseInt(endParts[1]) - 1;
      const eventEndDate = parseInt(endParts[2]);
      
      // Create dates in local timezone
      const eventStart = new Date(eventStartYear, eventStartMonth, eventStartDate);
      const eventEnd = new Date(eventEndYear, eventEndMonth, eventEndDate);
      const dayLocal = new Date(dayYear, dayMonth, dayDate);
      
      // Event end is exclusive in Google Calendar (end date is day AFTER event)
      // So event on Nov 28 has start=Nov 28, end=Nov 29
      // We check: dayLocal >= eventStart AND dayLocal < eventEnd
      return dayLocal >= eventStart && dayLocal < eventEnd;
    });
  }, [allDayEvents]);

  // Calculate event position and height with overlap support (Google Calendar style)
  // Uses pure proportional sizing: 15 min = 1/4 cell, 30 min = 1/2 cell, etc.
  const getEventStyle = useCallback((event: CalendarEvent, layout?: EventLayout) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    
    // Offset by the first visible hour
    const firstHourOffset = FIRST_HOUR * 60;
    const top = ((startMinutes - firstHourOffset) / 60) * HOUR_HEIGHT;
    // Pure proportional height - no minimum constraint
    const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
    
    // Calculate horizontal positioning based on overlap
    const column = layout?.column ?? 0;
    const totalColumns = layout?.totalColumns ?? 1;
    
    // Google Calendar style overlap:
    // - Always leave 12px on the right for click area (fixed pixels)
    // - Events overlap each other (left event goes under right event)
    // - Each subsequent column shifts right but events extend to the right edge
    
    // Calculate the left position as percentage of available width
    // Available width = 100% - 12px (right padding)
    const columnWidthPercent = 100 / totalColumns;
    const leftPercent = column * columnWidthPercent;
    
    // Events extend from their left position to the right edge (minus 12px)
    // This creates the overlapping card effect
    return {
      top: `${top}px`,
      height: `${height}px`,
      left: `calc((100% - 12px) * ${leftPercent / 100})`,
      right: '12px', // Always 12px from right edge
      zIndex: column + 1, // Higher columns appear on top
    };
  }, []);

  // Get selection overlay style - uses pure proportional sizing
  // 15 min = 1/4 cell, 30 min = 1/2 cell, 45 min = 3/4 cell, 60 min = full cell
  const getSelectionStyle = useCallback((range: SelectionRange, day: Date) => {
    // Only show selection on the same day
    if (range.start.date.toDateString() !== day.toDateString()) return null;
    
    const startMinutes = range.start.hour * 60 + range.start.minute;
    const endMinutes = range.end.hour * 60 + range.end.minute;
    
    // Offset by the first visible hour
    const firstHourOffset = FIRST_HOUR * 60;
    const top = ((startMinutes - firstHourOffset) / 60) * HOUR_HEIGHT;
    // Pure proportional height - no minimum constraint
    const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      left: '1px',
      right: '12px',
    };
  }, []);

  // Get pending event style - uses pure proportional sizing to match selection
  const getPendingEventStyle = useCallback((event: PendingEvent, day: Date) => {
    // Only show on the same day
    if (event.start.toDateString() !== day.toDateString()) return null;
    
    const startMinutes = event.start.getHours() * 60 + event.start.getMinutes();
    const endMinutes = event.end.getHours() * 60 + event.end.getMinutes();
    
    // Offset by the first visible hour
    const firstHourOffset = FIRST_HOUR * 60;
    const top = ((startMinutes - firstHourOffset) / 60) * HOUR_HEIGHT;
    // Pure proportional height - no minimum constraint
    const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      left: '1px',
      right: '12px',
    };
  }, []);

  // Handle mouse events with grid context
  const handleMouseDown = useCallback((e: React.MouseEvent, day: Date) => {
    // Don't start grid selection if we're dragging an event
    if (draggingEvent) return;
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    onMouseDown(e, rect.top, HOUR_HEIGHT, day);
  }, [onMouseDown, draggingEvent]);

  const handleMouseMove = useCallback((e: React.MouseEvent, day: Date) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    
    // Handle event resizing
    if (resizingEvent && resizeStartRef.current) {
      const dy = Math.abs(e.clientY - resizeStartRef.current.y);
      if (dy > 3) {
        isResizeSignificantRef.current = true;
      }
      
      // Calculate the new end time based on cursor position
      const relativeY = e.clientY - rect.top;
      const cursorMinutes = (relativeY / HOUR_HEIGHT) * 60;
      
      // Snap to 15-min intervals
      const snappedMinutes = Math.round(cursorMinutes / SNAP_MINUTES) * SNAP_MINUTES;
      let hour = Math.floor(snappedMinutes / 60);
      let minute = snappedMinutes % 60;
      
      // Handle overflow
      if (minute >= 60) {
        minute = 0;
        hour += 1;
      }
      
      // Ensure minimum duration (15 min) and valid range
      const eventStart = new Date(resizingEvent.start);
      const eventStartMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
      const newEndMinutes = hour * 60 + minute;
      
      if (newEndMinutes <= eventStartMinutes + 15) {
        // Minimum 15 min duration
        hour = Math.floor((eventStartMinutes + 15) / 60);
        minute = (eventStartMinutes + 15) % 60;
      }
      
      hour = Math.min(24, hour); // Allow ending at midnight (24:00)
      
      setResizeEndSlot({ hour, minute });
      return;
    }
    
    // Handle event dragging
    if (draggingEvent && dragStartRef.current) {
      // Check if drag is significant (moved more than 5px)
      const dx = Math.abs(e.clientX - dragStartRef.current.x);
      const dy = Math.abs(e.clientY - dragStartRef.current.y);
      if (dx > 5 || dy > 5) {
        isDragSignificantRef.current = true;
      }
      
      // Calculate the time slot for event START (accounting for where user grabbed the event)
      const relativeY = e.clientY - rect.top;
      const cursorMinutes = (relativeY / HOUR_HEIGHT) * 60;
      // Subtract the offset so the event stays "attached" to where they grabbed it
      const eventStartMinutes = cursorMinutes - dragStartRef.current.offsetMinutes;
      
      // Snap to 15-min intervals
      const snappedMinutes = Math.round(eventStartMinutes / SNAP_MINUTES) * SNAP_MINUTES;
      let hour = Math.floor(snappedMinutes / 60);
      let minute = snappedMinutes % 60;
      
      // Handle negative and overflow
      if (minute < 0) {
        minute += 60;
        hour -= 1;
      }
      if (minute >= 60) {
        minute = 0;
        hour += 1;
      }
      
      hour = Math.max(0, Math.min(23, hour));
      minute = Math.max(0, minute);
      
      setDragPreviewSlot({
        date: new Date(day),
        hour,
        minute,
      });
      return;
    }
    
    onMouseMove(e, rect.top, HOUR_HEIGHT, day);
  }, [onMouseMove, draggingEvent, resizingEvent]);

  // Handle event drag start
  const handleEventDragStart = useCallback((e: React.MouseEvent, event: CalendarEvent, gridTop: number) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Calculate where on the event the user clicked (offset from event start in minutes)
    const eventStart = new Date(event.start);
    const eventStartMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
    const clickedMinutes = ((e.clientY - gridTop) / HOUR_HEIGHT) * 60;
    const offsetMinutes = clickedMinutes - eventStartMinutes;
    
    dragStartRef.current = { x: e.clientX, y: e.clientY, event, offsetMinutes };
    isDragSignificantRef.current = false;
    setDraggingEvent(event);
  }, []);

  // Handle event drag end (global mouse up)
  const handleEventDragEnd = useCallback(() => {
    if (!draggingEvent || !dragPreviewSlot || !isDragSignificantRef.current || !onEventMove) {
      // If not significant drag, treat as click
      if (draggingEvent && !isDragSignificantRef.current) {
        onEventClick(draggingEvent);
      }
      setDraggingEvent(null);
      setDragPreviewSlot(null);
      dragStartRef.current = null;
      isDragSignificantRef.current = false;
      return;
    }
    
    // Calculate new start and end times
    const originalStart = new Date(draggingEvent.start);
    const originalEnd = new Date(draggingEvent.end);
    const duration = originalEnd.getTime() - originalStart.getTime();
    
    const newStart = new Date(dragPreviewSlot.date);
    newStart.setHours(dragPreviewSlot.hour, dragPreviewSlot.minute, 0, 0);
    
    const newEnd = new Date(newStart.getTime() + duration);
    
    onEventMove(draggingEvent, newStart, newEnd);
    
    setDraggingEvent(null);
    setDragPreviewSlot(null);
    dragStartRef.current = null;
    isDragSignificantRef.current = false;
  }, [draggingEvent, dragPreviewSlot, onEventMove, onEventClick]);

  // Global mouse up listener for event drag
  useEffect(() => {
    if (!draggingEvent) return;
    
    const handleGlobalMouseUp = () => {
      handleEventDragEnd();
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [draggingEvent, handleEventDragEnd]);

  // Handle event resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    resizeStartRef.current = { y: e.clientY, event };
    isResizeSignificantRef.current = false;
    setResizingEvent(event);
    
    // Set initial end slot to current end time
    const eventEnd = new Date(event.end);
    setResizeEndSlot({
      hour: eventEnd.getHours(),
      minute: eventEnd.getMinutes(),
    });
  }, []);

  // Handle event resize end
  const handleResizeEnd = useCallback(() => {
    if (!resizingEvent || !resizeEndSlot || !isResizeSignificantRef.current || !onEventMove) {
      setResizingEvent(null);
      setResizeEndSlot(null);
      resizeStartRef.current = null;
      isResizeSignificantRef.current = false;
      return;
    }
    
    // Calculate new end time
    const originalStart = new Date(resizingEvent.start);
    const newEnd = new Date(originalStart);
    newEnd.setHours(resizeEndSlot.hour, resizeEndSlot.minute, 0, 0);
    
    // If end is at or before start, don't update
    if (newEnd <= originalStart) {
      setResizingEvent(null);
      setResizeEndSlot(null);
      resizeStartRef.current = null;
      isResizeSignificantRef.current = false;
      return;
    }
    
    onEventMove(resizingEvent, originalStart, newEnd);
    
    setResizingEvent(null);
    setResizeEndSlot(null);
    resizeStartRef.current = null;
    isResizeSignificantRef.current = false;
  }, [resizingEvent, resizeEndSlot, onEventMove]);

  // Global mouse up listener for event resize
  useEffect(() => {
    if (!resizingEvent) return;
    
    const handleGlobalMouseUp = () => {
      handleResizeEnd();
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [resizingEvent, handleResizeEnd]);

  // Get drag preview style - full width with no right padding
  const getDragPreviewStyle = useCallback(() => {
    if (!draggingEvent || !dragPreviewSlot) return null;
    
    const originalStart = new Date(draggingEvent.start);
    const originalEnd = new Date(draggingEvent.end);
    const durationMinutes = (originalEnd.getTime() - originalStart.getTime()) / (1000 * 60);
    
    const startMinutes = dragPreviewSlot.hour * 60 + dragPreviewSlot.minute;
    const firstHourOffset = FIRST_HOUR * 60;
    const top = ((startMinutes - firstHourOffset) / 60) * HOUR_HEIGHT;
    const height = (durationMinutes / 60) * HOUR_HEIGHT;
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      left: '0',
      right: '0',
    };
  }, [draggingEvent, dragPreviewSlot]);

  // Get resize preview style - shows the event with new end time
  const getResizePreviewStyle = useCallback((day: Date) => {
    if (!resizingEvent || !resizeEndSlot) return null;
    
    // Only show on the event's day
    const eventStart = new Date(resizingEvent.start);
    if (eventStart.toDateString() !== day.toDateString()) return null;
    
    const startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
    const endMinutes = resizeEndSlot.hour * 60 + resizeEndSlot.minute;
    const durationMinutes = endMinutes - startMinutes;
    
    const firstHourOffset = FIRST_HOUR * 60;
    const top = ((startMinutes - firstHourOffset) / 60) * HOUR_HEIGHT;
    const height = (durationMinutes / 60) * HOUR_HEIGHT;
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      left: '0',
      right: '0',
    };
  }, [resizingEvent, resizeEndSlot]);

  // Format hour label
  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  // Format time for selection overlay (e.g., "10am", "10:30am")
  const formatSelectionTime = (hour: number, minute: number): string => {
    const ampm = hour >= 12 ? 'pm' : 'am';
    const hour12 = hour % 12 || 12;
    return minute === 0 ? `${hour12}${ampm}` : `${hour12}:${minute.toString().padStart(2, '0')}${ampm}`;
  };

  // Check if there are any all-day events (including pending)
  const hasPendingAllDay = pendingEvent?.allDay === true;
  const hasAllDayEvents = allDayEvents.length > 0 || hasPendingAllDay;

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#fafafa]">
      {/* Day headers row with timezone */}
      <div className="flex border-b border-[rgba(29,29,31,0.1)] bg-[#fafafa] h-7">
        {/* Timezone/Plus cell */}
        <div className="w-[72px] flex-shrink-0 flex items-center justify-between px-2">
          <Plus size={12} className="text-[#7d7d7d]" />
          <span className="text-[10px] font-medium text-[#7d7d7d] leading-4">
            {timezone}
          </span>
        </div>
        
        {/* Day columns */}
        {weekDays.map((day, i) => {
          const { dayName, dayNum } = formatDayHeader(day);
          const today = isToday(day);
          
          return (
            <div
              key={i}
              className="flex-1 flex items-center justify-center gap-[5px] text-[13px] font-medium text-[#1d1d1f] border-l border-[rgba(29,29,31,0.1)]"
            >
              <span>{dayName}</span>
              {today ? (
                <div className="w-6 h-6 rounded-full bg-[#0070f3] flex items-center justify-center">
                  <span className="text-white">{dayNum}</span>
                </div>
              ) : (
                <span>{dayNum}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* All-day events row */}
      {hasAllDayEvents && (
        <div className="flex border-b border-[rgba(29,29,31,0.1)] h-7">
          {/* Empty space for time column */}
          <div className="w-[72px] flex-shrink-0" />
          
          {/* All-day events per day */}
          {weekDays.map((day, i) => {
            const dayAllDayEvents = getAllDayEventsForDay(day);
            
            // Check if pending all-day event is on this day
            const showPendingAllDay = hasPendingAllDay && pendingEvent && 
              pendingEvent.start.toDateString() === day.toDateString();
            
            return (
              <div
                key={i}
                className="flex-1 flex items-stretch pt-px pb-px pl-px pr-3 border-l border-[rgba(29,29,31,0.1)] gap-0.5 overflow-hidden"
              >
                {dayAllDayEvents.map(event => (
                  <AllDayEventBlock
                    key={event.id}
                    event={event}
                    color={getCalendarColor(event.calendarId)}
                    onClick={() => onEventClick(event)}
                    isSelected={selectedEventId === event.id}
                  />
                ))}
                {/* Pending all-day event */}
                {showPendingAllDay && (
                  <div
                    className="rounded-[8px] px-[6px] h-full flex items-center text-[11px] font-medium leading-normal truncate pointer-events-none"
                    style={{ backgroundColor: '#CCE2FD', color: '#0C5EBE' }}
                  >
                    {pendingEvent.title || '(No title)'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Time grid (scrollable) */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="flex" ref={gridRef}>
          {/* Time labels column */}
          <div className="w-[72px] flex-shrink-0 bg-white">
            {VISIBLE_HOURS.map((hour, idx) => (
              <div
                key={hour}
                className="relative h-[61px]"
              >
                {idx > 0 && (
                  <span className="absolute -top-2 right-2 text-[10px] font-medium text-[#7d7d7d] leading-4">
                    {formatHour(hour)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Day columns with events */}
          {weekDays.map((day, dayIndex) => {
            const dayEvents = getEventsForDay(day);
            const today = isToday(day);
            
            return (
              <div
                key={dayIndex}
                className="flex-1 relative border-l border-[rgba(29,29,31,0.1)]"
                onMouseDown={(e) => handleMouseDown(e, day)}
                onMouseMove={(e) => handleMouseMove(e, day)}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseLeave}
              >
                {/* Hour grid lines */}
                {VISIBLE_HOURS.map(hour => (
                  <div
                    key={hour}
                    className="h-[61px] border-b border-[rgba(29,29,31,0.1)] bg-white"
                  />
                ))}

                {/* Current time indicator */}
                {today && <CurrentTimeIndicator firstHour={FIRST_HOUR} hourHeight={HOUR_HEIGHT} />}

                {/* Events */}
                {(() => {
                  // Calculate layouts for overlapping events
                  const layouts = calculateEventLayouts(dayEvents);
                  
                  return dayEvents.map(event => (
                    <CalendarEventBlock
                      key={event.id}
                      event={event}
                      color={getCalendarColor(event.calendarId)}
                      style={getEventStyle(event, layouts.get(event.id))}
                      onClick={() => onEventClick(event)}
                      onDragStart={(e) => {
                        if (!gridRef.current) return;
                        const rect = gridRef.current.getBoundingClientRect();
                        handleEventDragStart(e, event, rect.top);
                      }}
                      onResizeStart={(e) => handleResizeStart(e, event)}
                      isSelected={selectedEventId === event.id}
                      isDragging={draggingEvent?.id === event.id}
                      isResizing={resizingEvent?.id === event.id}
                    />
                  ));
                })()}
                
                {/* Drag preview - shown when dragging event to this day */}
                {draggingEvent && dragPreviewSlot && 
                 dragPreviewSlot.date.toDateString() === day.toDateString() && 
                 isDragSignificantRef.current && (() => {
                  const previewStyle = getDragPreviewStyle();
                  if (!previewStyle) return null;
                  
                  const originalStart = new Date(draggingEvent.start);
                  const originalEnd = new Date(draggingEvent.end);
                  const durationMinutes = (originalEnd.getTime() - originalStart.getTime()) / (1000 * 60);
                  const isShort = durationMinutes < 45;
                  const startTime = formatSelectionTime(dragPreviewSlot.hour, dragPreviewSlot.minute);
                  const endHour = dragPreviewSlot.hour + Math.floor((dragPreviewSlot.minute + durationMinutes) / 60);
                  const endMinute = (dragPreviewSlot.minute + durationMinutes) % 60;
                  const endTime = formatSelectionTime(endHour, endMinute);
                  
                  return (
                    <div
                      className={`absolute rounded-[8px] overflow-hidden z-20 pointer-events-none flex flex-col border border-white ${isShort ? 'justify-center' : 'justify-start'}`}
                      style={{
                        ...previewStyle,
                        backgroundColor: '#0070F3',
                        opacity: 0.85,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      }}
                    >
                      <div className={`px-[6px] flex flex-col text-[11px] font-medium leading-normal ${isShort ? 'py-0' : 'py-[4px]'}`} style={{ color: '#FFFFFF' }}>
                        {isShort ? (
                          <span className="truncate">{draggingEvent.title}, {startTime}</span>
                        ) : (
                          <>
                            <span className="truncate">{draggingEvent.title}</span>
                            <span className="truncate opacity-90">{startTime} - {endTime}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}
                
                {/* Resize preview - shown when resizing event */}
                {resizingEvent && resizeEndSlot && isResizeSignificantRef.current && (() => {
                  const previewStyle = getResizePreviewStyle(day);
                  if (!previewStyle) return null;
                  
                  const eventStart = new Date(resizingEvent.start);
                  const startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
                  const endMinutes = resizeEndSlot.hour * 60 + resizeEndSlot.minute;
                  const durationMinutes = endMinutes - startMinutes;
                  const isShort = durationMinutes < 45;
                  const startTime = formatSelectionTime(eventStart.getHours(), eventStart.getMinutes());
                  const endTime = formatSelectionTime(resizeEndSlot.hour, resizeEndSlot.minute);
                  
                  return (
                    <div
                      className={`absolute rounded-[8px] overflow-hidden z-20 pointer-events-none flex flex-col border border-white ${isShort ? 'justify-center' : 'justify-start'}`}
                      style={{
                        ...previewStyle,
                        backgroundColor: '#0070F3',
                        opacity: 0.85,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      }}
                    >
                      <div className={`px-[6px] flex flex-col text-[11px] font-medium leading-normal ${isShort ? 'py-0' : 'py-[4px]'}`} style={{ color: '#FFFFFF' }}>
                        {isShort ? (
                          <span className="truncate">{resizingEvent.title}, {startTime}</span>
                        ) : (
                          <>
                            <span className="truncate">{resizingEvent.title}</span>
                            <span className="truncate opacity-90">{startTime} - {endTime}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Pending event block (shown while creating new event - not for all-day events) */}
                {pendingEvent && !pendingEvent.allDay && getPendingEventStyle(pendingEvent, day) && (() => {
                  const durationMinutes = (pendingEvent.end.getTime() - pendingEvent.start.getTime()) / (1000 * 60);
                  const isShort = durationMinutes < 45;
                  const title = pendingEvent.title || '(No title)';
                  const startTime = formatSelectionTime(pendingEvent.start.getHours(), pendingEvent.start.getMinutes());
                  const endTime = formatSelectionTime(pendingEvent.end.getHours(), pendingEvent.end.getMinutes());
                  
                  return (
                    <div
                      className={`absolute rounded-[4px] overflow-hidden z-10 pointer-events-none flex flex-col ${isShort ? 'justify-center' : 'justify-start'}`}
                      style={{
                        ...getPendingEventStyle(pendingEvent, day)!,
                        backgroundColor: '#CCE2FD',
                      }}
                    >
                      <div className={`px-[6px] flex flex-col text-[11px] font-medium leading-normal ${isShort ? 'py-0' : 'py-[4px]'}`} style={{ color: '#0C5EBE' }}>
                        {isShort ? (
                          <span className="truncate">{title}, {startTime}</span>
                        ) : (
                          <>
                            <span className="truncate">{title}</span>
                            <span className="truncate opacity-90">{startTime} - {endTime}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Selection overlay - shown during drag when no pending event exists yet */}
                {selectionRange && !pendingEvent && isDragging && getSelectionStyle(selectionRange, day) && (() => {
                  const startMinutes = selectionRange.start.hour * 60 + selectionRange.start.minute;
                  const endMinutes = selectionRange.end.hour * 60 + selectionRange.end.minute;
                  const durationMinutes = endMinutes - startMinutes;
                  const isShort = durationMinutes < 45;
                  const startTime = formatSelectionTime(selectionRange.start.hour, selectionRange.start.minute);
                  const endTime = formatSelectionTime(selectionRange.end.hour, selectionRange.end.minute);
                  
                  return (
                    <div
                      className={`absolute rounded-[4px] overflow-hidden pointer-events-none z-10 flex flex-col ${isShort ? 'justify-center' : 'justify-start'}`}
                      style={{
                        ...getSelectionStyle(selectionRange, day),
                        backgroundColor: '#CCE2FD',
                      }}
                    >
                      <div className={`px-[6px] flex flex-col text-[11px] font-medium leading-normal ${isShort ? 'py-0' : 'py-[4px]'}`} style={{ color: '#0C5EBE' }}>
                        {isShort ? (
                          <span className="truncate">(No title), {startTime}</span>
                        ) : (
                          <>
                            <span className="truncate">(No title)</span>
                            <span className="truncate opacity-90">{startTime} - {endTime}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Current time indicator line
function CurrentTimeIndicator({ firstHour, hourHeight }: { firstHour: number; hourHeight: number }) {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const firstHourOffset = firstHour * 60;
  const top = ((minutes - firstHourOffset) / 60) * hourHeight;

  // Only show if within visible range (24 hours)
  if (top < 0 || top > hourHeight * 24) return null;

  return (
    <div
      className="absolute left-0 right-0 z-10 pointer-events-none"
      style={{ top: `${top}px` }}
    >
      <div className="flex items-center">
        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
        <div className="flex-1 h-0.5 bg-red-500" />
      </div>
    </div>
  );
}
