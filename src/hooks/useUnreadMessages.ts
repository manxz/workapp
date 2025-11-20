"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Manages unread message notifications with localStorage persistence
 * 
 * @description
 * Tracks which conversations have unread messages using a Set stored in localStorage.
 * Subscribes to real-time message INSERTs to automatically mark conversations as unread.
 * 
 * ## Key Features
 * - **Persistence**: Unread state survives page refreshes (localStorage)
 * - **Real-time**: Auto-updates when new messages arrive
 * - **User-specific**: Each user has their own unread state
 * - **Manual control**: Can mark conversations as read/unread
 * 
 * ## Data Flow
 * 1. Load unread Set from localStorage on mount
 * 2. Subscribe to all message INSERTs
 * 3. When message from other user arrives → mark conversation unread
 * 4. User opens conversation → call markAsRead()
 * 5. Save to localStorage on every change
 * 
 * @example
 * const { hasUnread, markAsRead, unreadConversations } = useUnreadMessages();
 * 
 * // Check if conversation has unread
 * if (hasUnread('channel-123')) {
 *   // Show blue dot
 * }
 * 
 * // Mark as read when user opens conversation
 * markAsRead('channel-123');
 * 
 * @returns Unread state and control functions
 */
export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadConversations, setUnreadConversations] = useState<Set<string>>(new Set());

  // Load unread status from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const stored = localStorage.getItem(`unread_${user.id}`);
      if (stored) {
        setUnreadConversations(new Set(JSON.parse(stored)));
      }
    }
  }, [user]);

  // Save to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      localStorage.setItem(`unread_${user.id}`, JSON.stringify(Array.from(unreadConversations)));
    }
  }, [unreadConversations, user]);

  // Mark a conversation as read
  const markAsRead = useCallback((conversationId: string) => {
    setUnreadConversations((prev) => {
      const next = new Set(prev);
      next.delete(conversationId);
      return next;
    });
  }, []);

  // Mark a conversation as unread
  const markAsUnread = useCallback((conversationId: string) => {
    setUnreadConversations((prev) => {
      const next = new Set(prev);
      next.add(conversationId);
      return next;
    });
  }, []);

  // Subscribe to new messages to mark conversations as unread
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("unread-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as Record<string, unknown>;
          // Only mark as unread if message is from someone else
          if ((newMsg.author_id as string) !== user.id) {
            markAsUnread(newMsg.conversation_id as string);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, markAsUnread]);

  return {
    unreadConversations,
    markAsRead,
    markAsUnread,
    hasUnread: (conversationId: string) => unreadConversations.has(conversationId),
  };
}

