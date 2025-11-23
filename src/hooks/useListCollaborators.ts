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
  // Joined user data
  user_name?: string;
  user_avatar?: string;
  user_email?: string;
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
        .select(`
          *,
          profiles!list_collaborators_user_id_fkey (
            full_name,
            avatar_url,
            email
          )
        `)
        .eq('list_id', id);

      if (error) {
        console.error('[useListCollaborators] Error fetching collaborators:', error);
        return;
      }

      const formattedCollaborators: Collaborator[] = (data || []).map((collab: any) => ({
        id: collab.id,
        list_id: collab.list_id,
        user_id: collab.user_id,
        permission: collab.permission,
        added_by: collab.added_by,
        created_at: collab.created_at,
        user_name: collab.profiles?.full_name || undefined,
        user_avatar: collab.profiles?.avatar_url || undefined,
        user_email: collab.profiles?.email || undefined,
      }));

      setCollaborators(formattedCollaborators);
    } catch (error) {
      console.error('[useListCollaborators] Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Add a collaborator
  const addCollaborator = useCallback(async (userId: string, permission: 'view' | 'edit' = 'view') => {
    if (!user || !listId) return false;

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
        return false;
      }

      // Refresh collaborators
      await fetchCollaborators(listId);
      return true;
    } catch (error) {
      console.error('[useListCollaborators] Unexpected error adding collaborator:', error);
      return false;
    }
  }, [user, listId, fetchCollaborators]);

  // Remove a collaborator
  const removeCollaborator = useCallback(async (collaboratorId: string) => {
    if (!user || !listId) return false;

    try {
      const { error } = await supabase
        .from('list_collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) {
        console.error('[useListCollaborators] Error removing collaborator:', error);
        return false;
      }

      // Refresh collaborators
      await fetchCollaborators(listId);
      return true;
    } catch (error) {
      console.error('[useListCollaborators] Unexpected error removing collaborator:', error);
      return false;
    }
  }, [user, listId, fetchCollaborators]);

  // Update collaborator permission
  const updatePermission = useCallback(async (collaboratorId: string, permission: 'view' | 'edit') => {
    if (!user || !listId) return false;

    try {
      const { error } = await supabase
        .from('list_collaborators')
        .update({ permission })
        .eq('id', collaboratorId);

      if (error) {
        console.error('[useListCollaborators] Error updating permission:', error);
        return false;
      }

      // Refresh collaborators
      await fetchCollaborators(listId);
      return true;
    } catch (error) {
      console.error('[useListCollaborators] Unexpected error updating permission:', error);
      return false;
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

