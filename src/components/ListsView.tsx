"use client";

import { useState, KeyboardEvent, useRef, useEffect } from "react";
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
  onShareList?: () => void; // New: callback to open share modal
  collaboratorAvatars?: Array<{ id: string; name: string; avatar?: string }>; // New: collaborator data
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
  onShareList,
  collaboratorAvatars = [],
}: ListsViewProps) {
  const [newItemText, setNewItemText] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const newItemInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the new item input when the list changes (new list selected or created)
  useEffect(() => {
    newItemInputRef.current?.focus();
  }, [listName]);

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
      <div className="border-b border-neutral-200 flex items-center justify-between px-4 h-14 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ProgressIndicator
            completed={completedCount}
            total={uncompletedCount + completedCount}
            size="medium"
          />
          <h2 className="text-base font-medium text-black">{listName}</h2>
          <span className="text-base font-medium text-neutral-500">
            {uncompletedCount}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Collaborator Avatars */}
          {collaboratorAvatars.length > 0 && (
            <div className="flex items-center pr-0 pl-0">
              {collaboratorAvatars.slice(0, 3).map((collaborator, index) => (
                <div
                  key={collaborator.id}
                  className="border border-neutral-100 rounded-full w-6 h-6 overflow-hidden"
                  style={{ marginRight: index < Math.min(collaboratorAvatars.length, 3) - 1 ? '-4px' : '0' }}
                  title={collaborator.name}
                >
                  {collaborator.avatar ? (
                    <img
                      src={collaborator.avatar}
                      alt={collaborator.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-neutral-300 flex items-center justify-center text-[10px] font-semibold text-neutral-600">
                      {collaborator.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
              {collaboratorAvatars.length > 3 && (
                <div className="ml-1 text-[12px] font-medium text-neutral-500">
                  +{collaboratorAvatars.length - 3}
                </div>
              )}
            </div>
          )}

          {/* Share List Button */}
          {onShareList && (
            <button
              onClick={onShareList}
              className="bg-black border border-[rgba(29,29,31,0.2)] flex items-center gap-1 h-6 px-2 rounded-[7px] hover:bg-neutral-800 transition-colors"
            >
              <span className="text-[12px] font-medium text-white">Share list</span>
            </button>
          )}

          {/* Delete Button */}
          <button
            onClick={onDeleteList}
            className="flex items-center justify-center rounded-[7px] w-8 h-8 hover:bg-neutral-200 transition-colors"
          >
            <Trash size={16} weight="regular" />
          </button>
        </div>
      </div>

      {/* Spacer */}
      <div className="h-2 bg-white" />

      {/* List Items */}
      <div className="flex-1 overflow-y-auto">
        {/* New Item Input */}
        <div className="flex items-center gap-2 px-4 py-1">
          <Checkbox state="add" />
          <input
            ref={newItemInputRef}
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

