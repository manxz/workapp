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
  }, [isOpen, collaborators]);

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

  // Get all team members (excluding owner)
  const teamMembers = users.filter(u => u.id !== listOwnerId);

  // Get current permission for a user (from DB or pending changes)
  const getUserPermission = (userId: string): 'none' | 'view' | 'edit' => {
    // Check pending changes first
    const pending = pendingChanges.get(userId);
    if (pending) {
      if (pending.action === 'remove') return 'none';
      if (pending.action === 'add') return pending.permission!;
      if (pending.action === 'update') return pending.permission!;
    }
    
    // Check if user is a collaborator in DB
    const collaborator = collaborators.find(c => c.user_id === userId);
    if (collaborator) {
      return collaborator.permission;
    }
    
    // No access
    return 'none';
  };

  // Handle clicking on permission badge to cycle through states: None → Viewer → Editor → None
  const handlePermissionToggle = (userId: string) => {
    const currentPermission = getUserPermission(userId);
    const collaborator = collaborators.find(c => c.user_id === userId);
    const newChanges = new Map(pendingChanges);
    
    if (currentPermission === 'none') {
      // None → Viewer (add)
      newChanges.set(userId, { userId, action: 'add', permission: 'view' });
    } else if (currentPermission === 'view') {
      // Viewer → Editor
      if (collaborator) {
        newChanges.set(userId, { userId, action: 'update', permission: 'edit' });
      } else {
        newChanges.set(userId, { userId, action: 'add', permission: 'edit' });
      }
    } else if (currentPermission === 'edit') {
      // Editor → None (remove access)
      if (collaborator) {
        newChanges.set(userId, { userId, action: 'remove' });
      } else {
        // If not in DB yet, just remove from pending
        newChanges.delete(userId);
      }
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
            <div className="flex items-center justify-between h-6 px-[6px] py-1 rounded-lg">
              <div className="flex items-center gap-1">
                <img
                  src={user?.user_metadata?.avatar_url || '/icon.svg'}
                  alt={user?.user_metadata?.full_name || 'You'}
                  className="w-4 h-4 rounded-full"
                />
                <p className="text-[12px] font-medium text-black">
                  {user?.user_metadata?.full_name || user?.email || 'You'}
                </p>
              </div>
              <span className="text-[10px] font-medium text-[#6A6A6A] tracking-[0.025px]">
                Owner
              </span>
            </div>

            {/* All Team Members */}
            {teamMembers.map((member) => {
              const permission = getUserPermission(member.id);
              
              // Determine badge text
              let badgeText = 'None';
              if (permission === 'view') badgeText = 'Viewer';
              else if (permission === 'edit') badgeText = 'Editor';
              
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between h-6 px-[6px] py-1 rounded-lg"
                >
                  <div className="flex items-center gap-1">
                    <img
                      src={member.avatar || '/icon.svg'}
                      alt={member.name}
                      className="w-4 h-4 rounded-full"
                    />
                    <p className="text-[12px] font-medium text-black">
                      {member.name}
                    </p>
                  </div>
                  {user?.id === listOwnerId && (
                    <button
                      onClick={() => handlePermissionToggle(member.id)}
                      disabled={isSubmitting}
                      className="bg-[#f5f5f5] border border-[rgba(29,29,31,0.1)] rounded-[5px] px-1 py-[2px] text-[10px] font-medium text-black tracking-[0.025px] leading-none hover:bg-[#EEEEEE] cursor-pointer"
                    >
                      {badgeText}
                    </button>
                  )}
                  {user?.id !== listOwnerId && permission !== 'none' && (
                    <span className="bg-[#f5f5f5] border border-[rgba(29,29,31,0.1)] rounded-[5px] px-1 py-[2px] text-[10px] font-medium text-black tracking-[0.025px] leading-none">
                      {badgeText}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-end justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="bg-white border border-[rgba(29,29,31,0.1)] h-6 px-2 py-0 rounded-[7px] hover:bg-neutral-50 transition-colors"
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

