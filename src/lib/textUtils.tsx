/**
 * Text processing utilities
 * 
 * Functions for parsing and formatting text content,
 * including URL detection and linkification.
 */

import React, { ReactNode } from 'react';

/**
 * Detects URLs in text and converts them to clickable links
 * 
 * Supports:
 * - Full URLs with protocol (https://example.com)
 * - URLs starting with www (www.example.com)
 * - Common TLDs without www (.com, .org, .io, etc.)
 * 
 * @param text - Plain text that may contain URLs
 * @returns Array of React nodes (strings and link elements)
 * 
 * @example
 * linkifyText("Check out https://example.com and www.test.io")
 * // Returns: ["Check out ", <a>https://example.com</a>, " and ", <a>www.test.io</a>]
 */
export function linkifyText(text: string): ReactNode[] {
  // Comprehensive URL regex that matches:
  // 1. URLs with http/https protocol
  // 2. URLs starting with www.
  // 3. Common domain patterns with popular TLDs
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|(?:[a-zA-Z0-9-]+\.)+(?:com|org|net|edu|gov|io|co|dev|app|ai|xyz|tech|me|info|biz|us|uk|ca|de|jp|fr|au|in|br|cn|ru|nl|se|no|dk|fi|it|es|pl|ch|at|be|cz|gr|hu|ie|il|nz|pt|ro|sg|za|kr|mx|ar|cl|my|ph|th|tw|vn|id|pk|bd|ua|ng|eg|ke|tz|gh|ug|zm|zw|ao|bw|cd|ci|cm|et|ga|gn|lr|mg|ml|mz|ne|rw|sd|sn|so|sz|tg|tn|ye|af|am|az|by|ge|kg|kz|lk|md|mn|tj|tm|uz|ba|bg|ee|hr|lt|lv|mk|rs|si|sk|al|ad|cy|fo|gi|is|li|mc|mt|sm|va)[^\s]*)/gi;
  
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      // Add https:// if the URL doesn't have a protocol
      const href = part.match(/^https?:\/\//) ? part : `https://${part}`;
      
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0070F3] hover:underline"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

/**
 * Checks if a string contains any URLs
 * 
 * @param text - Text to check for URLs
 * @returns True if text contains at least one URL
 * 
 * @example
 * containsUrl("Visit https://example.com") // true
 * containsUrl("Hello world") // false
 */
export function containsUrl(text: string): boolean {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|(?:[a-zA-Z0-9-]+\.)+(?:com|org|net|edu|gov|io|co|dev|app|ai|xyz|tech|me|info|biz|us|uk|ca|de|jp|fr|au|in|br|cn|ru|nl|se|no|dk|fi|it|es|pl|ch|at|be|cz|gr|hu|ie|il|nz|pt|ro|sg|za|kr|mx|ar|cl|my|ph|th|tw|vn|id|pk|bd|ua|ng|eg|ke|tz|gh|ug|zm|zw|ao|bw|cd|ci|cm|et|ga|gn|lr|mg|ml|mz|ne|rw|sd|sn|so|sz|tg|tn|ye|af|am|az|by|ge|kg|kz|lk|md|mn|tj|tm|uz|ba|bg|ee|hr|lt|lv|mk|rs|si|sk|al|ad|cy|fo|gi|is|li|mc|mt|sm|va)[^\s]*)/gi;
  return urlRegex.test(text);
}

/**
 * Truncates text to a maximum length, adding ellipsis if needed
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if necessary
 * 
 * @example
 * truncateText("This is a long message", 10) // "This is a..."
 * truncateText("Short", 10) // "Short"
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

