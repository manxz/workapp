"use client";

import { DotsThree } from "@phosphor-icons/react";

type ChatHeaderProps = {
  name: string;
  avatar?: string;
};

export default function ChatHeader({ name, avatar }: ChatHeaderProps) {
  const testNotification = () => {
    console.log("Test notification button clicked");
    console.log("Notification permission:", Notification.permission);
    
    if (Notification.permission === "granted") {
      try {
        const notification = new Notification("Test Notification", {
          body: "If you see this, notifications are working!",
          icon: "https://i.pravatar.cc/150?img=1",
          requireInteraction: false,
        });
        
        console.log("Test notification created:", notification);
        
        notification.onshow = () => {
          console.log("Test notification shown");
        };
        
        notification.onerror = (error) => {
          console.error("Test notification error:", error);
        };
      } catch (error) {
        console.error("Error creating test notification:", error);
      }
    } else {
      console.log("Notification permission not granted");
      Notification.requestPermission().then((permission) => {
        console.log("New permission:", permission);
      });
    }
  };

  return (
    <div className="sticky top-0 z-10 border-b border-neutral-200 px-4 h-14 flex items-center justify-between bg-white">
      <div className="flex items-center gap-2">
        {avatar && (
          <img
            src={avatar}
            alt={name}
            className="w-6 h-6 rounded-full object-cover"
          />
        )}
        <h2 className="text-base font-medium text-black">{name}</h2>
      </div>
      <div className="flex items-center gap-2">
        {/* Temporary test button */}
        <button 
          onClick={testNotification}
          className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
        >
          Test Notification
        </button>
        <button className="text-neutral-600 hover:text-black transition-colors p-1">
          <DotsThree size={20} weight="bold" />
        </button>
      </div>
    </div>
  );
}

