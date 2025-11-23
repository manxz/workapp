import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type Collaborator = {
  id: string;
  list_id: string;
  user_id: string;
  permission: 'view' | 'edit';
  added_by: string;
  created_at: string;
};

export function useListCollaborators(listId?: string) {
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch collaborators for a specific list
  const fetchCollaborators = useCallback(async (id: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('list_collaborators')
        .select('*')
        .eq('list_id', id);

      if (error) {
        console.error('[useListCollaborators] Error fetching collaborators:', error);
        setCollaborators([]);
        return;
      }

      setCollaborators(data || []);
    } catch (error) {
      console.error('[useListCollaborators] Unexpected error:', error);
      setCollaborators([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Add a collaborator
  const addCollaborator = useCallback(async (userId: string, permission: 'view' | 'edit' = 'view') => {
    if (!user || !listId) return { success: false, error: 'User or list not defined' };

    try {
      const { error } = await supabase
        .from('list_collaborators')
        .insert({
          list_id: listId,
          user_id: userId,
          permission,
          added_by: user.id,
        });

      if (error) {
        console.error('[useListCollaborators] Error adding collaborator:', error);
        return { success: false, error: error.message };
      }

      // Refresh collaborators
      await fetchCollaborators(listId);
      return { success: true };
    } catch (error: any) {
      console.error('[useListCollaborators] Unexpected error adding collaborator:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }, [user, listId, fetchCollaborators]);

  // Remove a collaborator
  const removeCollaborator = useCallback(async (collaboratorId: string) => {
    if (!user || !listId) return { success: false, error: 'User or list not defined' };

    try {
      const { error } = await supabase
        .from('list_collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) {
        console.error('[useListCollaborators] Error removing collaborator:', error);
        return { success: false, error: error.message };
      }

      // Refresh collaborators
      await fetchCollaborators(listId);
      return { success: true };
    } catch (error: any) {
      console.error('[useListCollaborators] Unexpected error removing collaborator:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }, [user, listId, fetchCollaborators]);

  // Update collaborator permission
  const updatePermission = useCallback(async (collaboratorId: string, permission: 'view' | 'edit') => {
    if (!user || !listId) return { success: false, error: 'User or list not defined' };

    try {
      const { error } = await supabase
        .from('list_collaborators')
        .update({ permission })
        .eq('id', collaboratorId);

      if (error) {
        console.error('[useListCollaborators] Error updating permission:', error);
        return { success: false, error: error.message };
      }

      // Refresh collaborators
      await fetchCollaborators(listId);
      return { success: true };
    } catch (error: any) {
      console.error('[useListCollaborators] Unexpected error updating permission:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }, [user, listId, fetchCollaborators]);

  // Fetch collaborators when listId changes
  useEffect(() => {
    if (listId) {
      fetchCollaborators(listId);
    } else {
      setCollaborators([]);
    }
  }, [listId, fetchCollaborators]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!listId || !user) return;

    const channel = supabase
      .channel(`list-collaborators-${listId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'list_collaborators',
          filter: `list_id=eq.${listId}`,
        },
        () => {
          // Refetch collaborators on any change
          fetchCollaborators(listId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listId, user, fetchCollaborators]);

  return {
    collaborators,
    loading,
    addCollaborator,
    removeCollaborator,
    updatePermission,
    refetch: () => listId ? fetchCollaborators(listId) : Promise.resolve(),
  };
}

