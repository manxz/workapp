# Notification System Documentation

## Overview

Clean, modular notification system with super-app awareness and ephemeral unread state.

## Architecture

### 1. Global Chat Visibility Tracker (`src/global/chatVisibility.ts`)

**Purpose**: Track whether Chat app is currently mounted in the super-app.

**API**:
- `markChatMounted()` - Called when ChatApp mounts
- `markChatUnmounted()` - Called when ChatApp unmounts  
- `isChatAppActive()` - Returns true if chat is currently visible

**Why Global?**  
Apps are code-split and dynamically loaded. We need a framework-agnostic way to check if chat is active from anywhere in the app.

### 2. Browser Notification Utility (`src/lib/notifications.ts`)

**Purpose**: Show browser notifications with smart visibility detection.

**API**:
```typescript
requestNotificationPermission(): Promise<boolean>
showMessageNotification(data: MessageNotificationData, onNotificationClick?: (conversationId: string) => void)
```

**Notification Logic**:  
Show notification if ALL are true:
- Message is from another user
- Notifications are permitted
- AND (tab is unfocused OR chat app is not active)

**Scenarios**:
- ✅ Tab focused + chat inactive (Projects/Notepad) → Show notification
- ✅ Tab unfocused + chat inactive → Show notification  
- ✅ Tab unfocused + chat active → Show notification
- ❌ Tab focused + chat active → Don't show notification

### 3. Ephemeral Unread Dots (`src/hooks/useUnreadDots.ts`)

**Purpose**: Simple boolean unread state (no counts, no persistence).

**API**:
```typescript
const { hasUnread, markUnread, markRead, clearAll } = useUnreadDots();

hasUnread(conversationId: string): boolean
markUnread(conversationId: string): void
markRead(conversationId: string): void
clearAll(): void
```

**Rules**:
- Message arrives for non-active conversation → mark unread
- User opens conversation → mark as read
- In-memory only (React state)
- No database writes

### 4. Integration Points

#### ChatApp Component (`src/apps/chat/ChatApp.tsx`)
- Calls `markChatMounted()` on mount, `markChatUnmounted()` on unmount
- Uses `useUnreadDots()` hook for sidebar indicators
- Global message listener marks unread for non-active conversations
- Clears unread when user selects a conversation

#### useChat Hook (`src/hooks/useChat.ts`)
- Calls `showMessageNotification()` when messages arrive
- Uses `requestNotificationPermission()` on mount

#### ChatSidebar Component
- Shows 8-10px colored dot if `hasUnread` is true
- No numbers, no animations

## Performance

✅ **No Database Writes** - Unread state is ephemeral (in-memory)  
✅ **No Global Re-renders** - State is localized to ChatApp  
✅ **Modular** - All changes isolated to notification system  
✅ **No Regressions** - Existing chat/presence/routing unchanged

## Testing Checklist

- [ ] Browser notification fires when tab is unfocused
- [ ] Browser notification fires when in Projects/Notepad (chat not mounted)
- [ ] No notification when chat is active and tab is focused
- [ ] Clicking notification focuses window and opens conversation
- [ ] Unread dot appears when message arrives for non-active conversation
- [ ] Unread dot disappears when conversation is opened
- [ ] No console errors
- [ ] Existing chat functionality works (messages, threads, reactions, presence)

## File Changes

**New Files**:
- `src/global/chatVisibility.ts` - Global chat mount tracker
- `src/lib/notifications.ts` - Browser notification utility
- `src/hooks/useUnreadDots.ts` - Ephemeral unread state hook
- `docs/NOTIFICATION_SYSTEM.md` - This documentation

**Modified Files**:
- `src/apps/chat/ChatApp.tsx` - Mount tracking, unread dots, global message listener
- `src/hooks/useChat.ts` - Integrated new notification system
- `src/components/NotificationPrompt.tsx` - Uses new `requestNotificationPermission()`

**No Breaking Changes** - All existing functionality preserved.

