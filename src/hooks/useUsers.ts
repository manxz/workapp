"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

/**
 * User profile information for DM list
 */
export type User = {
  id: string;
  name: string;
  avatar: string;
  hasUnread: boolean;
};

/**
 * Loads user directory for direct messaging
 * 
 * @description
 * Fetches all users from profiles table except the current user.
 * Used to populate the DM sidebar. Generates fallback names and avatars
 * for users without complete profiles.
 * 
 * ## Key Features
 * - **Excludes self**: Filters out current user from results
 * - **Fallback handling**: Generates default name/avatar if missing
 * - **No real-time**: Static load (users don't change frequently)
 * 
 * ## Performance Note
 * This hook does NOT subscribe to real-time updates. New users won't appear
 * until page refresh. Consider adding real-time subscription if user
 * creation is frequent.
 * 
 * @example
 * const { users, loading } = useUsers();
 * 
 * users.forEach(user => {
 *   // Render user in DM list
 *   <UserListItem user={user} />
 * });
 * 
 * @returns User list and loading state
 */
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

