/**
 * Application-wide constants
 * 
 * Centralizes magic numbers, strings, and configuration values
 * used throughout the application for easier maintenance and consistency.
 */

// ============================================================================
// FILE UPLOAD LIMITS
// ============================================================================

/** Maximum number of files that can be uploaded at once */
export const MAX_FILE_UPLOADS = 10;

/** Maximum height (in pixels) for image preview thumbnails */
export const MAX_IMAGE_PREVIEW_HEIGHT = 160;

/** Maximum width (in pixels) for displaying uploaded images in chat */
export const MAX_CHAT_IMAGE_WIDTH = 400;

// ============================================================================
// UI DIMENSIONS
// ============================================================================

/** Maximum height (in pixels) for the textarea input before scrolling */
export const TEXTAREA_MAX_HEIGHT = 400;

/** Width (in pixels) of the thread panel */
export const THREAD_PANEL_WIDTH = 512;

/** Width (in pixels) of the sidebar navigation */
export const SIDEBAR_WIDTH = 264;

/** Width (in pixels) of the narrow sidebar (icon-only mode) */
export const SIDEBAR_WIDTH_NARROW = 64;

// ============================================================================
// TIMING (milliseconds)
// ============================================================================

/** Duration before typing indicator automatically disappears */
export const TYPING_INDICATOR_TIMEOUT = 3000;

/** Delay before broadcasting "stop typing" after user stops typing */
export const TYPING_BROADCAST_DELAY = 2000;

/** Time window for matching optimistic messages with server messages */
export const OPTIMISTIC_MESSAGE_MATCH_WINDOW = 10000;

/** Delay before thread panel loads after URL change */
export const THREAD_LOAD_DELAY = 100;

/** Timeout for authentication initialization */
export const AUTH_INIT_TIMEOUT = 5000;

/** Delay before clearing pending files from drag & drop */
export const PENDING_FILES_CLEAR_DELAY = 100;

// ============================================================================
// COLORS
// ============================================================================

export const COLORS = {
  /** Primary brand color (blue) */
  primary: '#0070F3',
  
  /** Hover background color for messages and UI elements */
  hoverBackground: '#F5F5F5',
  
  /** Active reaction background (with transparency) */
  reactionActiveBackground: 'rgba(0,112,243,0.16)',
  
  /** Active reaction border */
  reactionActiveBorder: '#0070f3',
  
  /** Active reaction text */
  reactionActiveText: '#0070f3',
  
  /** Inactive reaction background */
  reactionInactiveBackground: '#e9e9e9',
  
  /** Inactive reaction hover background */
  reactionInactiveHover: '#d9d9d9',
  
  /** Inactive reaction text */
  reactionInactiveText: '#6a6a6a',
  
  /** Action button border (with transparency) */
  actionBorder: 'rgba(29,29,31,0.2)',
  
  /** Thread summary border (with transparency) */
  threadSummaryBorder: 'rgba(29,29,31,0.1)',
} as const;

// ============================================================================
// QUICK REACTIONS
// ============================================================================

/**
 * Quick reaction emojis displayed in message hover actions
 * Order matters - this is the display order
 */
export const QUICK_REACTIONS = ['👍', '❤️', '💯', '😂', '😢', '😡'] as const;

// ============================================================================
// MESSAGE RETENTION
// ============================================================================

/** Number of days messages are retained before automatic deletion */
export const MESSAGE_RETENTION_DAYS = 120;

// ============================================================================
// ANIMATION DURATIONS
// ============================================================================

/** Duration of thread panel slide-in animation (milliseconds) */
export const THREAD_PANEL_SLIDE_DURATION = 200;

/** Duration of main content resize transition (milliseconds) */
export const MAIN_CONTENT_RESIZE_DURATION = 200;

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/** Default avatar URL when user has no avatar */
export const DEFAULT_AVATAR_URL = 'https://i.pravatar.cc/150?img=1';

/** Placeholder for generating user-specific avatars */
export const USER_AVATAR_PLACEHOLDER = 'https://i.pravatar.cc/150?u=';

