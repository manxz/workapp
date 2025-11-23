"use client";

import { X } from "@phosphor-icons/react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import { Collaborator } from "@/hooks/useListCollaborators";

type ShareListModalProps = {
  isOpen: boolean;
  onClose: () => void;
  listName: string;
  listOwnerId: string;
  collaborators: Collaborator[];
  onAddCollaborator: (userId: string, permission: 'view' | 'edit') => Promise<{ success: boolean; error?: string }>;
  onRemoveCollaborator: (collaboratorId: string) => Promise<{ success: boolean; error?: string }>;
  onUpdatePermission?: (collaboratorId: string, permission: 'view' | 'edit') => Promise<{ success: boolean; error?: string }>;
};

export default function ShareListModal({
  isOpen,
  onClose,
  listName,
  listOwnerId,
  collaborators,
  onAddCollaborator,
  onRemoveCollaborator,
  onUpdatePermission,
}: ShareListModalProps) {
  const { user } = useAuth();
  const { users } = useUsers();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedPermission, setSelectedPermission] = useState<'view' | 'edit'>('edit');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedUserId("");
      setSelectedPermission('edit');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter out users who already have access
  const collaboratorUserIds = collaborators.map(c => c.user_id);
  const availableUsers = users.filter(u => 
    u.id !== listOwnerId && // Not the owner
    !collaboratorUserIds.includes(u.id) // Not already a collaborator
  );

  // Find owner user
  const ownerUser = users.find(u => u.id === listOwnerId);

  const handleShare = async () => {
    if (!selectedUserId) return;

    setIsSubmitting(true);
    const result = await onAddCollaborator(selectedUserId, selectedPermission);
    setIsSubmitting(false);

    if (result.success) {
      setSelectedUserId("");
      setSelectedPermission('edit');
    } else {
      alert(result.error || 'Failed to add collaborator');
    }
  };

  const handleRemove = async (collaboratorId: string) => {
    if (!confirm('Remove this person from the list?')) return;

    setIsSubmitting(true);
    const result = await onRemoveCollaborator(collaboratorId);
    setIsSubmitting(false);

    if (!result.success) {
      alert(result.error || 'Failed to remove collaborator');
    }
  };

  const handlePermissionClick = async (collaborator: Collaborator) => {
    if (!onUpdatePermission) return;

    const newPermission = collaborator.permission === 'edit' ? 'view' : 'edit';
    setIsSubmitting(true);
    const result = await onUpdatePermission(collaborator.id, newPermission);
    setIsSubmitting(false);

    if (!result.success) {
      alert(result.error || 'Failed to update permission');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-50 px-4">
      <div className="bg-[#FAFAFA] border border-[rgba(29,29,31,0.1)] rounded-[16px] p-4 w-full max-w-[351px] flex flex-col gap-4">
        {/* Title */}
        <div className="flex flex-col gap-1">
          <h2 className="text-[16px] font-semibold text-black">
            Share '{listName}'
          </h2>
        </div>

        {/* People with access */}
        <div className="flex flex-col gap-2">
          <p className="text-[14px] font-medium text-[#6A6A6A]">
            People with access
          </p>

          <div className="bg-white border border-[rgba(29,29,31,0.2)] rounded-[12px] py-1 px-1 flex flex-col gap-0.5">
            {/* Owner */}
            {ownerUser && (
              <div className="flex items-center justify-between h-6 px-[6px] py-1 rounded-lg">
                <div className="flex items-center gap-1">
                  <img
                    src={ownerUser.avatar_url || '/icon.svg'}
                    alt={ownerUser.full_name || ownerUser.email}
                    className="w-4 h-4 rounded-full"
                  />
                  <p className="text-[12px] font-medium text-black">
                    {ownerUser.full_name || ownerUser.email}
                  </p>
                </div>
                <div className="px-1 py-0.5 rounded-[5px]">
                  <p className="text-[10px] font-medium text-[#6A6A6A] tracking-[0.025px]">
                    Owner
                  </p>
                </div>
              </div>
            )}

            {/* Collaborators */}
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="flex items-center justify-between h-6 px-[6px] py-1 rounded-lg"
              >
                <div className="flex items-center gap-1">
                  <img
                    src={collaborator.profiles?.avatar_url || '/icon.svg'}
                    alt={collaborator.profiles?.full_name || 'User'}
                    className="w-4 h-4 rounded-full"
                  />
                  <p className="text-[12px] font-medium text-black">
                    {collaborator.profiles?.full_name || 'Unknown User'}
                  </p>
                </div>
                <button
                  onClick={() => handlePermissionClick(collaborator)}
                  disabled={isSubmitting || user?.id !== listOwnerId}
                  className={`bg-[#F5F5F5] border border-[rgba(29,29,31,0.1)] px-1 py-0.5 rounded-[5px] ${
                    user?.id === listOwnerId ? 'hover:bg-[#EEEEEE] cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <p className="text-[10px] font-medium text-black tracking-[0.025px]">
                    {collaborator.permission === 'edit' ? 'Editor' : 'Viewer'}
                  </p>
                </button>
              </div>
            ))}

            {/* Add new collaborator (only for owner) */}
            {user?.id === listOwnerId && availableUsers.length > 0 && (
              <div className="flex items-center justify-between h-6 px-[6px] py-1 rounded-lg border-t border-[rgba(29,29,31,0.1)] mt-1 pt-2">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  disabled={isSubmitting}
                  className="text-[12px] font-medium text-black bg-transparent border-none outline-none flex-1"
                >
                  <option value="">Add person...</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
                {selectedUserId && (
                  <button
                    onClick={() => setSelectedPermission(selectedPermission === 'edit' ? 'view' : 'edit')}
                    disabled={isSubmitting}
                    className="bg-[#F5F5F5] border border-[rgba(29,29,31,0.1)] px-1 py-0.5 rounded-[5px] hover:bg-[#EEEEEE]"
                  >
                    <p className="text-[10px] font-medium text-black tracking-[0.025px]">
                      {selectedPermission === 'edit' ? 'Editor' : 'Viewer'}
                    </p>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-end justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="bg-white border border-[rgba(29,29,31,0.1)] h-6 px-2 py-1 rounded-[7px] hover:bg-neutral-50 transition-colors"
          >
            <p className="text-[12px] font-medium text-black">Cancel</p>
          </button>

          {user?.id === listOwnerId && selectedUserId && (
            <button
              onClick={handleShare}
              disabled={isSubmitting}
              className="bg-black border border-[rgba(29,29,31,0.2)] h-6 px-2 py-0 rounded-[7px] hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              <p className="text-[12px] font-medium text-white">
                {isSubmitting ? 'Sharing...' : 'Share list'}
              </p>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

