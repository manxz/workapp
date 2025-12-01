"use client";

import { useState, useMemo } from 'react';
import { Plus, Rss } from '@phosphor-icons/react';
import { Calendar } from '../types';

type CalendarSidebarProps = {
  calendars: Calendar[];
  enabledCalendarIds: string[];
  onToggleCalendar: (calendarId: string) => void;
  currentDate: Date;
  weekDays: Date[];
  onDateSelect: (date: Date) => void;
  onCreateEvent?: () => void;
};

type DayInfo = {
  date: Date | null;
  isCurrentMonth: boolean;
};

export default function CalendarSidebar({
  calendars,
  enabledCalendarIds,
  onToggleCalendar,
  currentDate,
  weekDays,
  onDateSelect,
  onCreateEvent,
}: CalendarSidebarProps) {
  // Mini calendar state - separate from main view
  const [miniCalendarMonth, setMiniCalendarMonth] = useState(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  });

  // Mini calendar days organized by rows
  const miniCalendarRows = useMemo(() => {
    const year = miniCalendarMonth.getFullYear();
    const month = miniCalendarMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    
    // Get previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    const days: DayInfo[] = [];
    
    // Add days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }
    
    // Add all days of the current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }
    
    // Add days from next month to fill the grid (up to 6 rows)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays && days.length < 42; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
    
    // Split into rows of 7 days
    const rows: DayInfo[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }
    
    // Only keep rows that have at least one day from current month
    return rows.filter(row => row.some(d => d.isCurrentMonth));
  }, [miniCalendarMonth]);

  // Get weekdays from the current week (Mon-Fri only, indices 1-5)
  const weekdaysInSelection = useMemo(() => {
    // weekDays is Sun-Sat array, we want Mon-Fri (indices 1-5)
    return weekDays.slice(1, 6);
  }, [weekDays]);

  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isWeekdayInSelection = (date: Date | null): boolean => {
    if (!date || weekdaysInSelection.length === 0) return false;
    const dateStr = date.toDateString();
    return weekdaysInSelection.some(d => d.toDateString() === dateStr);
  };

  // Group calendars by type
  const internalCalendars = calendars.filter(c => c.source !== 'google' && !c.isHoliday);
  const holidayCalendars = calendars.filter(c => c.isHoliday);

  return (
    <div className="bg-neutral-100 border-r border-neutral-200 flex flex-col h-screen w-[200px] py-4 fixed left-16 top-0">
      {/* Header with title and create button */}
      <div className="flex items-center justify-between pl-4 pr-2 py-1.5 h-6 mb-[18px]">
        <h2 className="text-[18px] font-medium text-[#1d1d1f]">Calendar</h2>
        <button
          onClick={onCreateEvent}
          className="text-black hover:bg-neutral-200 rounded-md w-6 h-6 flex items-center justify-center transition-colors"
          title="Create event"
        >
          <Plus size={16} weight="regular" />
        </button>
      </div>

      {/* Mini Calendar */}
      <div className="mb-4">
        {/* Day headers */}
        <div className="flex items-center w-full">
          {['S', 'M', 'T', 'W', 'Th', 'F', 'S'].map((day, i) => (
            <div 
              key={i} 
              className="flex-1 flex items-center justify-center px-2 py-1.5"
            >
              <span className="text-[10px] font-semibold text-[#7d7d7f]">
                {day}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar grid - row by row */}
        {miniCalendarRows.map((row, rowIndex) => (
          <MiniCalendarRow
            key={rowIndex}
            days={row}
            isToday={isToday}
            isWeekdayInSelection={isWeekdayInSelection}
            onDateSelect={onDateSelect}
          />
        ))}
      </div>

      {/* Calendars Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-1.5">
          <span className="text-[13px] font-semibold text-[#6a6a6a]">
            Calendars
          </span>
        </div>

        {/* Calendar List */}
        <div className="px-2 space-y-0">
          {internalCalendars.map(calendar => (
            <CalendarListItem
              key={calendar.id}
              calendar={calendar}
              isEnabled={enabledCalendarIds.includes(calendar.id)}
              onToggle={() => onToggleCalendar(calendar.id)}
            />
          ))}
          
          {holidayCalendars.map(calendar => (
            <CalendarListItem
              key={calendar.id}
              calendar={calendar}
              isEnabled={enabledCalendarIds.includes(calendar.id)}
              onToggle={() => onToggleCalendar(calendar.id)}
              hasRssFeed
            />
          ))}
        </div>
      </div>

    </div>
  );
}

// Mini calendar row component - handles the weekday highlight grouping
function MiniCalendarRow({
  days,
  isToday,
  isWeekdayInSelection,
  onDateSelect,
}: {
  days: DayInfo[];
  isToday: (date: Date | null) => boolean;
  isWeekdayInSelection: (date: Date | null) => boolean;
  onDateSelect: (date: Date) => void;
}) {
  // Find if this row contains weekday selection cells (Mon-Fri, indices 1-5)
  // We need to identify consecutive weekday cells that are in the selection
  const hasWeekdaySelection = days.some((d, i) => {
    // Only check weekday columns (Mon=1 to Fri=5)
    return i >= 1 && i <= 5 && isWeekdayInSelection(d.date);
  });

  // Find the range of selected weekdays in this row
  let selectionStart = -1;
  let selectionEnd = -1;
  
  if (hasWeekdaySelection) {
    for (let i = 1; i <= 5; i++) {
      if (isWeekdayInSelection(days[i]?.date)) {
        if (selectionStart === -1) selectionStart = i;
        selectionEnd = i;
      }
    }
  }

  return (
    <div className="flex items-center w-full">
      {days.map((dayInfo, colIndex) => {
        const today = isToday(dayInfo.date);
        const inSelection = isWeekdayInSelection(dayInfo.date);
        
        // Determine if this cell is start/end of selection pill
        const isSelectionStart = colIndex === selectionStart;
        const isSelectionEnd = colIndex === selectionEnd;
        const isInSelectionRange = colIndex >= selectionStart && colIndex <= selectionEnd && selectionStart !== -1;
        
        return (
          <div
            key={colIndex}
            className={`
              flex-1 flex items-center justify-center h-[28px]
              ${isInSelectionRange ? 'bg-[#e0e0e0]' : ''}
              ${isSelectionStart ? 'rounded-l-full' : ''}
              ${isSelectionEnd ? 'rounded-r-full' : ''}
            `}
          >
            {today ? (
              // Today indicator: 20x20 blue circle centered in 28px cell
              <button
                onClick={() => dayInfo.date && onDateSelect(dayInfo.date)}
                className="w-5 h-5 min-w-[20px] min-h-[20px] max-w-[20px] max-h-[20px] bg-[#0070f3] rounded-full flex items-center justify-center shrink-0"
              >
                <span className="text-[10px] font-medium text-white">
                  {dayInfo.date?.getDate()}
                </span>
              </button>
            ) : (
              // Regular date cell
              <button
                onClick={() => dayInfo.date && onDateSelect(dayInfo.date)}
                disabled={!dayInfo.date}
                className={`
                  w-[28px] h-[28px] flex items-center justify-center transition-colors
                  ${!dayInfo.date ? 'invisible' : ''}
                  ${!isInSelectionRange ? 'hover:bg-neutral-200 rounded-full' : ''}
                `}
              >
                <span
                  className={`
                    text-[10px] font-medium
                    ${!dayInfo.isCurrentMonth ? 'text-[#7d7d7f] opacity-70' : 'text-[#1d1d1f]'}
                  `}
                >
                  {dayInfo.date?.getDate()}
                </span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Calendar list item component
function CalendarListItem({
  calendar,
  isEnabled,
  onToggle,
  hasRssFeed,
}: {
  calendar: Calendar;
  isEnabled: boolean;
  onToggle: () => void;
  hasRssFeed?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-neutral-200 transition-colors"
    >
      <div className="flex items-center gap-2">
        {/* Colored circle indicator */}
        <div
          className={`w-2.5 h-2.5 rounded-full ${isEnabled ? '' : 'opacity-30'}`}
          style={{ backgroundColor: calendar.color }}
        />
        <span className={`text-[13px] font-medium text-[#1d1d1f] ${!isEnabled ? 'opacity-50' : ''}`}>
          {calendar.name}
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        {/* Default badge */}
        {calendar.isDefault && (
          <span className="text-[11px] text-[#aaaaaa] font-medium tracking-[0.0275px]">
            Default
          </span>
        )}
        
        {/* RSS icon for holiday calendars */}
        {hasRssFeed && (
          <Rss size={16} className="text-[#aaaaaa]" />
        )}
      </div>
    </button>
  );
}
