"use client";

import { Smiley, At, Paperclip, ArrowUp, X } from "@phosphor-icons/react";
import { useState, useRef, useEffect, useCallback } from "react";

type ChatInputProps = {
  channelName?: string;
  onSendMessage?: (message: string, files?: File[]) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  externalFiles?: File[];
};

export default function ChatInput({ channelName = "Design", onSendMessage, onTyping, onStopTyping, externalFiles }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processedFilesRef = useRef<Set<string>>(new Set());

  const handleSend = useCallback(() => {
    if (message.trim() || uploadedFiles.length > 0) {
      onSendMessage?.(message, uploadedFiles.length > 0 ? uploadedFiles : undefined);
      setMessage("");
      setUploadedFiles([]);
      setPreviewUrls([]);
      processedFilesRef.current.clear(); // Clear processed files tracking
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
  }, [message, uploadedFiles, onSendMessage, onStopTyping]);

  const handleFileSelect = useCallback((files: File | File[]) => {
    const fileArray = Array.isArray(files) ? files : [files];
    const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));
    
    // Filter out already processed files using a unique key (name + size + lastModified)
    const newImageFiles = imageFiles.filter(file => {
      const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
      if (processedFilesRef.current.has(fileKey)) {
        return false;
      }
      processedFilesRef.current.add(fileKey);
      return true;
    });
    
    if (newImageFiles.length > 0) {
      setUploadedFiles((prev) => {
        // Cap at 10 files maximum
        const combined = [...prev, ...newImageFiles];
        return combined.slice(0, 10);
      });
      
      // Read all files and collect preview URLs
      const readerPromises = newImageFiles.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });
      
      // Update preview URLs once all files are read
      Promise.all(readerPromises).then((urls) => {
        setPreviewUrls((prev) => {
          // Cap at 10 preview URLs maximum
          const combined = [...prev, ...urls];
          return combined.slice(0, 10);
        });
      });
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(Array.from(files));
    }
  };

  const removeFile = (index: number) => {
    // Get the file being removed to also remove from processed set
    const fileToRemove = uploadedFiles[index];
    if (fileToRemove) {
      const fileKey = `${fileToRemove.name}-${fileToRemove.size}-${fileToRemove.lastModified}`;
      processedFilesRef.current.delete(fileKey);
    }
    
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  // Handle external file drops (from page-level drag & drop)
  useEffect(() => {
    if (externalFiles && externalFiles.length > 0) {
      handleFileSelect(externalFiles);
    }
  }, [externalFiles, handleFileSelect]);

  // Global Enter key handler for sending image without focus
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && uploadedFiles.length > 0 && !message.trim()) {
        e.preventDefault();
        handleSend();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [uploadedFiles, message, handleSend]);

  return (
    <div className="px-4">
        <div 
            className="bg-neutral-50 border border-neutral-200 rounded-xl flex items-end justify-between pl-3 pr-2 py-2 gap-2"
          >
        <div className="flex flex-col gap-2 flex-1">
          {/* File previews */}
          {previewUrls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {previewUrls.map((url, index) => (
                <div key={index} className="bg-white border border-neutral-200 rounded-lg p-2 relative">
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute -top-2 -right-2 bg-neutral-800 text-white rounded-full p-1 hover:bg-black transition-colors z-10"
                    aria-label="Remove file"
                  >
                    <X size={12} weight="bold" />
                  </button>
                  <img 
                    src={url} 
                    alt={`Upload preview ${index + 1}`} 
                    className="rounded max-h-[160px] max-w-[200px] object-contain"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Text input - always visible */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${channelName}`}
            rows={1}
            className="flex-1 bg-transparent outline-none text-[13px] font-medium text-neutral-600 placeholder:text-neutral-400 placeholder:opacity-70 resize-none max-h-[200px] overflow-y-auto leading-[20px] py-0.5"
          />
        </div>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
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
            onClick={() => fileInputRef.current?.click()}
            className="p-1 hover:bg-neutral-200 rounded transition-colors"
            aria-label="Attach file"
          >
            <Paperclip size={16} weight="regular" className="text-neutral-600" />
          </button>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!message.trim() && uploadedFiles.length === 0}
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

