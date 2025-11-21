"use client";

import { useState, useEffect, useMemo } from "react";
import NotepadSidebar from "@/components/NotepadSidebar";
import ListsView from "@/components/ListsView";
import NewListModal from "@/components/NewListModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import { useLists } from "@/hooks/useLists";
import { useListItems } from "@/hooks/useListItems";

type List = {
  id: string;
  name: string;
  completed: number;
  total: number;
};

export default function NotepadApp() {
  const { lists: rawLists, loading: listsLoading, createList, deleteList } = useLists();
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
  const lists: List[] = useMemo(() => {
    // For now, we'll need to calculate counts client-side
    // In a production app, you'd want to do this in the database or cache it
    return rawLists.map((list) => ({
      id: list.id,
      name: list.name,
      completed: 0, // Will be updated when we fetch items
      total: 0, // Will be updated when we fetch items
    }));
  }, [rawLists]);

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
  };

  // Handle item toggle
  const handleToggleItem = async (itemId: string) => {
    await toggleItem(itemId);
  };

  // Handle item update
  const handleUpdateItem = async (itemId: string, content: string) => {
    await updateItem(itemId, { content });
  };

  // Show loading state
  if (listsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-neutral-600">Loading...</p>
      </div>
    );
  }

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
        lists={lists.map((list) => ({
          ...list,
          completed: selectedList?.id === list.id ? completedItems.length : 0,
          total: selectedList?.id === list.id ? items.length : 0,
        }))}
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
            uncompletedCount={uncompletedItems.length}
            completedCount={completedItems.length}
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

