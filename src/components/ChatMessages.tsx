"use client";

import { useEffect, useRef, memo, useState } from "react";
import { X, ArrowBendUpLeft, Stack } from "@phosphor-icons/react";

export type Message = {
  id: string;
  author: string;
  avatar: string;
  timestamp: string;
  text: string;
  imageUrl?: string; // Legacy single image
  imageUrls?: string[]; // Multiple images
  reactions?: Array<{ emoji: string; userIds: string[] }>; // Ordered array to maintain insertion order
};

type ChatMessagesProps = {
  messages: Message[];
  currentUserId?: string;
  onReaction?: (messageId: string, emoji: string) => void;
};

// Helper function to detect and linkify URLs
function linkifyText(text: string) {
  // Match URLs with protocol (http/https) OR www. OR common domain patterns
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|(?:[a-zA-Z0-9-]+\.)+(?:com|org|net|edu|gov|io|co|dev|app|ai|xyz|tech|me|info|biz|us|uk|ca|de|jp|fr|au|in|br|cn|ru|nl|se|no|dk|fi|it|es|pl|ch|at|be|cz|gr|hu|ie|il|nz|pt|ro|sg|za|kr|mx|ar|cl|my|ph|th|tw|vn|id|pk|bd|ua|ng|eg|ke|tz|gh|ug|zm|zw|ao|bw|cd|ci|cm|et|ga|gn|lr|mg|ml|mz|ne|rw|sd|sn|so|sz|tg|tn|ye|af|am|az|by|ge|kg|kz|lk|md|mn|tj|tm|uz|ba|bg|ee|hr|lt|lv|mk|rs|si|sk|al|ad|cy|fo|gi|is|li|mc|mt|sm|va)[^\s]*)/gi;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      // Add https:// if the URL doesn't have a protocol
      const href = part.match(/^https?:\/\//) ? part : `https://${part}`;
      
      return (
        <a
          key={index}
          href={href}
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
}

function ChatMessages({ messages, currentUserId, onReaction }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const previousMessageCountRef = useRef(0);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  // Only scroll to bottom when new messages are added, not when existing messages update (e.g., reactions)
  useEffect(() => {
    const currentCount = messages.length;
    const previousCount = previousMessageCountRef.current;
    
    // Only scroll if message count increased (new message added)
    if (currentCount > previousCount) {
      scrollToBottom();
    }
    
    previousMessageCountRef.current = currentCount;
  }, [messages]);

  // Keep scroll at bottom when container resizes (input grows)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      scrollToBottom();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

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
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden min-h-0" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="px-4 py-4" style={{ marginTop: 'auto' }}>
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
            <div className="group relative -mx-4 px-4 py-1.5 hover:bg-[#F5F5F5] transition-colors">
              <div className="flex gap-1.5 max-w-full">
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
                  {message.text && (
                    <p className="text-[13px] font-medium text-black opacity-90 leading-normal whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      {linkifyText(message.text)}
                    </p>
                  )}
                  
                  {/* Message Images */}
                  {(message.imageUrls || message.imageUrl) && (
                    <div className="mt-2 flex flex-col gap-2">
                      {/* Multiple images */}
                      {message.imageUrls && message.imageUrls.map((url, index) => (
                        <div 
                          key={index}
                          className="cursor-pointer"
                          onClick={() => setLightboxImage(url)}
                        >
                          <img
                            src={url}
                            alt={`Uploaded image ${index + 1}`}
                            className="max-w-[400px] rounded-lg border border-neutral-200 hover:opacity-90 transition-opacity"
                          />
                        </div>
                      ))}
                      
                      {/* Legacy single image */}
                      {!message.imageUrls && message.imageUrl && (
                        <div 
                          className="cursor-pointer"
                          onClick={() => setLightboxImage(message.imageUrl || null)}
                        >
                          <img
                            src={message.imageUrl}
                            alt="Uploaded image"
                            className="max-w-[400px] rounded-lg border border-neutral-200 hover:opacity-90 transition-opacity"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Reactions - below message content */}
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
              
              {/* Action Buttons - shown on hover */}
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
                    
                    {/* Reply */}
                    <button className="p-[2px] hover:bg-neutral-100 rounded transition-colors">
                      <ArrowBendUpLeft size={16} weight="regular" className="text-[#6a6a6a]" />
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

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 bg-white text-black rounded-full p-2 hover:bg-neutral-100 transition-colors z-10"
            aria-label="Close lightbox"
          >
            <X size={24} weight="bold" />
          </button>
          <img
            src={lightboxImage}
            alt="Full size image"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default memo(ChatMessages);
