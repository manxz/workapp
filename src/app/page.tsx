"use client";

import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import Login from "@/components/Login";
import ProfileSetup from "@/components/ProfileSetup";
import OrgSetup from "@/components/OrgSetup";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useAppPreferences } from "@/hooks/useAppPreferences";
import { useChannels } from "@/hooks/useChannels";
import { useUsers } from "@/hooks/useUsers";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { useLists } from "@/hooks/useLists";
import { usePresence } from "@/hooks/usePresence";
import { useGlobalMessageListener } from "@/hooks/useGlobalMessageListener";
import { useUnreadDots } from "@/hooks/useUnreadDots";
import { AppProvider, AppCommunication } from "@/apps/AppContext";
import { AVAILABLE_APPS } from "@/apps/registry";
import { setupNotificationSound } from "@/global/notificationSound";
import { setupFavicon } from "@/global/favicon";
import { setOriginalTitle, clearUnreadCount } from "@/global/tabTitle";

// Dynamically import apps for code splitting
const ChatApp = dynamic(() => import("@/apps/chat/ChatApp"), {
  loading: () => <div className="flex-1 flex items-center justify-center"><p className="text-neutral-600">Loading Chat...</p></div>,
  ssr: false,
});

const ProjectsApp = dynamic(() => import("@/apps/projects/ProjectsApp"), {
  loading: () => <div className="flex-1 flex items-center justify-center"><p className="text-neutral-600">Loading Projects...</p></div>,
  ssr: false,
});

const NotepadApp = dynamic(() => import("@/apps/notepad/NotepadApp"), {
  loading: () => <div className="flex-1 flex items-center justify-center"><p className="text-neutral-600">Loading Notepad...</p></div>,
  ssr: false,
});

const CalendarApp = dynamic(() => import("@/apps/calendar/CalendarApp"), {
  loading: () => <div className="flex-1 flex items-center justify-center"><p className="text-neutral-600">Loading Calendar...</p></div>,
  ssr: false,
});

const AppLibraryView = dynamic(() => import("@/apps/library/AppLibraryView"), {
  loading: () => <div className="flex-1 flex items-center justify-center"><p className="text-neutral-600">Loading Apps...</p></div>,
  ssr: false,
});

function HomeContent() {
  const { user, profile, organization, loading } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const { isAppEnabled, toggleApp, loading: appsLoading } = useAppPreferences();
  const { channels, loading: channelsLoading } = useChannels();
  const { users, loading: usersLoading } = useUsers();
  const { projects, createProject, deleteProject, loading: projectsLoading } = useProjects();
  const { tasks, createTask, updateTask, deleteTask, loading: tasksLoading } = useTasks();
  const { lists, createList, deleteList, refreshLists, loading: listsLoading } = useLists();
  
  // Initialize presence tracking globally (stays active across all apps)
  const { getPresence } = usePresence();
  
  // Initialize unread dots (ephemeral state)
  const { hasUnread: hasUnreadDot, hasAnyUnread, markUnread: markUnreadDot, markRead: markReadDot } = useUnreadDots();
  
  // Track current conversation ID for the global message listener
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  
  // Initialize notification systems on mount
  useEffect(() => {
    setupNotificationSound();
    setupFavicon();
    setOriginalTitle("Workapp");
  }, []);
  
  // Clear unread count when window is focused
  useEffect(() => {
    const handleFocus = () => {
      clearUnreadCount();
    };

    window.addEventListener('focus', handleFocus);
    
    // Also clear on mount if window is already focused
    if (document.hasFocus()) {
      clearUnreadCount();
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
  
  // Global message listener (stays active across all apps)
  useGlobalMessageListener(currentConversationId, markUnreadDot);
  
  // Note: Tab title is now managed by src/global/tabTitle.ts
  
  // Initialize active view from localStorage
  const [activeView, setActiveView] = useState<"chat" | "projects" | "notes" | "calendar" | "apps">(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("activeView");
      return (saved as "chat" | "projects" | "notes" | "calendar" | "apps") || "chat";
    }
    return "chat";
  });

  // Persist active view to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("activeView", activeView);
    }
  }, [activeView]);

  // Redirect if current app is disabled
  useEffect(() => {
    // Only redirect once loading is complete AND preferences are loaded
    // Don't redirect during initial load when enabledApps might be empty
    if (appsLoading || loading || channelsLoading || projectsLoading || listsLoading) return;

    // If viewing a disabled app, redirect to chat
    // (Chat is always enabled, so no need to check it)
    if (activeView === "projects" && !isAppEnabled("projects")) {
      setActiveView("chat");
    }
    if (activeView === "notes" && !isAppEnabled("notes")) {
      setActiveView("chat");
    }
    if (activeView === "calendar" && !isAppEnabled("calendar")) {
      setActiveView("chat");
    }
  }, [activeView, isAppEnabled, appsLoading, loading, channelsLoading, projectsLoading, listsLoading]);

  // Cross-app communication interface
  const appCommunication: AppCommunication = {
    navigateToApp: (appId: string, params?: Record<string, any>) => {
      // Navigate to different app
      if (appId === 'chat' || appId === 'projects' || appId === 'calendar' || appId === 'apps') {
        setActiveView(appId as "chat" | "projects" | "calendar" | "apps");
      }
      // In the future, handle params for deep linking
      // e.g., navigateToApp('projects', { projectId: '123', taskId: '456' })
    },
    
    createProjectTask: async (projectId: string, taskData) => {
      // TODO: Implement when cross-app actions are needed
      // This would create a task and optionally switch to Projects view
      console.log('Create project task:', { projectId, taskData });
    },
    
    openChat: (conversationId: string) => {
      // TODO: Implement when cross-app actions are needed
      // This would switch to Chat and open specific conversation
      console.log('Open chat:', conversationId);
      setActiveView('chat');
    },
    
    getCurrentApp: () => activeView,
    
    shareData: (data: any) => {
      // TODO: Implement inter-app data sharing if needed
      console.log('Shared data:', data);
    },
  };

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-neutral-600">Loading...</p>
      </div>
    );
  }

  // Show login if not authenticated
  if (!loading && !user) {
    return <Login />;
  }

  // Show profile setup if user hasn't set their name
  if (user && (!profile || !profile.full_name)) {
    return <ProfileSetup />;
  }

  // Show org setup if user has no organization
  if (user && profile && !organization) {
    return <OrgSetup />;
  }

  return (
    <AppProvider value={appCommunication}>
      <div className="flex h-screen overflow-hidden bg-white">
        {/* Main Sidebar - Pass app preferences down */}
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          hasUnreadMessages={hasAnyUnread()}
          enabledApps={isAppEnabled}
          appsLoading={appsLoading}
        />

        {/* Render Active App */}
        {activeView === "chat" && (
          <ChatApp 
            channels={channels} 
            users={users} 
            getPresence={getPresence}
            hasUnreadDot={hasUnreadDot}
            markReadDot={markReadDot}
            onConversationChange={setCurrentConversationId}
          />
        )}
        {activeView === "projects" && (
          <ProjectsApp
            projects={projects}
            tasks={tasks}
            createProject={createProject}
            deleteProject={deleteProject}
            createTask={createTask}
            updateTask={updateTask}
            deleteTask={deleteTask}
          />
        )}
        {activeView === "notes" && (
          <NotepadApp 
            lists={lists}
            createList={createList}
            deleteList={deleteList}
            refreshLists={refreshLists}
          />
        )}
        {activeView === "calendar" && <CalendarApp />}
        {activeView === "apps" && <AppLibraryView sharedToggleApp={toggleApp} sharedIsAppEnabled={isAppEnabled} />}
      </div>
    </AppProvider>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-neutral-600">Loading...</p>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

