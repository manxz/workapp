"use client";

import ConfirmationModal from "./ConfirmationModal";

type DeleteProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  projectName: string;
};

/**
 * Project deletion confirmation modal.
 * Wraps the shared ConfirmationModal component.
 */
export default function DeleteProjectModal({ isOpen, onClose, onConfirm, projectName }: DeleteProjectModalProps) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Delete "${projectName}"?`}
      description="This will permanently delete the project and all associated issues. This action cannot be undone."
      confirmLabel="Delete project"
      confirmVariant="danger"
    />
  );
}

