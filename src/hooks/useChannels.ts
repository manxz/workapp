"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export type Channel = {
  id: string;
  name: string;
  description: string | null;
  hasUnread: boolean;
};

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

