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
    await supabase.from("trade_offers").update({ status }).eq("id", offerId);

    // 承諾時は両方の商品をtradedに更新(本来はDB側のトリガーで行うのが望ましい)
    if (status === "accepted") {
      const { data: offer } = await supabase
        .from("trade_offers")
        .select("offering_item_id, requesting_item_id")
        .eq("id", offerId)
        .single();

      if (offer) {
        await supabase
          .from("items")
          .update({ status: "traded" })
          .in("id", [offer.offering_item_id, offer.requesting_item_id]);
      }
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
