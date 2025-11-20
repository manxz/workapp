"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Channel information for sidebar display
 */
export type Channel = {
  id: string;
  name: string;
  description: string | null;
  hasUnread: boolean;
};

/**
 * Loads public channels for chat sidebar
 * 
 * @description
 * Fetches all public channels from database, sorted alphabetically by name.
 * Used to populate the channel list in chat sidebar.
 * 
 * ## Key Features
 * - **Public only**: Filters to `is_public = true` channels
 * - **Alphabetical sort**: Ordered by name ascending
 * - **No real-time**: Static load (channels don't change frequently)
 * 
 * ## Future Enhancement
 * Consider adding real-time subscription if channel creation/deletion
 * becomes frequent. Currently requires page refresh to see new channels.
 * 
 * @example
 * const { channels, loading } = useChannels();
 * 
 * channels.forEach(channel => {
 *   // Render channel in sidebar
 *   <ChannelListItem channel={channel} />
 * });
 * 
 * @returns Channel list and loading state
 */
export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const { data, error } = await supabase
        .from("channels")
        .select("id, name, description")
        .eq("is_public", true)
        .order("name", { ascending: true });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      if (data) {
        const formattedChannels: Channel[] = data.map((channel) => ({
          id: channel.id,
          name: channel.name,
          description: channel.description,
          hasUnread: false, // TODO: Implement unread logic later
        }));
        setChannels(formattedChannels);
      } else {
        setChannels([]);
      }
    } catch (error) {
      console.error("Error loading channels:", error);
      setChannels([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    channels,
    loading,
  };
}

