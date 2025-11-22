/**
 * Mention Utilities
 * 
 * Handles parsing and rendering of @mentions in messages.
 * 
 * ## Mention Format
 * Mentions are stored in text as: `@[userId:userName]`
 * Example: "Hey @[123:Oscar] can you review this?"
 * 
 * ## Why This Format?
 * - Easy to parse with regex
 * - Preserves user ID for notifications
 * - Displays user name in message
 * - Handles name changes (ID stays constant)
 */

export type Mention = {
  userId: string;
  userName: string;
  startIndex: number;
  endIndex: number;
};

/**
 * Extract all mentions from message text
 * 
 * @param text - Message text containing mentions
 * @returns Array of parsed mentions with positions
 * 
 * @example
 * parseMentions("Hey @[123:Oscar] and @[456:Maria]!")
 * // Returns: [
 * //   { userId: "123", userName: "Oscar", startIndex: 4, endIndex: 18 },
 * //   { userId: "456", userName: "Maria", startIndex: 23, endIndex: 36 }
 * // ]
 */
export function parseMentions(text: string): Mention[] {
  const mentions: Mention[] = [];
  // Match pattern: @[userId:userName]
  const mentionRegex = /@\[([^:]+):([^\]]+)\]/g;
  
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      userId: match[1],
      userName: match[2],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }
  
  return mentions;
}

/**
 * Extract user IDs from message text for notifications
 * 
 * @param text - Message text containing mentions
 * @returns Array of unique user IDs
 * 
 * @example
 * extractMentionedUserIds("Hey @[123:Oscar] and @[456:Maria]!")
 * // Returns: ["123", "456"]
 */
export function extractMentionedUserIds(text: string): string[] {
  const mentions = parseMentions(text);
  // Remove duplicates
  return Array.from(new Set(mentions.map(m => m.userId)));
}

/**
 * Insert a mention into text at cursor position
 * 
 * @param text - Current message text
 * @param cursorPosition - Current cursor position
 * @param userId - User ID to mention
 * @param userName - User name to display
 * @returns Object with new text and cursor position
 * 
 * @example
 * insertMention("Hey @o", 6, "123", "Oscar")
 * // Returns: { text: "Hey @[123:Oscar] ", cursorPosition: 17 }
 */
export function insertMention(
  text: string,
  cursorPosition: number,
  userId: string,
  userName: string
): { text: string; cursorPosition: number } {
  // Find the @ symbol before cursor
  const beforeCursor = text.slice(0, cursorPosition);
  const atIndex = beforeCursor.lastIndexOf('@');
  
  if (atIndex === -1) {
    // No @ found, insert at cursor
    const mention = `@[${userId}:${userName}] `;
    const newText = text.slice(0, cursorPosition) + mention + text.slice(cursorPosition);
    return {
      text: newText,
      cursorPosition: cursorPosition + mention.length,
    };
  }
  
  // Replace from @ to cursor with mention
  const mention = `@[${userId}:${userName}] `;
  const newText = text.slice(0, atIndex) + mention + text.slice(cursorPosition);
  
  return {
    text: newText,
    cursorPosition: atIndex + mention.length,
  };
}

/**
 * Get search query after @ symbol
 * 
 * @param text - Current message text
 * @param cursorPosition - Current cursor position
 * @returns Search query or null if not in mention mode
 * 
 * @example
 * getMentionQuery("Hey @osc", 8)
 * // Returns: "osc"
 * 
 * getMentionQuery("Hey there", 9)
 * // Returns: null
 */
export function getMentionQuery(text: string, cursorPosition: number): string | null {
  const beforeCursor = text.slice(0, cursorPosition);
  
  // Find last @ symbol
  const atIndex = beforeCursor.lastIndexOf('@');
  if (atIndex === -1) return null;
  
  // Check if there's a space or [ after @
  const afterAt = beforeCursor.slice(atIndex + 1);
  if (afterAt.includes(' ') || afterAt.includes('[')) return null;
  
  // Return query after @
  return afterAt;
}

/**
 * Check if cursor is in mention mode (typing after @)
 * 
 * @param text - Current message text
 * @param cursorPosition - Current cursor position
 * @returns True if in mention mode
 */
export function isInMentionMode(text: string, cursorPosition: number): boolean {
  return getMentionQuery(text, cursorPosition) !== null;
}

