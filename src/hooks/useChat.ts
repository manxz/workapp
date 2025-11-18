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
};

export function useChat(conversationId: string) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

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
          };
          
          // Show browser notification if message is from someone else
          if (user && newMsg.author_id !== user.id) {
            console.log("Message from someone else, checking notification permission...");
            console.log("Permission:", typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'N/A');
            console.log("Document visibility:", document.visibilityState);
            console.log("Window has focus:", document.hasFocus());
            
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              // Show notification if tab is hidden or window doesn't have focus
              const shouldNotify = document.visibilityState === 'hidden' || !document.hasFocus();
              
              if (shouldNotify) {
                console.log("Showing notification for:", formattedMessage.author);
                const notification = new Notification(formattedMessage.author, {
                  body: formattedMessage.text,
                  icon: formattedMessage.avatar,
                  tag: conversationId, // Replaces previous notification from same conversation
                  requireInteraction: false,
                });
                
                // Focus window when notification is clicked
                notification.onclick = () => {
                  window.focus();
                  notification.close();
                };
              } else {
                console.log("Tab is visible and focused, not showing notification");
              }
            } else {
              console.log("Notification not available or permission not granted");
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
  }, [conversationId, loadMessages, user]);

  return {
    messages,
    sendMessage,
    loading,
  };
}
