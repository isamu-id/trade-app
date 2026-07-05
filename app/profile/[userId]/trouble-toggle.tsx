"use client";

import { useState } from "react";

type Trouble = {
  id: string;
  reason: string;
  resolved: boolean;
  created_at: string;
  reporter: { username: any } | { username: any }[] | null;
};

export default function TroubleToggle({
  count,
  troubles,
}: {
  count: number;
  troubles: Trouble[];
}) {
  const [open, setOpen] = useState(false);

  if (count === 0) {
    return <p className="text-xs text-subtle">トラブルなし</p>;
  }

  const unresolvedCount = troubles.filter((t) => !t.resolved).length;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-red-400 hover:text-red-500 transition"
      >
        トラブル {count}件{unresolvedCount > 0 && ` (未解決 ${unresolvedCount}件)`} {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-red-100 bg-red-50 overflow-hidden text-left">
          {troubles.map((t) => {
            const username = Array.isArray(t.reporter)
              ? t.reporter[0]?.username
              : (t.reporter as any)?.username;
            return (
              <div key={t.id} className="px-3 py-2.5 border-b border-red-100 last:border-b-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-red-400">@{username}</span>
                  <span className={`text-xs font-medium rounded-full px-2 py-0.5 border ${
                    t.resolved
                      ? "bg-green-100 text-green-600 border-green-200"
                      : "bg-red-100 text-red-500 border-red-200"
                  }`}>
                    {t.resolved ? "✓ 解決済み" : "未解決"}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed mb-1 ${t.resolved ? "text-green-500" : "text-red-500"}`}>
                  {t.reason}
                </p>
                <p className="text-[10px] text-red-300">
                  {new Date(t.created_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
