"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OfferStatusWatcher({
  offerId,
}: {
  offerId: string;
}) {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel(`offer-status-${offerId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trade_offers",
          filter: `id=eq.${offerId}`,
        },
        () => {
          // statusが変わったら画面を自動更新
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [offerId]);

  return null;
}
