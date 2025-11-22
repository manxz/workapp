/**
 * Global Message Listener Hook
 * 
 * Listens for ALL new messages across ALL conversations.
 * Stays active regardless of which app is currently mounted.
 * Handles notifications, unread dots, tab title, and sound.
 */

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { showMessageNotification } from '@/lib/notifications';

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

          // If message is for a different conversation, mark as unread and notify
          if (msgConversationId !== currentConversationId) {
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

