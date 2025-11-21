"use client";

import { CaretDown, Plus, Hash } from "@phosphor-icons/react";
import NotificationPrompt from "./NotificationPrompt";

type Channel = {
  id: string;
  name: string;
  hasUnread: boolean;
};

type DirectMessage = {
  id: string;
  name: string;
  avatar: string;
  hasUnread: boolean;
};

type ChatSidebarProps = {
  channels: Channel[];
  directMessages: DirectMessage[];
  selectedId?: string;
  selectedType?: "channel" | "dm";
  onSelectChannel?: (channel: Channel) => void;
  onSelectChat?: (dm: DirectMessage) => void;
};

export default function ChatSidebar({
  channels,
  directMessages,
  selectedId,
  selectedType,
  onSelectChannel,
  onSelectChat,
}: ChatSidebarProps) {
  return (
    <div className="bg-neutral-100 border-r border-neutral-200 flex flex-col justify-between h-screen w-[200px] py-4 fixed left-16 top-0">
      <div className="flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center justify-between pl-4 py-1.5 h-6">
          <h2 className="text-lg font-medium text-black">Chat</h2>
        </div>

      {/* Channels Section */}
      <div className="flex flex-col w-full">
        {/* Channels Header */}
        <div className="px-2 pr-2">
          <div className="flex items-center justify-between pl-2 pr-0 py-1.5">
            <div className="flex items-center gap-0.5">
              <p className="text-[13px] font-semibold text-neutral-500">
                Channels
              </p>
              <CaretDown size={16} className="text-neutral-500" weight="bold" />
            </div>
            <button className="text-black hover:bg-neutral-200 rounded-md w-6 h-6 flex items-center justify-center transition-colors">
              <Plus size={16} weight="regular" />
            </button>
          </div>
        </div>

        {/* Channels List */}
        <div className="flex flex-col px-2">
          {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onSelectChannel?.(channel)}
                className={`flex items-center justify-between px-2 py-1.5 rounded-[7px] transition-colors ${
                  selectedId === channel.id && selectedType === "channel"
                    ? "bg-neutral-200"
                    : "hover:bg-neutral-200"
                }`}
            >
              <div className="flex items-center gap-1.5">
                <Hash size={16} weight="bold" className="text-neutral-600" />
                <p className={`text-[13px] text-black ${channel.hasUnread ? 'font-semibold' : 'font-medium'}`}>
                  {channel.name}
                </p>
              </div>
              {channel.hasUnread && (
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Direct Messages Section */}
      <div className="flex flex-col w-full mt-2">
        {/* Direct Messages Header */}
        <div className="px-2 pr-2">
          <div className="flex items-center justify-between pl-2 pr-0 py-1.5">
            <div className="flex items-center gap-0.5">
              <p className="text-[13px] font-semibold text-neutral-500">
                Direct Messages
              </p>
              <CaretDown size={16} className="text-neutral-500" weight="bold" />
            </div>
            <button className="text-black hover:bg-neutral-200 rounded-md w-6 h-6 flex items-center justify-center transition-colors">
              <Plus size={16} weight="regular" />
            </button>
          </div>
        </div>

        {/* Direct Messages List */}
        <div className="flex flex-col px-2">
          {directMessages.map((dm) => (
              <button
                key={dm.id}
                onClick={() => onSelectChat?.(dm)}
                className={`flex items-center justify-between px-2 py-1.5 rounded-[7px] transition-colors ${
                  selectedId === dm.id && selectedType === "dm"
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
                <p className={`text-[13px] text-black ${dm.hasUnread ? 'font-semibold' : 'font-medium'}`}>
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

      {/* Notification Prompt */}
      <NotificationPrompt />
    </div>
  );
}

