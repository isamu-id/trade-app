"use client";

import { useState } from "react";

type Trouble = {
  id: string;
  rating: number;
  trouble_reason: string | null;
  created_at: string;
  reviewer: { username: any } | { username: any }[] | null;
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

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-red-400 hover:text-red-500 transition"
      >
        トラブル {count}件 {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-red-100 bg-red-50 overflow-hidden text-left">
          {troubles.map((t) => {
            const username = Array.isArray(t.reviewer)
              ? t.reviewer[0]?.username
              : (t.reviewer as any)?.username;
            return (
              <div key={t.id} className="px-3 py-2.5 border-b border-red-100 last:border-b-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-red-400">@{username}</span>
                  <span className="text-amber-400 text-xs">
                    {"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}
                  </span>
                </div>
                {t.trouble_reason && (
                  <p className="text-xs text-red-500 leading-relaxed">{t.trouble_reason}</p>
                )}
                <p className="text-[10px] text-red-300 mt-1">
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
