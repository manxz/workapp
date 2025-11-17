"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatSidebar from "@/components/ChatSidebar";
import ChatInput from "@/components/ChatInput";
import ChatHeader from "@/components/ChatHeader";
import ChatMessages from "@/components/ChatMessages";
import { useChat } from "@/hooks/useChat";

export default function Home() {
  const [activeView, setActiveView] = useState<"chat" | "projects">("chat");
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [selectedChat, setSelectedChat] = useState({
    id: "1",
    name: "Dan Ricart",
    avatar: "https://i.pravatar.cc/150?img=12",
  });

  // Use chat hook for real-time messaging
  const { messages, sendMessage } = useChat(selectedChat.id);

  // Sample direct messages data
  const directMessages = [
    {
      id: "1",
      name: "Dan Ricart",
      avatar: "https://i.pravatar.cc/150?img=12",
      hasUnread: true,
    },
    {
      id: "2",
      name: "Sofia Patel",
      avatar: "https://i.pravatar.cc/150?img=5",
      hasUnread: false,
    },
    {
      id: "3",
      name: "Maria Gomez",
      avatar: "https://i.pravatar.cc/150?img=9",
      hasUnread: false,
    },
  ];

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        hasUnreadMessages={hasUnreadMessages}
      />
      {activeView === "chat" && (
        <ChatSidebar
          directMessages={directMessages}
          selectedId={selectedChat.id}
          onSelectChat={(dm) =>
            setSelectedChat({ id: dm.id, name: dm.name, avatar: dm.avatar })
          }
        />
      )}
      <main className={`flex flex-col h-screen flex-1 ${activeView === "chat" ? "ml-[264px]" : "ml-16"}`}>
        {activeView === "chat" ? (
          <>
            <ChatHeader name={selectedChat.name} avatar={selectedChat.avatar} />
            <ChatMessages messages={messages} />
            <ChatInput
              channelName={selectedChat.name}
              onSendMessage={(text) => sendMessage(text)}
            />
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
