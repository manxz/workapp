import React from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import { AppDefinition } from '@/apps/types';

interface DisableAppModalProps {
  app: AppDefinition;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation modal when user tries to disable an app.
 * 
 * Reassures user that their data will be preserved and they can re-enable anytime.
 * Uses React Portal to render outside component hierarchy (fixes z-index issues).
 */
export default function DisableAppModal({ app, onConfirm, onCancel }: DisableAppModalProps) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-[12px] shadow-[0px_8px_32px_rgba(0,0,0,0.12)] w-[400px] p-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">
              Disable {app.name}?
            </h2>
            <p className="text-sm font-normal text-[#6a6a6a]">
              You can re-enable it anytime. Your data will be preserved.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-[#6a6a6a] hover:text-[#1d1d1f] transition-colors"
            aria-label="Close modal"
          >
            <X size={20} weight="regular" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f5] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#1d1d1f] hover:bg-[#3d3d3f] transition-colors"
          >
            Disable
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

