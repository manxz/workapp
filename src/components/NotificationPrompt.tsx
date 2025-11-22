"use client";

import { useState, useEffect } from "react";
import { Bell } from "@phosphor-icons/react";

export default function NotificationPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      // Show prompt if permission is default (not yet asked) or denied
      setShow(Notification.permission === 'default');
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setShow(false);
      }
    }
  };

  // Don't show if user previously dismissed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('notification-prompt-dismissed');
      if (dismissed === 'true') {
        setShow(false);
      }
    }
  }, []);

  if (!show) return null;

  return (
    <div className="px-2 relative z-50">
      <div className="bg-[#fafafa] border border-[rgba(29,29,31,0.1)] rounded-xl p-4 flex flex-col gap-4 relative">
        {/* Icon and Text */}
        <div className="flex flex-col gap-1">
          <Bell size={16} weight="fill" className="text-black" />
          <p className="text-xs font-medium text-black leading-normal">
            Enable desktop notifications for a better experience!
          </p>
        </div>

        {/* Button */}
        <button
          onClick={handleEnableNotifications}
          className="bg-black text-white text-xs font-medium py-1.5 px-2 rounded-[7px] hover:bg-neutral-800 transition-colors w-full h-6 flex items-center justify-center relative z-50 cursor-pointer"
          type="button"
        >
          Enable notifications
        </button>
      </div>
    </div>
  );
}

