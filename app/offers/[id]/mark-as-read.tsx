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
    // チャット画面を開いた瞬間に、このオファーの既読時刻を更新
    supabase
      .from("message_reads")
      .upsert(
        { offer_id: offerId, user_id: userId, read_at: new Date().toISOString() },
        { onConflict: "offer_id,user_id" }
      )
      .then(() => {});

    // このオファーに関連する未読の通知（メッセージ通知など）を既読にする
    supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("offer_id", offerId)
      .eq("user_id", userId)
      .eq("is_read", false)
      .then(() => {});
  }, [offerId, userId]);

  return null;
}
