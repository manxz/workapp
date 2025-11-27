/**
 * Global Message Listener Hook
 * 
 * Listens for ALL new messages across ALL conversations.
 * Stays active regardless of which app is currently mounted.
 * Handles notifications, unread dots, tab title, and sound.
 * 
 * IMPORTANT: For DMs, only notifies if the current user is a participant.
 * DM conversation IDs have format: "{userId1}-{userId2}" (sorted alphabetically)
 * Channel conversation IDs have format: "channel-{channelId}"
 */

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { showMessageNotification } from '@/lib/notifications';

/**
 * Check if the current user is a participant in a conversation
 * 
 * @param conversationId - The conversation ID to check
 * @param userId - The current user's ID
 * @returns true if user is a participant, false otherwise
 */
function isUserInConversation(conversationId: string, userId: string): boolean {
  // Channel conversations - everyone can receive notifications
  // Format: "channel-{channelId}"
  if (conversationId.startsWith('channel-')) {
    return true;
  }
  
  // DM conversations - only participants should receive notifications
  // Format: "{userId1}-{userId2}" (sorted alphabetically)
  // Check if the current user's ID is one of the two participants
  const parts = conversationId.split('-');
  
  // Valid DM conversation should have exactly 2 parts (two user IDs)
  // But UUIDs contain hyphens, so we need to check if user ID is in the string
  return conversationId.includes(userId);
}

export function useGlobalMessageListener(
  currentConversationId: string | null,
  markUnreadDot: (conversationId: string) => void
) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global-message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMsg = payload.new as any;

          // Filter out thread replies
          if (newMsg.thread_id !== null) {
            return;
          }

          // Skip if message is from current user
          if (newMsg.author_id === user.id) {
            return;
          }

          const msgConversationId = newMsg.conversation_id as string;
          
          // CRITICAL: Check if current user is a participant in this conversation
          // This prevents users from receiving notifications for DMs they're not part of
          if (!isUserInConversation(msgConversationId, user.id)) {
            return;
          }
          
          const mentionedUserIds = newMsg.mentions || [];

          // Check if current user is mentioned
          const isUserMentioned = mentionedUserIds.includes(user.id);

          // If message is for a different conversation OR user is mentioned, mark as unread and notify
          if (msgConversationId !== currentConversationId || isUserMentioned) {
            markUnreadDot(msgConversationId);

            // Fetch sender profile
            const { data: profiles, error } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', newMsg.author_id)
              .single();

            if (error) {
              console.error('[GlobalMessageListener] Error fetching profile:', error);
              return;
            }

            const senderName = profiles?.full_name || 'Someone';
            const senderAvatar = profiles?.avatar_url || '';

            // Show notification (handles tab title and sound automatically)
            showMessageNotification({
              conversationId: msgConversationId,
              senderId: newMsg.author_id,
              senderName,
              senderAvatar,
              messageText: newMsg.text || '',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentConversationId, markUnreadDot]);
}

