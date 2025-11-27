"use client";

import { memo } from "react";

type TypingIndicatorProps = {
  typingUsers: { userId: string; userName: string; threadId?: string }[];
};

function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) {
    return <div className="flex-shrink-0 px-7 h-5 flex items-center" />;
  }

  let typingText;
  if (typingUsers.length === 1) {
    typingText = (
      <>
        <span className="font-bold">{typingUsers[0].userName}</span>
        {` is typing...`}
      </>
    );
  } else if (typingUsers.length === 2) {
    typingText = (
      <>
        <span className="font-bold">{typingUsers[0].userName}</span>
        {` and `}
        <span className="font-bold">{typingUsers[1].userName}</span>
        {` are typing...`}
      </>
    );
  } else {
    typingText = (
      <>
        <span className="font-bold">{typingUsers.length} people</span>
        {` are typing...`}
      </>
    );
  }

  return (
    <div className="flex-shrink-0 px-7 h-5 flex items-center">
      <p className="text-[10px] font-medium text-[#6a6a6a] opacity-90">
        {typingText}
      </p>
    </div>
  );
}

export default memo(TypingIndicator);
