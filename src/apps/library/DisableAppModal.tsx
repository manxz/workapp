import React from 'react';
import ConfirmationModal from '@/components/ConfirmationModal';
import { AppDefinition } from '@/apps/types';

interface DisableAppModalProps {
  app: AppDefinition;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * App disable confirmation modal.
 * Wraps the shared ConfirmationModal component.
 */
export default function DisableAppModal({ app, onConfirm, onCancel }: DisableAppModalProps) {
  return (
    <ConfirmationModal
      isOpen={true}
      onClose={onCancel}
      onConfirm={onConfirm}
      title={`Disable "${app.name}"?`}
      description="You can re-enable it anytime. Your data will be preserved."
      confirmLabel="Disable app"
      confirmVariant="default"
    />
  );
}

