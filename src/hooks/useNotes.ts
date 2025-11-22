import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Note {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  title: string;
  content: string;
  preview: string | null;
  is_public: boolean;
}

export function useNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching notes:', error);
        setNotes([]);
      } else if (data) {
        setNotes(data);
      }
    } catch (err: any) {
      console.error('Error in fetchNotes:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotes]);

  const createNote = useCallback(
    async (title: string = '', content: string = ''): Promise<Note | null> => {
      if (!user) return null;

      try {
        // Generate preview (first 100 chars of plain text)
        const preview = content.replace(/<[^>]*>/g, '').substring(0, 100);

        // Optimistically add new note
        const tempId = `temp-${Date.now()}`;
        const optimisticNote: Note = {
          id: tempId,
          title,
          content,
          preview,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_public: false,
        };
        setNotes((prev) => [optimisticNote, ...prev]);

        const { data, error } = await supabase
          .from('notes')
          .insert({ title, content, preview, user_id: user.id })
          .select()
          .single();

        if (error) {
          console.error('Error creating note:', error);
          setNotes((prev) => prev.filter((note) => note.id !== tempId)); // Rollback
          return null;
        }

        setNotes((prev) => prev.map((note) => (note.id === tempId ? data : note)));
        return data;
      } catch (error: any) {
        console.error('Error in createNote:', error.message);
        return null;
      }
    },
    [user]
  );

  const updateNote = useCallback(
    async (noteId: string, updates: Partial<Pick<Note, 'title' | 'content'>>): Promise<boolean> => {
      if (!user) return false;

      try {
        // Generate preview if content is being updated
        const preview = updates.content
          ? updates.content.replace(/<[^>]*>/g, '').substring(0, 100)
          : undefined;

        // Optimistic update
        const previousNotes = [...notes];
        setNotes((prev) =>
          prev.map((note) =>
            note.id === noteId
              ? { ...note, ...updates, preview: preview || note.preview, updated_at: new Date().toISOString() }
              : note
          )
        );

        const { error } = await supabase
          .from('notes')
          .update({ ...updates, preview })
          .eq('id', noteId)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating note:', error);
          setNotes(previousNotes); // Rollback
          return false;
        }

        return true;
      } catch (error: any) {
        console.error('Error in updateNote:', error.message);
        return false;
      }
    },
    [user, notes]
  );

  const deleteNote = useCallback(
    async (noteId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        const previousNotes = [...notes];
        setNotes((prev) => prev.filter((note) => note.id !== noteId)); // Optimistic update

        const { error } = await supabase
          .from('notes')
          .delete()
          .eq('id', noteId)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error deleting note:', error);
          setNotes(previousNotes); // Rollback on error
          return false;
        }
        return true;
      } catch (error: any) {
        console.error('Error in deleteNote:', error.message);
        return false;
      }
    },
    [user, notes]
  );

  return {
    notes,
    loading,
    createNote,
    updateNote,
    deleteNote,
    refreshNotes: fetchNotes,
  };
}

