"use client";

import { Smiley, At, Paperclip, ArrowUp, X } from "@phosphor-icons/react";
import { useState, useRef, useEffect, useCallback } from "react";
import MentionInput from "./MentionInput";
import {
  MAX_FILE_UPLOADS,
  MAX_IMAGE_PREVIEW_HEIGHT,
} from "@/lib/constants";

type User = {
  id: string;
  name: string;
  avatar: string;
};

type ChatInputProps = {
  channelName?: string;
  onSendMessage?: (message: string, files?: File[]) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  externalFiles?: File[];
  users?: User[];
};

export default function ChatInput({ 
  channelName = "Design", 
  onSendMessage, 
  onTyping, 
  onStopTyping, 
  externalFiles, 
  users = [] 
}: ChatInputProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processedFilesRef = useRef<Set<string>>(new Set());
  const mentionInputRef = useRef<{ getTextContent: () => string; getFormattedMessage: () => string; clear: () => void }>(null);

  const handleSendWithFiles = useCallback(() => {
    const plainText = mentionInputRef.current?.getTextContent().trim() || "";
    const formattedMessage = mentionInputRef.current?.getFormattedMessage().trim() || "";
    
    // Only send if there's text or files
    if (plainText || uploadedFiles.length > 0) {
      // Use formatted message (with mentions) if available, otherwise plain text
      const messageToSend = formattedMessage || plainText;
      onSendMessage?.(messageToSend, uploadedFiles.length > 0 ? uploadedFiles : undefined);
      mentionInputRef.current?.clear();
      setUploadedFiles([]);
      setPreviewUrls([]);
      processedFilesRef.current.clear();
      onStopTyping?.();
    }
  }, [uploadedFiles, onSendMessage, onStopTyping]);

  const handleFileSelect = useCallback((files: File | File[]) => {
    const fileArray = Array.isArray(files) ? files : [files];
    const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));
    
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
        const combined = [...prev, ...newImageFiles];
        return combined.slice(0, MAX_FILE_UPLOADS);
      });
      
      const readerPromises = newImageFiles.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });
      
      Promise.all(readerPromises).then((urls) => {
        setPreviewUrls((prev) => {
          const combined = [...prev, ...urls];
          return combined.slice(0, MAX_FILE_UPLOADS);
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

  useEffect(() => {
    if (externalFiles && externalFiles.length > 0) {
      handleFileSelect(externalFiles);
    }
  }, [externalFiles, handleFileSelect]);

  return (
    <div className="px-4 relative">
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl flex items-end justify-between pl-3 pr-2 py-2 gap-2">
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
                    className="rounded max-w-[200px] object-contain"
                    style={{ maxHeight: `${MAX_IMAGE_PREVIEW_HEIGHT}px` }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Text input with mention support */}
          <MentionInput
            ref={mentionInputRef}
            channelName={channelName}
            onSendMessage={handleSendWithFiles}
            onTyping={onTyping}
            onStopTyping={onStopTyping}
            users={users}
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
            onClick={handleSendWithFiles}
            disabled={!(mentionInputRef.current?.getTextContent()?.trim() || uploadedFiles.length > 0)}
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
