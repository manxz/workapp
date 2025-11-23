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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Local state for pending changes
  type PendingChange = {
    userId: string;
    action: 'add' | 'update' | 'remove';
    permission?: 'view' | 'edit';
  };
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPendingChanges(new Map());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Wait for users to load
  if (!users || users.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-50 px-4">
        <div className="bg-[#FAFAFA] border border-[rgba(29,29,31,0.1)] rounded-[16px] p-4 w-full max-w-[351px] flex items-center justify-center h-32">
          <p className="text-[14px] font-medium text-[#6A6A6A]">Loading...</p>
        </div>
      </div>
    );
  }

  // Filter out users who already have access (accounting for pending changes)
  const collaboratorUserIds = collaborators.map(c => c.user_id);
  const pendingAdditions = Array.from(pendingChanges.entries())
    .filter(([_, change]) => change.action === 'add')
    .map(([userId]) => userId);
  
  const availableUsers = users.filter(u => 
    u.id !== listOwnerId && // Not the owner
    !collaboratorUserIds.includes(u.id) && // Not already a collaborator
    !pendingAdditions.includes(u.id) // Not pending addition
  );

  // Find owner user - need to check if it's the current user first
  const ownerUser = user?.id === listOwnerId 
    ? {
        id: user.id,
        name: user.user_metadata?.full_name || user.email || 'You',
        avatar: user.user_metadata?.avatar_url || '/icon.svg'
      }
    : users.find(u => u.id === listOwnerId);

  // Helper to get user details by ID
  const getUserById = (userId: string) => {
    if (userId === user?.id) {
      return {
        id: user.id,
        name: user.user_metadata?.full_name || user.email || 'You',
        avatar: user.user_metadata?.avatar_url || '/icon.svg'
      };
    }
    return users.find(u => u.id === userId);
  };

  // Get effective permission for a user (considering pending changes)
  const getEffectivePermission = (collaborator: Collaborator): 'view' | 'edit' | 'remove' | null => {
    const pending = pendingChanges.get(collaborator.user_id);
    if (pending) {
      if (pending.action === 'remove') return 'remove';
      if (pending.action === 'update') return pending.permission!;
    }
    return collaborator.permission;
  };

  // Handle clicking on a user to add them
  const handleAddUser = (userId: string) => {
    const newChanges = new Map(pendingChanges);
    newChanges.set(userId, { userId, action: 'add', permission: 'view' });
    setPendingChanges(newChanges);
  };

  // Handle clicking on permission badge to cycle through states
  const handlePermissionClick = (collaborator: Collaborator) => {
    const newChanges = new Map(pendingChanges);
    const current = getEffectivePermission(collaborator);
    
    if (current === 'view') {
      // Viewer → Editor
      newChanges.set(collaborator.user_id, { 
        userId: collaborator.user_id, 
        action: 'update', 
        permission: 'edit' 
      });
    } else if (current === 'edit') {
      // Editor → Remove
      newChanges.set(collaborator.user_id, { 
        userId: collaborator.user_id, 
        action: 'remove' 
      });
    } else if (current === 'remove') {
      // Remove → Viewer (revert to original or viewer if new)
      newChanges.delete(collaborator.user_id);
    }
    
    setPendingChanges(newChanges);
  };

  // Handle clicking badge for newly added users
  const handleNewUserPermissionClick = (userId: string) => {
    const newChanges = new Map(pendingChanges);
    const current = pendingChanges.get(userId);
    
    if (current?.permission === 'view') {
      // Viewer → Editor
      newChanges.set(userId, { userId, action: 'add', permission: 'edit' });
    } else if (current?.permission === 'edit') {
      // Editor → Remove (just remove from pending)
      newChanges.delete(userId);
    }
    
    setPendingChanges(newChanges);
  };

  // Apply all pending changes
  const handleApplyChanges = async () => {
    if (pendingChanges.size === 0) {
      onClose();
      return;
    }

    setIsSubmitting(true);

    try {
      for (const [userId, change] of pendingChanges.entries()) {
        if (change.action === 'add') {
          await onAddCollaborator(userId, change.permission!);
        } else if (change.action === 'update') {
          const collaborator = collaborators.find(c => c.user_id === userId);
          if (collaborator) {
            await onUpdatePermission?.(collaborator.id, change.permission!);
          }
        } else if (change.action === 'remove') {
          const collaborator = collaborators.find(c => c.user_id === userId);
          if (collaborator) {
            await onRemoveCollaborator(collaborator.id);
          }
        }
      }
      
      setPendingChanges(new Map());
      onClose();
    } catch (error) {
      console.error('Error applying changes:', error);
      alert('Failed to apply some changes');
    } finally {
      setIsSubmitting(false);
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
                    src={ownerUser.avatar || '/icon.svg'}
                    alt={ownerUser.name}
                    className="w-4 h-4 rounded-full"
                  />
                  <p className="text-[12px] font-medium text-black">
                    {ownerUser.name}
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
            {collaborators.map((collaborator) => {
              const collaboratorUser = getUserById(collaborator.user_id);
              const effectivePermission = getEffectivePermission(collaborator);
              const isMarkedForRemoval = effectivePermission === 'remove';
              
              return (
                <div
                  key={collaborator.id}
                  className={`flex items-center justify-between h-6 px-[6px] py-1 rounded-lg ${isMarkedForRemoval ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    <img
                      src={collaboratorUser?.avatar || '/icon.svg'}
                      alt={collaboratorUser?.name || 'User'}
                      className="w-4 h-4 rounded-full"
                    />
                    <p className="text-[12px] font-medium text-black">
                      {collaboratorUser?.name || 'Unknown User'}
                    </p>
                  </div>
                  {user?.id === listOwnerId && (
                    <button
                      onClick={() => handlePermissionClick(collaborator)}
                      disabled={isSubmitting}
                      className="bg-[#f5f5f5] border border-[rgba(29,29,31,0.1)] rounded-[5px] px-1 py-[2px] text-[10px] font-medium text-black tracking-[0.025px] leading-none hover:bg-[#EEEEEE] cursor-pointer"
                    >
                      {isMarkedForRemoval ? 'Remove' : effectivePermission === 'edit' ? 'Editor' : 'Viewer'}
                    </button>
                  )}
                  {user?.id !== listOwnerId && (
                    <span className="bg-[#f5f5f5] border border-[rgba(29,29,31,0.1)] rounded-[5px] px-1 py-[2px] text-[10px] font-medium text-black tracking-[0.025px] leading-none">
                      {collaborator.permission === 'edit' ? 'Editor' : 'Viewer'}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Newly added users (pending) */}
            {Array.from(pendingChanges.entries())
              .filter(([_, change]) => change.action === 'add')
              .map(([userId, change]) => {
                const pendingUser = getUserById(userId);
                return (
                  <div
                    key={userId}
                    className="flex items-center justify-between h-6 px-[6px] py-1 rounded-lg bg-blue-50"
                  >
                    <div className="flex items-center gap-1">
                      <img
                        src={pendingUser?.avatar || '/icon.svg'}
                        alt={pendingUser?.name || 'User'}
                        className="w-4 h-4 rounded-full"
                      />
                      <p className="text-[12px] font-medium text-black">
                        {pendingUser?.name || 'Unknown User'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleNewUserPermissionClick(userId)}
                      disabled={isSubmitting}
                      className="bg-[#f5f5f5] border border-[rgba(29,29,31,0.1)] rounded-[5px] px-1 py-[2px] text-[10px] font-medium text-black tracking-[0.025px] leading-none hover:bg-[#EEEEEE] cursor-pointer"
                    >
                      {change.permission === 'edit' ? 'Editor' : 'Viewer'}
                    </button>
                  </div>
                );
              })}

            {/* Available users to add (only for owner) */}
            {user?.id === listOwnerId && availableUsers.map((availableUser) => (
              <div
                key={availableUser.id}
                className="flex items-center justify-between h-6 px-[6px] py-1 rounded-lg hover:bg-neutral-50 cursor-pointer"
                onClick={() => handleAddUser(availableUser.id)}
              >
                <div className="flex items-center gap-1">
                  <img
                    src={availableUser.avatar || '/icon.svg'}
                    alt={availableUser.name}
                    className="w-4 h-4 rounded-full"
                  />
                  <p className="text-[12px] font-medium text-black">
                    {availableUser.name}
                  </p>
                </div>
                <span className="bg-[#f5f5f5] border border-[rgba(29,29,31,0.1)] rounded-[5px] px-1 py-[2px] text-[10px] font-medium text-black tracking-[0.025px] leading-none">
                  Viewer
                </span>
              </div>
            ))}
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

          <button
            onClick={handleApplyChanges}
            disabled={isSubmitting}
            className="bg-black border border-[rgba(29,29,31,0.2)] h-6 px-2 py-0 rounded-[7px] hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <p className="text-[12px] font-medium text-white">
              {isSubmitting ? 'Saving...' : 'Share list'}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

