"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TradeFlowProps = {
  offerId: string;
  isOfferer: boolean; // 自分がオファーを送った側か
  offererShipped: boolean;
  requesterShipped: boolean;
  offererReceived: boolean;
  requesterReceived: boolean;
};

export default function TradeFlow({
  offerId,
  isOfferer,
  offererShipped,
  requesterShipped,
  offererReceived,
  requesterReceived,
}: TradeFlowProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const myShipped = isOfferer ? offererShipped : requesterShipped;
  const theirShipped = isOfferer ? requesterShipped : offererShipped;
  const myReceived = isOfferer ? offererReceived : requesterReceived;
  const bothShipped = offererShipped && requesterShipped;

  async function handleShipped() {
    setLoading(true);
    const { error } = await supabase.rpc("mark_shipped", { offer_id: offerId });
    setLoading(false);
    if (error) {
      alert("エラーが発生しました: " + error.message);
      return;
    }
    router.refresh();
  }

  async function handleReceived() {
    setLoading(true);
    const { error } = await supabase.rpc("mark_received", { offer_id: offerId });
    setLoading(false);
    if (error) {
      alert("エラーが発生しました: " + error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3">
      <p className="mb-3 text-sm font-medium text-green-800">✅ 取引が成立しました</p>

      <div className="flex flex-col gap-2">
        {/* 発送状況 */}
        <div className="flex items-center gap-2 text-sm">
          <span className={myShipped ? "text-green-600" : "text-gray-400"}>
            {myShipped ? "✓" : "○"}
          </span>
          <span className="text-gray-700">あなたの発送</span>
          {!myShipped && (
            <button
              onClick={handleShipped}
              disabled={loading}
              className="ml-auto rounded-lg bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-50"
            >
              発送しました
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className={theirShipped ? "text-green-600" : "text-gray-400"}>
            {theirShipped ? "✓" : "○"}
          </span>
          <span className="text-gray-700">相手の発送</span>
          {!theirShipped && (
            <span className="ml-auto text-xs text-gray-400">待っています</span>
          )}
        </div>

        {/* 受取状況（両方が発送した後に表示） */}
        {bothShipped && (
          <>
            <div className="my-1 border-t border-green-200" />
            <div className="flex items-center gap-2 text-sm">
              <span className={myReceived ? "text-green-600" : "text-gray-400"}>
                {myReceived ? "✓" : "○"}
              </span>
              <span className="text-gray-700">あなたの受け取り</span>
              {!myReceived && (
                <button
                  onClick={handleReceived}
                  disabled={loading}
                  className="ml-auto rounded-lg bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-50"
                >
                  受け取りました
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className={
                isOfferer ? (requesterReceived ? "text-green-600" : "text-gray-400")
                          : (offererReceived ? "text-green-600" : "text-gray-400")
              }>
                {(isOfferer ? requesterReceived : offererReceived) ? "✓" : "○"}
              </span>
              <span className="text-gray-700">相手の受け取り</span>
              {!(isOfferer ? requesterReceived : offererReceived) && (
                <span className="ml-auto text-xs text-gray-400">待っています</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
