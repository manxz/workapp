"use client";

import { useState, useEffect, useCallback } from "react";
import { Message } from "@/components/ChatMessages";

const MESSAGES_KEY = "chat_messages";

export function useChat(chatId: string) {
  const [messages, setMessages] = useState<Message[]>([]);

  // Load messages for this chat from localStorage
  const loadMessages = useCallback(() => {
    try {
      const stored = localStorage.getItem(`${MESSAGES_KEY}_${chatId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as Message[];
        
        // Remove duplicates and fix old IDs
        const uniqueMessages = parsed.reduce((acc: Message[], msg) => {
          // Check if ID already exists
          const exists = acc.some(m => m.id === msg.id);
          if (!exists) {
            // If old format ID (contains raw decimal), regenerate it
            if (msg.id.includes('.') || msg.id === '1') {
              msg.id = `migrated-${chatId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            }
            acc.push(msg);
          }
          return acc;
        }, []);
        
        setMessages(uniqueMessages);
        // Save the cleaned messages back
        localStorage.setItem(`${MESSAGES_KEY}_${chatId}`, JSON.stringify(uniqueMessages));
      } else {
        // Initialize with default messages
        const defaultMessages: Message[] = [
          {
            id: `default-${chatId}-1`,
            author: "Sofia Patel",
            avatar: "https://i.pravatar.cc/150?img=5",
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            text: "Have a good weekend guys!",
          },
        ];
        setMessages(defaultMessages);
        localStorage.setItem(
          `${MESSAGES_KEY}_${chatId}`,
          JSON.stringify(defaultMessages)
        );
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
    }
  }, [chatId]);

  // Save messages to localStorage
  const saveMessages = useCallback(
    (msgs: Message[]) => {
      try {
        localStorage.setItem(`${MESSAGES_KEY}_${chatId}`, JSON.stringify(msgs));
      } catch (error) {
        console.error("Error saving messages:", error);
      }
    },
    [chatId]
  );

  // Send a message
  const sendMessage = useCallback(
    (text: string, author: string = "You", avatar: string = "https://i.pravatar.cc/150?img=1") => {
      const newMessage: Message = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        author,
        avatar,
        timestamp: new Date().toISOString(),
        text,
      };

      setMessages((prev) => {
        const updated = [...prev, newMessage];
        saveMessages(updated);
        return updated;
      });
    },
    [saveMessages]
  );

  // Listen for changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `${MESSAGES_KEY}_${chatId}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setMessages(parsed);
        } catch (error) {
          console.error("Error parsing storage event:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Load initial messages
    loadMessages();

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [chatId, loadMessages]);

  return {
    messages,
    sendMessage,
  };
}

