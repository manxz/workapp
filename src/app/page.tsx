"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Mountains } from "@phosphor-icons/react";
import Sidebar from "@/components/Sidebar";
import ChatSidebar from "@/components/ChatSidebar";
import ChatInput from "@/components/ChatInput";
import ChatHeader from "@/components/ChatHeader";
import ChatMessages from "@/components/ChatMessages";
import ThreadPanel from "@/components/ThreadPanel";
import TypingIndicator from "@/components/TypingIndicator";
import Login from "@/components/Login";
import ProfileSetup from "@/components/ProfileSetup";
import ProjectsView from "@/components/ProjectsView";
import ProjectsSidebar from "@/components/ProjectsSidebar";
import NotificationPrompt from "@/components/NotificationPrompt";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import { useChannels } from "@/hooks/useChannels";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

export default function Home() {
  const { user, profile, loading } = useAuth();
  const { users } = useUsers();
  const { channels } = useChannels();
  const { projects, loading: projectsLoading, createProject, deleteProject } = useProjects();
  const { tasks: allTasks } = useTasks(); // Load all tasks to calculate counts
  const { hasUnread, markAsRead, unreadConversations } = useUnreadMessages();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Calculate total unread count for browser tab title
  const unreadCount = unreadConversations.size;
  
  // Update browser tab title with unread count
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) Workapp`;
    } else {
      document.title = "Workapp";
    }
  }, [unreadCount]);
  
  // Initialize state from localStorage if available
  const [activeView, setActiveView] = useState<"chat" | "projects">(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("activeView");
      return (saved as "chat" | "projects") || "chat";
    }
    return "chat";
  });
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
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const dragCounterRef = useRef(0);

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
  
  const { messages, sendMessage, typingUsers, broadcastTyping, broadcastStopTyping, toggleReaction, activeThread, loadThread, sendThreadReply, closeThread } = useChat(conversationId);

  // Wrap loadThread to update URL
  const handleOpenThread = (messageId: string) => {
    loadThread(messageId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('thread', messageId);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Wrap closeThread to update URL
  const handleCloseThread = () => {
    closeThread();
    const params = new URLSearchParams(searchParams.toString());
    params.delete('thread');
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Load thread from URL on mount or when conversation changes
  const threadIdFromUrl = searchParams.get('thread');
  useEffect(() => {
    if (threadIdFromUrl && conversationId && !activeThread) {
      // Small delay to ensure messages are loaded
      const timer = setTimeout(() => {
        loadThread(threadIdFromUrl);
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadIdFromUrl, conversationId]);
  
  // Clear thread param when conversation changes (but keep it if just refreshing same conversation)
  const prevConversationId = useRef(conversationId);
  useEffect(() => {
    if (prevConversationId.current && prevConversationId.current !== conversationId && threadIdFromUrl) {
      // Conversation changed and there's a thread param in URL - clear it
      const params = new URLSearchParams(searchParams.toString());
      params.delete('thread');
      router.replace(`?${params.toString()}`, { scroll: false });
      closeThread();
    }
    prevConversationId.current = conversationId;
  }, [conversationId, threadIdFromUrl, searchParams, router, closeThread]);

  // Reset pending files after they're passed to ChatInput
  useEffect(() => {
    if (pendingFiles.length > 0) {
      const timer = setTimeout(() => {
        setPendingFiles([]);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pendingFiles]);

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

  // Handle drag & drop for file uploads (only in chat view)
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeView !== "chat" || !selectedChat) return;
    
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDraggingFile(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDraggingFile(false);
    dragCounterRef.current = 0;
    
    if (activeView !== "chat" || !selectedChat) return;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        // Cap at 10 files maximum
        setPendingFiles(imageFiles.slice(0, 10));
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        hasUnreadMessages={unreadCount > 0}
      />
      {activeView === "chat" && (
        <ChatSidebar
          channels={channels.map(c => ({ 
            ...c, 
            hasUnread: hasUnread(`channel-${c.id}`) 
          }))}
          directMessages={users.map(u => ({ 
            ...u, 
            hasUnread: user ? hasUnread([user.id, u.id].sort().join("-")) : false
          }))}
          selectedId={selectedChat?.id}
          selectedType={selectedType}
          onSelectChannel={(channel) => {
            markAsRead(`channel-${channel.id}`);
            setSelectedChat({ id: channel.id, name: channel.name });
            setSelectedType("channel");
          }}
          onSelectChat={(dm) => {
            if (user) {
              markAsRead([user.id, dm.id].sort().join("-"));
            }
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
      <main 
        className={`flex flex-col h-screen flex-1 relative overflow-hidden transition-all duration-200 ${activeView === "chat" ? "ml-[264px]" : activeView === "projects" ? "ml-[264px]" : "ml-16"} ${activeThread ? "mr-[512px]" : ""}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag & Drop Overlay */}
            {isDraggingFile && activeView === "chat" && selectedChat && (
              <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none" style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)' }}>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
                    <Mountains size={32} weight="regular" className="text-neutral-400" />
                  </div>
                  <p className="text-sm font-medium text-neutral-600">
                    Upload to {selectedType === "channel" ? `#${selectedChat.name}` : selectedChat.name}
                  </p>
                </div>
              </div>
            )}

        {activeView === "chat" ? (
          selectedChat ? (
            <>
              {/* Header */}
              <ChatHeader 
                name={selectedType === "channel" ? `#${selectedChat.name}` : selectedChat.name} 
                avatar={selectedType === "dm" ? selectedChat.avatar : undefined} 
              />
              
              {/* Messages - scrollable, takes remaining space */}
              <ChatMessages
                messages={messages}
                currentUserId={user?.id}
                onReaction={toggleReaction}
                onOpenThread={handleOpenThread}
              />
              
              {/* Input area - grows with content */}
              <ChatInput
                channelName={selectedType === "channel" ? `#${selectedChat.name}` : selectedChat.name}
                onSendMessage={(text, files) => sendMessage(text, files)}
                onTyping={broadcastTyping}
                onStopTyping={broadcastStopTyping}
                externalFiles={pendingFiles}
              />
              
              {/* Typing indicator - show main chat typing + all thread typing */}
              <TypingIndicator typingUsers={typingUsers} />
              
              <NotificationPrompt />
              
              {/* Thread Panel */}
              {activeThread && (
                <ThreadPanel
                  parentMessage={activeThread.parentMessage}
                  replies={activeThread.replies}
                  onClose={handleCloseThread}
                  onSendReply={(text) => sendThreadReply(activeThread.parentMessage.id, text)}
                  currentUserId={user?.id}
                  onReaction={toggleReaction}
                  typingUsers={typingUsers}
                  onTyping={broadcastTyping}
                  onStopTyping={broadcastStopTyping}
                />
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-medium text-neutral-600 mb-2">No channels or users yet</p>
                <p className="text-sm text-neutral-500">Create a channel or invite someone to start chatting!</p>
              </div>
            </div>
          )
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
