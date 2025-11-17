"use client";

import { House, ChatCenteredText, Cube, SignOut } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";

type SidebarProps = {
  activeView: "chat" | "projects";
  onViewChange: (view: "chat" | "projects") => void;
  hasUnreadMessages?: boolean;
};

export default function Sidebar({ activeView, onViewChange, hasUnreadMessages = false }: SidebarProps) {
  const { signOut } = useAuth();

  return (
    <div className="bg-neutral-100 border-r border-neutral-200 flex flex-col h-screen items-center px-0 py-4 w-16 fixed left-0 top-0">
      {/* Logo Container - 24x24 black box with 16x16 filled house icon */}
      <div className="flex flex-col gap-3 items-center w-full mb-4">
        <div className="bg-black flex items-center justify-center rounded-md w-6 h-6">
          <House size={16} weight="fill" className="text-white" />
        </div>
      </div>

      {/* Nav Container - 32x32 boxes with 16x16 icons */}
      <div className="flex flex-col gap-0.5 items-center w-full">
          {/* Chat Icon */}
          <button
            onClick={() => onViewChange("chat")}
            className={`flex items-center justify-center rounded-[7px] relative w-8 h-8 transition-colors ${
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
            className={`flex items-center justify-center rounded-[7px] w-8 h-8 transition-colors ${
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

      {/* Spacer to push sign out to bottom */}
      <div className="flex-1" />

      {/* Sign Out Button */}
      <button
        onClick={signOut}
        className="flex items-center justify-center rounded-[7px] w-8 h-8 hover:bg-neutral-200 transition-colors"
        title="Sign Out"
      >
        <SignOut size={16} weight="regular" className="text-neutral-600" />
      </button>
    </div>
  );
}

