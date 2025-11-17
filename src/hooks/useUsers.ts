"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export type User = {
  id: string;
  name: string;
  avatar: string;
  hasUnread: boolean;
};

export function useUsers() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only load users when auth is done loading and user is authenticated
    if (!authLoading && currentUser) {
      loadUsers();
    } else if (!authLoading && !currentUser) {
      setLoading(false);
    }
  }, [currentUser, authLoading]);

  const loadUsers = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .neq("id", currentUser.id); // Exclude current user

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      if (data) {
        const formattedUsers: User[] = data.map((profile) => ({
          id: profile.id,
          name: profile.full_name || `User ${profile.id.substring(0, 8)}`,
          avatar: profile.avatar_url || `https://i.pravatar.cc/150?u=${profile.id}`,
          hasUnread: false, // TODO: Implement unread logic later
        }));
        setUsers(formattedUsers);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    users,
    loading,
  };
}

