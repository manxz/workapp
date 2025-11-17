"use client";

import { House, ChatCenteredText, Cube } from "@phosphor-icons/react";

type SidebarProps = {
  activeView: "chat" | "projects";
  onViewChange: (view: "chat" | "projects") => void;
  hasUnreadMessages?: boolean;
};

export default function Sidebar({ activeView, onViewChange, hasUnreadMessages = false }: SidebarProps) {
  return (
    <div className="bg-neutral-100 border-r border-neutral-200 flex flex-col gap-4 h-screen items-center px-0 py-4 w-16 fixed left-0 top-0">
      {/* Logo Container - 24x24 black box with 16x16 filled house icon */}
      <div className="flex flex-col gap-3 items-center w-full">
        <div className="bg-black flex items-center justify-center rounded-md w-6 h-6">
          <House size={16} weight="fill" className="text-white" />
        </div>
      </div>

      {/* Nav Container - 32x32 boxes with 16x16 icons */}
      <div className="flex flex-col gap-0.5 items-center w-full">
        {/* Chat Icon */}
        <button
          onClick={() => onViewChange("chat")}
          className={`flex items-center justify-center rounded-lg relative w-8 h-8 transition-colors ${
            activeView === "chat" ? "bg-neutral-200" : "hover:bg-neutral-200"
          }`}
        >
          <ChatCenteredText
            size={16}
            weight={activeView === "chat" ? "fill" : "regular"}
          />
          {/* Notification dot - only shows when there are unread messages */}
          {hasUnreadMessages && (
            <div className="absolute top-2 left-5 w-1.5 h-1.5 bg-blue-600 rounded-full border border-neutral-200" />
          )}
        </button>

        {/* Projects/Cube Icon */}
        <button
          onClick={() => onViewChange("projects")}
          className={`flex items-center justify-center rounded-lg w-8 h-8 transition-colors ${
            activeView === "projects"
              ? "bg-neutral-200"
              : "hover:bg-neutral-200"
          }`}
        >
          <Cube
            size={16}
            weight={activeView === "projects" ? "fill" : "regular"}
          />
        </button>
      </div>
    </div>
  );
}

