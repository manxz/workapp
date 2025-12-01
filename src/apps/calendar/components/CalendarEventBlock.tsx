"use client";

import { VideoCamera, ArrowsClockwise } from '@phosphor-icons/react';
import { CalendarEvent } from '../types';

type CalendarEventBlockProps = {
  event: CalendarEvent;
  color: string;
  style: React.CSSProperties;
  onClick: () => void;
  isSelected?: boolean;
};

// Convert hex color to rgba with opacity
function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Get a darker shade for text
function getDarkerShade(hex: string): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 80);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 80);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 80);
  return `rgb(${r}, ${g}, ${b})`;
}

// Check if calendar is a holiday calendar
function isHolidayCalendar(calendarId: string): boolean {
  return calendarId.includes('holiday') || calendarId === 'holidays';
}

// Work calendar colors
const WORK_COLORS = {
  // Future/selected events
  futureBg: '#0070F3',
  futureText: '#FFFFFF',
  // Past events
  pastBg: '#CCE2FD',
  pastText: '#0C5EBE',
  // Invite events (where user is attendee, not organizer)
  inviteBg: '#FFFFFF',
  inviteText: '#0070F3',
  inviteBorder: '#0070F3',
};

export default function CalendarEventBlock({
  event,
  color,
  style,
  onClick,
  isSelected,
}: CalendarEventBlockProps) {
  // Format time range
  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    const hour = date.getHours();
    const minute = date.getMinutes();
    const ampm = hour >= 12 ? 'pm' : 'am';
    const hour12 = hour % 12 || 12;
    return minute === 0 ? `${hour12}${ampm}` : `${hour12}:${minute.toString().padStart(2, '0')}${ampm}`;
  };

  const startTime = formatTime(event.start);
  const endTime = formatTime(event.end);

  // Calculate if event is short (less than 45 min visual height)
  const endDate = new Date(event.end);
  const startDate = new Date(event.start);
  const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
  const isShort = durationMinutes < 45;

  // Check if event is in the past
  const now = new Date();
  const isPast = endDate < now;
  
  // Check if this is a holiday calendar (keep original styling for holidays)
  const isHoliday = isHolidayCalendar(event.calendarId);
  
  // Check if this is a pending invite (user is attendee, not organizer, and hasn't accepted)
  const isInvite = event.isInvite === true;
  const isPendingInvite = isInvite && event.myResponseStatus !== 'accepted';

  // Determine colors based on event state
  let bgColor: string;
  let textColor: string;
  let borderColor: string = 'white'; // Default white border

  if (isHoliday) {
    // Holiday events: keep semi-transparent styling
    bgColor = hexToRgba(color, 0.2);
    textColor = getDarkerShade(color);
  } else if (isPendingInvite) {
    // Pending invite events: white background, blue text, blue border
    bgColor = WORK_COLORS.inviteBg;
    textColor = WORK_COLORS.inviteText;
    borderColor = WORK_COLORS.inviteBorder;
  } else if (isSelected || !isPast) {
    // Work calendar: Future or selected events - solid primary blue
    bgColor = WORK_COLORS.futureBg;
    textColor = WORK_COLORS.futureText;
  } else {
    // Work calendar: Past events - light blue with dark text
    bgColor = WORK_COLORS.pastBg;
    textColor = WORK_COLORS.pastText;
  }

  // Check if event has indicators to show
  const isRecurring = event.repeat?.type && event.repeat.type !== 'none';
  const hasVideoCall = event.videoCall?.enabled;
  const hasIndicators = isRecurring || hasVideoCall;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseDown={(e) => {
        // Prevent grid from starting a new selection when clicking on an event
        e.stopPropagation();
      }}
      className={`
        absolute rounded-[8px] overflow-hidden text-left
        flex flex-col items-start
        transition-all duration-100 cursor-pointer
        ${isShort ? 'justify-center' : hasIndicators ? 'justify-between' : 'justify-start'}
        ${isShort ? 'px-[6px] py-0' : 'px-[6px] py-[4px]'}
      `}
      style={{
        ...style,
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
      }}
    >
      {/* Title and time */}
      <div className="flex flex-col text-[11px] font-medium leading-normal w-full overflow-hidden" style={{ color: textColor }}>
        {isShort ? (
          // Short events: show title, start time, and indicators inline
          <div className="flex items-center gap-1 w-full">
            <span className="whitespace-nowrap overflow-hidden flex-1 min-w-0">
              {event.title}, {startTime}
            </span>
            {hasIndicators && (
              <div className="flex items-center gap-[2px] flex-shrink-0">
                {isRecurring && (
                  <ArrowsClockwise size={10} weight="bold" style={{ color: textColor }} />
                )}
                {hasVideoCall && (
                  <VideoCamera size={10} weight="fill" style={{ color: textColor }} />
                )}
              </div>
            )}
          </div>
        ) : (
          // Taller events: show title and time range on separate lines
          <>
            <span className="whitespace-nowrap overflow-hidden">
              {event.title}
            </span>
            <span className="whitespace-nowrap overflow-hidden">
              {startTime} - {endTime}
            </span>
          </>
        )}
      </div>

      {/* Event indicators (recurring, video call) - only for taller events */}
      {!isShort && hasIndicators && (
        <div className="flex items-center gap-[4px]">
          {isRecurring && (
            <ArrowsClockwise size={12} weight="bold" style={{ color: textColor }} />
          )}
          {hasVideoCall && (
            <VideoCamera size={12} weight="fill" style={{ color: textColor }} />
          )}
        </div>
      )}
    </button>
  );
}

// All-day event component for the top section
export function AllDayEventBlock({
  event,
  color,
  onClick,
  isSelected,
}: Omit<CalendarEventBlockProps, 'style'>) {
  // Check if this is a holiday calendar
  const isHoliday = isHolidayCalendar(event.calendarId);
  const isBirthday = event.title.toLowerCase().includes('birthday');
  
  // Check if event is in the past (for all-day events, check if end date is before today)
  const endDate = new Date(event.end);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPast = endDate < today;
  
  // Check if this is a pending invite (not yet accepted)
  const isInvite = event.isInvite === true;
  const isPendingInvite = isInvite && event.myResponseStatus !== 'accepted';

  // Determine colors based on event state
  let bgColor: string;
  let textColor: string;
  let borderColor: string | undefined;

  if (isHoliday) {
    // Holiday events: keep semi-transparent styling
    bgColor = hexToRgba(color, 0.2);
    textColor = getDarkerShade(color);
  } else if (isBirthday) {
    // Birthday: solid color with green text
    bgColor = color;
    textColor = '#03641b';
  } else if (isPendingInvite) {
    // Pending invite events: white background, blue text, blue border
    bgColor = WORK_COLORS.inviteBg;
    textColor = WORK_COLORS.inviteText;
    borderColor = WORK_COLORS.inviteBorder;
  } else if (isSelected || !isPast) {
    // Work calendar: Future or selected events - solid primary blue
    bgColor = WORK_COLORS.futureBg;
    textColor = WORK_COLORS.futureText;
  } else {
    // Work calendar: Past events - light blue with dark text
    bgColor = WORK_COLORS.pastBg;
    textColor = WORK_COLORS.pastText;
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseDown={(e) => {
        // Prevent grid from starting a new selection when clicking on an event
        e.stopPropagation();
      }}
      className="w-full rounded-[8px] px-[6px] py-0 text-left truncate h-full flex items-center transition-all duration-100 cursor-pointer"
      style={{ 
        backgroundColor: bgColor,
        border: borderColor ? `1px solid ${borderColor}` : undefined,
      }}
    >
      <span className="text-[11px] font-medium truncate" style={{ color: textColor }}>
        {event.title}
      </span>
    </button>
  );
}
