"use client";

import { House, ChatCenteredText, Cube, Plus, SignOut } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";

type SidebarProps = {
  activeView: "chat" | "projects" | "apps";
  onViewChange: (view: "chat" | "projects" | "apps") => void;
  hasUnreadMessages?: boolean;
  enabledApps: (appId: string) => boolean;
  appsLoading: boolean;
};

export default function Sidebar({ 
  activeView, 
  onViewChange, 
  hasUnreadMessages = false,
  enabledApps,
  appsLoading,
}: SidebarProps) {
  const { signOut } = useAuth();

  // Only show enabled apps (wait for loading to complete to prevent flash)
  const showChat = !appsLoading && enabledApps('chat');
  const showProjects = !appsLoading && enabledApps('projects');

  return (
    <div className="bg-neutral-100 border-r border-neutral-200 flex flex-col h-screen items-center px-0 py-4 w-16 fixed left-0 top-0 z-40 overflow-visible">
      {/* Logo Container - 24x24 black box with 16x16 filled house icon */}
      <div className="flex flex-col gap-3 items-center w-full mb-4">
        <div className="bg-black flex items-center justify-center rounded-md w-6 h-6">
          <House size={16} weight="fill" className="text-white" />
        </div>
      </div>

      {/* Nav Container - 32x32 boxes with 16x16 icons */}
      <div className="flex flex-col gap-0.5 items-center w-full overflow-visible">
          {/* Chat Icon - Only show if enabled */}
          {showChat && (
            <button
              onClick={() => onViewChange("chat")}
              className={`flex items-center justify-center rounded-[7px] relative w-8 h-8 transition-colors group ${
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
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#1d1d1f] text-white text-[10px] font-semibold rounded-[6px] shadow-[0px_1px_2px_0px_rgba(29,29,31,0.08)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap pointer-events-none z-50">
                Chat
              </div>
            </button>
          )}

          {/* Projects/Cube Icon - Only show if enabled */}
          {showProjects && (
            <button
              onClick={() => onViewChange("projects")}
              className={`flex items-center justify-center rounded-[7px] relative w-8 h-8 transition-colors group ${
                activeView === "projects"
                  ? "bg-neutral-200"
                  : "hover:bg-neutral-200"
              }`}
            >
              <Cube
                size={16}
                weight={activeView === "projects" ? "fill" : "regular"}
              />
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#1d1d1f] text-white text-[10px] font-semibold rounded-[6px] shadow-[0px_1px_2px_0px_rgba(29,29,31,0.08)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap pointer-events-none z-50">
                Projects
              </div>
            </button>
          )}

          {/* Plus Icon - Opens App Library (always visible) */}
          <button
            onClick={() => onViewChange("apps")}
            className={`flex items-center justify-center rounded-[7px] relative w-8 h-8 transition-colors group ${
              activeView === "apps" ? "bg-neutral-200" : "hover:bg-neutral-200"
            }`}
          >
            <Plus
              size={16}
              weight={activeView === "apps" ? "bold" : "regular"}
            />
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-[#1d1d1f] text-white text-[10px] font-semibold rounded-[6px] shadow-[0px_1px_2px_0px_rgba(29,29,31,0.08)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap pointer-events-none z-50">
              Apps
            </div>
          </button>
      </div>

      {/* Spacer to push sign out to bottom */}
      <div className="flex-1" />

      {/* Sign Out Button */}
      <button
        onClick={signOut}
        className="flex items-center justify-center rounded-[7px] relative w-8 h-8 hover:bg-neutral-200 transition-colors group"
      >
        <SignOut size={16} weight="regular" className="text-neutral-600" />
        {/* Tooltip */}
        <div className="absolute left-full ml-2 px-2 py-1 bg-[#1d1d1f] text-white text-[10px] font-semibold rounded-[6px] shadow-[0px_1px_2px_0px_rgba(29,29,31,0.08)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap pointer-events-none z-50">
          Sign Out
        </div>
      </button>
    </div>
  );
}

