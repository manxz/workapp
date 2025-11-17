"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import ChatSidebar from "@/components/ChatSidebar";
import ChatInput from "@/components/ChatInput";
import ChatHeader from "@/components/ChatHeader";
import ChatMessages from "@/components/ChatMessages";
import Login from "@/components/Login";
import ProfileSetup from "@/components/ProfileSetup";
import ProjectsView from "@/components/ProjectsView";
import ProjectsSidebar from "@/components/ProjectsSidebar";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import { useChannels } from "@/hooks/useChannels";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const { user, profile, loading } = useAuth();
  const { users, loading: usersLoading } = useUsers();
  const { channels, loading: channelsLoading } = useChannels();
  const { projects, loading: projectsLoading, createProject, deleteProject } = useProjects();
  const { tasks: allTasks } = useTasks(); // Load all tasks to calculate counts
  // Initialize state from localStorage if available
  const [activeView, setActiveView] = useState<"chat" | "projects">(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("activeView");
      return (saved as "chat" | "projects") || "chat";
    }
    return "chat";
  });
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [selectedType, setSelectedType] = useState<"channel" | "dm">(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("selectedChatType");
      return (saved as "channel" | "dm") || "channel";
    }
    return "channel";
  });
  const [selectedChat, setSelectedChat] = useState<{
    id: string;
    name: string;
    avatar?: string;
  } | null>(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem("selectedChatId");
      const savedName = localStorage.getItem("selectedChatName");
      const savedAvatar = localStorage.getItem("selectedChatAvatar");
      if (savedId && savedName) {
        return {
          id: savedId,
          name: savedName,
          avatar: savedAvatar || undefined,
        };
      }
    }
    return null;
  });
  const [selectedProject, setSelectedProject] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("selectedProject");
      return saved || "";
    }
    return "";
  });

  // Calculate task counts per project
  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allTasks.forEach((task) => {
      counts[task.project] = (counts[task.project] || 0) + 1;
    });
    return counts;
  }, [allTasks]);

  // Auto-select #general only if no saved state and channels are loaded
  useEffect(() => {
    if (!user || loading) return;
    if (selectedChat) return; // Already have a selection (from localStorage or previous)
    if (channels.length === 0) return; // Channels not loaded yet

    // Only auto-select #general if we don't have a saved state
    const generalChannel = channels.find(c => c.name === "general") || channels[0];
    setSelectedChat({
      id: generalChannel.id,
      name: generalChannel.name,
    });
    setSelectedType("channel");
  }, [channels, user, loading, selectedChat]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (activeView) {
      localStorage.setItem("activeView", activeView);
    }
  }, [activeView]);

  useEffect(() => {
    if (selectedChat) {
      localStorage.setItem("selectedChatId", selectedChat.id);
      localStorage.setItem("selectedChatName", selectedChat.name);
      localStorage.setItem("selectedChatType", selectedType);
      if (selectedChat.avatar) {
        localStorage.setItem("selectedChatAvatar", selectedChat.avatar);
      } else {
        localStorage.removeItem("selectedChatAvatar");
      }
    }
  }, [selectedChat, selectedType]);

  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem("selectedProject", selectedProject);
    }
  }, [selectedProject]);

  // Auto-select first project if none selected and projects are loaded
  useEffect(() => {
    if (!user || projectsLoading) return;
    if (selectedProject) return; // Already have a selection
    if (projects.length === 0) return; // No projects yet

    // Select the first project
    setSelectedProject(projects[0].id);
  }, [projects, user, projectsLoading, selectedProject]);

  // Use chat hook for real-time messaging
  // For channels, use "channel-{id}" as conversation_id
  // For DMs, create a consistent ID by sorting both user IDs
  const conversationId = selectedChat 
    ? selectedType === "channel" 
      ? `channel-${selectedChat.id}`
      : user 
        ? [user.id, selectedChat.id].sort().join("-")
        : ""
    : "";
  
  const { messages, sendMessage } = useChat(conversationId);

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-neutral-600">Loading...</p>
      </div>
    );
  }

  // Show login if not authenticated (only after loading completes)
  if (!loading && !user) {
    return <Login />;
  }

  // Show profile setup if user hasn't set their name
  if (user && (!profile || !profile.full_name)) {
    return <ProfileSetup />;
  }

  // Handle creating a new project
  const handleCreateProject = async (name: string, description: string) => {
    const newProject = await createProject(name, description);
    if (newProject) {
      setSelectedProject(newProject.id);
    }
  };

  // Handle deleting a project
  const handleDeleteProject = async (projectId: string) => {
    if (projects.length <= 1) {
      alert("You must have at least one project");
      return;
    }

    const success = await deleteProject(projectId);
    
    if (success) {
      // Switch to the first remaining project if the deleted project was selected
      if (projectId === selectedProject && projects.length > 1) {
        const remainingProjects = projects.filter(p => p.id !== projectId);
        if (remainingProjects.length > 0) {
          setSelectedProject(remainingProjects[0].id);
        }
      }
    } else {
      alert("Failed to delete project");
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        hasUnreadMessages={hasUnreadMessages}
      />
      {activeView === "chat" && (
        <ChatSidebar
          channels={channels}
          directMessages={users}
          selectedId={selectedChat?.id}
          selectedType={selectedType}
          onSelectChannel={(channel) => {
            setSelectedChat({ id: channel.id, name: channel.name });
            setSelectedType("channel");
          }}
          onSelectChat={(dm) => {
            setSelectedChat({ id: dm.id, name: dm.name, avatar: dm.avatar });
            setSelectedType("dm");
          }}
        />
      )}
      {activeView === "projects" && (
        <ProjectsSidebar
          projects={projects}
          selectedId={selectedProject}
          onSelectProject={(project) => {
            setSelectedProject(project.id);
          }}
          onCreateProject={handleCreateProject}
          taskCounts={taskCounts}
        />
      )}
      <main className={`flex flex-col h-screen flex-1 ${activeView === "chat" ? "ml-[264px]" : activeView === "projects" ? "ml-[264px]" : "ml-16"}`}>
        {activeView === "chat" ? (
          <>
            {selectedChat ? (
              <>
                <ChatHeader 
                  name={selectedType === "channel" ? `#${selectedChat.name}` : selectedChat.name} 
                  avatar={selectedType === "dm" ? selectedChat.avatar : undefined} 
                />
                <ChatMessages messages={messages} />
                <ChatInput
                  channelName={selectedType === "channel" ? `#${selectedChat.name}` : selectedChat.name}
                  onSendMessage={(text) => sendMessage(text)}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-medium text-neutral-600 mb-2">No channels or users yet</p>
                  <p className="text-sm text-neutral-500">Create a channel or invite someone to start chatting!</p>
                </div>
              </div>
            )}
          </>
            ) : (
              <ProjectsView 
                selectedProject={selectedProject}
                projectName={projects.find(p => p.id === selectedProject)?.name || "General"}
                onDeleteProject={handleDeleteProject}
              />
            )}
      </main>
    </div>
  );
}
