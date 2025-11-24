"use client";

import { useEffect, useRef, memo, useState, useCallback } from "react";
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
  const previousMessageCountRef = useRef(0);
  const isLoadingRef = useRef(false);
  const previousMessagesRef = useRef<Message[]>([]);

  /**
   * Scrolls the message container to the bottom
   * Used when new messages arrive or container resizes
   */
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, []);

  // Handle scrolling for new messages and reactions
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const currentCount = messages.length;
    const previousCount = previousMessageCountRef.current;
    
    // Check if user is at/near bottom (within 50px)
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    
    // Only scroll if message count increased (new message added)
    if (currentCount > previousCount) {
      scrollToBottom();
    } else if (currentCount === previousCount && messages.length > 0) {
      // Message count hasn't changed, check if reactions were added to the latest message
      const previousMessages = previousMessagesRef.current;
      if (previousMessages.length > 0) {
        const latestMessage = messages[messages.length - 1];
        const previousLatestMessage = previousMessages[previousMessages.length - 1];
        
        // Check if the latest message has more reactions than before
        const currentReactionCount = latestMessage.reactions?.reduce((sum, r) => sum + r.userIds.length, 0) || 0;
        const previousReactionCount = previousLatestMessage.reactions?.reduce((sum, r) => sum + r.userIds.length, 0) || 0;
        
        // If reactions were added to the latest message and user is at bottom, scroll to show them
        if (currentReactionCount > previousReactionCount && isAtBottom) {
          // Small delay to ensure DOM has updated
          setTimeout(() => {
            scrollToBottom();
          }, 10);
        }
      }
    }
    
    previousMessageCountRef.current = currentCount;
    previousMessagesRef.current = [...messages]; // Store a copy for next comparison
  }, [messages, scrollToBottom]);

  // Keep scroll at bottom when input grows, but only if already at bottom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let lastHeight = container.scrollHeight;

    const resizeObserver = new ResizeObserver(() => {
      const currentHeight = container.scrollHeight;
      
      // Skip if height change is small (likely a reaction, handled by the other useEffect)
      const heightChange = Math.abs(currentHeight - lastHeight);
      if (heightChange < 30) {
        lastHeight = currentHeight;
        return;
      }
      
      // Only scroll to bottom if user was already at/near the bottom (within 100px)
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom) {
        scrollToBottom();
      }
      
      lastHeight = currentHeight;
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [scrollToBottom]);

  // Infinite scroll: Load more messages when scrolling near the top
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !hasMoreMessages || loadingMore) return;

    const handleScroll = () => {
      // Check if user scrolled near the top (within 300px)
      const scrollTop = container.scrollTop;
      const threshold = 300;

      if (scrollTop < threshold && !isLoadingRef.current) {
        console.log('[ChatMessages] Triggering load more, scrollTop:', scrollTop);
        isLoadingRef.current = true;
        
        // Save current scroll position before loading
        const previousScrollHeight = container.scrollHeight;
        const previousScrollTop = container.scrollTop;
        
        onLoadMore?.();
        
        // After messages load, restore scroll position
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            const heightDifference = newScrollHeight - previousScrollHeight;
            container.scrollTop = previousScrollTop + heightDifference;
            console.log('[ChatMessages] Scroll restored, heightDiff:', heightDifference);
          }
          isLoadingRef.current = false;
        }, 200);
      }
    };

    // Check immediately on mount (in case we're already at the top)
    handleScroll();

    container.addEventListener('scroll', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [hasMoreMessages, loadingMore, onLoadMore]);

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden min-h-0" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="px-4 py-4" style={{ marginTop: 'auto' }}>
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
