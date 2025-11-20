"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type Message = {
  id: string;
  author: string;
  avatar: string;
  timestamp: string;
  text: string;
  imageUrl?: string; // Legacy single image
  imageUrls?: string[]; // Multiple images
  reactions?: Array<{ emoji: string; userIds: string[] }>; // Ordered array to maintain insertion order
};

export function useChat(conversationId: string) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<{ userId: string; userName: string }[]>([]);
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const optimisticMessageRef = useRef<string | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());

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
        const formattedMessages: Message[] = data.map((msg) => {
          // Add to processed set to prevent duplicate processing
          processedMessageIds.current.add(msg.id);
          
          // Convert old reaction format (object) to new format (array)
          let reactions: Array<{ emoji: string; userIds: string[] }> | undefined;
          if (msg.reactions) {
            if (Array.isArray(msg.reactions)) {
              reactions = msg.reactions;
            } else {
              // Convert object format to array format
              reactions = Object.entries(msg.reactions as Record<string, string[]>).map(([emoji, userIds]) => ({
                emoji,
                userIds
              }));
            }
          }
          
          return {
            id: msg.id,
            author: msg.author_name,
            avatar: msg.author_avatar || "https://i.pravatar.cc/150?img=1",
            timestamp: msg.created_at,
            text: msg.text,
            imageUrl: msg.image_url, // Legacy single image
            imageUrls: msg.image_urls || undefined, // Multiple images
            reactions,
          };
        });
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
    async (text: string, files?: File[]) => {
      if (!user || !profile || !profile.full_name) {
        console.error("User not authenticated or profile not loaded");
        return;
      }

      // Create optimistic message with local previews
      const optimisticId = `temp-${Date.now()}`;
      optimisticMessageRef.current = optimisticId;
      let localPreviewUrls: string[] = [];

      if (files && files.length > 0) {
        // Create local preview URLs for instant display
        localPreviewUrls = files.map(file => URL.createObjectURL(file));
      }

      const optimisticMessage: Message = {
        id: optimisticId,
        author: profile.full_name,
        avatar: profile.avatar_url || `https://i.pravatar.cc/150?u=${user.id}`,
        timestamp: new Date().toISOString(),
        text: text,
        imageUrls: localPreviewUrls.length > 0 ? localPreviewUrls : undefined,
      };

      // Add optimistic message immediately
      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        let imageUrls: string[] = [];

        // Upload files in background if provided
        if (files && files.length > 0) {
          const uploadPromises = files.map(async (file, index) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}-${index}.${fileExt}`;
            const filePath = `${conversationId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('chat-uploads')
              .upload(filePath, file);

            if (uploadError) {
              console.error("Error uploading file:", uploadError);
              throw uploadError;
            }

            // Get public URL after successful upload
            const { data: { publicUrl } } = supabase.storage
              .from('chat-uploads')
              .getPublicUrl(filePath);

            return publicUrl;
          });

          try {
            imageUrls = await Promise.all(uploadPromises);
          } catch (uploadError) {
            console.error("Error uploading files:", uploadError);
            // Remove optimistic message on error
            setMessages((prev) => prev.filter(m => m.id !== optimisticId));
            throw uploadError;
          }
        }

        // Insert message to database
        const { error } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          author_id: user.id,
          author_name: profile.full_name,
          author_avatar: profile.avatar_url || `https://i.pravatar.cc/150?u=${user.id}`,
          text: text,
          image_urls: imageUrls.length > 0 ? imageUrls : null,
        });

        if (error) {
          console.error("Error inserting message:", error);
          // Remove optimistic message on error
          setMessages((prev) => prev.filter(m => m.id !== optimisticId));
          throw error;
        }

        // Don't remove optimistic message - let real-time replace it
        // This prevents the flicker of images disappearing and reappearing
      } catch (error) {
        console.error("Error sending message:", error);
      }
    },
    [conversationId, user, profile]
  );

  // Store channel ref to reuse for broadcasts
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    // Reset typing users when switching conversations
    setTypingUsers([]);
    
    // Clear optimistic message ref when switching conversations
    optimisticMessageRef.current = null;
    
    // Clear processed message IDs when switching conversations
    processedMessageIds.current.clear();

    loadMessages();

    // Subscribe to new messages and typing events
    const channel = supabase
      .channel(`room:${conversationId}`, {
        config: {
          broadcast: { self: false },
        },
      });
    
    channelRef.current = channel;
    
    channel
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
            const newMsg = payload.new as Record<string, unknown>;
            
            // Skip if we've already processed this message
            if (processedMessageIds.current.has(newMsg.id as string)) {
              return;
            }
            processedMessageIds.current.add(newMsg.id as string);
            
            // Convert old reaction format (object) to new format (array)
            let reactions: Array<{ emoji: string; userIds: string[] }> | undefined;
            if (newMsg.reactions) {
              if (Array.isArray(newMsg.reactions)) {
                reactions = newMsg.reactions as Array<{ emoji: string; userIds: string[] }>;
              } else {
                // Convert object format to array format
                reactions = Object.entries(newMsg.reactions as Record<string, string[]>).map(([emoji, userIds]) => ({
                  emoji,
                  userIds
                }));
              }
            }
            
            const formattedMessage: Message = {
              id: newMsg.id as string,
              author: newMsg.author_name as string,
              avatar: (newMsg.author_avatar as string) || "https://i.pravatar.cc/150?img=1",
              timestamp: newMsg.created_at as string,
              text: newMsg.text as string,
              imageUrl: newMsg.image_url as string | undefined, // Legacy single image
              imageUrls: (newMsg.image_urls as string[]) || undefined, // Multiple images
              reactions,
            };
          
          // Show browser notification if message is from someone else
          if (user && (newMsg.author_id as string) !== user.id) {
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
            // Prevent duplicates by ID
            if (prev.some(m => m.id === formattedMessage.id)) {
              return prev;
            }
            
            // Replace optimistic message if it's from the current user
            if ((newMsg.author_id as string) === user?.id) {
              // First try to find by stored ref
              let optimisticIndex = optimisticMessageRef.current 
                ? prev.findIndex(m => m.id === optimisticMessageRef.current)
                : -1;
              
              // If not found, try to find by temp- prefix and recent timestamp (within 10 seconds)
              if (optimisticIndex === -1) {
                optimisticIndex = prev.findIndex(m => 
                  m.id.startsWith('temp-') && 
                  m.author === formattedMessage.author &&
                  Math.abs(new Date(m.timestamp).getTime() - new Date(formattedMessage.timestamp).getTime()) < 10000
                );
              }
              
              if (optimisticIndex !== -1) {
                const oldMessage = prev[optimisticIndex];
                
                // Preload real images before replacing to prevent flash
                if (formattedMessage.imageUrls && formattedMessage.imageUrls.length > 0) {
                  // Preload all images first
                  const imagePromises = formattedMessage.imageUrls.map(url => {
                    return new Promise((resolve) => {
                      const img = new Image();
                      img.onload = () => resolve(true);
                      img.onerror = () => resolve(false); // Still resolve on error
                      img.src = url;
                    });
                  });
                  
                  // Wait for all images to load, then replace message
                  Promise.all(imagePromises).then(() => {
                    setMessages((current) => {
                      const idx = current.findIndex(m => m.id === oldMessage.id);
                      if (idx !== -1) {
                        const updated = [...current];
                        updated[idx] = formattedMessage;
                        
                        // Clean up blob URLs after replacement
                        if (oldMessage.imageUrl && oldMessage.imageUrl.startsWith('blob:')) {
                          URL.revokeObjectURL(oldMessage.imageUrl);
                        }
                        if (oldMessage.imageUrls) {
                          oldMessage.imageUrls.forEach(url => {
                            if (url.startsWith('blob:')) {
                              URL.revokeObjectURL(url);
                            }
                          });
                        }
                        
                        // Clear optimistic message ref after successful replacement
                        optimisticMessageRef.current = null;
                        
                        return updated;
                      }
                      return current;
                    });
                  });
                  
                  // Keep the optimistic message for now (with blob URLs)
                  return prev;
                }
                
                // No images, replace immediately
                const newMessages = [...prev];
                newMessages[optimisticIndex] = formattedMessage;
                
                // Clear the optimistic message ref
                optimisticMessageRef.current = null;
                
                return newMessages;
              }
            }
            
            return [...prev, formattedMessage];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as Record<string, unknown>;
          
          // Convert old reaction format (object) to new format (array)
          let reactions: Array<{ emoji: string; userIds: string[] }> | undefined;
          if (updatedMsg.reactions) {
            if (Array.isArray(updatedMsg.reactions)) {
              reactions = updatedMsg.reactions as Array<{ emoji: string; userIds: string[] }>;
            } else {
              // Convert object format to array format
              reactions = Object.entries(updatedMsg.reactions as Record<string, string[]>).map(([emoji, userIds]) => ({
                emoji,
                userIds
              }));
            }
          }
          
          // Update the message with new data (e.g., reactions)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updatedMsg.id
                ? {
                    ...m,
                    reactions,
                  }
                : m
            )
          );
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

  // Broadcast typing event - uses channelRef to avoid creating new channels
  const broadcastTyping = useCallback(() => {
    if (!user || !profile || !profile.full_name || !channelRef.current) return;
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, userName: profile.full_name },
    });
  }, [user, profile]);

  // Broadcast stop typing event - uses channelRef to avoid creating new channels
  const broadcastStopTyping = useCallback(() => {
    if (!user || !channelRef.current) return;
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'stop-typing',
      payload: { userId: user.id },
    });
  }, [user]);

  // Toggle reaction on a message
  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;

    // Find the message
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    // Calculate new reactions (array-based to maintain order)
    // Ensure we have array format (convert from object if needed)
    let currentReactions: Array<{ emoji: string; userIds: string[] }> = [];
    if (message.reactions) {
      if (Array.isArray(message.reactions)) {
        currentReactions = message.reactions;
      } else {
        // Convert object format to array format
        currentReactions = Object.entries(message.reactions as unknown as Record<string, string[]>).map(([emoji, userIds]) => ({
          emoji,
          userIds
        }));
      }
    }
    
    const existingReactionIndex = currentReactions.findIndex(r => r.emoji === emoji);
    
    let newReactions: Array<{ emoji: string; userIds: string[] }>;
    
    if (existingReactionIndex !== -1) {
      // Emoji already exists
      const existingReaction = currentReactions[existingReactionIndex];
      const hasReacted = existingReaction.userIds.includes(user.id);
      
      if (hasReacted) {
        // Remove user's reaction
        const filteredUserIds = existingReaction.userIds.filter(id => id !== user.id);
        if (filteredUserIds.length === 0) {
          // Remove emoji entirely if no users left
          newReactions = currentReactions.filter((_, index) => index !== existingReactionIndex);
        } else {
          // Update the userIds array
          newReactions = [...currentReactions];
          newReactions[existingReactionIndex] = { emoji, userIds: filteredUserIds };
        }
      } else {
        // Add user's reaction
        newReactions = [...currentReactions];
        newReactions[existingReactionIndex] = {
          emoji,
          userIds: [...existingReaction.userIds, user.id]
        };
      }
    } else {
      // New emoji, add to end
      newReactions = [...currentReactions, { emoji, userIds: [user.id] }];
    }

    // Optimistically update UI
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, reactions: newReactions } : m
    ));

    // Update database
    try {
      const { error } = await supabase
        .from('messages')
        .update({ reactions: newReactions })
        .eq('id', messageId);

      if (error) {
        console.error('Error updating reactions:', error);
        // Revert optimistic update on error
        setMessages(prev => prev.map(m =>
          m.id === messageId ? { ...m, reactions: currentReactions } : m
        ));
      }
    } catch (error) {
      console.error('Error updating reactions:', error);
    }
  }, [messages, user]);

  return {
    messages,
    sendMessage,
    loading,
    typingUsers,
    broadcastTyping,
    broadcastStopTyping,
    toggleReaction,
  };
}
