"use client";

import { useState } from "react";

type ReportedTrouble = {
  id: string;
  reason: string;
  resolved: boolean;
  created_at: string;
};

export default function TroubleReportedToggle({
  count,
  troubles,
}: {
  count: number;
  troubles: ReportedTrouble[];
}) {
  const [open, setOpen] = useState(false);

  if (count === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-green-500 hover:text-green-600 transition"
      >
        報告中 {count}件 {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-green-100 bg-green-50 overflow-hidden text-left">
          {troubles.map((t) => (
            <div key={t.id} className="px-3 py-2.5 border-b border-green-100 last:border-b-0">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium rounded-full px-2 py-0.5 border ${
                  t.resolved
                    ? "bg-green-100 text-green-600 border-green-200"
                    : "bg-green-50 text-green-500 border-green-200"
                }`}>
                  {t.resolved ? "✓ 解決済み" : "未解決"}
                </span>
              </div>
              <p className="text-xs text-green-600 leading-relaxed mb-1">{t.reason}</p>
              <p className="text-[10px] text-green-400">
                {new Date(t.created_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
