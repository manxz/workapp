"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import ChatSidebar from "@/components/ChatSidebar";
import ChatInput from "@/components/ChatInput";
import ChatHeader from "@/components/ChatHeader";
import ChatMessages from "@/components/ChatMessages";
import Login from "@/components/Login";
import ProfileSetup from "@/components/ProfileSetup";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import { useChannels } from "@/hooks/useChannels";

export default function Home() {
  const { user, profile, loading } = useAuth();
  const { users, loading: usersLoading } = useUsers();
  const { channels, loading: channelsLoading } = useChannels();
  const [activeView, setActiveView] = useState<"chat" | "projects">("chat");
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [selectedType, setSelectedType] = useState<"channel" | "dm">("channel");
  const [selectedChat, setSelectedChat] = useState<{
    id: string;
    name: string;
    avatar?: string;
  } | null>(null);

  // Auto-select #general channel when channels load
  useEffect(() => {
    if (channels.length > 0 && !selectedChat) {
      const generalChannel = channels.find(c => c.name === "general") || channels[0];
      setSelectedChat({
        id: generalChannel.id,
        name: generalChannel.name,
      });
      setSelectedType("channel");
    }
  }, [channels, selectedChat]);

  // Use chat hook for real-time messaging
  // For channels, use "channel-{id}" as conversation_id, for DMs use the user's id
  const conversationId = selectedChat 
    ? selectedType === "channel" 
      ? `channel-${selectedChat.id}`
      : selectedChat.id
    : "";
  
  const { messages, sendMessage } = useChat(conversationId);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-neutral-600">Loading...</p>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <Login />;
  }

  // Show profile setup if user hasn't set their name
  if (user && (!profile || !profile.full_name)) {
    return <ProfileSetup />;
  }

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
      <main className={`flex flex-col h-screen flex-1 ${activeView === "chat" ? "ml-[264px]" : "ml-16"}`}>
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
          <div className="flex-1 p-8">
            <h1 className="text-3xl font-semibold text-black">Projects</h1>
            <p className="mt-4 text-neutral-600">
              Lightweight project tracker similar to Linear - Coming soon!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
