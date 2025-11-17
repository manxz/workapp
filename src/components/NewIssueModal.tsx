"use client";

import { useState } from "react";
import { X, UserCircle } from "@phosphor-icons/react";

type NewIssueModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, description: string, type: "task" | "feature") => void;
};

export default function NewIssueModal({ isOpen, onClose, onCreate }: NewIssueModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"task" | "feature">("task");

  const handleCreate = () => {
    if (!title.trim()) return;
    onCreate(title, description, type);
    setTitle("");
    setDescription("");
    setType("task");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(29, 29, 31, 0.55)' }} onClick={onClose}>
      <div 
        className="bg-[#fafafa] border border-[rgba(29,29,31,0.1)] rounded-2xl p-4 w-[440px] h-[180px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between h-full">
          {/* Modal Content */}
          <div className="flex-1 flex flex-col justify-between h-full">
            {/* Fields */}
            <div className="flex flex-col gap-1">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Issue name"
                className="font-semibold text-base text-black bg-transparent outline-none placeholder:text-[#7d7d7f] w-full"
                autoFocus
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                className="font-medium text-sm text-[#7d7d7f] bg-transparent outline-none placeholder:text-[#7d7d7f] w-full resize-none"
                rows={2}
              />
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-2 items-center">
              {/* Type Button */}
              <button
                onClick={() => setType(type === "task" ? "feature" : "task")}
                className="bg-[#f5f5f5] border border-[rgba(29,29,31,0.2)] rounded-[7px] px-2 h-6 flex items-center"
              >
                <p className="text-xs font-medium text-[rgba(29,29,31,0.7)]">
                  {type === "task" ? "Task" : "Feature"}
                </p>
              </button>

              {/* Assign Button */}
              <button className="bg-[#f5f5f5] border border-[rgba(29,29,31,0.2)] rounded-[7px] px-2 h-6 flex items-center gap-1">
                <UserCircle size={16} weight="regular" className="text-black" />
                <p className="text-xs font-medium text-[rgba(29,29,31,0.7)]">Assign</p>
              </button>
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
              disabled={!title.trim()}
              className={`bg-black border border-[rgba(29,29,31,0.2)] rounded-[7px] px-2 h-6 flex items-center ${
                !title.trim() ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <p className="text-xs font-medium text-white">Create issue</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

