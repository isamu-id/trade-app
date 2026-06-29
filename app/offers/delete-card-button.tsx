"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteCardButton({
  offerIds,
}: {
  offerIds: string[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const message =
      offerIds.length > 1
        ? `この商品宛の${offerIds.length}件のオファーをまとめて削除しますか?チャットの履歴も含めて完全に削除され、元に戻せません。`
        : "このオファーを削除しますか?チャットの履歴も含めて完全に削除され、元に戻せません。";

    const confirmed = window.confirm(message);
    if (!confirmed) return;

    setLoading(true);
    const { error } = await supabase
      .from("trade_offers")
      .delete()
      .in("id", offerIds);
    setLoading(false);

    if (error) {
      alert("削除に失敗しました: " + error.message);
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      aria-label="削除"
      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-xs text-white hover:bg-black/70 disabled:opacity-50"
    >
      ×
    </button>
  );
}
