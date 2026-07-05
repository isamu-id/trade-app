"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (value.trim()) {
        params.set("q", value.trim());
      }
      router.push(`/?${params.toString()}`);
    }, 400); // 400ms デバウンス

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, router]);

  return (
    <div className="relative">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-subtle"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="何を探していますか?"
        className="w-full rounded-2xl border border-hairline bg-white py-4 pl-14 pr-5 text-sm text-ink shadow-sm outline-none transition placeholder:text-subtle hover:shadow-md focus:border-gold focus:ring-4 focus:ring-gold-soft"
      />
      {value && (
        <button
          onClick={() => setValue("")}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-subtle hover:text-ink"
          aria-label="クリア"
        >
          ✕
        </button>
      )}
    </div>
  );
}
