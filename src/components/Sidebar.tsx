"use client";

import { ChatCenteredText, Cube, Notepad, Calendar, Plus, SignOut } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";

type SidebarProps = {
  activeView: "chat" | "projects" | "notes" | "calendar" | "apps";
  onViewChange: (view: "chat" | "projects" | "notes" | "calendar" | "apps") => void;
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
  const { signOut, organization } = useAuth();

  // Only show enabled apps (wait for loading to complete to prevent flash)
  const showChat = !appsLoading && enabledApps('chat');
  const showProjects = !appsLoading && enabledApps('projects');
  const showNotepad = !appsLoading && enabledApps('notes');
  const showCalendar = !appsLoading && enabledApps('calendar');

  return (
    <div className="bg-neutral-100 border-r border-neutral-200 flex flex-col h-screen items-center px-0 py-4 w-16 fixed left-0 top-0 z-40 overflow-visible">
      {/* Logo Container - 24x24 org logo or default app logo */}
      <div className="flex flex-col gap-3 items-center w-full mb-4">
        <div className="flex items-center justify-center rounded-md w-6 h-6 overflow-hidden">
          {organization?.logo_url ? (
            <Image
              src={organization.logo_url}
              alt={organization.name || "Organization"}
              width={24}
              height={24}
              className="w-6 h-6 object-cover rounded-md"
            />
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="6" fill="#06DF79"/>
              <path d="M12 6.5V17.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 9L17 15" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 15L17 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
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
                <div 
                  className={`absolute top-2 left-5 w-1.5 h-1.5 rounded-full ${
                    activeView === "chat" 
                      ? "[box-shadow:0_0_0_1.5px_#e5e5e5]" 
                      : "[box-shadow:0_0_0_1.5px_#FAFAFA] group-hover:[box-shadow:0_0_0_1.5px_#e5e5e5]"
                  }`}
                  style={{ 
                    backgroundColor: '#FF6663',
                  }} 
                />
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

          {/* Notepad Icon - Only show if enabled */}
          {showNotepad && (
            <button
              onClick={() => onViewChange("notes")}
              className={`flex items-center justify-center rounded-[7px] relative w-8 h-8 transition-colors group ${
                activeView === "notes"
                  ? "bg-neutral-200"
                  : "hover:bg-neutral-200"
              }`}
            >
              <Notepad
                size={16}
                weight={activeView === "notes" ? "fill" : "regular"}
              />
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#1d1d1f] text-white text-[10px] font-semibold rounded-[6px] shadow-[0px_1px_2px_0px_rgba(29,29,31,0.08)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap pointer-events-none z-50">
                Notepad
              </div>
            </button>
          )}

          {/* Calendar Icon - Only show if enabled */}
          {showCalendar && (
            <button
              onClick={() => onViewChange("calendar")}
              className={`flex items-center justify-center rounded-[7px] relative w-8 h-8 transition-colors group ${
                activeView === "calendar"
                  ? "bg-neutral-200"
                  : "hover:bg-neutral-200"
              }`}
            >
              <Calendar
                size={16}
                weight={activeView === "calendar" ? "fill" : "regular"}
              />
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#1d1d1f] text-white text-[10px] font-semibold rounded-[6px] shadow-[0px_1px_2px_0px_rgba(29,29,31,0.08)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap pointer-events-none z-50">
                Calendar
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

