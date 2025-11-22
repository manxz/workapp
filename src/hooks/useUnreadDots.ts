/**
 * Ephemeral Unread Dot Indicator Hook
 * 
 * Manages simple boolean unread state for conversations.
 * State is in-memory only (no database, no persistence).
 * 
 * ## Rules:
 * - When a message arrives and conversation is NOT actively opened → mark unread
 * - When user opens the conversation → mark as read
 * - No counts, no numbers, just a boolean dot indicator
 * 
 * ## Performance:
 * - In-memory only (React state)
 * - No database writes
 * - No global re-renders
 */

import { useState, useCallback } from 'react';

/**
 * Unread state map: conversationId → boolean
 */
type UnreadState = Record<string, boolean>;

/**
 * Hook for managing ephemeral unread dot indicators
 * 
 * @example
 * const { hasUnread, markUnread, markRead } = useUnreadDots();
 * 
 * // Check if conversation has unread
 * if (hasUnread('channel-123')) {
 *   // Show dot
 * }
 * 
 * // Mark as unread when message arrives
 * markUnread('channel-123');
 * 
 * // Mark as read when user opens conversation
 * markRead('channel-123');
 */
export function useUnreadDots() {
  const [unreadState, setUnreadState] = useState<UnreadState>({});

  /**
   * Check if a conversation has unread messages
   */
  const hasUnread = useCallback((conversationId: string): boolean => {
    return unreadState[conversationId] === true;
  }, [unreadState]);

  /**
   * Mark a conversation as unread (show dot)
   * Call when a new message arrives and conversation is not open
   */
  const markUnread = useCallback((conversationId: string) => {
    setUnreadState(prev => ({
      ...prev,
      [conversationId]: true,
    }));
  }, []);

  /**
   * Mark a conversation as read (hide dot)
   * Call when user opens the conversation
   */
  const markRead = useCallback((conversationId: string) => {
    setUnreadState(prev => {
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
  }, []);

  /**
   * Clear all unread states
   * Useful for cleanup or reset
   */
  const clearAll = useCallback(() => {
    setUnreadState({});
  }, []);

  /**
   * Check if there are ANY unread conversations
   * Useful for showing app-level indicator
   */
  const hasAnyUnread = useCallback((): boolean => {
    return Object.values(unreadState).some(value => value === true);
  }, [unreadState]);

  return {
    hasUnread,
    hasAnyUnread,
    markUnread,
    markRead,
    clearAll,
  };
}

