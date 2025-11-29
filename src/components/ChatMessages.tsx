"use client";

import { useEffect, useRef, memo, useState } from "react";
import { createPortal } from "react-dom";
import { X, ArrowBendUpLeft, Stack } from "@phosphor-icons/react";
import ThreadSummary from "./ThreadSummary";
import MentionText from "./MentionText";
import { formatTime, formatDateDivider, shouldShowDateDivider } from "@/lib/dateUtils";
import { linkifyText } from "@/lib/textUtils";
import { QUICK_REACTIONS, COLORS } from "@/lib/constants";

export type Message = {
  id: string;
  author: string;
  avatar: string;
  timestamp: string;
  text: string;
  imageUrl?: string; // Legacy single image
  imageUrls?: string[]; // Multiple images
  reactions?: Array<{ emoji: string; userIds: string[] }>; // Ordered array to maintain insertion order
  threadId?: string; // If this is a reply in a thread, the parent message ID
  replyCount?: number; // Number of replies in the thread
  lastReplyAt?: string; // Timestamp of last reply
  replyAvatars?: string[]; // Avatars of users who replied
};

type ChatMessagesProps = {
  messages: Message[];
  currentUserId?: string;
  onReaction?: (messageId: string, emoji: string) => void;
  onOpenThread?: (messageId: string) => void;
  loadingMore?: boolean;
  hasMoreMessages?: boolean;
  onLoadMore?: () => void;
};

function ChatMessages({ messages, currentUserId, onReaction, onOpenThread, loadingMore, hasMoreMessages, onLoadMore }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  const hasInitiallyScrolled = useRef(false);

  // Scroll to bottom only on initial load
  useEffect(() => {
    if (messages.length > 0 && !hasInitiallyScrolled.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      hasInitiallyScrolled.current = true;
    }
  }, [messages.length]);

  // Track scroll height before loading more messages
  const previousScrollHeightRef = useRef(0);
  
  // Preserve scroll position after older messages load
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !previousScrollHeightRef.current) return;
    
    // If scroll height increased (older messages loaded), adjust scroll position
    const newScrollHeight = container.scrollHeight;
    const heightDiff = newScrollHeight - previousScrollHeightRef.current;
    
    if (heightDiff > 0) {
      container.scrollTop += heightDiff;
    }
    
    previousScrollHeightRef.current = 0; // Reset after adjustment
  }, [messages]);

  // Infinite scroll: Load more messages when scrolling near the top
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !hasMoreMessages || loadingMore) return;

    const handleScroll = () => {
      // Check if user scrolled near the top (within 300px)
      const scrollTop = container.scrollTop;
      const threshold = 300;

      if (scrollTop < threshold && !isLoadingRef.current) {
        isLoadingRef.current = true;
        
        // Save current scroll height before loading
        previousScrollHeightRef.current = container.scrollHeight;
        
        onLoadMore?.();
        
        // Reset loading flag after a delay
        setTimeout(() => {
          isLoadingRef.current = false;
        }, 500);
      }
    };

    container.addEventListener('scroll', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [hasMoreMessages, loadingMore, onLoadMore]);

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto overflow-x-hidden flex flex-col">
      <div className="mt-auto px-4 py-4">
        {/* Loading indicator at top */}
        {loadingMore && (
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
              <span>Loading older messages...</span>
            </div>
          </div>
        )}
        
        {messages.map((message, index) => {
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showDivider = shouldShowDateDivider(message.timestamp, prevMessage?.timestamp || null);
          
          return (
          <div key={message.id}>
            {showDivider && (
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
                    <span className="text-[11px] font-medium text-neutral-500 opacity-80 leading-none translate-y-px">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  
                  {/* Message Text */}
                  {message.text && (
                    <p className="text-[13px] font-medium text-black opacity-90 leading-normal whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      <MentionText 
                        text={message.text} 
                        currentUserId={currentUserId}
                      />
                    </p>
                  )}
                  
                  {/* Message Images */}
                  {(message.imageUrls || message.imageUrl) && (
                    <div className="mt-2 flex flex-col gap-2">
                      {/* Multiple images */}
                      {message.imageUrls && message.imageUrls.map((url, imgIndex) => (
                        <div 
                          key={imgIndex}
                          className="cursor-pointer"
                          onClick={() => setLightboxImage(url)}
                        >
                          <img
                            src={url}
                            alt={`Uploaded image ${imgIndex + 1}`}
                            className="max-w-[400px] rounded-lg border border-neutral-200 hover:opacity-90 transition-opacity"
                            loading="lazy"
                            decoding="async"
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
                            loading="lazy"
                            decoding="async"
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
                            className="flex items-center gap-1 h-5 px-2 rounded-[11px] font-medium text-[11px] transition-colors"
                            style={
                              hasReacted
                                ? {
                                    backgroundColor: COLORS.reactionActiveBackground,
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    borderColor: COLORS.reactionActiveBorder,
                                    color: COLORS.reactionActiveText,
                                  }
                                : {
                                    backgroundColor: COLORS.reactionInactiveBackground,
                                    color: COLORS.reactionInactiveText,
                                  }
                            }
                            onMouseEnter={(e) => {
                              if (!hasReacted) {
                                e.currentTarget.style.backgroundColor = COLORS.reactionInactiveHover;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!hasReacted) {
                                e.currentTarget.style.backgroundColor = COLORS.reactionInactiveBackground;
                              }
                            }}
                          >
                            <span className="text-[13px] leading-none">{emoji}</span>
                            <span>{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Thread summary - if message has replies */}
                  {message.replyCount && message.replyCount > 0 && message.lastReplyAt && message.replyAvatars && (
                    <ThreadSummary
                      replyCount={message.replyCount}
                      lastReplyAt={message.lastReplyAt}
                      replyAvatars={message.replyAvatars}
                      onViewThread={() => onOpenThread?.(message.id)}
                    />
                  )}
                </div>
              </div>
              
              {/* Action Buttons - shown on hover */}
              <div className="absolute right-4 top-[-13px] hidden group-hover:flex flex-col items-end">
                  <div className="bg-white border rounded-full px-[6px] py-[2px] flex gap-1 items-center" style={{ borderColor: COLORS.actionBorder }}>
                    {/* Quick Reactions */}
                    {QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => onReaction?.(message.id, emoji)}
                        className="p-2 hover:bg-neutral-100 rounded transition-colors w-5 h-5 flex items-center justify-center"
                      >
                        <span className="text-[14px] leading-none">{emoji}</span>
                      </button>
                    ))}
                    
                    {/* Reply */}
                    <button 
                      onClick={() => onOpenThread?.(message.id)}
                      className="p-[2px] hover:bg-neutral-100 rounded transition-colors"
                    >
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
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Lightbox Modal - rendered via portal to ensure it covers everything */}
      {lightboxImage && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-8"
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
        </div>,
        document.body
      )}
    </div>
  );
}

export default memo(ChatMessages);
