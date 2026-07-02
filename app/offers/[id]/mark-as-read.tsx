"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MarkAsRead({
  offerId,
  userId,
}: {
  offerId: string;
  userId: string;
}) {
  const supabase = createClient();

  useEffect(() => {
    // チャット画面を開いた瞬間に、このオファーの既読時刻を更新(upsert)
    supabase
      .from("message_reads")
      .upsert(
        { offer_id: offerId, user_id: userId, read_at: new Date().toISOString() },
        { onConflict: "offer_id,user_id" }
      )
      .then(() => {});
  }, [offerId, userId]);

  return null;
}
