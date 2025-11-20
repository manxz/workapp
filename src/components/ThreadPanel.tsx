"use client";

import { X, Scribble, Stack } from "@phosphor-icons/react";
import { useRef, useEffect } from "react";
import type { Message } from "@/hooks/useChat";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";

type ThreadPanelProps = {
  parentMessage: Message;
  replies: Message[];
  onClose: () => void;
  onSendReply: (text: string) => void;
  currentUserId?: string;
  onReaction?: (messageId: string, emoji: string) => void;
  typingUsers?: { userId: string; userName: string; threadId?: string }[];
  onTyping?: (threadId?: string) => void;
  onStopTyping?: (threadId?: string) => void;
};

export default function ThreadPanel({
  parentMessage,
  replies,
  onClose,
  onSendReply,
  currentUserId,
  onReaction,
  typingUsers = [],
  onTyping,
  onStopTyping,
}: ThreadPanelProps) {
  // Filter typing users to only show those typing in this thread
  const threadTypingUsers = typingUsers.filter(u => u.threadId === parentMessage.id);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousReplyCountRef = useRef(0);

  // Only scroll to bottom when new replies are added, not when existing replies update (e.g., reactions)
  useEffect(() => {
    const currentCount = replies.length;
    const previousCount = previousReplyCountRef.current;
    
    // Only scroll if reply count increased (new reply added)
    if (currentCount > previousCount && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    
    previousReplyCountRef.current = currentCount;
  }, [replies]);

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

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const shouldShowDateDivider = (message: Message, prevMessage: Message | null) => {
    if (!prevMessage) return true;
    const currentDate = new Date(message.timestamp).toDateString();
    const prevDate = new Date(prevMessage.timestamp).toDateString();
    return currentDate !== prevDate;
  };

  const linkifyText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0070F3] hover:underline"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const allMessages = [parentMessage, ...replies];

  return (
    <div className="fixed top-0 right-0 h-screen w-[512px] bg-white border-l border-neutral-200 flex flex-col z-50 shadow-xl animate-slide-in">
      {/* Header - matches ChatHeader styling */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-neutral-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Scribble size={18} weight="bold" className="text-neutral-900" />
          <span className="text-[15px] font-semibold text-black">Thread</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-neutral-100 rounded transition-colors"
          aria-label="Close thread"
        >
          <X size={20} weight="regular" className="text-neutral-600" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 py-4 flex flex-col justify-end min-h-full">
          {allMessages.map((message, index) => (
            <div key={message.id}>
              {shouldShowDateDivider(message, index > 0 ? allMessages[index - 1] : null) && (
                <div className="flex items-center justify-center gap-1.5 -mx-4 px-0 py-1.5">
                  <div className="flex-1 h-px bg-neutral-300" />
                  <p className="text-[11px] font-medium text-neutral-500 opacity-80 whitespace-nowrap px-1.5">
                    {formatDateDivider(message.timestamp)}
                  </p>
                  <div className="flex-1 h-px bg-neutral-300" />
                </div>
              )}
              
              <div className="group relative -mx-4 px-4 py-1.5 hover:bg-[#F5F5F5] transition-colors">
                <div className="flex gap-1.5 max-w-full">
                  <img
                    src={message.avatar}
                    alt={message.author}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                  
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[13px] font-semibold text-black">
                        {message.author}
                      </span>
                      <span className="text-[11px] font-medium text-neutral-500 opacity-80">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    
                    {message.text && (
                      <p className="text-[13px] font-medium text-black opacity-90 leading-normal whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        {linkifyText(message.text)}
                      </p>
                    )}
                    
                    {/* Reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {message.reactions.map(({ emoji, userIds }) => {
                          const hasReacted = currentUserId && userIds.includes(currentUserId);
                          const count = userIds.length;
                          
                          return (
                            <button
                              key={emoji}
                              onClick={() => onReaction?.(message.id, emoji)}
                              className={`flex items-center gap-1 h-5 px-2 rounded-[11px] font-medium text-[11px] transition-colors ${
                                hasReacted
                                  ? 'bg-[rgba(0,112,243,0.16)] border border-[#0070f3] text-[#0070f3]'
                                  : 'bg-[#e9e9e9] hover:bg-[#d9d9d9] text-[#6a6a6a]'
                              }`}
                            >
                              <span className="text-[13px] leading-none">{emoji}</span>
                              <span>{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons - shown on hover (no reply button in threads) */}
                <div className="absolute right-4 top-[-13px] hidden group-hover:flex flex-col items-end">
                  <div className="bg-white border border-[rgba(29,29,31,0.2)] rounded-full px-[6px] py-[2px] flex gap-1 items-center">
                    {/* Quick Reactions */}
                    <button 
                      onClick={() => onReaction?.(message.id, '👍')}
                      className="p-2 hover:bg-neutral-100 rounded transition-colors w-5 h-5 flex items-center justify-center"
                    >
                      <span className="text-[14px] leading-none">👍</span>
                    </button>
                    <button 
                      onClick={() => onReaction?.(message.id, '❤️')}
                      className="p-2 hover:bg-neutral-100 rounded transition-colors w-5 h-5 flex items-center justify-center"
                    >
                      <span className="text-[14px] leading-none">❤️</span>
                    </button>
                    <button 
                      onClick={() => onReaction?.(message.id, '💯')}
                      className="p-2 hover:bg-neutral-100 rounded transition-colors w-5 h-5 flex items-center justify-center"
                    >
                      <span className="text-[14px] leading-none">💯</span>
                    </button>
                    <button 
                      onClick={() => onReaction?.(message.id, '😂')}
                      className="p-2 hover:bg-neutral-100 rounded transition-colors w-5 h-5 flex items-center justify-center"
                    >
                      <span className="text-[14px] leading-none">😂</span>
                    </button>
                    <button 
                      onClick={() => onReaction?.(message.id, '😢')}
                      className="p-2 hover:bg-neutral-100 rounded transition-colors w-5 h-5 flex items-center justify-center"
                    >
                      <span className="text-[14px] leading-none">😢</span>
                    </button>
                    <button 
                      onClick={() => onReaction?.(message.id, '😡')}
                      className="p-2 hover:bg-neutral-100 rounded transition-colors w-5 h-5 flex items-center justify-center"
                    >
                      <span className="text-[14px] leading-none">😡</span>
                    </button>
                    
                    {/* More Actions */}
                    <button className="p-[2px] hover:bg-neutral-100 rounded transition-colors">
                      <Stack size={16} weight="regular" className="text-[#6a6a6a]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - reuse ChatInput component */}
      <div className="flex-shrink-0">
        <ChatInput
          channelName="Thread"
          onSendMessage={(text) => onSendReply(text)}
          onTyping={() => onTyping?.(parentMessage.id)}
          onStopTyping={() => onStopTyping?.(parentMessage.id)}
        />
        
        {/* Typing Indicator - only show users typing in this thread */}
        <TypingIndicator typingUsers={threadTypingUsers} />
      </div>
    </div>
  );
}

