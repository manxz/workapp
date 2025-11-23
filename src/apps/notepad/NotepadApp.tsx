"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import ListsView from "@/components/ListsView";
import NewListModal from "@/components/NewListModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import ShareListModal from "@/components/ShareListModal";
import { type List as ListType } from "@/hooks/useLists";
import { useListItems } from "@/hooks/useListItems";
import { useNotes, Note } from "@/hooks/useNotes";
import { useListCollaborators } from "@/hooks/useListCollaborators";

const NotepadSidebar = dynamic(() => import("@/components/NotepadSidebar"), { ssr: false });
const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

type List = {
  id: string;
  name: string;
  completed: number;
  total: number;
  is_shared?: boolean;
  collaborator_count?: number;
  owner_id?: string;
};

interface NotepadAppProps {
  lists: ListType[];
  createList: (name: string) => Promise<ListType | null>;
  deleteList: (listId: string) => Promise<boolean>;
  refreshLists: () => Promise<void>;
}

export default function NotepadApp({ lists: rawLists, createList, deleteList, refreshLists }: NotepadAppProps) {
  // Initialize state from localStorage
  const [selectedListId, setSelectedListId] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('notepad_selected_list_id') || undefined;
    }
    return undefined;
  });
  const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('notepad_selected_note_id') || undefined;
    }
    return undefined;
  });
  const [selectedType, setSelectedType] = useState<"list" | "note">(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('notepad_selected_type') as "list" | "note") || "list";
    }
    return "list";
  });
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteNoteModal, setShowDeleteNoteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Notes hook
  const { notes, loading: notesLoading, createNote, updateNote, deleteNote } = useNotes();

  // Collaborators hook for selected list
  const {
    collaborators,
    addCollaborator,
    removeCollaborator,
    updatePermission
  } = useListCollaborators(selectedListId);

  // Fetch items for the selected list
  const {
    items,
    uncompletedItems,
    completedItems,
    loading: itemsLoading,
    createItem,
    updateItem,
    toggleItem,
  } = useListItems(selectedListId);

  // Transform raw lists to include completion counts
  // For the selected list, use local items state for instant updates
  // Sort by created_at descending (latest first)
  const lists: List[] = useMemo(() => {
    return rawLists
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((list) => {
      // Use local items state for selected list for instant UI updates
      // But only if items have loaded (not empty during transition)
      if (list.id === selectedListId && !itemsLoading) {
        return {
          id: list.id,
          name: list.name,
          completed: completedItems.length,
          total: items.length,
          is_shared: list.is_shared || false,
          collaborator_count: list.collaborator_count || 0,
          owner_id: list.owner_id,
        };
      }
      // Use database counts for other lists or while loading
      return {
        id: list.id,
        name: list.name,
        completed: list.completed_count || 0,
        total: list.total_count || 0,
        is_shared: list.is_shared || false,
        collaborator_count: list.collaborator_count || 0,
        owner_id: list.owner_id,
      };
    });
  }, [rawLists, selectedListId, items, completedItems, itemsLoading]);

  // Persist selected list ID to localStorage
  useEffect(() => {
    if (selectedListId) {
      localStorage.setItem('notepad_selected_list_id', selectedListId);
    } else {
      localStorage.removeItem('notepad_selected_list_id');
    }
  }, [selectedListId]);

  // Persist selected note ID to localStorage
  useEffect(() => {
    if (selectedNoteId) {
      localStorage.setItem('notepad_selected_note_id', selectedNoteId);
    } else {
      localStorage.removeItem('notepad_selected_note_id');
    }
  }, [selectedNoteId]);

  // Persist selected type to localStorage
  useEffect(() => {
    localStorage.setItem('notepad_selected_type', selectedType);
  }, [selectedType]);

  // Auto-select first list or note on load (only if no saved selection or saved item doesn't exist)
  useEffect(() => {
    // Check if the saved selection is still valid
    const savedListExists = selectedListId && lists.some(list => list.id === selectedListId);
    const savedNoteExists = selectedNoteId && notes.some(note => note.id === selectedNoteId);
    
    // If we have a saved selection and it exists, keep it
    if ((selectedType === 'list' && savedListExists) || (selectedType === 'note' && savedNoteExists)) {
      return;
    }
    
    // Otherwise, auto-select first available item
    if (!selectedListId && !selectedNoteId) {
      if (lists.length > 0) {
        setSelectedListId(lists[0].id);
        setSelectedType("list");
      } else if (notes.length > 0) {
        setSelectedNoteId(notes[0].id);
        setSelectedType("note");
      }
    }
  }, [lists, notes, selectedListId, selectedNoteId, selectedType]);

  // Find selected list and note
  const selectedList = lists.find((list) => list.id === selectedListId);
  const selectedNote = notes.find((note) => note.id === selectedNoteId);

  // Handle list creation
  const handleCreateList = async (name: string) => {
    const newList = await createList(name);
    if (newList) {
      setSelectedListId(newList.id);
    }
  };

  // Handle list deletion
  const handleDeleteList = async () => {
    if (selectedListId) {
      const success = await deleteList(selectedListId);
      if (success) {
        // Select another list if available
        const remainingLists = lists.filter((list) => list.id !== selectedListId);
        if (remainingLists.length > 0) {
          setSelectedListId(remainingLists[0].id);
        } else {
          setSelectedListId(undefined);
        }
      }
    }
  };

  // Handle item creation
  const handleCreateItem = async (content: string, notes?: string) => {
    await createItem(content, notes);
    // Refresh in background to update database counts for other lists
    refreshLists();
  };

  // Handle item toggle
  const handleToggleItem = async (itemId: string) => {
    await toggleItem(itemId);
    // Refresh in background to update database counts for other lists
    refreshLists();
  };

  // Handle item update
  const handleUpdateItem = async (itemId: string, updates: Partial<{content: string; notes?: string; completed: boolean}>) => {
    await updateItem(itemId, updates);
  };

  // Handle note creation
  const handleCreateNote = async () => {
    const newNote = await createNote();
    if (newNote) {
      setSelectedNoteId(newNote.id);
      setSelectedType("note");
    }
  };

  // Handle note selection
  const handleSelectNote = (note: Note) => {
    setSelectedNoteId(note.id);
    setSelectedListId(undefined); // Clear list selection
    setSelectedType("note");
  };

  // Handle list selection
  const handleSelectList = (list: List) => {
    setSelectedListId(list.id);
    setSelectedNoteId(undefined); // Clear note selection
    setSelectedType("list");
  };

  // Debounce timers
  const contentDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const titleDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Handle note content change (auto-save with debounce)
  const handleNoteContentChange = useCallback((content: string) => {
    if (selectedNoteId) {
      // Clear existing timer
      if (contentDebounceTimer.current) {
        clearTimeout(contentDebounceTimer.current);
      }
      // Set new timer (1 second debounce)
      contentDebounceTimer.current = setTimeout(() => {
        updateNote(selectedNoteId, { content });
      }, 1000);
    }
  }, [selectedNoteId, updateNote]);

  // Handle note title change (auto-save with debounce)
  const handleNoteTitleChange = useCallback((title: string) => {
    if (selectedNoteId) {
      // Clear existing timer
      if (titleDebounceTimer.current) {
        clearTimeout(titleDebounceTimer.current);
      }
      // Set new timer (500ms debounce for title)
      titleDebounceTimer.current = setTimeout(() => {
        updateNote(selectedNoteId, { title });
      }, 500);
    }
  }, [selectedNoteId, updateNote]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (contentDebounceTimer.current) {
        clearTimeout(contentDebounceTimer.current);
      }
      if (titleDebounceTimer.current) {
        clearTimeout(titleDebounceTimer.current);
      }
    };
  }, []);

  // Handle note deletion
  const handleDeleteNote = async () => {
    if (selectedNoteId) {
      const success = await deleteNote(selectedNoteId);
      if (success) {
        // Select another note or list if available
        const remainingNotes = notes.filter((note) => note.id !== selectedNoteId);
        if (remainingNotes.length > 0) {
          setSelectedNoteId(remainingNotes[0].id);
          setSelectedType("note");
        } else if (lists.length > 0) {
          setSelectedListId(lists[0].id);
          setSelectedType("list");
        } else {
          setSelectedNoteId(undefined);
        }
      }
      setShowDeleteNoteModal(false);
    }
  };

  // Show empty state if no lists and no notes
  if (lists.length === 0 && notes.length === 0) {
    return (
      <>
        <NotepadSidebar
          lists={[]}
          notes={[]}
          notesLoading={notesLoading}
          selectedId={undefined}
          selectedType="list"
          onSelectList={() => {}}
          onSelectNote={() => {}}
          onCreateList={() => setShowNewListModal(true)}
          onCreateNote={handleCreateNote}
        />
        <div className="flex-1 flex items-center justify-center ml-[304px]">
          <p className="text-sm font-medium text-neutral-500">No lists or notes yet</p>
        </div>
        <NewListModal
          isOpen={showNewListModal}
          onClose={() => setShowNewListModal(false)}
          onCreate={handleCreateList}
        />
      </>
    );
  }

  return (
    <>
      <NotepadSidebar
        lists={lists}
        notes={notes}
        notesLoading={notesLoading}
        selectedId={selectedType === "list" ? selectedListId : selectedNoteId}
        selectedType={selectedType}
        onSelectList={handleSelectList}
        onSelectNote={handleSelectNote}
        onCreateList={() => setShowNewListModal(true)}
        onCreateNote={handleCreateNote}
      />

      <div className="ml-[304px] flex-1">
        {/* Lists View */}
        {selectedType === "list" && selectedList && (
          <ListsView
            listId={selectedList.id}
            listName={selectedList.name}
            items={items}
            uncompletedCount={itemsLoading ? (selectedList.total - selectedList.completed) : uncompletedItems.length}
            completedCount={itemsLoading ? selectedList.completed : completedItems.length}
            isShared={selectedList.is_shared || false}
            collaborators={collaborators}
            onToggleItem={handleToggleItem}
            onCreateItem={handleCreateItem}
            onUpdateItem={handleUpdateItem}
            onDeleteList={() => setShowDeleteModal(true)}
            onShareList={() => setShowShareModal(true)}
            listOwnerId={selectedList.owner_id || ''}
          />
        )}

        {/* Notes View */}
        {selectedType === "note" && selectedNote && (
          <RichTextEditor
            content={selectedNote.content}
            title={selectedNote.title}
            onContentChange={handleNoteContentChange}
            onTitleChange={handleNoteTitleChange}
            onDelete={() => setShowDeleteNoteModal(true)}
          />
        )}
      </div>

      <NewListModal
        isOpen={showNewListModal}
        onClose={() => setShowNewListModal(false)}
        onCreate={handleCreateList}
      />

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteList}
        title={`Delete "${selectedList?.name}"?`}
        description="This will permanently delete the list and all its items. This action cannot be undone."
        confirmLabel="Delete list"
        confirmVariant="danger"
      />

      <ConfirmationModal
        isOpen={showDeleteNoteModal}
        onClose={() => setShowDeleteNoteModal(false)}
        onConfirm={handleDeleteNote}
        title={`Delete "${selectedNote?.title}"?`}
        description="This will permanently delete this note. This action cannot be undone."
        confirmLabel="Delete note"
        confirmVariant="danger"
      />

      <ShareListModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        listName={selectedList?.name || ""}
        listOwnerId={selectedList?.owner_id || ""}
        collaborators={collaborators}
        onAddCollaborator={addCollaborator}
        onRemoveCollaborator={removeCollaborator}
        onUpdatePermission={updatePermission}
      />
    </>
  );
}

