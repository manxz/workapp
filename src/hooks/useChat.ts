"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const [typingUsers, setTypingUsers] = useState<{ userId: string; userName: string }[]>([]);
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

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

  // Broadcast typing event
  const broadcastTyping = useCallback(() => {
    if (!user || !profile || !profile.full_name || !conversationId) return;
    
    const channel = supabase.channel(`room:${conversationId}`);
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, userName: profile.full_name },
    });
  }, [conversationId, user, profile]);

  // Broadcast stop typing event
  const broadcastStopTyping = useCallback(() => {
    if (!user || !conversationId) return;
    
    const channel = supabase.channel(`room:${conversationId}`);
    channel.send({
      type: 'broadcast',
      event: 'stop-typing',
      payload: { userId: user.id },
    });
  }, [conversationId, user]);

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    loadMessages();

    // Subscribe to new messages and typing events
    const channel = supabase
      .channel(`room:${conversationId}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, userName } = payload.payload;
        if (userId !== user?.id) {
          // Clear existing timeout for this user
          const existingTimeout = typingTimeoutsRef.current.get(userId);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          // Add or update user in typing list
          setTypingUsers((prev) => {
            if (prev.some(u => u.userId === userId)) return prev;
            return [...prev, { userId, userName }];
          });

          // Set new timeout to remove after 3 seconds
          const timeout = setTimeout(() => {
            setTypingUsers((prev) => prev.filter(u => u.userId !== userId));
            typingTimeoutsRef.current.delete(userId);
          }, 3000);
          
          typingTimeoutsRef.current.set(userId, timeout);
        }
      })
      .on('broadcast', { event: 'stop-typing' }, (payload) => {
        const { userId } = payload.payload;
        
        // Clear timeout for this user
        const existingTimeout = typingTimeoutsRef.current.get(userId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          typingTimeoutsRef.current.delete(userId);
        }
        
        setTypingUsers((prev) => prev.filter(u => u.userId !== userId));
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
          console.log("Message received");
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
            console.log("Attempting notification");
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              // Show notification if tab is hidden or window doesn't have focus
              const shouldNotify = document.visibilityState === 'hidden' || !document.hasFocus();
              
              if (shouldNotify) {
                try {
                  const notification = new Notification(formattedMessage.author, {
                    body: formattedMessage.text,
                    icon: formattedMessage.avatar,
                    tag: conversationId,
                    requireInteraction: false,
                  });
                  
                  // Focus window when notification is clicked
                  notification.onclick = () => {
                    window.focus();
                    notification.close();
                  };
                  
                  notification.onerror = (error) => {
                    console.error("Notification error:", error);
                  };
                } catch (error) {
                  console.error("Error creating notification:", error);
                }
              }
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
      .subscribe();

    return () => {
      // Clean up all typing timeouts
      typingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
      
      supabase.removeChannel(channel);
    };
  }, [conversationId, loadMessages, user]);

  return {
    messages,
    sendMessage,
    loading,
    typingUsers,
    broadcastTyping,
    broadcastStopTyping,
  };
}
