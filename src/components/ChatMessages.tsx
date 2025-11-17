"use client";

import { useEffect, useRef } from "react";

export type Message = {
  id: string;
  author: string;
  avatar: string;
  timestamp: string;
  text: string;
};

type ChatMessagesProps = {
  messages: Message[];
};

export default function ChatMessages({ messages }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDateDivider = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    // Otherwise return formatted date
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const shouldShowDateDivider = (currentMsg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.timestamp).toDateString();
    const prevDate = new Date(prevMsg.timestamp).toDateString();
    return currentDate !== prevDate;
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-4 min-h-full flex flex-col justify-end">
        {messages.map((message, index) => (
          <div key={message.id}>
            {shouldShowDateDivider(message, index > 0 ? messages[index - 1] : null) && (
              <div className="flex items-center justify-center gap-1.5 -mx-4 px-0 py-1.5">
                <div className="flex-1 h-px bg-neutral-300" />
                <p className="text-[11px] font-medium text-neutral-500 opacity-80 whitespace-nowrap px-1.5">
                  {formatDateDivider(message.timestamp)}
                </p>
                <div className="flex-1 h-px bg-neutral-300" />
              </div>
            )}
            <div className="flex gap-1.5 px-0 py-1.5 max-w-full">
              {/* Avatar */}
              <img
                src={message.avatar}
                alt={message.author}
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
              
              {/* Message Content */}
              <div className="flex flex-col min-w-0 flex-1">
                {/* Message Header */}
                <div className="flex items-center gap-1">
                  <span className="text-[13px] font-semibold text-black">
                    {message.author}
                  </span>
                  <span className="text-[11px] font-medium text-neutral-500 opacity-80">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                
                {/* Message Text */}
                <p className="text-[13px] font-medium text-black opacity-90 leading-relaxed whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  {message.text}
                </p>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

