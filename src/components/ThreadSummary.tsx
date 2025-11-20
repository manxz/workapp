"use client";

import { CaretRight } from "@phosphor-icons/react";
import { useState } from "react";

type ThreadSummaryProps = {
  replyCount: number;
  lastReplyAt: string;
  replyAvatars: string[];
  onViewThread: () => void;
};

export default function ThreadSummary({
  replyCount,
  lastReplyAt,
  replyAvatars,
  onViewThread,
}: ThreadSummaryProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatLastReplyTime = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  // Show last 2 avatars only
  const displayAvatars = replyAvatars.slice(-2);

  return (
    <button
      onClick={onViewThread}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex items-center justify-between gap-2 mt-1.5 pl-1 pr-2 py-1 rounded-[24px] border max-w-[460px] transition-colors group ${
        isHovered 
          ? 'bg-white border-[rgba(29,29,31,0.1)]' 
          : 'bg-transparent border-transparent'
      }`}
    >
      {/* Left side: Avatars + Reply Count + Text */}
      <div className="flex items-center gap-2">
        {/* Avatars */}
        <div className="flex items-center">
          {displayAvatars.map((avatar, index) => (
            <img
              key={index}
              src={avatar}
              alt=""
              className={`w-5 h-5 rounded-full border-2 border-white object-cover ${index > 0 ? '-ml-1' : ''}`}
            />
          ))}
        </div>
        
        {/* Reply Count */}
        <span className="text-[12px] font-medium text-[#0070F3] whitespace-nowrap">
          {replyCount} {replyCount === 1 ? 'Reply' : 'Replies'}
        </span>
        
        {/* Conditional Text - switches on hover */}
        {isHovered ? (
          <span className="text-[13px] font-medium text-[#6a6a6a] whitespace-nowrap">
            View thread
          </span>
        ) : (
          <span className="text-[12px] font-medium text-[#6a6a6a] whitespace-nowrap">
            Last reply {formatLastReplyTime(lastReplyAt)}
          </span>
        )}
      </div>
      
      {/* Right side: Chevron (only shows on hover) */}
      {isHovered && (
        <CaretRight size={12} weight="bold" className="text-[#6a6a6a]" />
      )}
    </button>
  );
}

