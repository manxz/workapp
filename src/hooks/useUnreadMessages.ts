"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Manages unread message notifications with database persistence
 * 
 * @description
 * Tracks which conversations have unread messages by comparing the last message timestamp
 * with when the user last read the conversation. Uses Supabase database for persistence,
 * so unread status syncs across all devices in real-time.
 * 
 * ## Key Features
 * - **Database-backed**: Survives page refreshes and syncs across devices
 * - **Real-time**: Auto-updates when new messages arrive or conversations are read
 * - **Accurate**: Compares message timestamps with last_read_at
 * - **Efficient**: Uses indexed queries for fast lookups
 * 
 * ## How It Works
 * 1. On mount, fetch all conversations with unread messages
 * 2. Subscribe to new message INSERTs to detect unread
 * 3. Subscribe to read_status changes to sync across tabs/devices
 * 4. When user opens conversation → call markAsRead() → updates database
 * 5. All devices receive real-time update and remove blue dot
 * 
 * ## Migration from localStorage
 * Previous implementation used localStorage which didn't sync across devices.
 * New implementation uses conversation_read_status table in database.
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

  // Load unread conversations from database
  const loadUnreadConversations = useCallback(async () => {
    if (!user) return;

    try {
      // Get user's read status for all conversations
      const { data: readStatus, error: readError } = await supabase
        .from('conversation_read_status')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);

      if (readError) throw readError;

      // Build a map of conversation_id -> last_read_at
      const readMap = new Map<string, string>();
      readStatus?.forEach(status => {
        readMap.set(status.conversation_id, status.last_read_at);
      });

      // Get all conversations and check for unread messages
      const { data: allMessages, error: messagesError } = await supabase
        .from('messages')
        .select('conversation_id, created_at, author_id')
        .is('thread_id', null) // Only top-level messages
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Find conversations with unread messages
      const unread = new Set<string>();
      const conversationLatestMessage = new Map<string, { timestamp: string; authorId: string }>();

      // Get the latest message for each conversation
      allMessages?.forEach(msg => {
        if (!conversationLatestMessage.has(msg.conversation_id)) {
          conversationLatestMessage.set(msg.conversation_id, {
            timestamp: msg.created_at,
            authorId: msg.author_id
          });
        }
      });

      // Check each conversation for unread messages
      conversationLatestMessage.forEach((latest, conversationId) => {
        const lastRead = readMap.get(conversationId);
        
        // Mark as unread ONLY if:
        // 1. We have a last_read_at timestamp (user has opened this conversation before), AND
        // 2. Latest message is newer than last_read_at, AND
        // 3. Latest message is not from the current user
        //
        // NOTE: If lastRead is undefined (never tracked), we DON'T mark as unread
        // This prevents all existing conversations from showing as unread on migration
        if (lastRead && latest.authorId !== user.id) {
          if (new Date(latest.timestamp) > new Date(lastRead)) {
            unread.add(conversationId);
          }
        }
      });

      setUnreadConversations(unread);
    } catch (error) {
      console.error('Error loading unread conversations:', error);
    }
  }, [user]);

  // Load on mount
  useEffect(() => {
    loadUnreadConversations();
  }, [loadUnreadConversations]);

  // Mark a conversation as read
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;

    // OPTIMISTIC UPDATE: Remove from unread immediately (no waiting)
    setUnreadConversations((prev) => {
      const next = new Set(prev);
      next.delete(conversationId);
      return next;
    });

    // Then sync with database in background
    try {
      const { error } = await supabase.rpc('mark_conversation_read', {
        p_conversation_id: conversationId
      });

      if (error) {
        console.error('Error marking conversation as read:', error);
        // Re-add to unread on error
        setUnreadConversations((prev) => {
          const next = new Set(prev);
          next.add(conversationId);
          return next;
        });
      }
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      // Re-add to unread on error
      setUnreadConversations((prev) => {
        const next = new Set(prev);
        next.add(conversationId);
        return next;
      });
    }
  }, [user]);

  // Subscribe to new messages to mark conversations as unread
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("unread-messages-realtime")
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
          if ((newMsg.author_id as string) !== user.id && !newMsg.thread_id) {
            setUnreadConversations((prev) => {
              const next = new Set(prev);
              next.add(newMsg.conversation_id as string);
              return next;
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_read_status",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // When user marks as read on another device, sync here
          const status = payload.new as Record<string, unknown>;
          setUnreadConversations((prev) => {
            const next = new Set(prev);
            next.delete(status.conversation_id as string);
            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_read_status",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // When user marks as read on another device, sync here
          const status = payload.new as Record<string, unknown>;
          setUnreadConversations((prev) => {
            const next = new Set(prev);
            next.delete(status.conversation_id as string);
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Compute unread count reactively
  const unreadCount = useMemo(() => unreadConversations.size, [unreadConversations]);

  return {
    unreadConversations,
    unreadCount,
    markAsRead,
    hasUnread: (conversationId: string) => unreadConversations.has(conversationId),
  };
}
