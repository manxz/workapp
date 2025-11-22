/**
 * Mention Text Renderer
 * 
 * Renders message text with highlighted @mentions and clickable links.
 * Mentions are styled differently based on whether they're the current user.
 */

import { parseMentions } from "@/lib/mentionUtils";
import { linkifyText } from "@/lib/textUtils";

type MentionTextProps = {
  text: string;
  currentUserId?: string;
  onMentionClick?: (userId: string) => void;
};

export default function MentionText({
  text,
  currentUserId,
  onMentionClick,
}: MentionTextProps) {
  const mentions = parseMentions(text);

  // If no mentions, render with linkify only
  if (mentions.length === 0) {
    return <>{linkifyText(text)}</>;
  }

  // Split text into parts (text and mentions)
  const parts: Array<{ type: "text" | "mention"; content: string; userId?: string; userName?: string }> = [];
  let lastIndex = 0;

  mentions.forEach((mention) => {
    // Add text before mention
    if (mention.startIndex > lastIndex) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex, mention.startIndex),
      });
    }

    // Add mention (without @)
    parts.push({
      type: "mention",
      content: mention.userName,
      userId: mention.userId,
      userName: mention.userName,
    });

    lastIndex = mention.endIndex;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={index}>{linkifyText(part.content)}</span>;
        }

        // Mention styling based on whether it's the current user
        const isCurrentUser = part.userId === currentUserId;
        const mentionClass = isCurrentUser
          ? "bg-[#FBE983] text-[#443E20]" // Yellow for current user
          : "bg-[#D6E8FD] text-[#0070F3]"; // Blue for others

        return (
          <span
            key={index}
            className={`${mentionClass} px-[3px] rounded-[4px] font-['Inter'] font-medium text-[13px] leading-[16px] h-[16px] cursor-pointer hover:opacity-90 transition-opacity inline-flex items-center`}
            onClick={() => onMentionClick?.(part.userId!)}
            title={`Click to message ${part.userName}`}
          >
            {part.content}
          </span>
        );
      })}
    </>
  );
}

