"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";

type NewProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
};

export default function NewProjectModal({ isOpen, onClose, onCreate }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim());
    setName("");
    setDescription("");
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50" 
      style={{ backgroundColor: 'rgba(29, 29, 31, 0.55)' }} 
      onClick={onClose}
    >
      <div 
        className="bg-[#fafafa] border border-[rgba(29,29,31,0.1)] rounded-2xl p-4 w-[440px] h-[180px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-end justify-between h-full">
          {/* Modal Content */}
          <div className="flex-1 flex flex-col justify-between h-full">
            {/* Fields */}
            <div className="flex flex-col gap-1">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
                className="font-semibold text-base text-black bg-transparent outline-none placeholder:text-[#7d7d7f] w-full"
                autoFocus
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                className="font-medium text-sm text-[#7d7d7f] bg-transparent outline-none placeholder:text-[#7d7d7f] w-full"
              />
            </div>
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
              disabled={!name.trim()}
              className={`bg-black border border-[rgba(29,29,31,0.2)] rounded-[7px] px-2 h-6 flex items-center ${
                !name.trim() ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <p className="text-xs font-medium text-white">Create project</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

