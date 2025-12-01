import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Helper to create Supabase client with proper cookie handling
async function createSupabaseClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore - this is called from a Server Component
          }
        },
      },
    }
  );
}

// DELETE: Disconnect a calendar account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: accountId } = await params;

    // Verify the account belongs to the user
    const { data: account, error: fetchError } = await supabase
      .from('connected_calendar_accounts')
      .select('id, access_token')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Optionally revoke the Google token
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${account.access_token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    } catch (revokeError) {
      // Don't fail if revoke fails - the user may have already revoked access
      console.warn('Failed to revoke Google token:', revokeError);
    }

    // Delete the account (cascades to synced_calendars)
    const { error: deleteError } = await supabase
      .from('connected_calendar_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting account:', deleteError);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in account DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update calendar sync settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: accountId } = await params;
    const body = await request.json();

    // Verify the account belongs to the user
    const { data: account, error: fetchError } = await supabase
      .from('connected_calendar_accounts')
      .select('id')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Update calendar enabled states if provided
    if (body.calendars) {
      for (const calendarUpdate of body.calendars) {
        const { error: updateError } = await supabase
          .from('synced_calendars')
          .update({ is_enabled: calendarUpdate.is_enabled })
          .eq('id', calendarUpdate.id)
          .eq('connected_account_id', accountId);

        if (updateError) {
          console.error('Error updating calendar:', updateError);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in account PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
