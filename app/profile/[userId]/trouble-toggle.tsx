"use client";

import { useState } from "react";

type Trouble = {
  id: string;
  reason: string;
  resolved: boolean;
  created_at: string;
  reporter: { username: any } | { username: any }[] | null;
};

function TroubleGroup({
  troubles,
  type,
}: {
  troubles: Trouble[];
  type: "unresolved" | "resolved";
}) {
  const [open, setOpen] = useState(false);
  if (troubles.length === 0) return null;

  const isUnresolved = type === "unresolved";
  const label = isUnresolved ? "未解決" : "解決済み";
  const colorText = isUnresolved ? "text-red-400" : "text-green-500";
  const borderColor = isUnresolved ? "border-red-100" : "border-green-100";
  const bgColor = isUnresolved ? "bg-red-50" : "bg-green-50";
  const textColor = isUnresolved ? "text-red-500" : "text-green-600";
  const mutedColor = isUnresolved ? "text-red-300" : "text-green-400";

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`text-xs font-medium transition ${colorText} hover:opacity-80`}
      >
        {label} {troubles.length}件 {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className={`mt-2 overflow-hidden rounded-xl border ${borderColor} ${bgColor} text-left`}>
          {troubles.map((t) => {
            const username = Array.isArray(t.reporter)
              ? t.reporter[0]?.username
              : (t.reporter as any)?.username;
            return (
              <div key={t.id} className={`border-b ${borderColor} px-3 py-2.5 last:border-b-0`}>
                <p className={`text-xs font-medium mb-0.5 ${colorText}`}>@{username}</p>
                <p className={`text-xs leading-relaxed mb-1 ${textColor}`}>{t.reason}</p>
                <p className={`text-[10px] ${mutedColor}`}>
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

export default function TroubleToggle({
  count,
  troubles,
}: {
  count: number;
  troubles: Trouble[];
}) {
  if (count === 0) return <p className="text-xs text-subtle">トラブルなし</p>;

  const unresolved = troubles.filter((t) => !t.resolved);
  const resolved = troubles.filter((t) => t.resolved);

  return (
    <div className="flex flex-col gap-2">
      <TroubleGroup troubles={unresolved} type="unresolved" />
      <TroubleGroup troubles={resolved} type="resolved" />
    </div>
  );
}
