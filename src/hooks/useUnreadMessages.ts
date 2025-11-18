"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

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
          console.log("New message received for unread tracking:", payload);
          const newMsg = payload.new as any;
          // Only mark as unread if message is from someone else
          if (newMsg.author_id !== user.id) {
            console.log("Marking as unread:", newMsg.conversation_id);
            markAsUnread(newMsg.conversation_id);
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

