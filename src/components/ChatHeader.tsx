"use client";

import { DotsThree } from "@phosphor-icons/react";

type ChatHeaderProps = {
  name: string;
  avatar?: string;
};

export default function ChatHeader({ name, avatar }: ChatHeaderProps) {
  return (
    <div className="sticky top-0 z-10 border-b border-neutral-200 px-4 py-3 flex items-center justify-between bg-white">
      <div className="flex items-center gap-2">
        {avatar && (
          <img
            src={avatar}
            alt={name}
            className="w-6 h-6 rounded-full object-cover"
          />
        )}
        <h2 className="text-[16px] font-medium text-black">{name}</h2>
      </div>
      <button className="text-neutral-600 hover:text-black transition-colors p-1">
        <DotsThree size={20} weight="bold" />
      </button>
    </div>
  );
}

