"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

/**
 * User presence state
 */
export type UserPresence = {
  online: boolean;
  lastActiveAt: number; // Unix timestamp (ms)
};

/**
 * Presence map: userId -> presence state
 */
export type PresenceMap = Map<string, UserPresence>;

/**
 * Hook to manage real-time user presence (online/offline status)
 * 
 * ## How it works:
 * 1. Uses Supabase Realtime Presence (ephemeral, no DB writes)
 * 2. Sends heartbeat every 25 seconds to stay online
 * 3. Server marks user offline after ~60 seconds of no heartbeat
 * 4. Other clients see presence changes in real-time
 * 
 * ## Performance:
 * - No DB writes (uses Realtime Presence API)
 * - Efficient heartbeat (25 sec interval)
 * - Automatic disconnect detection
 * 
 * @example
 * const { presenceMap, getPresence } = usePresence();
 * const status = getPresence(userId);
 * // status.online => true/false
 * // status.lastActiveAt => timestamp
 */
export function usePresence() {
  const { user } = useAuth();
  const [presenceMap, setPresenceMap] = useState<PresenceMap>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Get presence for a specific user
   * Returns { online: false, lastActiveAt: 0 } if user not found
   */
  const getPresence = useCallback((userId: string): UserPresence => {
    return presenceMap.get(userId) || { online: false, lastActiveAt: 0 };
  }, [presenceMap]);

  /**
   * Mark current user as online
   * Called on mount and every heartbeat interval
   */
  const markOnline = useCallback(async () => {
    if (!channelRef.current || !user) return;

    try {
      const status = channelRef.current.presenceState();
      console.log('[Presence] Sending heartbeat, current state:', Object.keys(status).length, 'users');
      
      await channelRef.current.track({
        online: true,
        lastActiveAt: Date.now(),
        user_id: user.id,
      });
    } catch (err) {
      console.error('[Presence] Error marking online:', err);
    }
  }, [user]);

  /**
   * Mark current user as offline
   * Called on unmount and tab close
   */
  const markOffline = useCallback(async () => {
    if (!channelRef.current || !user) return;

    try {
      console.log('[Presence] Marking offline');
      await channelRef.current.untrack();
    } catch (err) {
      console.error('[Presence] Error marking offline:', err);
    }
  }, [user]);

  /**
   * Initialize presence tracking
   */
  useEffect(() => {
    if (!user) {
      // Clear state if no user
      setPresenceMap(new Map());
      return;
    }

    console.log('[Presence] Initializing for user:', user.id);

    // Create presence channel
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id, // Unique key per user
        },
      },
    });

    channelRef.current = channel;

    // Listen for presence changes
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('[Presence] Sync event, online users:', Object.keys(state).length);
        
        // Convert Supabase presence state to our Map format
        const newMap = new Map<string, UserPresence>();
        
        Object.keys(state).forEach((userId) => {
          const presences = state[userId];
          if (presences && presences.length > 0) {
            // Take the most recent presence entry
            const latest = presences[0] as { online: boolean; lastActiveAt: number; user_id: string };
            newMap.set(userId, {
              online: latest.online,
              lastActiveAt: latest.lastActiveAt,
            });
          }
        });

        setPresenceMap(newMap);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[Presence] User joined:', key);
        // Sync event will handle the state update
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[Presence] User left:', key);
        // Sync event will handle the state update
      })
      .subscribe(async (status) => {
        console.log('[Presence] Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          // Mark self as online immediately
          await markOnline();
          
          // Start heartbeat (every 25 seconds)
          heartbeatIntervalRef.current = setInterval(() => {
            markOnline();
          }, 25000);
        }
      });

    // Mark offline on tab close (best-effort)
    const handleBeforeUnload = () => {
      console.log('[Presence] Tab closing, marking offline');
      markOffline();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      console.log('[Presence] Cleaning up');
      
      // Stop heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // Mark offline and unsubscribe
      markOffline();
      supabase.removeChannel(channel);
      channelRef.current = null;
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, markOnline, markOffline]);

  return {
    presenceMap,
    getPresence,
  };
}
