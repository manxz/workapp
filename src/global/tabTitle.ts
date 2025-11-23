/**
 * Tab Title Unread Counter
 * 
 * Gmail-style unread count in browser tab title.
 */

import { playNotificationSound } from "@/global/notificationSound";
import { updateFaviconWithBadge } from "@/global/favicon";

let originalTitle = "Workapp";
let unreadCount = 0;

/**
 * Set the original title (without unread count)
 * Call this on app mount
 */
export function setOriginalTitle(title: string) {
  originalTitle = title;
  updateTabTitle();
}

/**
 * Increment unread count by 1
 * Updates tab title and plays sound
 */
export function incrementUnreadCount() {
  unreadCount++;
  updateTabTitle();
  updateFaviconWithBadge(true);
  playNotificationSound();
}

/**
 * Set unread count to specific value
 * Updates tab title (no sound)
 */
export function setUnreadCount(count: number) {
  unreadCount = count;
  updateTabTitle();
  updateFaviconWithBadge(count > 0);
}

/**
 * Clear unread count (set to 0)
 * Updates tab title
 */
export function clearUnreadCount() {
  unreadCount = 0;
  updateTabTitle();
  updateFaviconWithBadge(false);
}

/**
 * Get current unread count
 */
export function getUnreadCount(): number {
  return unreadCount;
}

/**
 * Update browser tab title with unread count
 */
function updateTabTitle() {
  if (typeof window === 'undefined') return;
  
  if (unreadCount > 0) {
    document.title = `(${unreadCount}) ${originalTitle}`;
  } else {
    document.title = originalTitle;
  }
}

