"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefreshButton() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={refreshing}
      aria-label="更新"
      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-50"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 18 18"
        fill="none"
        aria-hidden="true"
        style={{ animation: refreshing ? "spin 0.7s linear infinite" : "none" }}
      >
        <path d="M14.5 9a5.5 5.5 0 1 1-1.1-3.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M14.5 4v2.5H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      更新
    </button>
  );
}
