"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { showMessageNotification, requestNotificationPermission } from "@/lib/notifications";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  TYPING_INDICATOR_TIMEOUT,
  OPTIMISTIC_MESSAGE_MATCH_WINDOW,
  DEFAULT_AVATAR_URL,
  USER_AVATAR_PLACEHOLDER,
} from "@/lib/constants";

/**
 * Message type with support for text, images, reactions, and threads
 * 
 * Key Design Decisions:
 * - `reactions`: Array format maintains insertion order (not object)
 * - `imageUrls`: Multiple images supported (imageUrl is legacy)
 * - `thread_id`: Marks this as a reply (if set, excluded from main chat)
 * - `replyCount`, `lastReplyAt`, `replyAvatars`: Thread metadata for parent messages
 */
export type Message = {
  id: string;
  author: string;
  avatar: string;
  timestamp: string;
  text: string;
  imageUrl?: string; // Legacy single image
  imageUrls?: string[]; // Multiple images
  reactions?: Array<{ emoji: string; userIds: string[] }>; // Ordered array to maintain insertion order
  threadId?: string; // If this is a reply in a thread, the parent message ID
  replyCount?: number; // Number of replies in the thread
  lastReplyAt?: string; // Timestamp of last reply
  replyAvatars?: string[]; // Avatars of users who replied
};

/**
 * Thread information containing parent message and all replies
 */
export type ThreadInfo = {
  parentMessage: Message;
  replies: Message[];
};

/**
 * Real-time chat hook with optimistic UI, threading, and reactions
 * 
 * @param conversationId - Unique conversation identifier
 *   - Format: "channel-{id}" for channels
 *   - Format: "{userId1}-{userId2}" for DMs (sorted alphabetically)
 * 
 * ## Key Features
 * 
 * ### Optimistic UI
 * Messages appear instantly with local blob:// image URLs before server confirmation.
 * Real images are preloaded in background, then seamlessly swapped to prevent flashing.
 * 
 * ### Typing Indicators
 * Broadcasts when user types, auto-expires after 3 seconds of inactivity.
 * Supports both main chat and thread-specific typing indicators.
 * 
 * ### Thread Support
 * - Parent messages can have nested replies
 * - Threads maintain separate message lists
 * - Real-time updates for both main chat and active threads
 * - Thread metadata (reply count, avatars) updates automatically
 * 
 * ### Reaction System
 * - Array-based reactions maintain insertion order
 * - Optimistic updates with server reconciliation
 * - Automatic conversion from old object format for backward compatibility
 * 
 * ## Data Flow
 * 
 * 1. **Send Message**
 *    - Create optimistic message with blob:// URLs
 *    - Upload files to Supabase Storage (parallel)
 *    - Insert message to database
 *    - Real-time subscription receives INSERT
 *    - Preload real images, then replace optimistic message
 * 
 * 2. **Real-time Updates**
 *    - INSERT: New messages (with duplicate prevention)
 *    - UPDATE: Reactions, thread metadata
 *    - Typing events: Broadcast-only (not persisted)
 * 
 * 3. **Thread Management**
 *    - Opening thread: Fetches parent + all replies
 *    - New reply: Updates parent message metadata
 *    - Real-time: Syncs both main chat and active thread
 * 
 * @returns Chat interface methods and state
 */
export function useChat(conversationId: string) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<{ userId: string; userName: string; threadId?: string }[]>([]);
  const [activeThread, setActiveThread] = useState<ThreadInfo | null>(null);
  const [threadReplies, setThreadReplies] = useState<Message[]>([]);
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const optimisticMessageRef = useRef<string | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  /**
   * Loads messages from Supabase for the current conversation
   * 
   * Only loads top-level messages (thread replies are loaded separately).
   * Handles backward compatibility for old reaction format (object → array).
   * Automatically fetches thread metadata for messages with replies.
   */
  const loadMessages = useCallback(async () => {
    try {
      // Fetch messages and thread metadata in parallel
      const [messagesResult, threadsResult] = await Promise.all([
        supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .is("thread_id", null) // Only load top-level messages, not thread replies
          .order("created_at", { ascending: true }),
        supabase
          .from("messages")
          .select("thread_id, author_avatar, created_at")
          .eq("conversation_id", conversationId)
          .not("thread_id", "is", null) // Only get thread replies
          .order("created_at", { ascending: false })
      ]);

      if (messagesResult.error) throw messagesResult.error;

      if (messagesResult.data) {
        // Build thread metadata map for instant lookup
        const threadMetadata = new Map<string, { replyCount: number; lastReplyAt: string; replyAvatars: string[] }>();
        
        if (threadsResult.data) {
          // Group by thread_id
          const threadGroups = threadsResult.data.reduce((acc, reply) => {
            const threadId = reply.thread_id as string;
            if (!acc[threadId]) acc[threadId] = [];
            acc[threadId].push(reply);
            return acc;
          }, {} as Record<string, typeof threadsResult.data>);
          
          // Calculate metadata for each thread
          Object.entries(threadGroups).forEach(([threadId, replies]) => {
            threadMetadata.set(threadId, {
              replyCount: replies.length,
              lastReplyAt: replies[0].created_at, // Already sorted desc
              replyAvatars: [...new Set(replies.map(r => r.author_avatar))].filter(Boolean) as string[]
            });
          });
        }
        
        const formattedMessages: Message[] = messagesResult.data.map((msg) => {
          // Add to processed set to prevent duplicate processing from real-time events
          processedMessageIds.current.add(msg.id);
          
          // Convert old reaction format (object) to new format (array)
          // WHY: Array format maintains insertion order, ensuring reactions appear
          // in the order they were first added, not in the order users reacted
          let reactions: Array<{ emoji: string; userIds: string[] }> | undefined;
          if (msg.reactions) {
            if (Array.isArray(msg.reactions)) {
              reactions = msg.reactions;
            } else {
              // Backward compatibility: convert object format to array format
              reactions = Object.entries(msg.reactions as Record<string, string[]>).map(([emoji, userIds]) => ({
                emoji,
                userIds
              }));
            }
          }
          
          // Get thread metadata if this message has replies
          const metadata = threadMetadata.get(msg.id);
          
          return {
            id: msg.id,
            author: msg.author_name,
            avatar: msg.author_avatar || DEFAULT_AVATAR_URL,
            timestamp: msg.created_at,
            text: msg.text,
            imageUrl: msg.image_url, // Legacy single image
            imageUrls: msg.image_urls || undefined, // Multiple images
            reactions,
            // Include thread metadata immediately if available
            ...(metadata && {
              threadId: msg.id,
              replyCount: metadata.replyCount,
              lastReplyAt: metadata.lastReplyAt,
              replyAvatars: metadata.replyAvatars
            })
          };
        });
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        avatar: profile.avatar_url || `${USER_AVATAR_PLACEHOLDER}${user.id}`,
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
          author_avatar: profile.avatar_url || `${USER_AVATAR_PLACEHOLDER}${user.id}`,
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
        const { userId, userName, threadId } = payload.payload;
        if (userId !== user?.id) {
          const key = threadId ? `${userId}-${threadId}` : userId;
          
          // Clear existing timeout for this user/thread combo
          const existingTimeout = typingTimeoutsRef.current.get(key);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          // Add or update user in typing list
          setTypingUsers((prev) => {
            const existing = prev.find(u => u.userId === userId && u.threadId === threadId);
            if (existing) return prev;
            return [...prev, { userId, userName, threadId }];
          });

          // Set new timeout to remove after 3 seconds
          const timeout = setTimeout(() => {
            setTypingUsers((prev) => prev.filter(u => !(u.userId === userId && u.threadId === threadId)));
            typingTimeoutsRef.current.delete(key);
          }, 3000);
          
          typingTimeoutsRef.current.set(key, timeout);
        }
      })
      .on('broadcast', { event: 'stop-typing' }, (payload) => {
        const { userId, threadId } = payload.payload;
        const key = threadId ? `${userId}-${threadId}` : userId;
        
        // Clear timeout for this user/thread combo
        const existingTimeout = typingTimeoutsRef.current.get(key);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          typingTimeoutsRef.current.delete(key);
        }
        
        setTypingUsers((prev) => prev.filter(u => !(u.userId === userId && u.threadId === threadId)));
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
            
            // Handle thread messages separately
            if (newMsg.thread_id) {
              // This is a thread reply - update parent message metadata
              updateThreadMetadata(newMsg.thread_id as string);
              
              // If this thread is currently open, reload it
              if (activeThread && activeThread.parentMessage.id === newMsg.thread_id) {
                loadThread(newMsg.thread_id as string);
              }
              
              // Don't add thread replies to main message list
              return;
            }
            
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
            showMessageNotification(
              {
                conversationId,
                senderId: newMsg.author_id as string,
                senderName: formattedMessage.author,
                senderAvatar: formattedMessage.avatar,
                messageText: formattedMessage.text,
              },
              () => {
                // Notification clicked - navigate to this conversation if needed
                // (The ChatApp component handles conversation selection)
                console.log('[useChat] Notification clicked for conversation:', conversationId);
              }
            );
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
                
                /**
                 * CRITICAL: Image Preloading Strategy
                 * 
                 * WHY: We preload real images before replacing the optimistic message
                 * to prevent a visual "flash" where images disappear then reappear.
                 * 
                 * FLOW:
                 * 1. User sends message → optimistic message shows instantly with blob:// URLs
                 * 2. Files upload to Supabase Storage (in background)
                 * 3. Real-time subscription receives message with real URLs
                 * 4. We preload ALL real images into browser cache
                 * 5. Once ALL images are cached, we swap optimistic → real message
                 * 6. Clean up blob:// URLs to free memory
                 * 
                 * RESULT: Seamless transition, no flash, perfect UX
                 */
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
          
          // Also update in active thread if it's open
          setActiveThread((prev) => {
            if (!prev) return prev;
            
            // Check if this message is the parent or a reply
            if (prev.parentMessage.id === updatedMsg.id) {
              return {
                ...prev,
                parentMessage: { ...prev.parentMessage, reactions },
              };
            }
            
            const replyIndex = prev.replies.findIndex(r => r.id === updatedMsg.id);
            if (replyIndex !== -1) {
              const newReplies = [...prev.replies];
              newReplies[replyIndex] = { ...newReplies[replyIndex], reactions };
              return { ...prev, replies: newReplies };
            }
            
            return prev;
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

  // Broadcast typing event - uses channelRef to avoid creating new channels
  const broadcastTyping = useCallback((threadId?: string) => {
    if (!user || !profile || !profile.full_name || !channelRef.current) return;
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, userName: profile.full_name, threadId },
    });
  }, [user, profile]);

  // Broadcast stop typing event - uses channelRef to avoid creating new channels
  const broadcastStopTyping = useCallback((threadId?: string) => {
    if (!user || !channelRef.current) return;
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'stop-typing',
      payload: { userId: user.id, threadId },
    });
  }, [user]);

  // Toggle reaction on a message
  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;

    // Find the message in main messages or thread replies
    let message = messages.find(m => m.id === messageId);
    let isThreadMessage = false;
    
    if (!message && activeThread) {
      message = [activeThread.parentMessage, ...activeThread.replies].find(m => m.id === messageId);
      isThreadMessage = true;
    }
    
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
    if (isThreadMessage) {
      // Update thread message
      setActiveThread(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          parentMessage: prev.parentMessage.id === messageId 
            ? { ...prev.parentMessage, reactions: newReactions }
            : prev.parentMessage,
          replies: prev.replies.map(m =>
            m.id === messageId ? { ...m, reactions: newReactions } : m
          ),
        };
      });
    } else {
      // Update main message
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, reactions: newReactions } : m
      ));
    }

    // Update database
    try {
      const { error } = await supabase
        .from('messages')
        .update({ reactions: newReactions })
        .eq('id', messageId);

      if (error) {
        console.error('Error updating reactions:', error);
        // Revert optimistic update on error
        if (isThreadMessage) {
          setActiveThread(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              parentMessage: prev.parentMessage.id === messageId 
                ? { ...prev.parentMessage, reactions: currentReactions }
                : prev.parentMessage,
              replies: prev.replies.map(m =>
                m.id === messageId ? { ...m, reactions: currentReactions } : m
              ),
            };
          });
        } else {
          setMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, reactions: currentReactions } : m
          ));
        }
      }
    } catch (error) {
      console.error('Error updating reactions:', error);
    }
  }, [messages, user, activeThread]);

  // Load thread messages
  const loadThread = useCallback(async (parentMessageId: string) => {
    try {
      // Get parent message from local messages first
      let parentMsg = messages.find(m => m.id === parentMessageId);
      
      // If not found locally, fetch from database
      if (!parentMsg) {
        const { data: parentData, error: parentError } = await supabase
          .from('messages')
          .select('*')
          .eq('id', parentMessageId)
          .single();
        
        if (parentError) throw parentError;
        
        if (parentData) {
          let reactions: Array<{ emoji: string; userIds: string[] }> | undefined;
          if (parentData.reactions) {
            if (Array.isArray(parentData.reactions)) {
              reactions = parentData.reactions;
            } else {
              reactions = Object.entries(parentData.reactions as Record<string, string[]>).map(([emoji, userIds]) => ({
                emoji,
                userIds
              }));
            }
          }
          
          parentMsg = {
            id: parentData.id,
            author: parentData.author_name,
            avatar: parentData.author_avatar || "https://i.pravatar.cc/150?img=1",
            timestamp: parentData.created_at,
            text: parentData.text,
            imageUrl: parentData.image_url,
            imageUrls: parentData.image_urls || undefined,
            reactions,
            threadId: parentData.thread_id,
            replyCount: parentData.reply_count,
            lastReplyAt: parentData.last_reply_at,
            replyAvatars: parentData.reply_avatars,
          };
        }
      }
      
      if (!parentMsg) return;

      // Load thread replies
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', parentMessageId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const formattedReplies: Message[] = data.map((msg) => {
          let reactions: Array<{ emoji: string; userIds: string[] }> | undefined;
          if (msg.reactions) {
            if (Array.isArray(msg.reactions)) {
              reactions = msg.reactions;
            } else {
              reactions = Object.entries(msg.reactions as Record<string, string[]>).map(([emoji, userIds]) => ({
                emoji,
                userIds
              }));
            }
          }
          
          return {
            id: msg.id,
            author: msg.author_name,
            avatar: msg.author_avatar || DEFAULT_AVATAR_URL,
            timestamp: msg.created_at,
            text: msg.text,
            imageUrl: msg.image_url,
            imageUrls: msg.image_urls || undefined,
            reactions,
            threadId: msg.thread_id,
          };
        });

        setActiveThread({
          parentMessage: parentMsg,
          replies: formattedReplies,
        });
        setThreadReplies(formattedReplies);
      }
    } catch (error) {
      console.error('Error loading thread:', error);
    }
  }, [messages]);

  // Send a reply in a thread
  const sendThreadReply = useCallback(async (parentMessageId: string, text: string) => {
    if (!user || !profile || !profile.full_name) {
      console.error("User not authenticated or profile not loaded");
      return;
    }

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        author_id: user.id,
        author_name: profile.full_name,
        author_avatar: profile.avatar_url || `${USER_AVATAR_PLACEHOLDER}${user.id}`,
        text: text,
        thread_id: parentMessageId,
      });

      if (error) throw error;

      // Reload thread to get the new reply
      await loadThread(parentMessageId);
      
      // Update thread metadata for parent message
      await updateThreadMetadata(parentMessageId);
    } catch (error) {
      console.error("Error sending thread reply:", error);
    }
  }, [conversationId, user, profile, loadThread]);

  // Update thread metadata (reply count, last reply time, avatars)
  const updateThreadMetadata = useCallback(async (parentMessageId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('author_avatar, created_at')
        .eq('thread_id', parentMessageId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const replyCount = data.length;
        const lastReplyAt = data[0].created_at;
        const replyAvatars = [...new Set(data.map(m => m.author_avatar))].filter(Boolean);

        setMessages(prev => prev.map(m =>
          m.id === parentMessageId
            ? { ...m, replyCount, lastReplyAt, replyAvatars }
            : m
        ));
      }
    } catch (error) {
      console.error('Error updating thread metadata:', error);
    }
  }, []);

  // Close thread
  const closeThread = useCallback(() => {
    setActiveThread(null);
    setThreadReplies([]);
  }, []);

  return {
    messages,
    sendMessage,
    loading,
    typingUsers,
    broadcastTyping,
    broadcastStopTyping,
    toggleReaction,
    activeThread,
    loadThread,
    sendThreadReply,
    closeThread,
  };
}
