"use client";

import { useState, useEffect, useMemo } from "react";
import NotepadSidebar from "@/components/NotepadSidebar";
import ListsView from "@/components/ListsView";
import NewListModal from "@/components/NewListModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import { type List as ListType } from "@/hooks/useLists";
import { useListItems } from "@/hooks/useListItems";

type List = {
  id: string;
  name: string;
  completed: number;
  total: number;
};

interface NotepadAppProps {
  lists: ListType[];
  createList: (name: string) => Promise<ListType | null>;
  deleteList: (listId: string) => Promise<boolean>;
  refreshLists: () => Promise<void>;
}

export default function NotepadApp({ lists: rawLists, createList, deleteList, refreshLists }: NotepadAppProps) {
  const [selectedListId, setSelectedListId] = useState<string | undefined>();
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
  const lists: List[] = useMemo(() => {
    return rawLists.map((list) => {
      // Use local items state for selected list for instant UI updates
      // But only if items have loaded (not empty during transition)
      if (list.id === selectedListId && !itemsLoading) {
        return {
          id: list.id,
          name: list.name,
          completed: completedItems.length,
          total: items.length,
        };
      }
      // Use database counts for other lists or while loading
      return {
        id: list.id,
        name: list.name,
        completed: list.completed_count || 0,
        total: list.total_count || 0,
      };
    });
  }, [rawLists, selectedListId, items, completedItems, itemsLoading]);

  // Auto-select first list on load
  useEffect(() => {
    if (!selectedListId && lists.length > 0) {
      setSelectedListId(lists[0].id);
    }
  }, [lists, selectedListId]);

  // Find selected list
  const selectedList = lists.find((list) => list.id === selectedListId);

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
  const handleCreateItem = async (content: string) => {
    await createItem(content);
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
  const handleUpdateItem = async (itemId: string, content: string) => {
    await updateItem(itemId, { content });
  };

  // Show empty state if no lists
  if (lists.length === 0) {
    return (
      <>
        <NotepadSidebar
          lists={[]}
          selectedId={undefined}
          selectedType="list"
          onSelectList={() => {}}
          onCreateList={() => setShowNewListModal(true)}
        />
        <div className="flex-1 flex items-center justify-center ml-[264px]">
          <p className="text-sm font-medium text-neutral-500">No lists yet</p>
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
        selectedId={selectedListId}
        selectedType="list"
        onSelectList={(list) => setSelectedListId(list.id)}
        onCreateList={() => setShowNewListModal(true)}
      />

      <div className="ml-[264px] flex-1">
        {selectedList && (
          <ListsView
            listName={selectedList.name}
            items={items}
            uncompletedCount={itemsLoading ? (selectedList.total - selectedList.completed) : uncompletedItems.length}
            completedCount={itemsLoading ? selectedList.completed : completedItems.length}
            onToggleItem={handleToggleItem}
            onCreateItem={handleCreateItem}
            onUpdateItem={handleUpdateItem}
            onDeleteList={() => setShowDeleteModal(true)}
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
    </>
  );
}

