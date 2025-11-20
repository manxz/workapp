"use client";

import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import Login from "@/components/Login";
import ProfileSetup from "@/components/ProfileSetup";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
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

function HomeContent() {
  const { user, profile, loading } = useAuth();
  const { unreadCount } = useUnreadMessages();
  
  // Update browser tab title with unread count
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) Workapp`;
    } else {
      document.title = "Workapp";
    }
  }, [unreadCount]);
  
  // Initialize active view from localStorage
  const [activeView, setActiveView] = useState<"chat" | "projects">(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("activeView");
      return (saved as "chat" | "projects") || "chat";
    }
    return "chat";
  });

  // Persist active view to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("activeView", activeView);
    }
  }, [activeView]);

  // Cross-app communication interface
  const appCommunication: AppCommunication = {
    navigateToApp: (appId: string, params?: Record<string, any>) => {
      // Navigate to different app
      if (appId === 'chat' || appId === 'projects') {
        setActiveView(appId);
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
        {/* Main Sidebar */}
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          hasUnreadMessages={unreadCount > 0}
        />

        {/* Render Active App */}
        {activeView === "chat" ? <ChatApp /> : <ProjectsApp />}
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

