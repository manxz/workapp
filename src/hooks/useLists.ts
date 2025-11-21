import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type List = {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

/**
 * Hook for managing user's lists in the Notepad app.
 * 
 * Features:
 * - Fetches all lists for the current user
 * - Real-time subscription for list changes
 * - CRUD operations (create, update, delete)
 * - Loading states
 */
export function useLists() {
  const { user } = useAuth();
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Fetches all lists for the current user.
   */
  const fetchLists = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching lists:', error);
      } else if (data) {
        setLists(data);
      }
    } catch (error) {
      console.error('Error in fetchLists:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Initial fetch of lists.
   */
  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  /**
   * Subscribe to real-time changes for lists.
   */
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`lists:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lists',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLists((prev) => [...prev, payload.new as List]);
          } else if (payload.eventType === 'UPDATE') {
            setLists((prev) =>
              prev.map((list) =>
                list.id === payload.new.id ? (payload.new as List) : list
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setLists((prev) => prev.filter((list) => list.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  /**
   * Creates a new list.
   * Uses optimistic update for instant UI feedback.
   */
  const createList = useCallback(
    async (name: string): Promise<List | null> => {
      if (!user) return null;

      try {
        // Create optimistic list
        const optimisticList: List = {
          id: `temp-${Date.now()}`,
          name,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Optimistically add to UI
        setLists((prev) => [...prev, optimisticList]);

        const { data, error } = await supabase
          .from('lists')
          .insert({
            name,
            user_id: user.id,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating list:', error);
          // Rollback optimistic update
          setLists((prev) => prev.filter((list) => list.id !== optimisticList.id));
          return null;
        }

        // Replace optimistic list with real list
        setLists((prev) =>
          prev.map((list) => (list.id === optimisticList.id ? data : list))
        );

        return data;
      } catch (error) {
        console.error('Error in createList:', error);
        return null;
      }
    },
    [user]
  );

  /**
   * Updates an existing list.
   */
  const updateList = useCallback(
    async (listId: string, updates: Partial<List>): Promise<boolean> => {
      if (!user) return false;

      try {
        const { error } = await supabase
          .from('lists')
          .update(updates)
          .eq('id', listId)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating list:', error);
          return false;
        }

        return true;
      } catch (error) {
        console.error('Error in updateList:', error);
        return false;
      }
    },
    [user]
  );

  /**
   * Deletes a list and all its items (cascades).
   * Uses optimistic update for instant UI feedback.
   */
  const deleteList = useCallback(
    async (listId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        // Store previous state for rollback
        const previousLists = [...lists];

        // Optimistically remove list from UI
        setLists((prev) => prev.filter((list) => list.id !== listId));

        const { error } = await supabase
          .from('lists')
          .delete()
          .eq('id', listId)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error deleting list:', error);
          // Rollback on error
          setLists(previousLists);
          return false;
        }

        return true;
      } catch (error) {
        console.error('Error in deleteList:', error);
        return false;
      }
    },
    [user, lists]
  );

  return {
    lists,
    loading,
    createList,
    updateList,
    deleteList,
    refreshLists: fetchLists,
  };
}

