"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";

type ExistingOrg = {
  id: string;
  name: string;
  domain: string;
};

export default function OrgSetup() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [companyName, setCompanyName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingOrg, setCheckingOrg] = useState(true);
  const [existingOrg, setExistingOrg] = useState<ExistingOrg | null>(null);
  const [error, setError] = useState("");

  // Pre-fill name from Google auth metadata and check for existing org
  useEffect(() => {
    const initializeSetup = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser?.user_metadata) {
        const fullName = authUser.user_metadata.full_name || authUser.user_metadata.name || "";
        if (fullName) {
          const nameParts = fullName.split(" ");
          setFirstName(nameParts[0] || "");
          setLastName(nameParts.slice(1).join(" ") || "");
        }
        if (authUser.email) {
          setEmail(authUser.email);
          
          // Check if there's an existing org with this email domain
          const parts = authUser.email.split('@');
          if (parts.length === 2) {
            const domain = parts[1].toLowerCase();
            const { data: matchingOrg } = await supabase
              .from("organizations")
              .select("id, name, domain")
              .eq("domain", domain)
              .single();
            
            if (matchingOrg) {
              setExistingOrg(matchingOrg);
            }
          }
        }
      }
      setCheckingOrg(false);
    };
    initializeSetup();
  }, []);

  // Get email domain for display
  const getEmailDomain = () => {
    const parts = email.split('@');
    if (parts.length === 2) {
      return `@${parts[1].split('.')[0]}`;
    }
    return '';
  };

  // Generate a URL-safe slug from company name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  };

  // Comprehensive list of personal/free email providers
  const personalEmailDomains = new Set([
    // Google
    'gmail.com', 'googlemail.com',
    // Microsoft
    'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de', 'hotmail.es', 'hotmail.it',
    // Yahoo
    'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de', 'yahoo.es', 'yahoo.it', 'yahoo.ca', 'yahoo.com.au', 'yahoo.co.in', 'ymail.com', 'rocketmail.com',
    // Apple
    'icloud.com', 'me.com', 'mac.com',
    // AOL
    'aol.com', 'aim.com',
    // ProtonMail
    'protonmail.com', 'proton.me', 'pm.me',
    // Zoho
    'zoho.com', 'zohomail.com',
    // Other popular free providers
    'mail.com', 'email.com', 'usa.com', 'myself.com',
    'gmx.com', 'gmx.net', 'gmx.de',
    'web.de', 'freenet.de', 't-online.de',
    'yandex.com', 'yandex.ru',
    'mail.ru', 'inbox.ru', 'list.ru', 'bk.ru',
    'qq.com', '163.com', '126.com', 'sina.com',
    'naver.com', 'daum.net', 'hanmail.net',
    'rediffmail.com',
    'tutanota.com', 'tutanota.de', 'tutamail.com', 'tuta.io',
    'fastmail.com', 'fastmail.fm',
    'hushmail.com',
    'mailinator.com', 'guerrillamail.com', 'tempmail.com', // Disposable
    'cock.li', 'airmail.cc', // Privacy-focused
  ]);

  // Check if email is from a personal/free provider
  const isPersonalEmail = (email: string) => {
    const parts = email.split('@');
    if (parts.length === 2) {
      const domain = parts[1].toLowerCase();
      return personalEmailDomains.has(domain);
    }
    return true; // Default to personal if we can't parse
  };

  // Extract domain from email (returns null for personal emails)
  const extractDomain = (email: string) => {
    const parts = email.split('@');
    if (parts.length === 2) {
      const domain = parts[1].toLowerCase();
      if (!personalEmailDomains.has(domain)) {
        return domain;
      }
    }
    return null;
  };

  // Handle logo file selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 1MB)
      if (file.size > 1024 * 1024) {
        setError("Logo must be less than 1MB");
        return;
      }
      setLogoFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload logo to Supabase Storage
  const uploadLogo = async (orgId: string): Promise<string | null> => {
    if (!logoFile) return null;
    
    const fileExt = logoFile.name.split('.').pop();
    const fileName = `${orgId}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('org-logos')
      .upload(fileName, logoFile, { upsert: true });
    
    if (uploadError) {
      console.error('Error uploading logo:', uploadError);
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('org-logos')
      .getPublicUrl(fileName);
    
    return publicUrl;
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

      // Add user as owner of the organization FIRST (needed for RLS to allow logo update)
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

      // Upload logo if provided (after user is owner, so RLS allows the update)
      if (logoFile) {
        const logoUrl = await uploadLogo(org.id);
        if (logoUrl) {
          await supabase
            .from("organizations")
            .update({ logo_url: logoUrl })
            .eq("id", org.id);
        }
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

  // Handle joining an existing organization
  const handleJoinOrg = async () => {
    if (!existingOrg) return;
    
    setLoading(true);
    setError("");

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      
      // Add user as member of the organization
      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: existingOrg.id,
          user_id: user?.id,
          role: 'member',
        });

      if (memberError) {
        throw memberError;
      }

      // Get avatar from auth metadata
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const avatarUrl = authUser?.user_metadata?.avatar_url || null;

      // Update user profile with organization
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user?.id,
          full_name: fullName,
          email: email,
          avatar_url: avatarUrl,
          organization_id: existingOrg.id,
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        throw profileError;
      }

      // Reload to refresh state
      window.location.reload();
    } catch (err) {
      console.error("Error joining organization:", err);
      const error = err as { message?: string; hint?: string };
      setError(error.message || error.hint || "Failed to join workspace");
    } finally {
      setLoading(false);
    }
  };

  const isPersonal = isPersonalEmail(email);

  // Show loading while checking for existing org
  if (checkingOrg) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <p className="text-neutral-600">Loading...</p>
      </div>
    );
  }

  // If there's an existing org with matching domain, show join UI
  if (existingOrg && !isPersonal) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <div className="flex flex-col gap-[18px] items-center w-[280px]">
          {/* Logo + App Name */}
          <div className="flex flex-col gap-2 items-center w-full">
            <Image
              src="/app-logo.svg"
              alt="Workapp"
              width={24}
              height={24}
              className="rounded-[6px]"
            />
            <h1 className="text-[20px] font-semibold text-[#1d1d1f]">
              Workapp
            </h1>
          </div>

          {/* Join Card */}
          <div className="bg-white border border-[rgba(29,29,31,0.2)] rounded-[12px] w-full p-4">
            <div className="flex flex-col gap-3 items-center text-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/>
                  <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#1d1d1f] mb-1">
                  Join {existingOrg.name}
                </p>
                <p className="text-[12px] text-[#1d1d1f]/70">
                  Your team is already using Workapp. Join them to start collaborating.
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2 items-center w-full">
            <button
              onClick={handleJoinOrg}
              disabled={loading}
              className="bg-[#1d1d1f] w-full flex items-center justify-center px-2 py-2 rounded-lg hover:bg-[#2d2d2f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-[13px] font-medium text-white">
                {loading ? 'Joining...' : `Join ${existingOrg.name}`}
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

  // If using personal email, show a different UI
  if (isPersonal) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <div className="flex flex-col gap-[18px] items-center w-[280px]">
          {/* Logo + App Name */}
          <div className="flex flex-col gap-2 items-center w-full">
            <Image
              src="/app-logo.svg"
              alt="Workapp"
              width={24}
              height={24}
              className="rounded-[6px]"
            />
            <h1 className="text-[20px] font-semibold text-[#1d1d1f]">
              Workapp
            </h1>
          </div>

          {/* Message Card */}
          <div className="bg-white border border-[rgba(29,29,31,0.2)] rounded-[12px] w-full p-4">
            <div className="flex flex-col gap-3 items-center text-center">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#1d1d1f] mb-1">
                  Work email required
                </p>
                <p className="text-[12px] text-[#1d1d1f]/70">
                  To create a workspace, please sign in with your work email instead of <span className="font-medium">{email}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Sign out button */}
          <div className="flex flex-col gap-2 items-center w-full">
            <button
              onClick={handleCancel}
              className="bg-[#1d1d1f] w-full flex items-center justify-center px-2 py-2 rounded-lg hover:bg-[#2d2d2f] transition-colors"
            >
              <span className="text-[13px] font-medium text-white">
                Sign in with work email
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <div className="flex flex-col gap-[18px] items-center w-[240px]">
        {/* Logo + App Name */}
        <div className="flex flex-col gap-2 items-center w-full">
          <Image
            src="/app-logo.svg"
            alt="Workapp"
            width={24}
            height={24}
            className="rounded-[6px]"
          />
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
              readOnly
              className="w-full bg-neutral-100 border border-[rgba(29,29,31,0.1)] rounded-lg p-2 text-[12px] font-medium text-[#1d1d1f]/60 cursor-not-allowed"
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
            
            {/* Logo Upload */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  {logoPreview ? (
                    <div className="w-8 h-8 rounded-md overflow-hidden border border-[rgba(29,29,31,0.1)]">
                      <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-md border border-dashed border-[rgba(29,29,31,0.2)] flex items-center justify-center bg-neutral-50">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                  )}
                  <span className="text-[12px] font-medium text-[#1d1d1f]/60">
                    {logoPreview ? 'Change logo' : 'Add logo (optional)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              </div>
              <p className="text-[10px] text-[#1d1d1f]/40 ml-11">
                Recommended: 48×48px, PNG
              </p>
            </div>
          </div>

          {/* Info Text */}
          <div className="p-4">
            <p className="text-[12px] font-medium text-[#1d1d1f]">
              People from your org will join your workspace when they sign up using their{' '}
              <span className="font-semibold">{getEmailDomain()}</span> email accounts.
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



