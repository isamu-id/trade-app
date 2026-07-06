"use client";

import { useState } from "react";
import Link from "next/link";

type OtherParty = {
  id: string;
  username: string;
} | null;

type ReportedTrouble = {
  id: string;
  reason: string;
  resolved: boolean;
  created_at: string;
  offer: {
    offerer_id: string;
    offerer: { id: string; username: string } | { id: string; username: string }[] | null;
    requesting_item: {
      owner: { id: string; username: string } | { id: string; username: string }[] | null;
    } | { owner: { id: string; username: string } | { id: string; username: string }[] | null }[] | null;
  } | null;
};

function getOtherParty(trouble: ReportedTrouble, reporterId: string): OtherParty {
  const offer = Array.isArray(trouble.offer) ? trouble.offer[0] : trouble.offer;
  if (!offer) return null;

  const offerer = Array.isArray(offer.offerer) ? offer.offerer[0] : offer.offerer;
  const requestingItem = Array.isArray(offer.requesting_item) ? offer.requesting_item[0] : offer.requesting_item;
  const owner = requestingItem
    ? (Array.isArray(requestingItem.owner) ? requestingItem.owner[0] : requestingItem.owner)
    : null;

  // reporterがoffererなら相手はrequesting_itemのowner、その逆も然り
  if (offerer?.id === reporterId) {
    return owner ? { id: owner.id, username: owner.username } : null;
  } else {
    return offerer ? { id: offerer.id, username: offerer.username } : null;
  }
}

export default function TroubleReportedToggle({
  count,
  troubles,
  reporterId,
}: {
  count: number;
  troubles: ReportedTrouble[];
  reporterId: string;
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
          {troubles.map((t) => {
            const other = getOtherParty(t, reporterId);
            return (
              <div key={t.id} className="px-3 py-2.5 border-b border-green-100 last:border-b-0">
                <div className="flex items-center justify-between mb-1.5">
                  {other ? (
                    <Link
                      href={`/profile/${other.id}`}
                      className="text-xs font-medium text-green-600 underline underline-offset-2 hover:text-green-700"
                    >
                      @{other.username} のプロフィールへ →
                    </Link>
                  ) : (
                    <span className="text-xs text-green-400">相手不明</span>
                  )}
                  <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 border flex-shrink-0 ml-2 ${
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
            );
          })}
        </div>
      )}
    </div>
  );
}
