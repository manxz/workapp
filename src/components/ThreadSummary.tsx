"use client";

import { CaretRight } from "@phosphor-icons/react";
import { useState } from "react";
import { formatRelativeTime } from "@/lib/dateUtils";
import { COLORS } from "@/lib/constants";

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

  // Show last 2 avatars only
  const displayAvatars = replyAvatars.slice(-2);

  return (
    <button
      onClick={onViewThread}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex items-center justify-between gap-2 mt-1.5 pl-1 pr-2 py-1 rounded-[24px] border max-w-[460px] transition-colors group"
      style={{
        backgroundColor: isHovered ? 'white' : 'transparent',
        borderColor: isHovered ? COLORS.threadSummaryBorder : 'transparent',
      }}
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
        <span className="text-[12px] font-medium whitespace-nowrap" style={{ color: COLORS.primary }}>
          {replyCount} {replyCount === 1 ? 'Reply' : 'Replies'}
        </span>
        
        {/* Conditional Text - switches on hover */}
        {isHovered ? (
          <span className="text-[13px] font-medium whitespace-nowrap" style={{ color: COLORS.reactionInactiveText }}>
            View thread
          </span>
        ) : (
          <span className="text-[12px] font-medium whitespace-nowrap" style={{ color: COLORS.reactionInactiveText }}>
            Last reply {formatRelativeTime(lastReplyAt)}
          </span>
        )}
      </div>
      
      {/* Right side: Chevron (only shows on hover) */}
      {isHovered && (
        <CaretRight size={12} weight="bold" style={{ color: COLORS.reactionInactiveText }} />
      )}
    </button>
  );
}

