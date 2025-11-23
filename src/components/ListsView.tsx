"use client";

import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { Trash, Eye, EyeSlash, Article, Users } from "@phosphor-icons/react";
import ProgressIndicator from "./ProgressIndicator";
import Checkbox from "./Checkbox";
import { Collaborator } from "@/hooks/useListCollaborators";
import { useAuth } from "@/contexts/AuthContext";
import { useUsers } from "@/hooks/useUsers";

type ListItem = {
  id: string;
  content: string;
  notes?: string;
  completed: boolean;
};

type ListsViewProps = {
  listId: string;
  listName: string;
  items: ListItem[];
  uncompletedCount: number;
  completedCount: number;
  isShared: boolean;
  collaborators: Collaborator[];
  onToggleItem: (itemId: string) => void;
  onCreateItem: (content: string, notes?: string) => void;
  onUpdateItem: (itemId: string, updates: Partial<ListItem>) => void;
  onDeleteList: () => void;
  onShareList: () => void;
  listOwnerId: string;
};

export default function ListsView({
  listId,
  listName,
  items,
  uncompletedCount,
  completedCount,
  isShared,
  collaborators,
  onToggleItem,
  onCreateItem,
  onUpdateItem,
  onDeleteList,
  onShareList,
  listOwnerId,
}: ListsViewProps) {
  const { user } = useAuth();
  const { users } = useUsers();
  const [newItemText, setNewItemText] = useState("");
  const [newItemNotes, setNewItemNotes] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingNotes, setEditingNotes] = useState("");
  const newItemInputRef = useRef<HTMLInputElement>(null);
  const editingContainerRef = useRef<HTMLDivElement>(null);

  const isCurrentUserOwner = user?.id === listOwnerId;

  // Auto-focus the new item input when the list changes (new list selected or created)
  useEffect(() => {
    newItemInputRef.current?.focus();
  }, [listName]);

  const uncompletedItems = items.filter((item) => !item.completed);
  const completedItems = items.filter((item) => item.completed);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newItemText.trim()) {
      onCreateItem(newItemText.trim(), newItemNotes.trim() || undefined);
      setNewItemText("");
      setNewItemNotes("");
    }
  };

  const handleNewItemBlur = () => {
    if (newItemText.trim()) {
      onCreateItem(newItemText.trim(), newItemNotes.trim() || undefined);
      setNewItemText("");
      setNewItemNotes("");
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    
    // Helper to clean up list item text
    const cleanItem = (text: string): string => {
      return text
        .replace(/^[-*•]\s+/, '') // Remove bullet points (-, *, •)
        .replace(/^\d+\.\s+/, '') // Remove numbered lists (1., 2., etc)
        .replace(/^\[\s*\]\s*/, '') // Remove checkboxes [ ]
        .replace(/^\[x\]\s*/i, '') // Remove checked boxes [x]
        .trim();
    };
    
    // Split by newlines first
    const lines = pastedText.split(/\r?\n/).map(line => cleanItem(line)).filter(line => line.length > 0);
    
    // If multiple lines, create multiple items
    if (lines.length > 1) {
      e.preventDefault();
      
      // Create all items
      lines.forEach(line => {
        onCreateItem(line, undefined);
      });
      
      setNewItemText("");
      return;
    }
    
    // If single line, check for comma-separated items
    if (lines.length === 1) {
      const commaSeparated = lines[0].split(',').map(item => item.trim()).filter(item => item.length > 0);
      
      // If multiple comma-separated items (and they're reasonably short), create multiple
      if (commaSeparated.length > 1 && commaSeparated.every(item => item.length < 100)) {
        e.preventDefault();
        
        commaSeparated.forEach(item => {
          onCreateItem(item, undefined);
        });
        
        setNewItemText("");
        return;
      }
    }
    
    // Otherwise, let default paste behavior happen (single item)
  };

  const handleDoubleClick = (item: ListItem) => {
    setEditingItemId(item.id);
    setEditingText(item.content);
    setEditingNotes(item.notes || "");
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, itemId: string) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent default only for Enter without Shift
      if (editingText.trim()) {
        onUpdateItem(itemId, { content: editingText.trim(), notes: editingNotes.trim() });
      }
      setEditingItemId(null);
      setEditingText("");
      setEditingNotes("");
    } else if (e.key === "Escape") {
      setEditingItemId(null);
      setEditingText("");
      setEditingNotes("");
    }
  };

  const handleEditBlur = (itemId: string, e: React.FocusEvent) => {
    // Check if the new focus target is within the editing container
    if (editingContainerRef.current?.contains(e.relatedTarget as Node)) {
      return; // Don't close if clicking within the same editing container
    }
    
    if (editingText.trim()) {
      onUpdateItem(itemId, { content: editingText.trim(), notes: editingNotes.trim() });
    }
    setEditingItemId(null);
    setEditingText("");
    setEditingNotes("");
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
          {isShared && (
            <Users size={16} weight="fill" className="text-[#6A6A6A]" />
          )}
          <span className="text-base font-medium text-neutral-500">
            {uncompletedCount}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Owner + Collaborator Avatars - always show owner if list is shared */}
          {isShared && (() => {
            const ownerUser = users.find(u => u.id === listOwnerId);
            const validCollaborators = collaborators.filter(c => users.find(u => u.id === c.user_id));
            const totalCount = (ownerUser ? 1 : 0) + validCollaborators.length;
            const displayLimit = 3;
            
            return totalCount > 0 && (
              <div className="flex items-center pr-0 pl-0">
                {/* Owner Avatar - always first */}
                {ownerUser && (
                  <div
                    key={`owner-${listOwnerId}`}
                    className="relative group"
                    style={{ marginRight: totalCount > 1 ? '-4px' : '0' }}
                  >
                    <div className="border border-neutral-100 rounded-full w-6 h-6 overflow-hidden">
                      {ownerUser.avatar ? (
                        <img
                          src={ownerUser.avatar}
                          alt={ownerUser.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-300 flex items-center justify-center text-[10px] font-semibold text-neutral-600">
                          {ownerUser.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    {/* Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 bg-[#1d1d1f] text-white text-[10px] font-semibold rounded-[6px] shadow-[0px_1px_2px_0px_rgba(29,29,31,0.08)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap pointer-events-none z-50">
                      {ownerUser.name} (Owner)
                    </div>
                  </div>
                )}
                
                {/* Collaborator Avatars */}
                {validCollaborators.slice(0, displayLimit - 1).map((collaborator, index) => {
                  const collaboratorUser = users.find(u => u.id === collaborator.user_id)!;
                  const isLast = index === Math.min(validCollaborators.length, displayLimit - 1) - 1;
                  return (
                    <div
                      key={collaborator.id}
                      className="relative group"
                      style={{ marginRight: !isLast ? '-4px' : '0' }}
                    >
                      <div className="border border-neutral-100 rounded-full w-6 h-6 overflow-hidden">
                        {collaboratorUser.avatar ? (
                          <img
                            src={collaboratorUser.avatar}
                            alt={collaboratorUser.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-neutral-300 flex items-center justify-center text-[10px] font-semibold text-neutral-600">
                            {collaboratorUser.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {/* Tooltip */}
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 bg-[#1d1d1f] text-white text-[10px] font-semibold rounded-[6px] shadow-[0px_1px_2px_0px_rgba(29,29,31,0.08)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap pointer-events-none z-50">
                        {collaboratorUser.name}
                      </div>
                    </div>
                  );
                })}
                
                {/* +N indicator if more than display limit */}
                {totalCount > displayLimit && (
                  <div className="ml-1 text-[12px] font-medium text-neutral-500">
                    +{totalCount - displayLimit}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Share List Button */}
          {isCurrentUserOwner && (
            <button
              onClick={onShareList}
              className="bg-black border border-[rgba(29,29,31,0.2)] flex items-center gap-1 h-6 px-2 rounded-[7px] hover:bg-neutral-800 transition-colors"
            >
              <span className="text-[12px] font-medium text-white">Share list</span>
            </button>
          )}

          {/* Delete Button - only for owner */}
          {isCurrentUserOwner && (
            <button
              onClick={onDeleteList}
              className="flex items-center justify-center rounded-[7px] w-8 h-8 hover:bg-neutral-200 transition-colors"
            >
              <Trash size={16} weight="regular" />
            </button>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="h-2 bg-white" />

      {/* List Items */}
      <div className="flex-1 overflow-y-auto">
        {/* New Item Input */}
        <div className="px-4 py-1">
          <div className="flex items-center gap-2">
            <Checkbox state="add" />
            <input
              ref={newItemInputRef}
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleNewItemBlur}
              onPaste={handlePaste}
              placeholder="New list item"
              className="flex-1 text-[13px] font-medium text-black placeholder:text-[#B0B0B0] outline-none bg-transparent"
            />
          </div>
          {/* Notes input - aligned with main input */}
          <div className="flex items-center gap-2 ml-[21px]">
            <input
              type="text"
              value={newItemNotes}
              onChange={(e) => setNewItemNotes(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleNewItemBlur}
              placeholder="Notes"
              className="flex-1 text-[13px] font-normal text-[#6A6A6A] placeholder:text-[#B0B0B0] outline-none bg-transparent"
            />
          </div>
        </div>

        {/* Uncompleted Items */}
        {uncompletedItems.map((item) => (
          <div key={item.id} className={editingItemId === item.id ? "px-2 py-1" : "px-4 py-1"}>
            {editingItemId === item.id ? (
              // Editing mode - checkbox inside container with adjusted padding
              <div 
                ref={editingContainerRef}
                className="bg-white border border-[rgba(29,29,31,0.2)] rounded-[8px] py-2 px-2 flex flex-col shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    state="default"
                    onClick={() => onToggleItem(item.id)}
                  />
                  <input
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, item.id)}
                    onBlur={(e) => handleEditBlur(item.id, e)}
                    autoFocus
                    className="flex-1 text-[13px] font-medium text-black outline-none bg-transparent leading-[normal]"
                  />
                </div>
                {/* Notes input when editing */}
                <div className="pl-[21px]">
                  <textarea
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, item.id)}
                    onBlur={(e) => handleEditBlur(item.id, e)}
                    placeholder="Notes"
                    rows={1}
                    className="w-full text-[12px] font-medium text-[#8a8a8a] placeholder:text-[#B0B0B0] outline-none bg-transparent leading-[normal] resize-none"
                  />
                </div>
              </div>
            ) : (
              // View mode - show content with doc icon if notes exist
              <div className="flex items-center gap-2">
                <Checkbox
                  state="default"
                  onClick={() => onToggleItem(item.id)}
                />
                <div className="flex items-center gap-1 flex-1">
                  <p
                    className="text-[13px] font-medium text-black cursor-text"
                    onDoubleClick={() => handleDoubleClick(item)}
                  >
                    {item.content}
                  </p>
                  {item.notes && item.notes.trim() && (
                    <Article size={12} weight="regular" className="text-[#6A6A6A] opacity-60 flex-shrink-0" />
                  )}
                </div>
              </div>
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

