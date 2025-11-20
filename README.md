# WorkApp

A modern real-time chat and project management application built with Next.js, Supabase, and Tailwind CSS.

## Features

- **Real-time Chat**: Send and receive messages instantly with Supabase real-time subscriptions
- **User Authentication**: Secure sign-in with email/password or OAuth providers (Google, GitHub)
- **Message Persistence**: Messages are stored for 120 days with automatic cleanup
- **Project Management**: Lightweight project tracker (coming soon)
- **Modern UI**: Beautiful, responsive interface with Inter font and Phosphor Icons

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Styling**: Tailwind CSS v4
- **Icons**: Phosphor Icons
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/manxz/workapp.git
cd workapp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

### Profiles Table
- Stores user profile information
- Automatically created on user signup
- Fields: id, email, full_name, avatar_url, created_at, updated_at

### Messages Table
- Stores chat messages with 120-day retention
- Real-time subscriptions enabled
- Fields: id, conversation_id, author_id, author_name, author_avatar, text, created_at

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only perform authorized actions
- Security policies enforce data access controls

## Deployment

### Deploy to Vercel

1. Push your code to GitHub

2. Import your repository in [Vercel](https://vercel.com)

3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Deploy!

### Supabase Configuration

Make sure to configure the following in your Supabase project:

1. **Authentication Providers**: Enable Email and any OAuth providers you want to use

2. **Site URL**: Add your production URL (e.g., `https://yourapp.vercel.app`)

3. **Redirect URLs**: Add:
   - `http://localhost:3000/**` (for local development)
   - `https://yourapp.vercel.app/**` (for production)

4. **Email Templates**: Customize authentication email templates (optional)

## Architecture

### State Management

**No Redux/Zustand needed** - The app uses a simple, effective state architecture:

- **Authentication State**: React Context (`AuthContext`)
- **Component UI State**: Local `useState` hooks
- **Server State**: Custom hooks (`useChat`, `useProjects`, `useTasks`, `useUnreadMessages`)
- **Real-time Sync**: Supabase Realtime subscriptions embedded in hooks

### Data Flow

```
User Action
    ↓
Hook Function (e.g., sendMessage)
    ↓
Optimistic UI Update (instant feedback)
    ↓
Supabase API Call
    ↓
Real-time Subscription Event
    ↓
All Clients Updated Automatically
```

### Key Design Patterns

#### 1. **Optimistic UI**
Actions appear instantly before server confirmation. If the server rejects, changes are reverted.

Example: Sending a message with images
- Message appears instantly with local `blob://` URLs
- Files upload to Supabase Storage in background
- Real images preloaded into browser cache
- Optimistic message seamlessly replaced with real data
- **Result**: Zero perceived latency, perfect UX

#### 2. **Reaction Order Preservation**
Reactions use **array format** (not objects) to maintain insertion order:
```typescript
// ✅ Maintains order
reactions: [{ emoji: '👍', userIds: ['user1', 'user2'] }]

// ❌ Order is unpredictable
reactions: { '👍': ['user1', 'user2'] }
```

#### 3. **Thread Architecture**
- Top-level messages: `thread_id = null`
- Thread replies: `thread_id = parent_message_id`
- Thread metadata cached on parent message (reply count, avatars)
- Real-time updates sync both main chat and active thread

#### 4. **Typing Indicators**
- Broadcast-only (not persisted to database)
- Auto-expire after 3 seconds of inactivity
- Thread-aware (separate indicators for main chat vs. threads)

### Project Structure

```
src/
├── app/                      # Next.js app directory
│   ├── layout.tsx           # Root layout with AuthProvider
│   ├── page.tsx             # Main page orchestrating all views
│   └── globals.css          # Global styles and animations
├── components/              # React components
│   ├── ChatHeader.tsx       # Chat conversation header
│   ├── ChatInput.tsx        # Message input with file upload
│   ├── ChatMessages.tsx     # Message list with reactions
│   ├── ChatSidebar.tsx      # Channel/DM list
│   ├── ThreadPanel.tsx      # Sliding thread conversation panel
│   ├── ThreadSummary.tsx    # Thread preview below parent message
│   ├── TypingIndicator.tsx  # "User is typing..." indicator
│   ├── Login.tsx            # Authentication UI
│   ├── ProfileSetup.tsx     # First-time user setup
│   ├── Sidebar.tsx          # Main navigation
│   ├── ProjectsView.tsx     # Kanban board
│   └── ProjectsSidebar.tsx  # Project list
├── contexts/                # React contexts
│   └── AuthContext.tsx      # Authentication state management
├── hooks/                   # Custom React hooks
│   ├── useChat.ts           # Chat with real-time, reactions, threads
│   ├── useChannels.ts       # Channel list management
│   ├── useUsers.ts          # User directory
│   ├── useProjects.ts       # Project CRUD
│   ├── useTasks.ts          # Task management
│   └── useUnreadMessages.ts # Notification state (localStorage + realtime)
├── lib/                     # Shared utilities
│   ├── supabase.ts          # Supabase client initialization
│   ├── constants.ts         # App-wide constants (colors, limits, etc.)
│   ├── dateUtils.ts         # Date/time formatting functions
│   └── textUtils.tsx        # Text processing (URL linkification)
└── types/                   # TypeScript types
    └── database.types.ts    # Generated Supabase types
```

## Developer Guide

### Adding Features

#### Adding a New Message Field

1. **Update Types** (`src/hooks/useChat.ts`)
   ```typescript
   export type Message = {
     // ... existing fields
     newField?: string; // Add your field
   };
   ```

2. **Update Database**
   - Add column in Supabase dashboard or via migration
   - Update RLS policies if needed

3. **Update Message Loading** (`loadMessages` function)
   ```typescript
   return {
     // ... existing fields
     newField: msg.new_field,
   };
   ```

4. **Update Real-time Subscription**
   - Handle INSERT events with new field
   - Handle UPDATE events if field is mutable

5. **Update UI**
   - `ChatMessages.tsx` for main chat
   - `ThreadPanel.tsx` for threads

#### Adding a New Hook

Follow the pattern in existing hooks:

```typescript
export function useMyFeature() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    if (!user) return;
    loadData();

    // Set up real-time subscription
    const channel = supabase
      .channel('my-feature')
      .on('postgres_changes', { ... }, (payload) => {
        // Handle updates
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { data, loading, /* actions */ };
}
```

#### Adding a New Component

- Use TypeScript for props
- Add `memo()` if expensive to render
- Use shared utilities from `lib/`
- Follow existing naming conventions

### Common Pitfalls

#### ❌ DON'T: Forget to clean up subscriptions
```typescript
useEffect(() => {
  const channel = supabase.channel('test').subscribe();
  // ❌ Missing cleanup!
}, []);
```

#### ✅ DO: Always clean up
```typescript
useEffect(() => {
  const channel = supabase.channel('test').subscribe();
  return () => supabase.removeChannel(channel); // ✅
}, []);
```

#### ❌ DON'T: Use object format for reactions
```typescript
// ❌ Order is unpredictable
reactions: { '👍': ['user1'] }
```

#### ✅ DO: Use array format
```typescript
// ✅ Maintains insertion order
reactions: [{ emoji: '👍', userIds: ['user1'] }]
```

#### ❌ DON'T: Skip image preloading
```typescript
// ❌ Images will flash (disappear/reappear)
setMessages(prev => [...prev, messageWithNewUrls]);
```

#### ✅ DO: Preload images first
```typescript
// ✅ Seamless transition
const imagePromises = urls.map(url => {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.src = url;
  });
});
await Promise.all(imagePromises);
setMessages(prev => [...prev, messageWithNewUrls]);
```

#### ❌ DON'T: Forget thread_id filter
```typescript
// ❌ Will load both main messages AND thread replies
.select('*')
.eq('conversation_id', conversationId)
```

#### ✅ DO: Filter correctly
```typescript
// ✅ Only main messages
.select('*')
.eq('conversation_id', conversationId)
.is('thread_id', null)
```

### Testing Checklist

When testing features, verify:

#### Real-time Functionality
- [ ] Changes sync across multiple browser windows
- [ ] Changes sync when other users are active
- [ ] No duplicate messages appear
- [ ] Old data is properly replaced (not duplicated)

#### Chat Features
- [ ] Messages send successfully
- [ ] Images upload and display correctly
- [ ] Images don't flash (disappear/reappear) after sending
- [ ] Multiple images can be uploaded at once
- [ ] Drag & drop works anywhere on the page

#### Typing Indicators
- [ ] Appear when users type
- [ ] Disappear after 3 seconds of inactivity
- [ ] Disappear immediately when message is sent
- [ ] Show correct user names
- [ ] Work in both main chat and threads

#### Reactions
- [ ] Add/remove reactions successfully
- [ ] Reactions appear in insertion order
- [ ] Active/inactive states display correctly
- [ ] Work in both main chat and threads
- [ ] Don't trigger auto-scroll

#### Threads
- [ ] Open/close smoothly
- [ ] Persist across page refresh (check URL)
- [ ] Clear when switching conversations
- [ ] Show correct reply count and avatars
- [ ] Typing indicators work in threads

#### Notifications
- [ ] Browser tab shows unread count
- [ ] Browser notifications appear (when tab is hidden)
- [ ] Notification permission prompt shows when needed
- [ ] Clicking notification focuses the window

#### Performance
- [ ] No memory leaks (check DevTools Memory tab)
- [ ] No excessive re-renders (use React DevTools Profiler)
- [ ] Images load efficiently
- [ ] Real-time connections clean up properly

### Debugging Tips

**Real-time not working?**
- Check Supabase dashboard → Realtime logs
- Verify RLS policies allow SELECT for authenticated users
- Check browser console for subscription errors
- Ensure channel is properly cleaned up on unmount

**Messages duplicating?**
- Check for missing `processedMessageIds` tracking
- Verify optimistic message replacement logic
- Check if `key` prop is unique

**Images flashing?**
- Verify image preloading is working
- Check if blob URLs are being revoked too early
- Ensure Promise.all waits for all images

**Typing indicators stuck?**
- Check if timeout cleanup is working
- Verify stop-typing event is broadcast
- Check if timeout ref is being cleared properly

## Features in Detail

### Real-time Messaging
- Messages sync instantly across all connected clients
- Automatic scroll to latest message
- Multi-line message support
- Date dividers for better readability

### Authentication
- Email/password authentication
- OAuth providers (Google, GitHub)
- Automatic profile creation on signup
- Secure session management

### Message Retention
- Messages are automatically deleted after 120 days
- Efficient database cleanup function
- Indexed for fast queries

## Development

### Running Locally
```bash
npm run dev
```

### Building for Production
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues and questions, please open an issue on GitHub.
