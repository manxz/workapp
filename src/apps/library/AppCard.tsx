import React from 'react';
import { ChatCenteredText, Cube, Note, UserCircle, Lock } from '@phosphor-icons/react';
import { AppDefinition } from '@/apps/types';

// Icon map for tree-shaking (only imports icons we actually use)
const ICON_MAP = {
  ChatCenteredText,
  Cube,
  Note,
  UserCircle,
} as const;

interface AppCardProps {
  app: AppDefinition;
  isEnabled: boolean;
  onToggle: (appId: string) => void;
}

/**
 * Individual app card in the App Library.
 * 
 * Shows app icon, name, description, and toggle switch.
 * - WIP apps: Faded + non-clickable toggle + "WIP" badge
 * - Chat app: Toggle is disabled (always enabled)
 * - Other apps: Fully interactive toggle
 * - Uses explicit icon imports for tree-shaking (only bundles icons we use)
 */
export default function AppCard({ app, isEnabled, onToggle }: AppCardProps) {
  const Icon = ICON_MAP[app.icon as keyof typeof ICON_MAP];
  const canToggle = !app.isWIP && app.canDisable;

  const handleToggleClick = () => {
    if (canToggle) {
      onToggle(app.id);
    }
  };

  return (
    <div
      className={`
        bg-[#fafafa] border border-[rgba(29,29,31,0.1)] rounded-[12px] p-4
        flex flex-col gap-4 w-[200px] shrink-0 relative
        ${app.isWIP ? 'opacity-50' : ''}
      `}
    >
      {/* App Icon and Info Container */}
      <div className="flex flex-col gap-2 w-full">
        {/* Icon and WIP badge row (only if WIP) */}
        {app.isWIP ? (
          <div className="flex items-start justify-between w-full">
            {Icon && (
              <Icon
                size={24}
                weight="regular"
                className="text-[#1d1d1f]"
              />
            )}
            <span className="text-[10px] font-medium text-black px-1 py-[2px] bg-[#f5f5f5] border border-[rgba(29,29,31,0.1)] rounded-[5px] leading-none tracking-[0.025px]">
              WIP
            </span>
          </div>
        ) : (
          /* Just icon if not WIP */
          Icon && (
            <Icon
              size={24}
              weight="regular"
              className="text-[#1d1d1f]"
            />
          )
        )}

        {/* App Name and Description */}
        <div className="flex flex-col gap-1 w-full">
          <p className="text-[16px] font-medium text-[#1d1d1f] leading-normal">
            {app.name}
          </p>
          <p className="text-[12px] font-normal text-[#6a6a6a] leading-normal">
            {app.description}
          </p>
        </div>
      </div>

      {/* Toggle Switch */}
      <button
        onClick={handleToggleClick}
        disabled={!canToggle}
        className={`
          h-4 w-7 rounded-[16px] shrink-0
          flex items-center
          transition-all duration-200
          ${canToggle ? 'cursor-pointer' : 'cursor-not-allowed'}
          ${
            isEnabled
              ? 'bg-[#05f140] justify-end px-[1.5px] py-0.5'
              : 'bg-[#e0e0e0] justify-start px-[1.5px] py-0.5'
          }
        `}
        aria-label={`Toggle ${app.name}`}
      >
        <div className="bg-white rounded-[32px] w-[13px] h-[13px]" />
      </button>

      {/* Lock Icon - Bottom Right Corner (for Chat only) */}
      {!app.canDisable && (
        <div className="absolute bottom-4 right-4">
          <Lock size={16} weight="fill" className="text-[#b0b0b0]" />
        </div>
      )}
    </div>
  );
}

