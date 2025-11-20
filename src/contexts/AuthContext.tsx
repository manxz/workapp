"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { AUTH_INIT_TIMEOUT } from "@/lib/constants";

/**
 * Authentication context shape
 */
type AuthContextType = {
  /** Supabase auth user object (null if not authenticated) */
  user: User | null;
  /** User profile from profiles table (null if not loaded or no profile) */
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  /** True while checking auth status on initial load */
  loading: boolean;
  /** Signs out the current user */
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication provider with profile management
 * 
 * @description
 * Manages Supabase authentication state and user profiles.
 * Automatically loads profile when user signs in.
 * Includes timeout fallback to prevent infinite loading states.
 * 
 * ## Key Features
 * - **Auto-load profile**: Fetches profile data on sign-in
 * - **Session persistence**: Restores session from localStorage
 * - **Real-time auth changes**: Listens to Supabase auth state
 * - **Timeout protection**: 5-second fallback prevents hanging
 * 
 * ## Data Flow
 * 1. Check for existing session on mount
 * 2. If session exists, load user profile
 * 3. Subscribe to auth state changes (sign in/out)
 * 4. Keep profile synced with auth state
 * 
 * @param children - React children to wrap with auth context
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setLoading(false);
      }
    };

    // Add timeout fallback in case Supabase hangs
    const timeout = setTimeout(() => {
      console.warn(`Auth initialization timed out after ${AUTH_INIT_TIMEOUT / 1000}s`);
      setLoading(false);
    }, AUTH_INIT_TIMEOUT);

    initAuth().then(() => clearTimeout(timeout));

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile(data);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication state
 * 
 * @description
 * Must be used within an AuthProvider. Provides access to current user,
 * profile, loading state, and sign out function.
 * 
 * @throws Error if used outside AuthProvider
 * 
 * @example
 * const { user, profile, loading, signOut } = useAuth();
 * 
 * if (loading) return <LoadingSpinner />;
 * if (!user) return <LoginPage />;
 * if (!profile?.full_name) return <ProfileSetup />;
 * 
 * return <Dashboard user={user} profile={profile} />;
 * 
 * @returns Authentication context value
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

