import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type ListItem = {
  id: string;
  list_id: string;
  content: string;
  notes?: string;
  completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

/**
 * Hook for managing list items in the Notepad app.
 * 
 * Features:
 * - Fetches all items for a specific list
 * - Real-time subscription for item changes
 * - CRUD operations (create, update, delete, toggle completion)
 * - Automatic position management
 * - Separate completed/uncompleted items
 */
export function useListItems(listId?: string) {
  const { user } = useAuth();
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Fetches all items for the specified list.
   */
  const fetchItems = useCallback(async () => {
    if (!user || !listId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('list_items')
        .select('*')
        .eq('list_id', listId)
        .order('position', { ascending: true });

      if (error) {
        // Only log error if it's not just an empty result
        if (error.code !== 'PGRST116') {
          console.error('Error fetching list items:', error);
        }
      } else if (data) {
        setItems(data);
      }
    } catch (error) {
      console.error('Error in fetchItems:', error);
    } finally {
      setLoading(false);
    }
  }, [user, listId]);

  /**
   * Reset items when listId changes to prevent showing stale data
   */
  useEffect(() => {
    setItems([]);
    setLoading(true);
  }, [listId]);

  /**
   * Initial fetch of items.
   */
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  /**
   * Subscribe to real-time changes for list items.
   */
  useEffect(() => {
    if (!user || !listId) return;

    const channel = supabase
      .channel(`list_items:${listId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'list_items',
          filter: `list_id=eq.${listId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems((prev) => {
              // Check if item already exists (from optimistic update)
              const exists = prev.some(item => item.id === payload.new.id);
              if (exists) {
                // Replace optimistic item with real data
                return prev.map(item => 
                  item.id === payload.new.id ? (payload.new as ListItem) : item
                );
              }
              // Add new item
              return [...prev, payload.new as ListItem];
            });
          } else if (payload.eventType === 'UPDATE') {
            setItems((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? (payload.new as ListItem) : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setItems((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, listId]);

  /**
   * Creates a new list item.
   * Automatically assigns the next position.
   * Uses optimistic update for instant UI feedback.
   */
  const createItem = useCallback(
    async (content: string, notes?: string): Promise<ListItem | null> => {
      if (!user || !listId) return null;

      try {
        // Get the max position
        const maxPosition = items.reduce((max, item) => Math.max(max, item.position), -1);
        const newPosition = maxPosition + 1;

        // Create optimistic item with unique ID (timestamp + random to avoid collisions)
        const optimisticItem: ListItem = {
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          list_id: listId,
          content,
          notes: notes || '',
          position: newPosition,
          completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Optimistically add to UI
        setItems((prev) => [...prev, optimisticItem]);

        const { data, error } = await supabase
          .from('list_items')
          .insert({
            list_id: listId,
            content,
            notes: notes || '',
            position: newPosition,
            completed: false,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating list item:', error);
          // Rollback optimistic update
          setItems((prev) => prev.filter((item) => item.id !== optimisticItem.id));
          return null;
        }

        // Replace optimistic item with real item
        setItems((prev) =>
          prev.map((item) => (item.id === optimisticItem.id ? data : item))
        );

        return data;
      } catch (error) {
        console.error('Error in createItem:', error);
        return null;
      }
    },
    [user, listId, items]
  );

  /**
   * Updates an existing list item.
   * Uses optimistic update for instant UI feedback.
   */
  const updateItem = useCallback(
    async (itemId: string, updates: Partial<ListItem>): Promise<boolean> => {
      if (!user || !listId) return false;

      try {
        // Store previous state for rollback
        const previousItems = [...items];

        // Optimistically update UI
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          )
        );

        const { error } = await supabase
          .from('list_items')
          .update(updates)
          .eq('id', itemId)
          .eq('list_id', listId);

        if (error) {
          console.error('Error updating list item:', error);
          // Rollback on error
          setItems(previousItems);
          return false;
        }

        return true;
      } catch (error) {
        console.error('Error in updateItem:', error);
        return false;
      }
    },
    [user, listId, items]
  );

  /**
   * Toggles the completed status of a list item.
   */
  const toggleItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return false;

      return updateItem(itemId, { completed: !item.completed });
    },
    [items, updateItem]
  );

  /**
   * Deletes a list item.
   */
  const deleteItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      if (!user || !listId) return false;

      try {
        const { error } = await supabase
          .from('list_items')
          .delete()
          .eq('id', itemId)
          .eq('list_id', listId);

        if (error) {
          console.error('Error deleting list item:', error);
          return false;
        }

        return true;
      } catch (error) {
        console.error('Error in deleteItem:', error);
        return false;
      }
    },
    [user, listId]
  );

  // Separate items into uncompleted and completed
  const uncompletedItems = items.filter((item) => !item.completed);
  const completedItems = items.filter((item) => item.completed);

  return {
    items,
    uncompletedItems,
    completedItems,
    loading,
    createItem,
    updateItem,
    toggleItem,
    deleteItem,
    refreshItems: fetchItems,
  };
}

