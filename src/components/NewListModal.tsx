"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";

type NewListModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
};

/**
 * Modal for creating a new list in the Notepad app.
 * 
 * Design:
 * - Matches NewIssueModal style with inline inputs
 * - Simple text input for list name (no borders)
 * - Create button on bottom right
 */
export default function NewListModal({ isOpen, onClose, onCreate }: NewListModalProps) {
  const [listName, setListName] = useState("");

  if (!isOpen) return null;

  const handleCreate = () => {
    if (listName.trim()) {
      onCreate(listName.trim());
      setListName("");
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(29, 29, 31, 0.55)" }}
      onClick={onClose}
    >
      <div
        className="bg-[#fafafa] border border-[rgba(29,29,31,0.1)] rounded-2xl p-4 w-[440px] h-[180px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between h-full">
          {/* Modal Content */}
          <div className="flex-1 flex flex-col justify-between h-full">
            {/* Input Field */}
            <div className="flex flex-col gap-1">
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="List name"
                className="font-semibold text-base text-black bg-transparent outline-none placeholder:text-[#7d7d7f] w-full"
                autoFocus
              />
            </div>

            {/* Bottom Spacer (to match NewIssueModal layout) */}
            <div />
          </div>

          {/* Right Side - Close and Create */}
          <div className="flex flex-col h-full items-end justify-between ml-4">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-black hover:bg-neutral-200 rounded-md w-6 h-6 flex items-center justify-center transition-colors"
            >
              <X size={16} weight="regular" />
            </button>

            {/* Create Button */}
            <button
              onClick={handleCreate}
              disabled={!listName.trim()}
              className={`bg-black border border-[rgba(29,29,31,0.2)] rounded-[7px] px-2 h-6 flex items-center ${
                !listName.trim() ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <p className="text-xs font-medium text-white">Create list</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

