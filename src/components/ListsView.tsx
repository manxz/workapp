"use client";

import { useState, KeyboardEvent } from "react";
import { Trash, Eye, EyeSlash } from "@phosphor-icons/react";
import ProgressIndicator from "./ProgressIndicator";
import Checkbox from "./Checkbox";

type ListItem = {
  id: string;
  content: string;
  completed: boolean;
};

type ListsViewProps = {
  listName: string;
  items: ListItem[];
  uncompletedCount: number;
  completedCount: number;
  onToggleItem: (itemId: string) => void;
  onCreateItem: (content: string) => void;
  onUpdateItem: (itemId: string, content: string) => void;
  onDeleteList: () => void;
};

export default function ListsView({
  listName,
  items,
  uncompletedCount,
  completedCount,
  onToggleItem,
  onCreateItem,
  onUpdateItem,
  onDeleteList,
}: ListsViewProps) {
  const [newItemText, setNewItemText] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const uncompletedItems = items.filter((item) => !item.completed);
  const completedItems = items.filter((item) => item.completed);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newItemText.trim()) {
      onCreateItem(newItemText.trim());
      setNewItemText("");
    }
  };

  const handleDoubleClick = (item: ListItem) => {
    setEditingItemId(item.id);
    setEditingText(item.content);
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>, itemId: string) => {
    if (e.key === "Enter") {
      if (editingText.trim()) {
        onUpdateItem(itemId, editingText.trim());
      }
      setEditingItemId(null);
      setEditingText("");
    } else if (e.key === "Escape") {
      setEditingItemId(null);
      setEditingText("");
    }
  };

  const handleEditBlur = (itemId: string) => {
    if (editingText.trim()) {
      onUpdateItem(itemId, editingText.trim());
    }
    setEditingItemId(null);
    setEditingText("");
  };

  return (
    <div className="flex flex-col h-screen flex-1 bg-white">
      {/* Header */}
      <div className="border-b border-neutral-200 flex items-center justify-between px-4 py-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-medium text-black">{listName}</h2>
          <span className="text-base font-medium text-neutral-500">
            {uncompletedCount}
          </span>
        </div>

        <button
          onClick={onDeleteList}
          className="flex items-center justify-center rounded-[7px] w-8 h-8 hover:bg-neutral-200 transition-colors"
        >
          <Trash size={16} weight="regular" />
        </button>
      </div>

      {/* Spacer */}
      <div className="h-2 bg-white" />

      {/* List Items */}
      <div className="flex-1 overflow-y-auto">
        {/* New Item Input */}
        <div className="flex items-center gap-2 px-4 py-1">
          <Checkbox state="add" />
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="New list item"
            className="flex-1 text-[13px] font-medium text-black placeholder:text-[#B0B0B0] outline-none bg-transparent"
          />
        </div>

        {/* Uncompleted Items */}
        {uncompletedItems.map((item) => (
          <div key={item.id} className="flex items-center gap-2 px-4 py-1">
            <Checkbox
              state="default"
              onClick={() => onToggleItem(item.id)}
            />
            {editingItemId === item.id ? (
              <input
                type="text"
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onKeyDown={(e) => handleEditKeyDown(e, item.id)}
                onBlur={() => handleEditBlur(item.id)}
                autoFocus
                className="flex-1 text-[13px] font-medium text-black outline-none bg-transparent"
              />
            ) : (
              <p
                className="text-[13px] font-medium text-black flex-1 cursor-text"
                onDoubleClick={() => handleDoubleClick(item)}
              >
                {item.content}
              </p>
            )}
          </div>
        ))}

        {/* Spacer before completed section */}
        {completedItems.length > 0 && <div className="h-2 bg-white" />}

        {/* Hide/Show Completed Toggle */}
        {completedItems.length > 0 && (
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 px-4 py-2 hover:bg-neutral-50 transition-colors w-full"
          >
            {showCompleted ? (
              <EyeSlash size={16} weight="regular" className="text-neutral-500" />
            ) : (
              <Eye size={16} weight="regular" className="text-neutral-500" />
            )}
            <p className="text-[13px] font-medium text-neutral-500">
              {showCompleted ? "Hide" : "Show"} {completedItems.length} completed{" "}
              {completedItems.length === 1 ? "item" : "items"}
            </p>
          </button>
        )}

        {/* Completed Items */}
        {showCompleted &&
          completedItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2 px-4 py-1">
              <Checkbox
                state="filled"
                onClick={() => onToggleItem(item.id)}
              />
              {editingItemId === item.id ? (
                <input
                  type="text"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={(e) => handleEditKeyDown(e, item.id)}
                  onBlur={() => handleEditBlur(item.id)}
                  autoFocus
                  className="flex-1 text-[13px] font-medium text-black outline-none bg-transparent"
                />
              ) : (
                <p
                  className="text-[13px] font-medium text-black flex-1 cursor-text"
                  onDoubleClick={() => handleDoubleClick(item)}
                >
                  {item.content}
                </p>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

