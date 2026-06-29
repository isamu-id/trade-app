"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OfferActions({ offerId }: { offerId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: "accepted" | "rejected") {
    setLoading(true);

    if (status === "accepted") {
      // 両方の商品を確実に更新するため、Supabase側の関数を呼ぶ
      const { error } = await supabase.rpc("accept_trade_offer", {
        offer_id: offerId,
      });
      if (error) {
        alert("承諾に失敗しました: " + error.message);
        setLoading(false);
        return;
      }
    } else {
      await supabase.from("trade_offers").update({ status }).eq("id", offerId);
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => updateStatus("accepted")}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
      >
        承諾
      </button>
      <button
        onClick={() => updateStatus("rejected")}
        disabled={loading}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-50"
      >
        拒否
      </button>
    </div>
  );
}
