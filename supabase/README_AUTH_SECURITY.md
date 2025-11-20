# Auth Security Configuration

## Leaked Password Protection

**Warning**: Leaked password protection is currently disabled.

### What is it?
Supabase Auth can check passwords against the HaveIBeenPwned.org database to prevent users from using compromised passwords.

### How to Enable

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Policies**
4. Find **Password Settings**
5. Enable **"Check for breached passwords"**

### Benefits
- Prevents users from using passwords that have been leaked in data breaches
- Improves overall account security
- Automatic protection with no code changes needed

### Impact
- Users trying to sign up or change passwords will be blocked if their password appears in breach databases
- No impact on existing users unless they change their password
- Minimal performance impact (API call to HaveIBeenPwned)

### Alternative
If you prefer not to use external services, you can implement your own password strength requirements in your application code, but HaveIBeenPwned integration is recommended for better security.

---

**Note**: This is a Supabase Auth configuration setting and cannot be changed via SQL migrations. It must be configured through the Supabase Dashboard.

