/**
 * Browser Notification Utility
 * 
 * Handles requesting permission and showing browser notifications for messages.
 * Only shows notifications when appropriate (tab unfocused OR chat app inactive).
 */

import { isChatAppActive } from '@/global/chatVisibility';
import { incrementUnreadCount } from '@/global/tabTitle';

/**
 * Request notification permission from the user
 * Should be called when user explicitly enables notifications
 * 
 * @returns Promise<boolean> - true if permission granted
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('[Notifications] Error requesting permission:', error);
    return false;
  }
}

/**
 * Message data for notifications
 */
export interface MessageNotificationData {
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  messageText: string;
}

/**
 * Show a browser notification for a new message
 * 
 * Only shows notification if:
 * - Message is from another user (not self)
 * - Notifications are permitted
 * - AND (tab is unfocused OR chat app is not active)
 * 
 * Also increments unread count, updates favicon, and plays sound
 * 
 * @param data - Message data for the notification
 * @param onNotificationClick - Callback when notification is clicked
 */
export function showMessageNotification(
  data: MessageNotificationData,
  onNotificationClick?: (conversationId: string) => void
) {
  // Check if notifications are supported and permitted
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  // Determine if we should show the notification
  const shouldNotify = shouldShowNotification();
  
  if (!shouldNotify) {
    return;
  }

  // Increment unread count (updates tab title, plays sound)
  incrementUnreadCount();

  try {
    // Truncate message to ~50 characters
    const truncatedMessage = data.messageText.length > 50 
      ? data.messageText.substring(0, 50) + '...'
      : data.messageText;

    const notification = new Notification(data.senderName, {
      body: truncatedMessage,
      icon: data.senderAvatar || '/icon.svg',
      tag: data.conversationId,
      requireInteraction: false,
      silent: false,
    });

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      notification.close();
      
      if (onNotificationClick) {
        onNotificationClick(data.conversationId);
      }
    };

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

  } catch (error) {
    console.error('[Notifications] Error showing notification:', error);
  }
}

/**
 * Determine if a notification should be shown
 * 
 * Show notification if:
 * - Tab is unfocused (document.hidden === true)
 * - OR chat app is not active (user is in Projects/Notepad/Apps view)
 * 
 * Do NOT show notification if:
 * - Tab is focused AND chat app is active (user is looking at chat)
 */
function shouldShowNotification(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // If tab is not visible (unfocused), always show notification
  if (document.hidden) {
    return true;
  }

  // If tab is visible but chat app is not active (user is in another app), show notification
  if (!isChatAppActive()) {
    return true;
  }

  // Tab is focused and chat app is active → don't show notification
  return false;
}

