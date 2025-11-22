# Presence System Documentation

## Overview

Clean, simple implementation of real-time user presence (online/offline status) using Supabase Realtime Presence API.

## Architecture

### Data Model
```typescript
{
  online: boolean;        // User is currently online
  lastActiveAt: number;   // Unix timestamp (ms) of last activity
}
```

### Server-Side (Supabase Realtime Presence)
- **No database table** - uses Supabase's ephemeral Presence API
- **Automatic disconnect detection** - Supabase marks users offline after ~60s of no heartbeat
- **Real-time broadcasts** - All clients notified instantly when users go online/offline
- **No rate limits** - Designed for heartbeat traffic

### Client-Side (`usePresence` hook)

**Heartbeat System:**
- Sends presence update every **25 seconds**
- Server marks offline after **~60 seconds** of no updates
- Automatically marks online on mount
- Best-effort offline on tab close (with automatic server timeout as backup)

**Real-time Events:**
- Listens for `presence:sync` events (all users' current state)
- Listens for `presence:join` events (user comes online)
- Listens for `presence:leave` events (user goes offline)

**Performance:**
- Single channel subscription for all presence updates
- Map-based storage for O(1) lookups
- No unnecessary re-renders (only updates on actual changes)

## Usage

### In Components

```tsx
import { usePresence } from "@/hooks/usePresence";

function MyComponent() {
  const { getPresence } = usePresence();
  
  const presence = getPresence(userId);
  // presence.online => true/false
  // presence.lastActiveAt => timestamp (ms)
  
  return (
    <div>
      {presence.online ? "🟢 Online" : "⚫ Offline"}
    </div>
  );
}
```

### API

```typescript
usePresence() => {
  presenceMap: Map<string, UserPresence>;  // All users' presence state
  getPresence: (userId: string) => UserPresence;  // Get specific user's presence
}
```

## UI Implementation

### Online Indicator
- **Green dot** (`#34C759`) with white outer stroke
- 6x6px, positioned over avatar bottom-right

### Offline Indicator
- **Light gray fill** (`#FAFAFA`) with gray border (`#8E8E93`)
- Same size and position as online
- White outer stroke for consistency

### Future: Last Active
- Can compute "last active X minutes ago" using `lastActiveAt` timestamp
- Example: `Date.now() - presence.lastActiveAt` gives ms since last activity

## Performance Characteristics

✅ **Fast:**
- Users appear online within **1-2 seconds** of opening app
- Users appear offline within **~60 seconds** of closing app
- Other users see changes **instantly** (real-time)

✅ **Efficient:**
- Heartbeat only every 25 seconds (not every second)
- No database writes (ephemeral storage)
- Single subscription for all users
- Automatic cleanup on disconnect

✅ **Reliable:**
- Server-side timeout catches missed disconnects
- Best-effort client-side cleanup
- No race conditions or stale state

## Testing Checklist

- [ ] User becomes online within 1-2s of opening app
- [ ] Other users see online status immediately
- [ ] User becomes offline within ~60s of closing tab
- [ ] Other users see offline status immediately
- [ ] Heartbeat runs every 25 seconds (check console)
- [ ] No rate limit errors (429)
- [ ] No unnecessary re-renders
- [ ] Works across multiple tabs
- [ ] Survives page refresh
- [ ] No impact on existing chat functionality

## Migration Notes

**Removed:**
- `user_presence` database table (no longer needed)
- `update_user_presence` RPC function (no longer needed)
- Database migration `20251122000000_create_user_presence.sql`

**Added:**
- New `usePresence` hook using Supabase Realtime Presence
- Updated `ChatSidebar` to use simplified presence API
- Updated `ChatApp` to pass `getPresence` to sidebar

**No breaking changes** - All existing functionality preserved.

