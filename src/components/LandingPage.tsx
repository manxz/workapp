"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LandingPage() {
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
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <div className="flex flex-col items-center w-[240px]">
        {/* Logo */}
        <div className="flex flex-col gap-4 items-center mb-4">
          <div className="bg-[#06df79] p-1.5 rounded-[11px] flex items-center justify-center">
            <svg 
              width="32" 
              height="32" 
              viewBox="0 0 32 32" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M16 5V27M5 16H27M8.5 8.5L23.5 23.5M23.5 8.5L8.5 23.5" 
                stroke="white" 
                strokeWidth="2.5" 
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="text-[40px] font-semibold text-[#1d1d1f] text-center">
            Workapp
          </h1>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2 items-center justify-center p-4 w-full">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="bg-[#1d1d1f] w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg hover:bg-[#2d2d2f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-[13px] font-medium text-white whitespace-nowrap">
              {loading ? 'Signing in...' : 'Sign in'}
            </span>
          </button>
          
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg hover:bg-neutral-200/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-[13px] font-medium text-[#1d1d1f] whitespace-nowrap">
              Sign up
            </span>
          </button>
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}



