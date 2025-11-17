"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export type Message = {
  id: string;
  author: string;
  avatar: string;
  timestamp: string;
  text: string;
  author_id?: string;
};

// Request notification permission
const requestNotificationPermission = async () => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  
  if (Notification.permission === "granted") {
    return true;
  }
  
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  
  return false;
};

// Show notification
const showNotification = (title: string, body: string, icon?: string) => {
  if (typeof window === "undefined" || Notification.permission !== "granted") {
    return;
  }
  
  new Notification(title, {
    body,
    icon: icon || "/favicon.ico",
    badge: "/favicon.ico",
  });
};

export function useChat(conversationId: string, onNewMessage?: (message: Message) => void) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Load messages from Supabase
  const loadMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data) {
        const formattedMessages: Message[] = data.map((msg) => ({
          id: msg.id,
          author: msg.author_name,
          avatar: msg.author_avatar || "https://i.pravatar.cc/150?img=1",
          timestamp: msg.created_at,
          text: msg.text,
          author_id: msg.author_id,
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Send a message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!user || !profile || !profile.full_name) {
        console.error("User not authenticated or profile not loaded");
        return;
      }

      try {
        const { error } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          author_id: user.id,
          author_name: profile.full_name,
          author_avatar: profile.avatar_url || `https://i.pravatar.cc/150?u=${user.id}`,
          text: text,
        });

        if (error) throw error;
      } catch (error) {
        console.error("Error sending message:", error);
      }
    },
    [conversationId, user, profile]
  );

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    loadMessages();
    
    // Request notification permission on mount
    requestNotificationPermission();

    // Subscribe to new messages
    const channel = supabase
      .channel(`room:${conversationId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("Real-time message received:", payload);
          const newMsg = payload.new as any;
          const formattedMessage: Message = {
            id: newMsg.id,
            author: newMsg.author_name,
            avatar: newMsg.author_avatar || "https://i.pravatar.cc/150?img=1",
            timestamp: newMsg.created_at,
            text: newMsg.text,
            author_id: newMsg.author_id,
          };
          
          // Show notification if message is from someone else
          if (user && newMsg.author_id !== user.id) {
            const isChannel = conversationId.startsWith("channel-");
            const title = isChannel ? `#${newMsg.author_name}` : newMsg.author_name;
            showNotification(title, newMsg.text, newMsg.author_avatar);
            
            // Notify parent component
            if (onNewMessage) {
              onNewMessage(formattedMessage);
            }
          }
          
          setMessages((prev) => {
            // Prevent duplicates
            if (prev.some(m => m.id === formattedMessage.id)) {
              return prev;
            }
            return [...prev, formattedMessage];
          });
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return () => {
      console.log("Removing channel subscription");
      supabase.removeChannel(channel);
    };
  }, [conversationId, loadMessages, user, onNewMessage]);

  return {
    messages,
    sendMessage,
    loading,
  };
}
