/**
 * Mention Input Component
 * 
 * A contenteditable div that supports styled @mentions.
 * Uses contenteditable for proper cursor positioning and inline styling.
 */

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import MentionPicker, { type User } from "./MentionPicker";
import { getMentionQuery, isInMentionMode } from "@/lib/mentionUtils";

type MentionInputProps = {
  channelName?: string;
  onSendMessage?: (message: string) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  users?: User[];
};

export interface MentionInputRef {
  getTextContent: () => string;
  getFormattedMessage: () => string;
  clear: () => void;
}

const MentionInput = forwardRef<MentionInputRef, MentionInputProps>(({
  channelName = "Design",
  onSendMessage,
  onTyping,
  onStopTyping,
  users = [],
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const mentionMapRef = useRef<Record<string, string>>({}); // userName -> userId

  const getTextContent = useCallback(() => {
    if (!editorRef.current) return "";
    return editorRef.current.innerText || "";
  }, []);

  const clear = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    mentionMapRef.current = {};
  }, []);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getTextContent,
    getFormattedMessage,
    clear,
  }));

  const getFormattedMessage = useCallback(() => {
    if (!editorRef.current) return "";
    
    let formattedMessage = "";
    
    // Recursively process nodes to handle nested elements and preserve line breaks
    const processNode = (node: ChildNode) => {
      if (node.nodeType === Node.TEXT_NODE) {
        formattedMessage += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        
        // Handle line break elements
        if (tagName === 'br') {
          formattedMessage += '\n';
        }
        // Check if it's a mention span
        else if (element.hasAttribute('data-mention-id')) {
          const userId = element.getAttribute('data-mention-id');
          const userName = element.getAttribute('data-mention-name');
          formattedMessage += `@[${userId}:${userName}]`;
        }
        // Handle div/p elements (browsers wrap lines in divs)
        else if (tagName === 'div' || tagName === 'p') {
          // Add newline before div/p unless it's the first element
          if (formattedMessage.length > 0 && !formattedMessage.endsWith('\n')) {
            formattedMessage += '\n';
          }
          // Process children
          element.childNodes.forEach(child => processNode(child));
        }
        // Handle other elements by processing their children
        else {
          element.childNodes.forEach(child => processNode(child));
        }
      }
    };
    
    // Walk through all child nodes
    editorRef.current.childNodes.forEach(node => processNode(node));
    
    return formattedMessage;
  }, []);

  // Calculate cursor position relative to entire contenteditable text
  const getCursorPosition = useCallback((): number => {
    if (!editorRef.current) return 0;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    
    const range = selection.getRangeAt(0);
    
    // Create a range from start of editor to cursor
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    
    // Get the text content up to cursor
    return preCaretRange.toString().length;
  }, []);

  const handleInput = useCallback(() => {
    const text = getTextContent();
    
    // If empty, ensure the div is truly empty (remove any <br> or empty text nodes)
    if (text.trim() === "" && editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    
    // Check for mention mode
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const cursorPosition = getCursorPosition();
      
      const query = getMentionQuery(text, cursorPosition);
      if (query !== null) {
        setMentionQuery(query);
        setShowMentionPicker(true);
        
        // Position picker
        if (editorRef.current) {
          const rect = editorRef.current.getBoundingClientRect();
          setPickerPosition({
            top: rect.top - 8,
            left: 280, // 264px chat sidebar + 16px gap
          });
        }
      } else {
        setShowMentionPicker(false);
      }
    }
    
    // Typing indicator
    if (text.length > 0) {
      onTyping?.();
    } else {
      onStopTyping?.();
    }
  }, [getTextContent, getCursorPosition, onTyping, onStopTyping]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Don't send message if mention picker is open - let picker handle Enter/Tab
    if (showMentionPicker && (e.key === "Enter" || e.key === "Tab")) {
      return;
    }
    
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = getTextContent();
      if (text.trim()) {
        // Get formatted message with mentions converted to storage format
        const formattedMessage = getFormattedMessage();
        
        onSendMessage?.(formattedMessage);
        
        // Clear editor
        if (editorRef.current) {
          editorRef.current.innerHTML = "";
        }
        mentionMapRef.current = {};
        onStopTyping?.();
      }
    }
  }, [showMentionPicker, getTextContent, getFormattedMessage, onSendMessage, onStopTyping]);

  const handleMentionSelect = useCallback((user: User) => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    const text = textNode.textContent || "";
    const cursorPos = range.startOffset;
    
    // Find @ symbol
    const beforeCursor = text.slice(0, cursorPos);
    const atIndex = beforeCursor.lastIndexOf('@');
    
    if (atIndex === -1) return;
    
    // Create mention span
    const mentionSpan = document.createElement('span');
    mentionSpan.className = 'bg-[#D6E8FD] text-[#0070F3] px-[3px] rounded-[4px] inline-flex items-center h-[16px] text-[13px] leading-[16px]';
    mentionSpan.contentEditable = 'false';
    mentionSpan.textContent = user.name;
    mentionSpan.setAttribute('data-mention-id', user.id);
    mentionSpan.setAttribute('data-mention-name', user.name);
    
    // Add space after mention
    const spaceNode = document.createTextNode(' ');
    
    // Replace text from @ to cursor with mention
    const newRange = document.createRange();
    newRange.setStart(textNode, atIndex);
    newRange.setEnd(textNode, cursorPos);
    newRange.deleteContents();
    newRange.insertNode(spaceNode);
    newRange.insertNode(mentionSpan);
    
    // Move cursor after space
    const finalRange = document.createRange();
    finalRange.setStartAfter(spaceNode);
    finalRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(finalRange);
    
    // Store mention mapping
    mentionMapRef.current[user.name] = user.id;
    
    setShowMentionPicker(false);
    setMentionQuery("");
    
    editorRef.current.focus();
  }, []);

  return (
    <div className="relative">
      {showMentionPicker && (
        <MentionPicker
          users={users}
          query={mentionQuery}
          onSelect={handleMentionSelect}
          onClose={() => setShowMentionPicker(false)}
          position={pickerPosition}
        />
      )}
      
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={`Message ${channelName}`}
        className="w-full bg-transparent outline-none text-[13px] font-medium text-neutral-600 resize-none leading-[20px] py-[2px] box-border min-h-[24px] max-h-[200px] overflow-y-auto [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-neutral-400 [&:empty]:before:opacity-70"
        style={{
          caretColor: '#525252',
        }}
      />
    </div>
  );
});

MentionInput.displayName = 'MentionInput';

export default MentionInput;
