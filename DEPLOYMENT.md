# Deployment Guide

## Quick Deploy to Vercel

### 1. Prepare Supabase

Before deploying, configure your Supabase project:

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to Authentication > URL Configuration**
3. **Add Site URL**: `https://your-app-name.vercel.app` (update after deployment)
4. **Add Redirect URLs**:
   - `https://your-app-name.vercel.app/**`
   - `http://localhost:3000/**` (for local dev)

5. **Enable Authentication Providers**:
   - Go to Authentication > Providers
   - Enable Email (already done)
   - Optional: Enable Google, GitHub, etc.

### 2. Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. **Go to**: https://vercel.com/new
2. **Import your repository**: `manxz/workapp`
3. **Configure Project**:
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **Add Environment Variables**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://dxrrwhsicazbrshamfzn.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4cnJ3aHNpY2F6YnJzaGFtZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNDA4NDUsImV4cCI6MjA3ODkxNjg0NX0.nlqDitH9K-XivG68I63Dg6WkFmE2M13ns1hoKX6kI6g
   ```

5. **Click Deploy**

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### 3. Post-Deployment

1. **Copy your deployment URL** (e.g., `https://workapp-xyz.vercel.app`)

2. **Update Supabase URL Configuration**:
   - Go back to Supabase Dashboard > Authentication > URL Configuration
   - Update Site URL with your Vercel URL
   - Update Redirect URLs with your Vercel URL

3. **Test Authentication**:
   - Visit your app
   - Try signing up with email
   - Try logging in
   - Test sending messages

### 4. Custom Domain (Optional)

1. In Vercel Dashboard, go to your project
2. Navigate to Settings > Domains
3. Add your custom domain
4. Update DNS records as instructed
5. Update Supabase URL configuration with your custom domain

## Database Maintenance

### Auto-Delete Old Messages

Your database has a function `delete_old_messages()` that removes messages older than 120 days.

**Option 1: Manual Cleanup** (Recommended for now)
- Call the function manually when needed via Supabase Dashboard

**Option 2: Scheduled Cleanup** (Future Enhancement)
- Use Supabase Edge Functions with pg_cron
- Or set up a Vercel Cron Job to call the function

Example Vercel Cron (create `app/api/cleanup/route.ts`):

```typescript
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Call cleanup function
  const { error } = await supabase.rpc('delete_old_messages');
  
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
```

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cleanup",
    "schedule": "0 0 * * *"
  }]
}
```

## Monitoring

### Check Application Logs
- **Vercel**: Dashboard > Your Project > Logs
- **Supabase**: Dashboard > Logs

### Check Database Health
- **Supabase**: Dashboard > Database > Reports

### Security Advisors
- Run security checks regularly via Supabase dashboard
- Monitor RLS policies

## Troubleshooting

### Authentication Issues
- Verify environment variables are set correctly
- Check Supabase URL configuration
- Ensure redirect URLs match exactly

### Real-time Not Working
- Check browser console for WebSocket errors
- Verify Supabase Realtime is enabled (it should be by default)
- Check network tab for connection issues

### Database Connection Issues
- Verify NEXT_PUBLIC_SUPABASE_URL is correct
- Verify NEXT_PUBLIC_SUPABASE_ANON_KEY is correct
- Check Supabase project status

## Scaling Considerations

### Current Setup
- ✅ Supabase Free Tier: 500 MB database, 2 GB bandwidth, 50k monthly active users
- ✅ Vercel Free Tier: 100 GB bandwidth, unlimited projects

### When to Upgrade
- **Supabase Pro** ($25/mo): When you exceed free tier limits
- **Vercel Pro** ($20/mo): When you need team collaboration or more bandwidth

### Performance Optimizations
- Add indexes to frequently queried fields (already done)
- Implement pagination for message history
- Use database connection pooling (built into Supabase)
- Consider CDN for static assets (Vercel does this automatically)

## Security Best Practices

✅ **Already Implemented:**
- Row Level Security (RLS) enabled
- Environment variables for secrets
- Secure authentication with Supabase
- Search path set for database functions

🔒 **Additional Recommendations:**
- Rotate Supabase keys periodically
- Enable 2FA on your Supabase account
- Monitor authentication logs
- Set up rate limiting (via Supabase API)

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

Happy deploying! 🚀

