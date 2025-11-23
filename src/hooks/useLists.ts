import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type List = {
  id: string;
  name: string;
  user_id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  completed_count?: number;
  total_count?: number;
  is_shared?: boolean;
  collaborator_count?: number;
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
      // First, fetch lists only (without nested relation)
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching lists:', error);
        return; // Exit early on error
      }
      
      if (data) {
        // Fetch list items separately for each list
        const listIds = data.map((list: any) => list.id);
        const { data: itemsData } = await supabase
          .from('list_items')
          .select('id, list_id, completed')
          .in('list_id', listIds);

        // Group items by list_id
        const itemsByList = (itemsData || []).reduce((acc: Record<string, any[]>, item: any) => {
          if (!acc[item.list_id]) acc[item.list_id] = [];
          acc[item.list_id].push(item);
          return acc;
        }, {});

        // Fetch collaborator counts separately
        const { data: collabData } = await supabase
          .from('list_collaborators')
          .select('list_id')
          .in('list_id', listIds);

        // Group collaborators by list_id
        const collabCounts = (collabData || []).reduce((acc: Record<string, number>, collab: any) => {
          acc[collab.list_id] = (acc[collab.list_id] || 0) + 1;
          return acc;
        }, {});

        // Transform data to include counts and shared status
        const listsWithCounts = data.map((list: any) => {
          const items = itemsByList[list.id] || [];
          const collaboratorCount = collabCounts[list.id] || 0;
          return {
            id: list.id,
            name: list.name,
            user_id: list.user_id,
            owner_id: list.owner_id,
            created_at: list.created_at,
            updated_at: list.updated_at,
            total_count: items.length,
            completed_count: items.filter((item: any) => item.completed).length,
            is_shared: collaboratorCount > 0,
            collaborator_count: collaboratorCount,
          };
        });
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
        },
        () => {
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
          // Small delay to ensure database operation completes
          setTimeout(() => fetchLists(), 100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'list_collaborators',
        },
        () => {
          // Re-fetch lists to update shared status when collaborators change
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
          owner_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Optimistically add to UI (prepend to maintain desc order)
        setLists((prev) => [optimisticList, ...prev]);

        const { data, error } = await supabase
          .from('lists')
          .insert({
            name,
            user_id: user.id,
            owner_id: user.id,
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

