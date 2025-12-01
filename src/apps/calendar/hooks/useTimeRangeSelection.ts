"use client";

import { useState, useCallback, useRef } from 'react';
import { TimeSlot, SelectionRange, SNAP_MINUTES, MIN_EVENT_DURATION, DEFAULT_EVENT_DURATION } from '../types';

/**
 * Hook for handling time range selection via click and drag
 * 
 * Supports:
 * - Single click: Creates 30-minute event
 * - Click + drag: Creates event with dragged duration (min 15 min)
 * - Times snap to 15-minute increments
 */
export function useTimeRangeSelection(
  onSelectionComplete: (range: SelectionRange) => void
) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectionStart, setSelectionStart] = useState<TimeSlot | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<TimeSlot | null>(null);
  const [hoverSlot, setHoverSlot] = useState<TimeSlot | null>(null);
  
  // Track if this was a click (no significant drag)
  const clickStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDragSignificantRef = useRef(false);
  
  // Store drag context to prevent jumpiness from gridTop changes during drag
  const dragContextRef = useRef<{ gridTop: number; rowHeight: number } | null>(null);

  /**
   * Round minutes to nearest snap interval
   */
  const snapMinutes = useCallback((minutes: number): number => {
    return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
  }, []);

  /**
   * Calculate time slot from mouse position
   */
  const getTimeSlotFromPosition = useCallback((
    clientY: number,
    gridTop: number,
    rowHeight: number,
    date: Date
  ): TimeSlot => {
    const relativeY = clientY - gridTop;
    const totalMinutes = (relativeY / rowHeight) * 60;
    let hour = Math.floor(totalMinutes / 60);
    let minute = snapMinutes(totalMinutes % 60);
    
    // Handle minute overflow (when snapping pushes to 60)
    if (minute >= 60) {
      minute = 0;
      hour += 1;
    }
    
    return {
      date: new Date(date),
      hour: Math.max(0, Math.min(23, hour)),
      minute,
    };
  }, [snapMinutes]);

  /**
   * Start selection on mouse down
   */
  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    gridTop: number,
    rowHeight: number,
    date: Date
  ) => {
    // Only handle left click
    if (e.button !== 0) return;
    
    // Store the grid context at drag start to prevent jumpiness
    dragContextRef.current = { gridTop, rowHeight };
    
    const slot = getTimeSlotFromPosition(e.clientY, gridTop, rowHeight, date);
    
    clickStartRef.current = { x: e.clientX, y: e.clientY };
    isDragSignificantRef.current = false;
    
    setIsDragging(true);
    setSelectionStart(slot);
    setSelectionEnd(slot);
  }, [getTimeSlotFromPosition]);

  /**
   * Update selection on mouse move
   */
  const handleMouseMove = useCallback((
    e: React.MouseEvent,
    gridTop: number,
    rowHeight: number,
    date: Date
  ) => {
    // Use stored context during drag to prevent jumpiness, fall back to current values for hover
    const effectiveGridTop = isDragging && dragContextRef.current ? dragContextRef.current.gridTop : gridTop;
    const effectiveRowHeight = isDragging && dragContextRef.current ? dragContextRef.current.rowHeight : rowHeight;
    
    // Update hover state
    const slot = getTimeSlotFromPosition(e.clientY, effectiveGridTop, effectiveRowHeight, date);
    setHoverSlot(slot);
    
    if (!isDragging || !selectionStart) return;
    
    // Check if drag is significant (moved more than 5px)
    if (clickStartRef.current) {
      const dx = Math.abs(e.clientX - clickStartRef.current.x);
      const dy = Math.abs(e.clientY - clickStartRef.current.y);
      if (dx > 5 || dy > 5) {
        isDragSignificantRef.current = true;
      }
    }
    
    // Only update if same date (no cross-day selection for now)
    if (date.toDateString() === selectionStart.date.toDateString()) {
      setSelectionEnd(slot);
    }
  }, [isDragging, selectionStart, getTimeSlotFromPosition]);

  /**
   * Complete selection on mouse up
   */
  const handleMouseUp = useCallback(() => {
    if (!selectionStart || !selectionEnd) {
      clearSelection();
      return;
    }
    
    let start = selectionStart;
    let end = selectionEnd;
    
    // If not a significant drag, create default duration event
    if (!isDragSignificantRef.current) {
      // Single click - create 30 minute event
      end = {
        ...start,
        hour: start.hour + Math.floor((start.minute + DEFAULT_EVENT_DURATION) / 60),
        minute: (start.minute + DEFAULT_EVENT_DURATION) % 60,
      };
    } else {
      // Ensure start is before end
      const startTime = start.hour * 60 + start.minute;
      const endTime = end.hour * 60 + end.minute;
      
      if (startTime > endTime) {
        [start, end] = [end, start];
      }
      
      // Ensure minimum duration
      const duration = (end.hour * 60 + end.minute) - (start.hour * 60 + start.minute);
      if (duration < MIN_EVENT_DURATION) {
        end = {
          ...end,
          hour: start.hour + Math.floor((start.minute + MIN_EVENT_DURATION) / 60),
          minute: (start.minute + MIN_EVENT_DURATION) % 60,
        };
      }
    }
    
    // Clamp to valid hours
    if (end.hour >= 24) {
      end = { ...end, hour: 23, minute: 45 };
    }
    
    onSelectionComplete({ start, end });
    clearSelection();
  }, [selectionStart, selectionEnd, onSelectionComplete]);

  /**
   * Clear selection state
   */
  const clearSelection = useCallback(() => {
    setIsDragging(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    clickStartRef.current = null;
    isDragSignificantRef.current = false;
    dragContextRef.current = null;
  }, []);

  /**
   * Clear hover state when mouse leaves grid
   */
  const handleMouseLeave = useCallback(() => {
    setHoverSlot(null);
    if (isDragging) {
      handleMouseUp();
    }
  }, [isDragging, handleMouseUp]);

  /**
   * Get current selection as normalized range
   */
  const getSelectionRange = useCallback((): SelectionRange | null => {
    if (!selectionStart || !selectionEnd) return null;
    
    let start = selectionStart;
    let end = selectionEnd;
    
    const startTime = start.hour * 60 + start.minute;
    const endTime = end.hour * 60 + end.minute;
    
    if (startTime > endTime) {
      [start, end] = [end, start];
    }
    
    // For display, ensure minimum visual height
    const duration = (end.hour * 60 + end.minute) - (start.hour * 60 + start.minute);
    if (duration < MIN_EVENT_DURATION) {
      end = {
        ...end,
        hour: start.hour + Math.floor((start.minute + MIN_EVENT_DURATION) / 60),
        minute: (start.minute + MIN_EVENT_DURATION) % 60,
      };
    }
    
    return { start, end };
  }, [selectionStart, selectionEnd]);

  return {
    isDragging,
    selectionStart,
    selectionEnd,
    hoverSlot,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    clearSelection,
    getSelectionRange,
  };
}

