"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
      {/* Logo + App Name */}
      <div className="flex items-center gap-2 mb-6">
        <Image
          src="/app-logo.svg"
          alt="Workapp"
          width={40}
          height={40}
          className="rounded-lg"
        />
        <span 
          className="font-medium text-black"
          style={{ 
            fontFamily: 'Inter, sans-serif',
            fontSize: '32px',
            lineHeight: '40px'
          }}
        >
          Workapp
        </span>
      </div>

      {/* Google Sign In Button */}
      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="flex items-center justify-center gap-3 px-6 py-3 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        style={{ width: '380px' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span className="text-sm font-medium text-neutral-700">
          {loading ? 'Signing in...' : 'Continue with Google'}
        </span>
      </button>

      {error && (
        <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
      )}

      {/* Terms of Service & Privacy Policy Links */}
      <p className="mt-3 text-[12px] text-[#6a6a6a]">
        By continuing, you agree to our{' '}
        <a href="/tos" className="underline hover:text-[#1d1d1f]">Terms of Service</a>
        {' '}and{' '}
        <a href="/privacy" className="underline hover:text-[#1d1d1f]">Privacy Policy</a>
      </p>
    </div>
  );
}
