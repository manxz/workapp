"use client";

import { Smiley, At, Paperclip, ArrowUp } from "@phosphor-icons/react";
import { useState, useRef, useEffect } from "react";

type ChatInputProps = {
  channelName?: string;
  onSendMessage?: (message: string) => void;
};

export default function ChatInput({ channelName = "Design", onSendMessage }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage?.(message);
      setMessage("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  return (
    <div className="px-4 pb-4">
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl flex items-start justify-between pl-3 pr-2 py-2 gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${channelName}`}
          rows={1}
          className="flex-1 bg-transparent outline-none text-[13px] font-medium text-neutral-600 placeholder:text-neutral-400 placeholder:opacity-70 resize-none max-h-[200px] overflow-y-auto leading-[20px] py-0.5"
        />
        
        <div className="flex items-center gap-1">
          {/* Emoji Icon */}
          <button
            type="button"
            className="p-1 hover:bg-neutral-200 rounded transition-colors"
            aria-label="Add emoji"
          >
            <Smiley size={16} weight="regular" className="text-neutral-600" />
          </button>

          {/* Mention Icon */}
          <button
            type="button"
            className="p-1 hover:bg-neutral-200 rounded transition-colors"
            aria-label="Mention someone"
          >
            <At size={16} weight="regular" className="text-neutral-600" />
          </button>

          {/* Attachment Icon */}
          <button
            type="button"
            className="p-1 hover:bg-neutral-200 rounded transition-colors"
            aria-label="Attach file"
          >
            <Paperclip size={16} weight="regular" className="text-neutral-600" />
          </button>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!message.trim()}
            className="bg-black p-1 rounded-md hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <ArrowUp size={16} weight="regular" className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

