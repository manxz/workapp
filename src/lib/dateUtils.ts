/**
 * Date and time utility functions
 * 
 * Provides consistent date/time formatting across the application.
 * All functions handle timezone conversion and edge cases.
 */

/**
 * Formats a timestamp into a readable time string (e.g., "3:45 PM")
 * 
 * @param timestamp - ISO 8601 timestamp string
 * @returns Formatted time string in 12-hour format
 * 
 * @example
 * formatTime("2024-01-15T15:45:00Z") // "3:45 PM"
 */
export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Formats a timestamp into a date divider string
 * Shows "Today", "Yesterday", or full date
 * 
 * @param timestamp - ISO 8601 timestamp string
 * @returns User-friendly date string
 * 
 * @example
 * formatDateDivider("2024-01-15T10:30:00Z") // "Today" (if today)
 * formatDateDivider("2024-01-14T10:30:00Z") // "Yesterday" (if yesterday)
 * formatDateDivider("2024-01-10T10:30:00Z") // "Wednesday, January 10, 2024"
 */
export function formatDateDivider(timestamp: string): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if it's today
  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  
  // Check if it's yesterday
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  
  // Otherwise return formatted date
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Determines if a date divider should be shown between two messages
 * Returns true if messages are on different days
 * 
 * @param currentTimestamp - ISO timestamp of current message
 * @param previousTimestamp - ISO timestamp of previous message (null if first message)
 * @returns True if date divider should be shown
 * 
 * @example
 * shouldShowDateDivider("2024-01-15T10:00:00Z", "2024-01-15T09:00:00Z") // false (same day)
 * shouldShowDateDivider("2024-01-15T10:00:00Z", "2024-01-14T23:00:00Z") // true (different days)
 * shouldShowDateDivider("2024-01-15T10:00:00Z", null) // true (first message)
 */
export function shouldShowDateDivider(
  currentTimestamp: string,
  previousTimestamp: string | null
): boolean {
  if (!previousTimestamp) return true;
  
  const currentDate = new Date(currentTimestamp).toDateString();
  const prevDate = new Date(previousTimestamp).toDateString();
  
  return currentDate !== prevDate;
}

/**
 * Formats a timestamp into a relative time string (e.g., "5 min ago")
 * Used for thread summaries and relative timestamps
 * 
 * @param timestamp - ISO 8601 timestamp string
 * @returns Human-readable relative time
 * 
 * @example
 * formatRelativeTime("2024-01-15T15:30:00Z") // "just now" (if < 1 min)
 * formatRelativeTime("2024-01-15T15:25:00Z") // "5 min ago"
 * formatRelativeTime("2024-01-15T13:00:00Z") // "2 hours ago"
 * formatRelativeTime("2024-01-14T15:00:00Z") // "1 day ago"
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

