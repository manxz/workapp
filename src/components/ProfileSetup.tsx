"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfileSetup() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ full_name: name.trim() })
        .eq("id", user?.id);

      if (updateError) throw updateError;

      // Reload the page to refresh the profile
      window.location.reload();
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-medium text-black mb-2">Welcome to WorkApp</h1>
          <p className="text-sm text-neutral-600">Let's set up your profile</p>
        </div>
        
        <div className="bg-white border border-neutral-200 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-2">
                What's your name?
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-3 py-2 border border-neutral-300 rounded-[7px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                disabled={loading}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className={`w-full py-2 px-4 rounded-[7px] text-sm font-medium text-white transition-colors ${
                loading || !name.trim()
                  ? "bg-neutral-300 cursor-not-allowed"
                  : "bg-black hover:bg-neutral-800"
              }`}
            >
              {loading ? "Saving..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

