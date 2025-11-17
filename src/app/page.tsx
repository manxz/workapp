"use client";

import { useState, useEffect } from "react";
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
import { supabase } from "@/lib/supabase";

export default function Home() {
  const { user, profile, loading } = useAuth();
  const { users, loading: usersLoading } = useUsers();
  const { channels, loading: channelsLoading } = useChannels();
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
      return saved || "General";
    }
    return "General";
  });

  // Projects state with localStorage persistence
  const [projects, setProjects] = useState<Array<{
    id: string;
    name: string;
  }>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("projects");
      if (saved) {
        return JSON.parse(saved);
      }
    }
    return [
      { id: "General", name: "Chat" },
      { id: "Field Workers", name: "Field Workers" },
      { id: "Project Manager", name: "Project Manager" },
    ];
  });

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

  // Save projects to localStorage
  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem("projects", JSON.stringify(projects));
    }
  }, [projects]);

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
  const handleCreateProject = (name: string, description: string) => {
    const newProject = {
      id: name, // Use name as ID for simplicity (could use UUID in production)
      name,
    };
    setProjects([...projects, newProject]);
    setSelectedProject(newProject.id);
  };

  // Handle deleting a project
  const handleDeleteProject = async (projectId: string) => {
    if (projects.length <= 1) {
      alert("You must have at least one project");
      return;
    }

    try {
      // Delete all tasks associated with this project from Supabase
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("project", projectId);

      if (error) {
        console.error("Error deleting tasks:", error);
        alert(`Failed to delete project tasks: ${error.message || "Unknown error"}`);
        return;
      }

      // Remove project from state
      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);

      // Switch to the first remaining project if the deleted project was selected
      if (projectId === selectedProject && updatedProjects.length > 0) {
        setSelectedProject(updatedProjects[0].id);
      }
    } catch (error: any) {
      console.error("Error deleting project:", error);
      alert(`Failed to delete project: ${error?.message || "Unknown error"}`);
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
          onDeleteProject={handleDeleteProject}
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
              />
            )}
      </main>
    </div>
  );
}
