"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginScreen() {
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-6 text-lg font-medium">物々交換サイト</h1>

        <button
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 py-3 text-sm"
        >
          {/* Google公式ロゴ */}
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.7 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.7 6 29.6 4 24 4c-7.5 0-14 4.1-17.7 10.2z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.5 0 10.5-1.9 14.3-5.1l-6.6-5.4C29.6 35.4 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.9 39.8 16.4 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H24v8h11.3c-.8 2.3-2.2 4.2-4 5.6l6.6 5.4C41.7 36.5 44 30.8 44 24c0-1.3-.1-2.7-.4-3.5z"
            />
          </svg>
          Googleでログイン
        </button>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}
