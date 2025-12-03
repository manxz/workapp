"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function OrgSetup() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Generate a URL-safe slug from company name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  };

  // Extract domain from email
  const extractDomain = (email: string) => {
    const parts = email.split('@');
    if (parts.length === 2) {
      const domain = parts[1].toLowerCase();
      // Skip common personal email domains
      const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'me.com'];
      if (!personalDomains.includes(domain)) {
        return domain;
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim() || !companyName.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const slug = generateSlug(companyName);
      const domain = extractDomain(email);

      // Check if slug already exists
      const { data: existingOrg } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .single();

      if (existingOrg) {
        setError("An organization with this name already exists. Please choose a different name.");
        setLoading(false);
        return;
      }

      // Create the organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: companyName.trim(),
          slug,
          domain,
          created_by: user?.id,
        })
        .select()
        .single();

      if (orgError) {
        throw orgError;
      }

      // Add user as owner of the organization
      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: org.id,
          user_id: user?.id,
          role: 'owner',
        });

      if (memberError) {
        throw memberError;
      }

      // Get avatar from auth metadata
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const avatarUrl = authUser?.user_metadata?.avatar_url || null;

      // Update user profile with full name and organization
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user?.id,
          full_name: fullName,
          email: email,
          avatar_url: avatarUrl,
          organization_id: org.id,
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        throw profileError;
      }

      // Reload to refresh state
      window.location.reload();
    } catch (err) {
      console.error("Error creating organization:", err);
      const error = err as { message?: string; hint?: string };
      setError(error.message || error.hint || "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <div className="flex flex-col gap-[18px] items-center w-[240px]">
        {/* Logo */}
        <div className="flex flex-col gap-2 items-center w-full">
          <div className="bg-[#06df79] p-1 rounded-[6px] flex items-center justify-center">
            <svg 
              width="16" 
              height="16" 
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
          <h1 className="text-[20px] font-semibold text-[#1d1d1f]">
            Workapp
          </h1>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white border border-[rgba(29,29,31,0.2)] rounded-[12px] w-full">
          {/* Personal Information */}
          <div className="border-b border-[rgba(29,29,31,0.1)] p-4 flex flex-col gap-2">
            <p className="text-[12px] font-medium text-[#1d1d1f]">
              Personal information
            </p>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="w-full bg-white border border-[rgba(29,29,31,0.1)] rounded-lg p-2 text-[12px] font-medium text-[#1d1d1f] placeholder:text-[#1d1d1f]/50 focus:outline-none focus:ring-1 focus:ring-[#1d1d1f]/20"
              disabled={loading}
            />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="w-full bg-white border border-[rgba(29,29,31,0.1)] rounded-lg p-2 text-[12px] font-medium text-[#1d1d1f] placeholder:text-[#1d1d1f]/50 focus:outline-none focus:ring-1 focus:ring-[#1d1d1f]/20"
              disabled={loading}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full bg-white border border-[rgba(29,29,31,0.1)] rounded-lg p-2 text-[12px] font-medium text-[#1d1d1f] placeholder:text-[#1d1d1f]/50 focus:outline-none focus:ring-1 focus:ring-[#1d1d1f]/20"
              disabled={loading}
            />
          </div>

          {/* Company Information */}
          <div className="border-b border-[rgba(29,29,31,0.1)] p-4 flex flex-col gap-2">
            <p className="text-[12px] font-medium text-[#1d1d1f]">
              Company information
            </p>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company name"
              className="w-full bg-white border border-[rgba(29,29,31,0.1)] rounded-lg p-2 text-[12px] font-medium text-[#1d1d1f] placeholder:text-[#1d1d1f]/50 focus:outline-none focus:ring-1 focus:ring-[#1d1d1f]/20"
              disabled={loading}
            />
          </div>

          {/* Info Text */}
          <div className="p-4">
            <p className="text-[12px] font-medium text-[#1d1d1f]">
              People from your org will join your workspace when they sign up using their work email
            </p>
          </div>
        </form>

        {/* Buttons */}
        <div className="flex flex-col gap-2 items-center w-full">
          <button
            onClick={handleSubmit}
            disabled={loading || !firstName.trim() || !lastName.trim() || !companyName.trim()}
            className="bg-[#1d1d1f] w-full flex items-center justify-center px-2 py-2 rounded-lg hover:bg-[#2d2d2f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-[13px] font-medium text-white">
              {loading ? 'Creating...' : 'Create workspace'}
            </span>
          </button>
          
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="w-full flex items-center justify-center px-2 py-2 rounded-lg hover:bg-neutral-200/50 transition-colors disabled:opacity-50"
          >
            <span className="text-[13px] font-medium text-[#1d1d1f]">
              Cancel
            </span>
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}



