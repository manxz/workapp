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

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout with AuthProvider
│   └── page.tsx           # Main page with chat interface
├── components/            # React components
│   ├── ChatHeader.tsx     # Chat conversation header
│   ├── ChatInput.tsx      # Message input area
│   ├── ChatMessages.tsx   # Message display
│   ├── ChatSidebar.tsx    # Conversation list
│   ├── Login.tsx          # Authentication UI
│   └── Sidebar.tsx        # Main navigation
├── contexts/              # React contexts
│   └── AuthContext.tsx    # Authentication state
├── hooks/                 # Custom React hooks
│   └── useChat.ts         # Chat functionality with real-time
├── lib/                   # Utilities
│   └── supabase.ts        # Supabase client
└── types/                 # TypeScript types
    └── database.types.ts  # Generated Supabase types
```

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
