"use client";

import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import Login from "@/components/Login";
import ProfileSetup from "@/components/ProfileSetup";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useAppPreferences } from "@/hooks/useAppPreferences";
import { useChannels } from "@/hooks/useChannels";
import { useUsers } from "@/hooks/useUsers";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { AppProvider, AppCommunication } from "@/apps/AppContext";
import { AVAILABLE_APPS } from "@/apps/registry";

// Dynamically import apps for code splitting
const ChatApp = dynamic(() => import("@/apps/chat/ChatApp"), {
  loading: () => <div className="flex-1 flex items-center justify-center"><p className="text-neutral-600">Loading Chat...</p></div>,
  ssr: false,
});

const ProjectsApp = dynamic(() => import("@/apps/projects/ProjectsApp"), {
  loading: () => <div className="flex-1 flex items-center justify-center"><p className="text-neutral-600">Loading Projects...</p></div>,
  ssr: false,
});

const AppLibraryView = dynamic(() => import("@/apps/library/AppLibraryView"), {
  loading: () => <div className="flex-1 flex items-center justify-center"><p className="text-neutral-600">Loading Apps...</p></div>,
  ssr: false,
});

function HomeContent() {
  const { user, profile, loading } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const { isAppEnabled, toggleApp, loading: appsLoading } = useAppPreferences();
  const { channels, loading: channelsLoading } = useChannels();
  const { users, loading: usersLoading } = useUsers();
  const { projects, createProject, deleteProject, loading: projectsLoading } = useProjects();
  const { tasks, createTask, updateTask, deleteTask, loading: tasksLoading } = useTasks();
  
  // Update browser tab title with unread count
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) Workapp`;
    } else {
      document.title = "Workapp";
    }
  }, [unreadCount]);
  
  // Initialize active view from localStorage
  const [activeView, setActiveView] = useState<"chat" | "projects" | "apps">(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("activeView");
      return (saved as "chat" | "projects" | "apps") || "chat";
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
    // Only redirect once loading is complete
    if (appsLoading) return;

    // If viewing a disabled app, redirect to chat
    // (Chat is always enabled, so no need to check it)
    if (activeView === "projects" && !isAppEnabled("projects")) {
      setActiveView("chat");
    }
  }, [activeView, isAppEnabled, appsLoading]);

  // Cross-app communication interface
  const appCommunication: AppCommunication = {
    navigateToApp: (appId: string, params?: Record<string, any>) => {
      // Navigate to different app
      if (appId === 'chat' || appId === 'projects' || appId === 'apps') {
        setActiveView(appId as "chat" | "projects" | "apps");
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

  return (
    <AppProvider value={appCommunication}>
      <div className="flex min-h-screen bg-white">
        {/* Main Sidebar - Pass app preferences down */}
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          hasUnreadMessages={unreadCount > 0}
          enabledApps={isAppEnabled}
          appsLoading={appsLoading}
        />

        {/* Render Active App */}
        {activeView === "chat" && <ChatApp channels={channels} users={users} />}
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

