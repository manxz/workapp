"use client";

import { X } from "@phosphor-icons/react";

type DeleteProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  projectName: string;
};

export default function DeleteProjectModal({ isOpen, onClose, onConfirm, projectName }: DeleteProjectModalProps) {
  if (!isOpen) return null;

  return (
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
            {/* Title and Description */}
            <div className="flex flex-col gap-1">
              <h2 className="font-semibold text-base text-black">
                Delete "{projectName}"?
              </h2>
              <p className="font-medium text-sm text-[#7d7d7f]">
                This will permanently delete the project and all associated issues. This action cannot be undone.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="bg-neutral-50 border border-neutral-200 text-black text-xs font-medium px-3 py-1.5 rounded-[7px] hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="bg-red-600 border border-red-700 text-white text-xs font-medium px-3 py-1.5 rounded-[7px] hover:bg-red-700 transition-colors"
              >
                Delete project
              </button>
            </div>
          </div>

          {/* Right Side - Close */}
          <div className="flex flex-col h-full items-end justify-start ml-4">
            {/* Close Button */}
            <button 
              onClick={onClose} 
              className="text-black hover:bg-neutral-200 rounded-md w-6 h-6 flex items-center justify-center transition-colors"
            >
              <X size={16} weight="regular" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

