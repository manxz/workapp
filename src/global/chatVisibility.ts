/**
 * Global Chat App Visibility Tracker
 * 
 * Tracks whether the Chat app is currently mounted in the super-app.
 * This is used to determine when to show browser notifications.
 * 
 * ## Why Global?
 * Because apps are code-split and dynamically loaded, we need a 
 * framework-agnostic way to track chat visibility across the entire app.
 * 
 * ## Usage:
 * - Call `markChatMounted()` when ChatApp component mounts
 * - Call `markChatUnmounted()` when ChatApp component unmounts
 * - Call `isChatAppActive()` to check if chat is currently visible
 */

let isChatMounted = false;

/**
 * Mark the Chat app as mounted (visible)
 * Call this in ChatApp's useEffect on mount
 */
export function markChatMounted() {
  isChatMounted = true;
}

/**
 * Mark the Chat app as unmounted (not visible)
 * Call this in ChatApp's useEffect cleanup
 */
export function markChatUnmounted() {
  isChatMounted = false;
}

/**
 * Check if the Chat app is currently active (mounted)
 * Used to determine when to show browser notifications
 * 
 * @returns true if chat is visible, false otherwise
 */
export function isChatAppActive(): boolean {
  return isChatMounted;
}

