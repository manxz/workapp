"use client";

import { Smiley, At, Paperclip, ArrowUp } from "@phosphor-icons/react";
import { useState, useRef, useEffect } from "react";

type ChatInputProps = {
  channelName?: string;
  onSendMessage?: (message: string) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
};

export default function ChatInput({ channelName = "Design", onSendMessage, onTyping, onStopTyping }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage?.(message);
      setMessage("");
      onStopTyping?.();
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Broadcast typing
    if (e.target.value.length > 0) {
      onTyping?.();
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        onStopTyping?.();
      }, 2000);
    } else {
      // Empty input, stop typing immediately
      onStopTyping?.();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
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
    <div className="px-4">
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl flex items-start justify-between pl-3 pr-2 py-2 gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
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

