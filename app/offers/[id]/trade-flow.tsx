"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

type TradeFlowProps = {
  offerId: string;
  isOfferer: boolean;
  offererShipped: boolean;
  requesterShipped: boolean;
  offererReceived: boolean;
  requesterReceived: boolean;
};

function Step({ label, state }: { label: string; state: "done" | "active" | "pending" }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
        state === "done" ? "bg-green-500 text-white" :
        state === "active" ? "bg-gold text-white" :
        "border border-hairline bg-white text-subtle"
      }`}>
        {state === "done" ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
        ) : state === "active" ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        )}
      </div>
      <p className={`text-center text-[10px] leading-tight ${
        state === "done" ? "text-green-600" :
        state === "active" ? "text-gold" :
        "text-subtle"
      }`}>{label}</p>
    </div>
  );
}

function StepLine({ done }: { done: boolean }) {
  return (
    <div className={`h-0.5 flex-1 mt-3.5 ${done ? "bg-green-400" : "bg-hairline"}`} />
  );
}

export default function TradeFlow({
  offerId, isOfferer, offererShipped, requesterShipped, offererReceived, requesterReceived,
}: TradeFlowProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const myShipped = isOfferer ? offererShipped : requesterShipped;
  const theirShipped = isOfferer ? requesterShipped : offererShipped;
  const myReceived = isOfferer ? offererReceived : requesterReceived;
  const theirReceived = isOfferer ? requesterReceived : offererReceived;
  const bothShipped = offererShipped && requesterShipped;

  async function handleShipped() {
    if (!window.confirm("商品を発送しましたか？\n「OK」を押すと相手に発送通知が届きます。取り消しはできません。")) return;
    setLoading(true);
    const { error } = await supabase.rpc("mark_shipped", { offer_id: offerId });
    setLoading(false);
    if (error) { alert("エラー: " + error.message); return; }
    router.refresh();
  }

  async function handleReceived() {
    if (!window.confirm("商品を受け取りましたか？\n両方が確認すると取引完了になります。取り消しはできません。")) return;
    setLoading(true);
    const { error } = await supabase.rpc("mark_received", { offer_id: offerId });
    setLoading(false);
    if (error) { alert("エラー: " + error.message); return; }
    router.refresh();
  }

  return (
    <div className="mb-4 rounded-2xl border border-hairline bg-white p-4">
      <p className="mb-3 text-xs text-subtle">取引の進捗</p>

      {/* ステッププログレス */}
      <div className="flex items-start mb-4">
        <Step label="承諾" state="done" />
        <StepLine done={myShipped} />
        <Step label="自分の発送" state={myShipped ? "done" : "active"} />
        <StepLine done={theirShipped} />
        <Step label="相手の発送" state={theirShipped ? "done" : myShipped ? "active" : "pending"} />
        {bothShipped && (
          <>
            <StepLine done={myReceived && theirReceived} />
            <Step label="受取完了" state={myReceived && theirReceived ? "done" : bothShipped ? "active" : "pending"} />
          </>
        )}
      </div>

      {/* アクションボタン */}
      {!myShipped && (
        <button
          onClick={handleShipped}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gold py-2.5 text-sm font-medium text-white transition hover:bg-gold/90 disabled:opacity-50"
        >
          {loading && <Spinner />}
          発送しました
        </button>
      )}

      {myShipped && !theirShipped && (
        <div className="rounded-xl bg-neutral-50 px-4 py-3 text-center">
          <p className="text-xs text-subtle">相手の発送を待っています…</p>
        </div>
      )}

      {bothShipped && !myReceived && (
        <button
          onClick={handleReceived}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-green-500 py-2.5 text-sm font-medium text-white transition hover:bg-green-500/90 disabled:opacity-50"
        >
          {loading && <Spinner />}
          受け取りました
        </button>
      )}

      {bothShipped && myReceived && !theirReceived && (
        <div className="rounded-xl bg-neutral-50 px-4 py-3 text-center">
          <p className="text-xs text-subtle">相手の受取確認を待っています…</p>
        </div>
      )}
    </div>
  );
}
