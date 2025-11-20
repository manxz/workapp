"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mountains } from "@phosphor-icons/react";
import ChatSidebar from "@/components/ChatSidebar";
import ChatInput from "@/components/ChatInput";
import ChatHeader from "@/components/ChatHeader";
import ChatMessages from "@/components/ChatMessages";
import ThreadPanel from "@/components/ThreadPanel";
import TypingIndicator from "@/components/TypingIndicator";
import NotificationPrompt from "@/components/NotificationPrompt";
import { useAuth } from "@/contexts/AuthContext";
import { useChannels } from "@/hooks/useChannels";
import { useUsers } from "@/hooks/useUsers";
import { useChat } from "@/hooks/useChat";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

/**
 * Chat App Module
 * 
 * Complete messaging system with:
 * - Channels and direct messages
 * - Real-time messaging
 * - Thread conversations
 * - Reactions
 * - Typing indicators
 * - Image uploads with drag & drop
 * - Unread message tracking
 * 
 * This is extracted from the main page.tsx for code splitting.
 */
export default function ChatApp() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadIdFromUrl = searchParams.get("thread");

  const { channels } = useChannels();
  const { users } = useUsers();
  const { hasUnread, markAsRead } = useUnreadMessages();

  // Restore last conversation from localStorage
  const [selectedChat, setSelectedChat] = useState<{ id: string; name: string; avatar?: string } | null>(() => {
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
  
  const [selectedType, setSelectedType] = useState<"channel" | "dm">(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("selectedChatType");
      return (saved as "channel" | "dm") || "channel";
    }
    return "channel";
  });
  
  // Drag & drop state
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const dragCounterRef = useRef(0);

  // Get conversationId based on selectedChat and type
  const conversationId = selectedChat
    ? selectedType === "channel"
      ? `channel-${selectedChat.id}`
      : user
      ? [user.id, selectedChat.id].sort().join("-")
      : ""
    : "";

  // Chat hook
  const {
    messages,
    sendMessage,
    loading,
    typingUsers,
    broadcastTyping,
    broadcastStopTyping,
    toggleReaction,
    activeThread,
    loadThread,
    sendThreadReply,
    closeThread,
  } = useChat(conversationId);

  // Wrap thread functions to update URL
  const handleOpenThread = (messageId: string) => {
    loadThread(messageId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("thread", messageId);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleCloseThread = () => {
    closeThread();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("thread");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Default to first channel if no selection
  useEffect(() => {
    if (!selectedChat && channels.length > 0) {
      const firstChannel = channels[0];
      setSelectedChat({ id: firstChannel.id, name: firstChannel.name });
      setSelectedType("channel");
    }
  }, [selectedChat, channels]);

  // Persist selected chat to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedChat) {
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

  // Restore thread from URL on mount
  useEffect(() => {
    if (threadIdFromUrl && messages.length > 0) {
      const timer = setTimeout(() => {
        loadThread(threadIdFromUrl);
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadIdFromUrl, messages.length]);

  // Clear thread when conversation changes
  const prevConversationId = useRef(conversationId);
  useEffect(() => {
    if (prevConversationId.current && prevConversationId.current !== conversationId && threadIdFromUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("thread");
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

  // Drag & drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedChat) return;
    
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
    
    if (!selectedChat) return;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        setPendingFiles(imageFiles.slice(0, 10));
      }
    }
  };

  return (
    <>
      {/* Chat Sidebar */}
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

      {/* Main Chat Area */}
      <main 
        className={`flex flex-col h-screen flex-1 relative overflow-hidden transition-all duration-200 ml-[264px] ${activeThread ? "mr-[512px]" : ""}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag & Drop Overlay */}
        {isDraggingFile && selectedChat && (
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

        {selectedChat ? (
          <>
            {/* Header */}
            <ChatHeader 
              name={selectedType === "channel" ? `#${selectedChat.name}` : selectedChat.name} 
              avatar={selectedType === "dm" ? selectedChat.avatar : undefined} 
            />
            
            {/* Messages */}
            <ChatMessages
              messages={messages}
              currentUserId={user?.id}
              onReaction={toggleReaction}
              onOpenThread={handleOpenThread}
            />
            
            {/* Input */}
            <ChatInput
              channelName={selectedType === "channel" ? `#${selectedChat.name}` : selectedChat.name}
              onSendMessage={(text, files) => sendMessage(text, files)}
              onTyping={broadcastTyping}
              onStopTyping={broadcastStopTyping}
              externalFiles={pendingFiles}
            />
            
            {/* Typing indicator */}
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
        ) : channels.length === 0 && users.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-neutral-600 mb-2">No channels or users yet</p>
              <p className="text-sm text-neutral-500">Create a channel or invite someone to start chatting!</p>
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}

