import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type List = {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  completed_count?: number;
  total_count?: number;
  isShared?: boolean; // New: indicates if list has collaborators
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
   * Fetches all lists for the current user with item counts.
   */
  const fetchLists = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('lists')
        .select(`
          *,
          list_items(id, completed)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching lists:', error);
      } else if (data) {
        // Transform data to include counts and shared status
        const listsWithCounts = data.map((list: any) => ({
          id: list.id,
          name: list.name,
          user_id: list.user_id,
          created_at: list.created_at,
          updated_at: list.updated_at,
          total_count: list.list_items?.length || 0,
          completed_count: list.list_items?.filter((item: any) => item.completed).length || 0,
          isShared: false, // Temporary: will be populated after migration
        }));
        setLists(listsWithCounts);
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
   * Subscribe to real-time changes for lists and list items.
   * Re-fetches all lists when changes occur to update counts.
   */
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`lists_and_items:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lists',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Re-fetch to get updated counts
          fetchLists();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'list_items',
        },
        () => {
          // Re-fetch lists to update counts when items change
          // Small delay to ensure database operation completes
          setTimeout(() => fetchLists(), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchLists]);

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

