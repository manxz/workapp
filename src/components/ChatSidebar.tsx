"use client";

import { CaretDown, Plus } from "@phosphor-icons/react";

type DirectMessage = {
  id: string;
  name: string;
  avatar: string;
  hasUnread: boolean;
};

type ChatSidebarProps = {
  directMessages: DirectMessage[];
  selectedId?: string;
  onSelectChat?: (dm: DirectMessage) => void;
};

export default function ChatSidebar({
  directMessages,
  selectedId,
  onSelectChat,
}: ChatSidebarProps) {
  return (
    <div className="bg-neutral-100 border-r border-neutral-200 flex flex-col gap-2 h-screen w-[200px] py-4 fixed left-16 top-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-1.5 h-6">
        <h2 className="text-lg font-medium text-black">Chat</h2>
      </div>

      {/* Direct Messages Section */}
      <div className="flex flex-col w-full">
        {/* Direct Messages Header */}
        <div className="flex items-center justify-between px-4 pr-5 py-1.5">
          <div className="flex items-center gap-0.5">
            <p className="text-[13px] font-semibold text-neutral-500">
              Direct Messages
            </p>
            <CaretDown size={16} className="text-neutral-500" weight="bold" />
          </div>
          <button className="text-neutral-500 hover:text-black transition-colors">
            <Plus size={16} weight="bold" />
          </button>
        </div>

        {/* Direct Messages List */}
        <div className="flex flex-col px-2">
          {directMessages.map((dm) => (
            <button
              key={dm.id}
              onClick={() => onSelectChat?.(dm)}
              className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${
                selectedId === dm.id
                  ? "bg-neutral-200"
                  : "hover:bg-neutral-200"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <img
                  src={dm.avatar}
                  alt={dm.name}
                  className="w-[18px] h-[18px] rounded-full object-cover"
                />
                <p className="text-[13px] font-semibold text-black">
                  {dm.name}
                </p>
              </div>
              {dm.hasUnread && (
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

