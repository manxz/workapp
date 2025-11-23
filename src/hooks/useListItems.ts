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
  const optimisticItemsRef = useRef<Set<string>>(new Set());

  const sortItemsByPosition = useCallback(
    (unsorted: ListItem[]) => {
      return [...unsorted].sort((a, b) => a.position - b.position);
    },
    []
  );

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
        setItems(sortItemsByPosition(data));
      }
    } catch (error) {
      console.error('Error in fetchItems:', error);
    } finally {
      setLoading(false);
    }
  }, [user, listId, sortItemsByPosition]);

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
              const newItem = payload.new as ListItem;
              
              // Check if this is our own optimistic update coming back
              // We track optimistic items by position and content
              const optimisticIndex = prev.findIndex(item => 
                item.id.startsWith('temp-') && 
                item.content === newItem.content &&
                item.position === newItem.position
              );
              
              if (optimisticIndex !== -1) {
                // Replace the optimistic item with the real one
                const updated = [...prev];
                updated[optimisticIndex] = newItem;
                optimisticItemsRef.current.delete(prev[optimisticIndex].id);
                return sortItemsByPosition(updated);
              }
              
              // Check if item already exists by real ID (shouldn't happen but be safe)
              const exists = prev.some(item => item.id === newItem.id);
              if (exists) {
                return prev;
              }
              
              // Add new item (from another user or tab)
              return sortItemsByPosition([...prev, newItem]);
            });
          } else if (payload.eventType === 'UPDATE') {
            setItems((prev) =>
              sortItemsByPosition(
                prev.map((item) =>
                item.id === payload.new.id ? (payload.new as ListItem) : item
                )
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
  }, [user, listId, sortItemsByPosition]);

  /**
   * Creates a new list item.
   * Automatically assigns the next position.
   * Uses optimistic update for instant UI feedback.
   */
  const createItem = useCallback(
    async (content: string, notes?: string): Promise<ListItem | null> => {
      if (!user || !listId) return null;

      try {
        // Get the minimum position so we can insert the new item at the top
        const minPosition = items.reduce(
          (min, item) => Math.min(min, item.position),
          Number.POSITIVE_INFINITY
        );
        const newPosition = minPosition === Number.POSITIVE_INFINITY ? 0 : minPosition - 1;

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

        // Optimistically add to UI (ensure sorted so it appears at the top)
        optimisticItemsRef.current.add(optimisticItem.id);
        setItems((prev) => sortItemsByPosition([...prev, optimisticItem]));

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
          optimisticItemsRef.current.delete(optimisticItem.id);
          setItems((prev) => prev.filter((item) => item.id !== optimisticItem.id));
          return null;
        }

        // Don't replace here - let the real-time subscription handle it
        // This prevents the duplication issue

        return data;
      } catch (error) {
        console.error('Error in createItem:', error);
        return null;
      }
    },
    [user, listId, items, sortItemsByPosition]
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

