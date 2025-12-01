"use client";

import { useState, useCallback, useMemo } from 'react';
import { DateRange, WeekConfig } from '../types';

/**
 * Hook for week navigation
 * 
 * Manages the currently displayed week and provides navigation functions.
 */
export function useWeekNavigation(config: WeekConfig = { startDay: 0, timezone: 'PST' }) {
  // Initialize to current week
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  /**
   * Get the start of the week for a given date
   */
  const getWeekStart = useCallback((date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day - config.startDay;
    const adjustedDiff = diff < 0 ? diff + 7 : diff;
    d.setDate(d.getDate() - adjustedDiff);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [config.startDay]);

  /**
   * Get the end of the week for a given date
   */
  const getWeekEnd = useCallback((date: Date): Date => {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [getWeekStart]);

  /**
   * Get all days in the current week
   */
  const weekDays = useMemo((): Date[] => {
    const start = getWeekStart(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  }, [currentDate, getWeekStart]);

  /**
   * Get the date range for API fetching
   */
  const dateRange = useMemo((): DateRange => {
    const start = getWeekStart(currentDate);
    const end = getWeekEnd(currentDate);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }, [currentDate, getWeekStart, getWeekEnd]);

  /**
   * Navigate to next week
   */
  const nextWeek = useCallback(() => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7);
      return next;
    });
  }, []);

  /**
   * Navigate to previous week
   */
  const prevWeek = useCallback(() => {
    setCurrentDate(prev => {
      const prev2 = new Date(prev);
      prev2.setDate(prev2.getDate() - 7);
      return prev2;
    });
  }, []);

  /**
   * Go to today's week
   */
  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  /**
   * Go to a specific date
   */
  const goToDate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  /**
   * Check if today is in the current view
   */
  const isCurrentWeek = useMemo((): boolean => {
    const today = new Date();
    const start = getWeekStart(currentDate);
    const end = getWeekEnd(currentDate);
    return today >= start && today <= end;
  }, [currentDate, getWeekStart, getWeekEnd]);

  /**
   * Get month label for header
   * Uses full month name when single month, abbreviated when spanning two months
   */
  const monthLabel = useMemo((): string => {
    const start = weekDays[0];
    const end = weekDays[6];
    
    const startMonthFull = start.toLocaleDateString('en-US', { month: 'long' });
    const endMonthFull = end.toLocaleDateString('en-US', { month: 'long' });
    
    // Same month - use full name
    if (startMonthFull === endMonthFull) {
      return startMonthFull;
    }
    
    // Two months - use abbreviated names (e.g., "Nov – Dec")
    const startMonthShort = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonthShort = end.toLocaleDateString('en-US', { month: 'short' });
    
    return `${startMonthShort} – ${endMonthShort}`;
  }, [weekDays]);

  /**
   * Get year label for header
   */
  const yearLabel = useMemo((): string => {
    const start = weekDays[0];
    return start.getFullYear().toString();
  }, [weekDays]);

  /**
   * Format day for header (e.g., "Sun 23")
   */
  const formatDayHeader = useCallback((date: Date): { dayName: string; dayNum: number } => {
    return {
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: date.getDate(),
    };
  }, []);

  /**
   * Check if a date is today
   */
  const isToday = useCallback((date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, []);

  return {
    currentDate,
    weekDays,
    dateRange,
    monthLabel,
    yearLabel,
    isCurrentWeek,
    nextWeek,
    prevWeek,
    goToToday,
    goToDate,
    formatDayHeader,
    isToday,
    timezone: config.timezone,
  };
}

