"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";

export default function Login() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-medium text-black">WorkApp</h1>
        </div>
        
        <div className="bg-white border border-neutral-200 rounded-2xl p-8">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "#000000",
                    brandAccent: "#262626",
                  },
                },
              },
              className: {
                container: "auth-container",
                button: "font-medium",
                input: "font-medium text-sm",
              },
            }}
            providers={["google"]}
            redirectTo={typeof window !== 'undefined' ? window.location.origin : undefined}
          />
        </div>
      </div>
    </div>
  );
}

